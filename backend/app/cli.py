"""Operator commands. Run from backend/:  python -m app.cli <command>

  create-admin --email you@example.com [--name "Your Name"] [--force-additional]
      Creates a super admin. Password is prompted (or read from ADMIN_PASSWORD for automation).
      Refuses when a super admin already exists unless --force-additional is given.
  seed            Insert the initial portfolio content (idempotent, never overwrites edits).
  sync-roles      Re-apply the role/permission catalogue from app/core/permissions.py.
  prune-sessions  Delete expired sessions and used/expired one-time tokens.

There is deliberately no HTTP endpoint that can create the first administrator.
"""

import argparse
import getpass
import os
import sys
from datetime import UTC, datetime

from sqlalchemy import delete, func, or_, select

from .core.database import new_session
from .core.permissions import sync_roles
from .core.security import hash_password, password_problems
from .models import AuthSession, AuthToken, Role, User


def _read_password(email: str) -> str:
    env = os.environ.get("ADMIN_PASSWORD")
    if env:
        password = env
    else:
        password = getpass.getpass("New admin password: ")
        if password != getpass.getpass("Repeat password: "):
            sys.exit("Passwords do not match.")
    problems = password_problems(password, email)
    if problems:
        sys.exit("Password rejected: " + " ".join(problems))
    return password


def create_admin(email: str, name: str, force_additional: bool) -> None:
    from email_validator import EmailNotValidError, validate_email

    try:
        email = validate_email(email.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        sys.exit("Please give a valid email address.")
    with new_session() as db:
        role = db.scalar(select(Role).where(Role.name == "super_admin"))
        if role is None:
            sys.exit("Roles are missing. Run `alembic upgrade head` first.")
        existing = db.scalar(
            select(func.count(User.id)).where(User.roles.any(Role.name == "super_admin"), User.is_active.is_(True))
        )
        if existing and not force_additional:
            sys.exit("A super admin already exists. Invite further users from the admin, or pass --force-additional.")
        if db.scalar(select(User.id).where(User.email == email)):
            sys.exit("A user with this email already exists.")
        password = _read_password(email)
        now = datetime.now(UTC)
        db.add(User(email=email, full_name=name, password_hash=hash_password(password), roles=[role],
                    email_verified_at=now, password_changed_at=now))
        db.commit()
    print(f"Super admin {email} created. Sign in at /admin/login and turn on two-factor authentication.")


def seed() -> None:
    from .seed import seed_content

    with new_session() as db:
        added = seed_content(db)
    print("Seed complete:", ", ".join(f"{k}={v}" for k, v in sorted(added.items())) or "nothing new")


def roles() -> None:
    with new_session() as db:
        sync_roles(db)
        db.commit()
    print("Roles and permissions synchronised.")


def prune() -> None:
    now = datetime.now(UTC)
    with new_session() as db:
        s = db.execute(delete(AuthSession).where(or_(AuthSession.expires_at < now, AuthSession.revoked_at.is_not(None))))
        t = db.execute(delete(AuthToken).where(or_(AuthToken.expires_at < now, AuthToken.used_at.is_not(None))))
        db.commit()
    print(f"Removed {s.rowcount} sessions and {t.rowcount} one-time tokens.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    ca = sub.add_parser("create-admin")
    ca.add_argument("--email", required=True)
    ca.add_argument("--name", default="")
    ca.add_argument("--force-additional", action="store_true")
    sub.add_parser("seed")
    sub.add_parser("sync-roles")
    sub.add_parser("prune-sessions")
    args = parser.parse_args(argv)
    if args.cmd == "create-admin":
        create_admin(args.email, args.name, args.force_additional)
    elif args.cmd == "seed":
        seed()
    elif args.cmd == "sync-roles":
        roles()
    else:
        prune()


if __name__ == "__main__":
    main()
