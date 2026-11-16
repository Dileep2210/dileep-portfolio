from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from ..models import AuditLog, User
from .ratelimit import client_ip

# Keys whose values must never reach the audit log.
_REDACT = {"password", "current_password", "new_password", "token", "secret", "code", "totp_code", "message"}


def _clean(details: dict[str, Any] | None) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in (details or {}).items():
        if k in _REDACT:
            continue
        if isinstance(v, str) and len(v) > 200:
            v = v[:200] + "…"
        out[k] = v
    return out


def record(
    db: Session,
    request: Request | None,
    actor: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: Any = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Adds an audit row to the current transaction (committed together with the change)."""
    db.add(
        AuditLog(
            actor_user_id=actor.id if actor else None,
            actor_email=actor.email if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            ip=client_ip(request) if request else None,
            user_agent=(request.headers.get("user-agent", "")[:300] if request else None),
            details=_clean(details),
        )
    )
