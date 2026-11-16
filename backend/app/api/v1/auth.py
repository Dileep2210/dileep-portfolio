import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core import audit
from ...core.config import get_settings
from ...core.database import get_db
from ...core.deps import Auth, current_auth, require_reauth
from ...core.email import send_email_quietly
from ...core.errors import AppError, Forbidden, NotFound, Unauthorized
from ...core.ratelimit import limiter, login_limit
from ...core.security import (
    REFRESH_COOKIE,
    hash_password,
    needs_rehash,
    new_totp_secret,
    password_problems,
    seal_secret,
    totp_uri,
    unseal_secret,
    verify_password,
    verify_totp,
)
from ...models import AuthSession, User
from ...schemas.auth import (
    ChangePasswordIn,
    InviteAcceptIn,
    LoginIn,
    MeOut,
    MfaSetupOut,
    PasswordIn,
    ResetConfirmIn,
    ResetRequestIn,
    SessionOut,
    TotpCodeIn,
)
from ...services import auth as svc
from ...services import email_templates as tpl

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("auth")

GENERIC_LOGIN_ERROR = "Invalid email or password, or the account is temporarily locked."


def _me(user: User) -> MeOut:
    return MeOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        roles=user.role_names,
        permissions=sorted(user.permission_codes),
        mfa_enabled=user.mfa_enabled,
        last_login_at=user.last_login_at,
    )


def _check_password_policy(password: str, email: str) -> None:
    problems = password_problems(password, email)
    if problems:
        raise AppError(" ".join(problems), code="weak_password", status_code=422)


@router.post("/login", response_model=MeOut)
@limiter.limit(login_limit)
def login(request: Request, response: Response, payload: LoginIn, db: Session = Depends(get_db)):
    s = get_settings()
    user = db.scalar(select(User).where(User.email == payload.email).with_for_update())
    ok = verify_password(payload.password, user.password_hash if user else None)
    now = datetime.now(UTC)

    if user is None or not user.is_active or user.password_hash is None:
        audit.record(db, request, None, "auth.login_failed", "user", None, {"reason": "unknown_or_inactive"})
        db.commit()
        raise Unauthorized(GENERIC_LOGIN_ERROR, code="invalid_credentials")

    if user.locked_until and user.locked_until > now:
        audit.record(db, request, user, "auth.login_blocked", "user", user.id)
        db.commit()
        raise Unauthorized(GENERIC_LOGIN_ERROR, code="invalid_credentials")

    if not ok:
        user.failed_login_count += 1
        details = {"failures": user.failed_login_count}
        if user.failed_login_count >= s.login_max_failures:
            user.locked_until = now + timedelta(minutes=s.login_lock_minutes)
            user.failed_login_count = 0
            details["locked"] = True
        audit.record(db, request, user, "auth.login_failed", "user", user.id, details)
        db.commit()
        raise Unauthorized(GENERIC_LOGIN_ERROR, code="invalid_credentials")

    if user.mfa_enabled:
        if not payload.totp_code:
            db.rollback()
            raise Unauthorized("Enter the 6-digit code from your authenticator app.", code="mfa_required")
        secret = unseal_secret(user.mfa_secret_enc)
        counter = verify_totp(secret, payload.totp_code, user.mfa_last_counter) if secret else None
        if counter is None:
            user.failed_login_count += 1
            if user.failed_login_count >= s.login_max_failures:
                user.locked_until = now + timedelta(minutes=s.login_lock_minutes)
                user.failed_login_count = 0
            audit.record(db, request, user, "auth.mfa_failed", "user", user.id)
            db.commit()
            raise Unauthorized("That code is not valid. Try the newest code.", code="mfa_invalid")
        user.mfa_last_counter = counter

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    svc.start_session(db, user, request, response)
    audit.record(db, request, user, "auth.login", "user", user.id)
    db.commit()
    return _me(user)


@router.post("/refresh", status_code=204)
@limiter.limit("60/minute")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise Unauthorized("Please sign in.", code="no_session")
    try:
        sess = svc.rotate_refresh(db, raw, response)
    except svc.RefreshFailed as exc:
        if exc.reason == "reuse":
            audit.record(db, request, None, "auth.refresh_reuse_detected", "session", None)
        db.commit()
        raise Unauthorized("Your session has ended. Please sign in again.", code="session_revoked") from None
    db.commit()
    request.state.user_id = str(sess.user_id)
    response.status_code = 204
    return response


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db), auth: Auth = Depends(current_auth)):
    svc.revoke_session(db, auth.session, "logout")
    audit.record(db, request, auth.user, "auth.logout", "user", auth.user.id)
    db.commit()
    svc.clear_auth_cookies(response)
    response.status_code = 204
    return response


@router.post("/logout-all", status_code=204)
def logout_all(request: Request, response: Response, db: Session = Depends(get_db), auth: Auth = Depends(current_auth)):
    auth.user.token_version += 1
    svc.revoke_all_sessions(db, auth.user, "logout_all")
    audit.record(db, request, auth.user, "auth.logout_all", "user", auth.user.id)
    db.commit()
    svc.clear_auth_cookies(response)
    response.status_code = 204
    return response


@router.get("/me", response_model=MeOut)
def me(response: Response, auth: Auth = Depends(current_auth)):
    response.headers["Cache-Control"] = "no-store"
    return _me(auth.user)


@router.post("/reauth", status_code=204)
@limiter.limit("10/minute")
def reauth(request: Request, response: Response, payload: PasswordIn, db: Session = Depends(get_db), auth: Auth = Depends(current_auth)):
    if not verify_password(payload.password, auth.user.password_hash):
        audit.record(db, request, auth.user, "auth.reauth_failed", "user", auth.user.id)
        db.commit()
        raise Forbidden("That password is not correct.", code="reauth_failed")
    auth.session.reauth_at = datetime.now(UTC)
    audit.record(db, request, auth.user, "auth.reauth", "user", auth.user.id)
    db.commit()
    response.status_code = 204
    return response


@router.post("/change-password", status_code=204)
@limiter.limit("5/minute")
def change_password(
    request: Request,
    response: Response,
    payload: ChangePasswordIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    auth: Auth = Depends(current_auth),
):
    user = auth.user
    if not verify_password(payload.current_password, user.password_hash):
        audit.record(db, request, user, "auth.password_change_failed", "user", user.id)
        db.commit()
        raise Forbidden("Your current password is not correct.", code="reauth_failed")
    _check_password_policy(payload.new_password, user.email)
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(UTC)
    svc.revoke_all_sessions(db, user, "password_changed", except_session=auth.session.id)
    audit.record(db, request, user, "auth.password_changed", "user", user.id)
    db.commit()
    background.add_task(send_email_quietly, tpl.security_notice(user.email, "Your admin password was changed"), "security")
    response.status_code = 204
    return response


# ----------------------------------------------------------------------------- password reset


@router.post("/password-reset/request", status_code=202)
@limiter.limit("3/minute;10/hour")
def request_reset(request: Request, payload: ResetRequestIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    s = get_settings()
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user and user.is_active and user.email_verified_at is not None:
        raw = svc.issue_one_time_token(db, user, "password_reset", timedelta(minutes=s.password_reset_minutes))
        audit.record(db, request, user, "auth.password_reset_requested", "user", user.id)
        db.commit()
        link = f"{s.site_origin}/admin/reset-password?token={raw}"
        background.add_task(send_email_quietly, tpl.password_reset(user.email, link, s.password_reset_minutes), "password_reset")
    # Same answer whether or not the account exists (no account enumeration).
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/password-reset/confirm", status_code=204)
@limiter.limit("5/minute")
def confirm_reset(
    request: Request, response: Response, payload: ResetConfirmIn, background: BackgroundTasks, db: Session = Depends(get_db)
):
    user = svc.consume_one_time_token(db, payload.token, "password_reset")
    if user is None or not user.is_active:
        db.rollback()
        raise AppError("This reset link is invalid or has expired.", code="invalid_token", status_code=400)
    _check_password_policy(payload.new_password, user.email)
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(UTC)
    user.failed_login_count = 0
    user.locked_until = None
    user.token_version += 1
    svc.revoke_all_sessions(db, user, "password_reset")
    audit.record(db, request, user, "auth.password_reset", "user", user.id)
    db.commit()
    background.add_task(send_email_quietly, tpl.security_notice(user.email, "Your admin password was reset"), "security")
    response.status_code = 204
    return response


@router.post("/invite/accept", status_code=204)
@limiter.limit("5/minute")
def accept_invite(request: Request, response: Response, payload: InviteAcceptIn, db: Session = Depends(get_db)):
    user = svc.consume_one_time_token(db, payload.token, "invite")
    if user is None or not user.is_active:
        db.rollback()
        raise AppError("This invitation is invalid or has expired.", code="invalid_token", status_code=400)
    _check_password_policy(payload.password, user.email)
    user.full_name = payload.full_name
    user.password_hash = hash_password(payload.password)
    user.password_changed_at = datetime.now(UTC)
    user.email_verified_at = datetime.now(UTC)
    audit.record(db, request, user, "auth.invite_accepted", "user", user.id)
    db.commit()
    response.status_code = 204
    return response


# ----------------------------------------------------------------------------- sessions


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db), auth: Auth = Depends(current_auth)):
    rows = db.scalars(
        select(AuthSession)
        .where(
            AuthSession.user_id == auth.user.id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(UTC),
        )
        .order_by(AuthSession.last_seen_at.desc().nullslast())
    )
    return [SessionOut.model_validate(r).model_copy(update={"current": r.id == auth.session.id}) for r in rows]


@router.delete("/sessions/{session_id}", status_code=204)
def revoke_session(
    session_id: uuid.UUID, request: Request, response: Response, db: Session = Depends(get_db), auth: Auth = Depends(current_auth)
):
    sess = db.get(AuthSession, session_id)
    if sess is None or sess.user_id != auth.user.id:  # no access to other users' sessions (IDOR)
        raise NotFound()
    svc.revoke_session(db, sess, "revoked_by_user")
    audit.record(db, request, auth.user, "auth.session_revoked", "session", session_id)
    db.commit()
    if sess.id == auth.session.id:
        svc.clear_auth_cookies(response)
    response.status_code = 204
    return response


# ----------------------------------------------------------------------------- MFA


@router.post("/mfa/setup", response_model=MfaSetupOut)
def mfa_setup(request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require_reauth)):
    if auth.user.mfa_enabled:
        raise AppError("Two-factor authentication is already on.", code="mfa_already_enabled", status_code=409)
    secret = new_totp_secret()
    auth.user.mfa_secret_enc = seal_secret(secret)
    auth.user.mfa_last_counter = 0
    audit.record(db, request, auth.user, "auth.mfa_setup_started", "user", auth.user.id)
    db.commit()
    return MfaSetupOut(secret=secret, otpauth_uri=totp_uri(secret, auth.user.email))


@router.post("/mfa/enable", response_model=MeOut)
@limiter.limit("10/minute")
def mfa_enable(request: Request, payload: TotpCodeIn, background: BackgroundTasks, db: Session = Depends(get_db), auth: Auth = Depends(current_auth)):
    user = auth.user
    secret = unseal_secret(user.mfa_secret_enc)
    if user.mfa_enabled or not secret:
        raise AppError("Start the setup first.", code="mfa_not_started", status_code=409)
    counter = verify_totp(secret, payload.code, user.mfa_last_counter)
    if counter is None:
        raise AppError("That code is not valid. Check your device's time and try the newest code.", code="mfa_invalid", status_code=422)
    user.mfa_last_counter = counter
    user.mfa_enabled = True
    audit.record(db, request, user, "auth.mfa_enabled", "user", user.id)
    db.commit()
    background.add_task(send_email_quietly, tpl.security_notice(user.email, "Two-factor authentication was turned on"), "security")
    return _me(user)


@router.post("/mfa/disable", response_model=MeOut)
@limiter.limit("10/minute")
def mfa_disable(request: Request, payload: TotpCodeIn, background: BackgroundTasks, db: Session = Depends(get_db), auth: Auth = Depends(require_reauth)):
    user = auth.user
    secret = unseal_secret(user.mfa_secret_enc)
    if not user.mfa_enabled or not secret:
        raise AppError("Two-factor authentication is not on.", code="mfa_not_enabled", status_code=409)
    if verify_totp(secret, payload.code, user.mfa_last_counter) is None:
        raise AppError("That code is not valid.", code="mfa_invalid", status_code=422)
    user.mfa_enabled = False
    user.mfa_secret_enc = None
    user.mfa_last_counter = 0
    audit.record(db, request, user, "auth.mfa_disabled", "user", user.id)
    db.commit()
    background.add_task(send_email_quietly, tpl.security_notice(user.email, "Two-factor authentication was turned off"), "security")
    return _me(user)
