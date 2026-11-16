import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from ..models import AuthSession, User
from .config import get_settings
from .database import get_db
from .errors import Forbidden, Unauthorized
from .security import ACCESS_COOKIE, decode_access_token


@dataclass
class Auth:
    user: User
    session: AuthSession

    def can(self, perm: str) -> bool:
        return perm in self.user.permission_codes


def current_auth(request: Request, db: Session = Depends(get_db)) -> Auth:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise Unauthorized()
    try:
        data = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Your session has expired.", code="token_expired") from None
    except jwt.InvalidTokenError:
        raise Unauthorized("Invalid session.", code="invalid_token") from None
    try:
        sid = uuid.UUID(data["sid"])
    except (ValueError, KeyError):
        raise Unauthorized("Invalid session.", code="invalid_token") from None
    sess = db.get(AuthSession, sid)
    now = datetime.now(UTC)
    if (
        sess is None
        or sess.revoked_at is not None
        or sess.expires_at <= now
        or str(sess.user_id) != data["sub"]
    ):
        raise Unauthorized("Your session has ended. Please sign in again.", code="session_revoked")
    user = sess.user
    if not user.is_active or user.token_version != data.get("ver"):
        raise Unauthorized("Your session has ended. Please sign in again.", code="session_revoked")
    if sess.last_seen_at is None or now - sess.last_seen_at > timedelta(minutes=5):
        sess.last_seen_at = now
        db.commit()
    request.state.user_id = str(user.id)
    return Auth(user=user, session=sess)


def require(*perms: str):
    def dependency(auth: Auth = Depends(current_auth)) -> Auth:
        if any(p not in auth.user.permission_codes for p in perms):
            raise Forbidden()
        return auth

    return dependency


def require_any(*perms: str):
    def dependency(auth: Auth = Depends(current_auth)) -> Auth:
        if not any(p in auth.user.permission_codes for p in perms):
            raise Forbidden()
        return auth

    return dependency


def ensure_recent_reauth(auth: Auth) -> None:
    window = timedelta(minutes=get_settings().reauth_window_minutes)
    at = auth.session.reauth_at
    if at is None or datetime.now(UTC) - at > window:
        raise Forbidden("Please confirm your password to continue.", code="reauth_required")


def require_reauth(auth: Auth = Depends(current_auth)) -> Auth:
    ensure_recent_reauth(auth)
    return auth
