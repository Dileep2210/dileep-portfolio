import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from pydantic import BaseModel, EmailStr, Field, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ....core import audit
from ....core.config import get_settings
from ....core.database import get_db
from ....core.deps import Auth, ensure_recent_reauth, require
from ....core.email import send_email_quietly
from ....core.errors import AppError, Conflict, Forbidden, NotFound
from ....core.permissions import ROLE_NAMES
from ....models import (
    AuditLog,
    BlogPost,
    ContactLead,
    Project,
    Role,
    Service,
    Testimonial,
    User,
)
from ....schemas.common import Input, Line, Page
from ....schemas.leads import LeadOut
from ....schemas.settings import SiteSettings
from ....services import auth as auth_svc
from ....services import email_templates as tpl
from ....services.site import load_settings, save_settings
from .crud import apply_listing, commit, paginate

router = APIRouter()

# ----------------------------------------------------------------------------- settings


@router.get("/settings", response_model=SiteSettings, tags=["admin:settings"])
def get_site_settings(db: Session = Depends(get_db), auth: Auth = Depends(require("settings:read"))):
    return load_settings(db)


@router.patch("/settings", response_model=SiteSettings, tags=["admin:settings"])
def update_site_settings(
    payload: dict[str, Any], request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("settings:write"))
):
    unknown = set(payload) - set(SiteSettings.model_fields)
    if unknown:
        raise AppError(f"Unknown setting(s): {', '.join(sorted(unknown))[:200]}", code="validation_error", status_code=422)
    merged = load_settings(db).model_dump(mode="json")
    merged.update(payload)
    try:
        validated = SiteSettings.model_validate(merged).model_dump(mode="json")
    except ValidationError as exc:
        details = [{"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()]
        raise AppError("Some settings are invalid.", code="validation_error", status_code=422, details=details) from None
    changed = save_settings(db, {k: validated[k] for k in payload})
    audit.record(db, request, auth.user, "settings.update", "site_settings", None, {"fields": changed})
    commit(db)
    return load_settings(db)


# ----------------------------------------------------------------------------- users


class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    email: str
    full_name: str
    roles: list[str]
    is_active: bool
    mfa_enabled: bool
    email_verified_at: datetime | None
    last_login_at: datetime | None
    locked_until: datetime | None
    created_at: datetime


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id, email=u.email, full_name=u.full_name, roles=u.role_names, is_active=u.is_active,
        mfa_enabled=u.mfa_enabled, email_verified_at=u.email_verified_at, last_login_at=u.last_login_at,
        locked_until=u.locked_until, created_at=u.created_at,
    )


RoleName = Annotated[str, Field(pattern="^(" + "|".join(ROLE_NAMES) + ")$")]


class InviteIn(Input):
    email: EmailStr
    full_name: Annotated[Line, Field(max_length=120)] = ""
    roles: Annotated[list[RoleName], Field(min_length=1, max_length=3)]


class InviteOut(BaseModel):
    user: UserOut
    invite_url: str
    email_sent: bool


class UserPatch(Input):
    full_name: Annotated[Line, Field(max_length=120)] | None = None
    roles: Annotated[list[RoleName], Field(min_length=1, max_length=3)] | None = None
    is_active: bool | None = None


def _roles(db: Session, names: list[str]) -> list[Role]:
    roles = list(db.scalars(select(Role).where(Role.name.in_(set(names)))))
    if len(roles) != len(set(names)):
        raise AppError("Unknown role.", code="validation_error", status_code=422)
    return roles


def _active_super_admins(db: Session) -> int:
    return db.scalar(
        select(func.count(User.id)).where(User.is_active.is_(True), User.roles.any(Role.name == "super_admin"))
    ) or 0


@router.get("/users", response_model=Page[UserOut], tags=["admin:users"])
def list_users(
    db: Session = Depends(get_db),
    auth: Auth = Depends(require("users:read")),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    sort: str | None = Query(None, max_length=40),
):
    stmt = apply_listing(select(User), User, q=q, search=["email", "full_name"], sort=sort,
                         sorts=["created_at", "email", "last_login_at"], default_sort="email")
    rows, total = paginate(db, stmt, page, page_size)
    return {"items": [_user_out(u) for u in rows], "total": total, "page": page, "page_size": page_size}


@router.post("/users/invite", response_model=InviteOut, status_code=201, tags=["admin:users"])
def invite_user(
    payload: InviteIn, request: Request, background: BackgroundTasks, db: Session = Depends(get_db),
    auth: Auth = Depends(require("users:manage")),
):
    ensure_recent_reauth(auth)
    s = get_settings()
    email = str(payload.email).lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise Conflict("A user with this email already exists.", code="duplicate")
    user = User(email=email, full_name=payload.full_name, roles=_roles(db, payload.roles), is_active=True)
    db.add(user)
    db.flush()
    raw = auth_svc.issue_one_time_token(db, user, "invite", timedelta(hours=s.invite_hours))
    audit.record(db, request, auth.user, "user.invite", "user", user.id, {"roles": payload.roles})
    commit(db)
    url = f"{s.site_origin}/admin/accept-invite?token={raw}"
    sent = s.smtp_configured
    if sent:
        background.add_task(send_email_quietly, tpl.invitation(email, url, s.invite_hours, auth.user.full_name or auth.user.email), "invite")
    return InviteOut(user=_user_out(user), invite_url=url, email_sent=sent)


def _get_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFound("User not found.")
    return user


@router.patch("/users/{user_id}", response_model=UserOut, tags=["admin:users"])
def update_user(
    user_id: uuid.UUID, payload: UserPatch, request: Request, db: Session = Depends(get_db),
    auth: Auth = Depends(require("users:manage")),
):
    ensure_recent_reauth(auth)
    user = _get_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    is_self = user.id == auth.user.id
    if is_self and ("roles" in data or data.get("is_active") is False):
        raise Forbidden("You cannot change your own roles or deactivate yourself.", code="self_change")
    was_super = "super_admin" in user.role_names and user.is_active
    if data.get("full_name") is not None:
        user.full_name = data["full_name"]
    if data.get("roles") is not None:
        user.roles = _roles(db, data["roles"])
        user.token_version += 1  # permissions change: force re-login
        auth_svc.revoke_all_sessions(db, user, "roles_changed")
    if data.get("is_active") is not None:
        user.is_active = data["is_active"]
        if not user.is_active:
            user.token_version += 1
            auth_svc.revoke_all_sessions(db, user, "deactivated")
    db.flush()
    if was_super and _active_super_admins(db) == 0:
        db.rollback()
        raise Conflict("At least one active super admin must remain.", code="last_super_admin")
    audit.record(db, request, auth.user, "user.update", "user", user.id, {"fields": sorted(data), "roles": data.get("roles")})
    commit(db)
    return _user_out(user)


@router.post("/users/{user_id}/reset-mfa", response_model=UserOut, tags=["admin:users"])
def reset_user_mfa(user_id: uuid.UUID, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("users:manage"))):
    ensure_recent_reauth(auth)
    user = _get_user(db, user_id)
    if user.id == auth.user.id:
        raise Forbidden("Use Security settings to manage your own two-factor authentication.", code="self_change")
    user.mfa_enabled = False
    user.mfa_secret_enc = None
    user.mfa_last_counter = 0
    user.token_version += 1
    auth_svc.revoke_all_sessions(db, user, "mfa_reset")
    audit.record(db, request, auth.user, "user.mfa_reset", "user", user.id)
    commit(db)
    return _user_out(user)


@router.post("/users/{user_id}/unlock", response_model=UserOut, tags=["admin:users"])
def unlock_user(user_id: uuid.UUID, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("users:manage"))):
    user = _get_user(db, user_id)
    user.locked_until = None
    user.failed_login_count = 0
    audit.record(db, request, auth.user, "user.unlock", "user", user.id)
    commit(db)
    return _user_out(user)


@router.get("/roles", tags=["admin:users"])
def list_roles(db: Session = Depends(get_db), auth: Auth = Depends(require("users:read"))):
    return [
        {"name": r.name, "description": r.description, "permissions": sorted(p.code for p in r.permissions)}
        for r in db.scalars(select(Role).order_by(Role.name))
    ]


# ----------------------------------------------------------------------------- audit log


class AuditOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    created_at: datetime
    actor_email: str | None
    action: str
    entity_type: str | None
    entity_id: str | None
    ip: str | None
    details: dict


@router.get("/audit-logs", response_model=Page[AuditOut], tags=["admin:audit"])
def list_audit(
    db: Session = Depends(get_db),
    auth: Auth = Depends(require("audit:read")),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    action: str | None = Query(None, max_length=64, pattern=r"^[a-z_.]+$"),
    entity_type: str | None = Query(None, max_length=64, pattern=r"^[a-z_]+$"),
    since: datetime | None = None,
):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action.startswith(action))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if since:
        stmt = stmt.where(AuditLog.created_at >= since)
    stmt = apply_listing(stmt, AuditLog, q=q, search=["actor_email", "action", "entity_id"], sort="-created_at",
                         sorts=["created_at"], default_sort="-created_at")
    rows, total = paginate(db, stmt, page, page_size)
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


# ----------------------------------------------------------------------------- dashboard


@router.get("/dashboard", tags=["admin:dashboard"])
def dashboard(db: Session = Depends(get_db), auth: Auth = Depends(require("dashboard:read"))):
    def count(stmt) -> int:
        return db.scalar(stmt) or 0

    live_p = Project.deleted_at.is_(None)
    live_s = Service.deleted_at.is_(None)
    live_b = BlogPost.deleted_at.is_(None)
    live_t = Testimonial.deleted_at.is_(None)
    data: dict[str, Any] = {
        "counts": {
            "projects": count(select(func.count(Project.id)).where(live_p)),
            "projects_published": count(select(func.count(Project.id)).where(live_p, Project.status == "published")),
            "services": count(select(func.count(Service.id)).where(live_s)),
            "services_published": count(select(func.count(Service.id)).where(live_s, Service.status == "published")),
            "testimonials_published": count(
                select(func.count(Testimonial.id)).where(live_t, Testimonial.is_published.is_(True), Testimonial.approval_status == "approved")
            ),
            "testimonials_pending": count(select(func.count(Testimonial.id)).where(live_t, Testimonial.approval_status == "pending")),
            "blog_posts": count(select(func.count(BlogPost.id)).where(live_b)),
            "blog_published": count(select(func.count(BlogPost.id)).where(live_b, BlogPost.status == "published")),
        },
        "content_status": {
            "draft_projects": count(select(func.count(Project.id)).where(live_p, Project.status == "draft")),
            "draft_services": count(select(func.count(Service.id)).where(live_s, Service.status == "draft")),
            "draft_posts": count(select(func.count(BlogPost.id)).where(live_b, BlogPost.status == "draft")),
            "scheduled_posts": count(
                select(func.count(BlogPost.id)).where(live_b, BlogPost.status == "published", BlogPost.published_at > datetime.now(UTC))
            ),
        },
        "recent_leads": None,
        "leads_by_week": None,
        "recent_activity": None,
    }
    if auth.can("leads:read"):
        live_l = ContactLead.deleted_at.is_(None)
        data["counts"]["leads_new"] = count(select(func.count(ContactLead.id)).where(live_l, ContactLead.status == "new"))
        data["counts"]["leads_total"] = count(select(func.count(ContactLead.id)).where(live_l))
        recent = db.scalars(select(ContactLead).where(live_l).order_by(ContactLead.created_at.desc()).limit(5))
        data["recent_leads"] = [LeadOut.model_validate(r).model_dump(mode="json") for r in recent]
        start = (datetime.now(UTC) - timedelta(weeks=7)).date()
        start = start - timedelta(days=start.weekday())
        week = func.date_trunc("week", ContactLead.created_at)
        rows = db.execute(
            select(week.label("week"), func.count(ContactLead.id))
            .where(live_l, ContactLead.created_at >= start)
            .group_by(week)
        ).all()
        by_week = {r[0].date().isoformat(): r[1] for r in rows}
        data["leads_by_week"] = [
            {"week": (start + timedelta(weeks=i)).isoformat(), "count": by_week.get((start + timedelta(weeks=i)).isoformat(), 0)}
            for i in range(8)
        ]
    if auth.can("audit:read"):
        recent_audit = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10))
        data["recent_activity"] = [AuditOut.model_validate(a).model_dump(mode="json") for a in recent_audit]
    return data
