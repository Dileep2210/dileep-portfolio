import logging
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api.misc import router as misc_router
from .api.v1 import v1_router
from .core.config import get_settings
from .core.errors import AppError, error_body
from .core.ratelimit import limiter
from .core.security import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER, REFRESH_COOKIE, tokens_equal
from .services.auth import clear_auth_cookies

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
access_log = logging.getLogger("access")

MAX_JSON_BYTES = 1024 * 1024
UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}
# Endpoints that start a session (no session cookie yet): Origin check only, no CSRF token.
CSRF_EXEMPT = {
    "/api/v1/auth/login",
    "/api/v1/auth/password-reset/request",
    "/api/v1/auth/password-reset/confirm",
    "/api/v1/auth/invite/accept",
}
LEGACY_PATHS = {"/api/contact"}


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _error(request: Request, status: int, code: str, message: str, details=None) -> JSONResponse:
    if request.url.path in LEGACY_PATHS:  # keep the original response shape for the old form
        content = {"ok": False, "error": message}
        if details is not None:
            content["detail"] = details
        return JSONResponse(status_code=status, content=content)
    resp = JSONResponse(status_code=status, content=error_body(code, message, _request_id(request), details))
    if code in {"session_revoked", "invalid_token", "no_session"}:
        clear_auth_cookies(resp)
    return resp


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Portfolio CMS API",
        version="1.0.0",
        docs_url="/docs" if settings.is_dev else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.is_dev else None,
    )
    app.state.limiter = limiter
    site_origins = set(settings.allowed_origins)

    # ------------------------------------------------------------------ middleware (inner → outer)

    @app.middleware("http")
    async def csrf_and_origin(request: Request, call_next):
        path = request.url.path
        if request.method in UNSAFE and (path.startswith("/api/v1/admin") or path.startswith("/api/v1/auth")):
            origin = request.headers.get("origin")
            if origin is None:
                referer = request.headers.get("referer")
                if referer:
                    p = urlparse(referer)
                    origin = f"{p.scheme}://{p.netloc}"
            if origin not in site_origins:
                return _error(request, 403, "origin_rejected", "Request origin not allowed.")
            uses_cookie = ACCESS_COOKIE in request.cookies or REFRESH_COOKIE in request.cookies
            if path not in CSRF_EXEMPT and uses_cookie:
                if not tokens_equal(request.headers.get(CSRF_HEADER), request.cookies.get(CSRF_COOKIE)):
                    return _error(request, 403, "csrf_failed", "Security token missing or invalid. Reload the page and try again.")
        return await call_next(request)

    @app.middleware("http")
    async def limit_body_size(request: Request, call_next):
        length = request.headers.get("content-length")
        is_upload = request.url.path.startswith("/api/v1/admin/media")
        cap = (max(settings.max_image_mb, settings.max_document_mb) + 1) * 1024 * 1024 if is_upload else MAX_JSON_BYTES
        if length and length.isdigit() and int(length) > cap:
            return _error(request, 413, "too_large", "Request too large.")
        return await call_next(request)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = request.headers.get("x-request-id", "")
        rid = rid if (0 < len(rid) <= 64 and rid.replace("-", "").isalnum()) else uuid.uuid4().hex
        request.state.request_id = rid
        start = time.perf_counter()
        response = await call_next(request)
        duration = (time.perf_counter() - start) * 1000
        h = response.headers
        h["X-Request-ID"] = rid
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Cross-Origin-Resource-Policy", "same-site")
        if request.url.path.startswith("/media/"):
            h["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
        else:
            h.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        if settings.is_production:
            h.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        if request.url.path.startswith(("/api/v1/admin", "/api/v1/auth")):
            h["Cache-Control"] = "no-store"
        access_log.info(
            "rid=%s %s %s %s %.1fms user=%s",
            rid, request.method, request.url.path, response.status_code, duration, getattr(request.state, "user_id", "-"),
        )
        return response

    # CORS outermost so headers are present on every response, errors included. Same-origin (via the
    # Vercel rewrite) needs no CORS; the list only serves cross-origin public calls (legacy form).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(site_origins),
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID"],
        allow_credentials=True,
        max_age=600,
    )

    # ------------------------------------------------------------------ errors

    @app.exception_handler(AppError)
    async def app_error(request: Request, exc: AppError):
        return _error(request, exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RateLimitExceeded)
    async def rate_limited(request: Request, exc: RateLimitExceeded):
        return _error(request, 429, "rate_limited", "Too many requests. Please wait a bit and try again.")

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Field + message only; submitted values are never echoed back.
        details = [
            {"field": ".".join(str(p) for p in e["loc"][1:]) or "body", "message": e["msg"]} for e in exc.errors()
        ]
        message = "Please check the form fields." if request.url.path in LEGACY_PATHS else "Some fields are invalid."
        return _error(request, 422, "validation_error", message, details)

    @app.exception_handler(ValidationError)
    async def model_validation_error(request: Request, exc: ValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()]
        return _error(request, 422, "validation_error", "Some fields are invalid.", details)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return _error(request, exc.status_code, code, message)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        logging.getLogger("app").exception("unhandled error rid=%s", _request_id(request))
        return _error(request, 500, "server_error", "Something went wrong on our side.")

    # ------------------------------------------------------------------ routes

    app.include_router(misc_router)
    app.include_router(v1_router())
    if settings.storage_backend == "local":
        media_dir = Path(settings.local_media_dir)
        media_dir.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=media_dir), name="media")
    return app


app = create_app()
