import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Request, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.ratelimit import client_ip
from ..core.security import (
    ACCESS_COOKIE,
    CSRF_COOKIE,
    REFRESH_COOKIE,
    create_access_token,
    hash_token,
    new_opaque_token,
)
from ..models import AuthSession, AuthToken, RefreshToken, User

REFRESH_PATH = "/api/v1/auth"
REUSE_GRACE_SECONDS = 20


def now() -> datetime:
    return datetime.now(UTC)


def _cookie_kwargs() -> dict:
    s = get_settings()
    return {"secure": s.cookie_secure, "samesite": "lax"}


def set_auth_cookies(response: Response, access: str, refresh: str | None, csrf: str | None) -> None:
    s = get_settings()
    kw = _cookie_kwargs()
    response.set_cookie(ACCESS_COOKIE, access, max_age=s.access_token_minutes * 60, httponly=True, path="/api", **kw)
    if refresh is not None:
        response.set_cookie(
            REFRESH_COOKIE, refresh, max_age=s.refresh_token_days * 86400, httponly=True, path=REFRESH_PATH, **kw
        )
    if csrf is not None:
        response.set_cookie(CSRF_COOKIE, csrf, max_age=s.refresh_token_days * 86400, httponly=False, path="/", **kw)


def clear_auth_cookies(response: Response) -> None:
    kw = _cookie_kwargs()
    response.delete_cookie(ACCESS_COOKIE, path="/api", httponly=True, **kw)
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, httponly=True, **kw)
    response.delete_cookie(CSRF_COOKIE, path="/", **kw)


def _new_refresh(db: Session, session: AuthSession) -> str:
    raw = new_opaque_token()
    db.add(RefreshToken(session_id=session.id, token_hash=hash_token(raw), expires_at=session.expires_at))
    return raw


def start_session(db: Session, user: User, request: Request, response: Response) -> AuthSession:
    s = get_settings()
    sess = AuthSession(
        user_id=user.id,
        expires_at=now() + timedelta(days=s.refresh_token_days),
        ip=client_ip(request),
        user_agent=request.headers.get("user-agent", "")[:300],
        last_seen_at=now(),
    )
    db.add(sess)
    db.flush()
    refresh = _new_refresh(db, sess)
    access = create_access_token(user.id, sess.id, user.token_version)
    set_auth_cookies(response, access, refresh, new_opaque_token())
    return sess


class RefreshFailed(Exception):
    def __init__(self, reason: str):
        self.reason = reason


def rotate_refresh(db: Session, raw: str, response: Response) -> AuthSession:
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
    if row is None:
        raise RefreshFailed("unknown")
    sess = db.get(AuthSession, row.session_id)
    if sess is None or sess.revoked_at is not None or sess.expires_at <= now() or row.expires_at <= now():
        raise RefreshFailed("expired")
    user = sess.user
    if not user.is_active:
        raise RefreshFailed("inactive")
    if row.used_at is not None:
        if now() - row.used_at <= timedelta(seconds=REUSE_GRACE_SECONDS):
            # Concurrent refresh from another tab: the browser already holds the newer cookie.
            set_auth_cookies(response, create_access_token(user.id, sess.id, user.token_version), None, None)
            return sess
        revoke_session(db, sess, "refresh_reuse")
        raise RefreshFailed("reuse")
    row.used_at = now()
    refresh = _new_refresh(db, sess)
    set_auth_cookies(response, create_access_token(user.id, sess.id, user.token_version), refresh, None)
    sess.last_seen_at = now()
    return sess


def revoke_session(db: Session, sess: AuthSession, reason: str) -> None:
    if sess.revoked_at is None:
        sess.revoked_at = now()
        sess.revoked_reason = reason


def revoke_all_sessions(db: Session, user: User, reason: str, except_session: uuid.UUID | None = None) -> None:
    stmt = update(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
    if except_session:
        stmt = stmt.where(AuthSession.id != except_session)
    db.execute(stmt.values(revoked_at=now(), revoked_reason=reason))


def issue_one_time_token(db: Session, user: User, purpose: str, ttl: timedelta) -> str:
    # Only one live token per purpose: older ones stop working.
    db.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user.id, AuthToken.purpose == purpose, AuthToken.used_at.is_(None))
        .values(used_at=now())
    )
    raw = new_opaque_token()
    db.add(AuthToken(user_id=user.id, purpose=purpose, token_hash=hash_token(raw), expires_at=now() + ttl))
    return raw


def consume_one_time_token(db: Session, raw: str, purpose: str) -> User | None:
    row = db.scalar(
        select(AuthToken).where(AuthToken.token_hash == hash_token(raw), AuthToken.purpose == purpose).with_for_update()
    )
    if row is None or row.used_at is not None or row.expires_at <= now():
        return None
    row.used_at = now()
    return db.get(User, row.user_id)
