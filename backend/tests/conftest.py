"""Test harness: a real PostgreSQL database built with the real Alembic migration.

Set TEST_DATABASE_URL to point elsewhere (CI uses a service container). The database is wiped.
"""

import os
import tempfile
import uuid
from datetime import UTC, datetime

TEST_DB = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://portfolio:portfolio_dev_only@127.0.0.1:5544/portfolio_test"
)
MEDIA_DIR = tempfile.mkdtemp(prefix="pf-media-")
ORIGIN = "http://testserver"

os.environ.update(
    {
        "APP_ENV": "test",
        "SECRET_KEY": "test-secret-key-that-is-long-enough-0123456789",
        "DATABASE_URL": TEST_DB,
        "PUBLIC_SITE_ORIGIN": ORIGIN,
        "FRONTEND_ORIGIN": "https://legacy.example",
        "COOKIE_SECURE": "false",
        "TRUSTED_PROXY_HOPS": "1",
        "SMTP_HOST": "smtp.test",
        "SMTP_USERNAME": "user",
        "SMTP_PASSWORD": "secret-pass",
        "MAIL_FROM": "sender@example.com",
        "CONTACT_RECEIVER_EMAIL": "owner@example.com",
        "SEND_LEAD_ACKNOWLEDGEMENT": "true",
        "RATE_LIMIT_CONTACT": "1000/minute",
        "RATE_LIMIT_LOGIN": "1000/minute",
        "STORAGE_BACKEND": "local",
        "LOCAL_MEDIA_DIR": MEDIA_DIR,
        "TURNSTILE_SECRET_KEY": "",
    }
)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, select, text  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.database import new_session, reset_engine_cache  # noqa: E402
from app.core.ratelimit import limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import Role, User  # noqa: E402

KEEP = {"roles", "permissions", "role_permissions", "alembic_version"}
PASSWORD = "Correct-Horse-Battery-9"
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def alembic_config() -> Config:
    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    cfg.attributes["database_url"] = TEST_DB
    return cfg


@pytest.fixture(scope="session", autouse=True)
def database():
    engine = create_engine(TEST_DB.replace("postgresql://", "postgresql+psycopg://"))
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    engine.dispose()
    command.upgrade(alembic_config(), "head")
    reset_engine_cache()
    yield


@pytest.fixture(autouse=True)
def clean(database):
    get_settings.cache_clear()
    limiter.reset()
    with new_session() as db:
        tables = [r[0] for r in db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))]
        wipe = [t for t in tables if t not in KEEP]
        if wipe:
            db.execute(text("TRUNCATE " + ", ".join(f'"{t}"' for t in wipe) + " RESTART IDENTITY CASCADE"))
        db.commit()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr("app.core.email._send_once", lambda settings, msg: sent.append(msg))
    return sent


@pytest.fixture
def app():
    from app.main import create_app

    return create_app()


def new_client(app) -> TestClient:
    return TestClient(app, base_url=ORIGIN, headers={"Origin": ORIGIN})


@pytest.fixture
def client(app):
    return new_client(app)


def make_user(email: str, roles: list[str], password: str = PASSWORD, **extra) -> uuid.UUID:
    with new_session() as db:
        rs = list(db.scalars(select(Role).where(Role.name.in_(roles))))
        user = User(
            email=email, full_name=email.split("@")[0], password_hash=hash_password(password), roles=rs,
            email_verified_at=datetime.now(UTC), **extra,
        )
        db.add(user)
        db.commit()
        return user.id


def login(client: TestClient, email: str, password: str = PASSWORD, **extra) -> TestClient:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password, **extra})
    assert r.status_code == 200, r.text
    client.headers["X-CSRF-Token"] = client.cookies.get("pf_csrf")
    return client


@pytest.fixture
def admin(app):
    make_user("admin@example.com", ["super_admin"])
    return login(new_client(app), "admin@example.com")


@pytest.fixture
def editor(app):
    make_user("editor@example.com", ["editor"])
    return login(new_client(app), "editor@example.com")


@pytest.fixture
def viewer(app):
    make_user("viewer@example.com", ["viewer"])
    return login(new_client(app), "viewer@example.com")


def reauth(c: TestClient, password: str = PASSWORD) -> None:
    r = c.post("/api/v1/auth/reauth", json={"password": password})
    assert r.status_code == 204, r.text


@pytest.fixture
def seeded():
    from app.seed import seed_content

    with new_session() as db:
        seed_content(db)
