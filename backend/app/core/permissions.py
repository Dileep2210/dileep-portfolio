"""Permission catalogue and default role grants.

Permissions are enforced by backend dependencies (`require(...)`); hiding a button in React is
only a convenience. The migration seeds these rows; `sync_roles()` re-applies them idempotently.
"""

CONTENT_MODULES = [
    "projects",
    "services",
    "testimonials",
    "skills",
    "experiences",
    "blog",
    "homepage",
    "navigation",
    "social",
    "seo",
    "resume",
    "media",
    "settings",
]

PERMISSIONS: dict[str, str] = {"dashboard:read": "View the dashboard"}
for _m in CONTENT_MODULES:
    PERMISSIONS[f"{_m}:read"] = f"View {_m} in admin"
    PERMISSIONS[f"{_m}:write"] = f"Create and edit {_m}"
    PERMISSIONS[f"{_m}:delete"] = f"Delete {_m}"
PERMISSIONS.update(
    {
        "leads:read": "View contact enquiries (personal data)",
        "leads:write": "Update enquiry status and notes",
        "leads:delete": "Delete enquiries",
        "leads:export": "Export enquiries to CSV",
        "users:read": "View admin users",
        "users:manage": "Invite users, change roles, deactivate accounts",
        "audit:read": "View the audit log",
    }
)

_content_rw = [f"{m}:{a}" for m in CONTENT_MODULES for a in ("read", "write", "delete")]

ROLE_GRANTS: dict[str, tuple[str, list[str]]] = {
    "super_admin": ("Full access including users, security and audit", sorted(PERMISSIONS)),
    "editor": (
        "Manages content and enquiries; cannot manage users or export data",
        ["dashboard:read", *_content_rw, "leads:read", "leads:write"],
    ),
    "viewer": (
        "Read-only access to content (no personal data)",
        ["dashboard:read", *[f"{m}:read" for m in CONTENT_MODULES]],
    ),
}

ROLE_NAMES = tuple(ROLE_GRANTS)


def sync_roles(db) -> None:
    """Create/refresh roles and permissions to match this module. Safe to run repeatedly."""
    from sqlalchemy import select

    from ..models import Permission, Role

    perms = {p.code: p for p in db.scalars(select(Permission))}
    for code, desc in PERMISSIONS.items():
        if code not in perms:
            perms[code] = Permission(code=code, description=desc)
            db.add(perms[code])
    db.flush()
    roles = {r.name: r for r in db.scalars(select(Role))}
    for name, (desc, codes) in ROLE_GRANTS.items():
        role = roles.get(name) or Role(name=name, description=desc)
        role.description = desc
        role.permissions = [perms[c] for c in codes]
        db.add(role)
    db.flush()
