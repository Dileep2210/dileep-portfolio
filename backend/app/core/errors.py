from typing import Any


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, details: Any = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details


class NotFound(AppError):
    status_code = 404
    code = "not_found"

    def __init__(self, message: str = "Not found."):
        super().__init__(message)


class Unauthorized(AppError):
    status_code = 401
    code = "unauthorized"

    def __init__(self, message: str = "Authentication required.", code: str | None = None):
        super().__init__(message, code=code)


class Forbidden(AppError):
    status_code = 403
    code = "forbidden"

    def __init__(self, message: str = "You do not have permission to do that.", code: str | None = None):
        super().__init__(message, code=code)


class Conflict(AppError):
    status_code = 409
    code = "conflict"


def error_body(code: str, message: str, request_id: str | None, details: Any = None) -> dict:
    body: dict[str, Any] = {"error": {"code": code, "message": message}, "request_id": request_id}
    if details is not None:
        body["error"]["details"] = details
    return body
