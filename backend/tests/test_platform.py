import pytest
from alembic import command

from tests.conftest import alembic_config


def test_health_and_ready(client):
    assert client.get("/health").json() == {"status": "ok"}
    r = client.get("/ready")
    assert r.status_code == 200 and r.json()["schema"] == "0001"


def test_models_match_migrations():
    command.check(alembic_config())  # raises if models and migrations drift


def test_security_headers_and_request_id(client):
    r = client.get("/api/v1/public/services", headers={"X-Request-ID": "abc123"})
    h = r.headers
    assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
    assert h["x-request-id"] == "abc123" and "frame-ancestors 'none'" in h["content-security-policy"]
    assert client.get("/api/v1/public/services", headers={"X-Request-ID": "<script>"}).headers["x-request-id"] != "<script>"
    assert client.get("/api/v1/auth/me").headers["cache-control"] == "no-store"


def test_error_envelope_has_no_internals(client):
    r = client.get("/api/v1/public/projects/does-not-exist")
    body = r.json()
    assert r.status_code == 404 and body["error"]["code"] == "not_found" and body["request_id"]
    assert "Traceback" not in r.text and "sqlalchemy" not in r.text.lower()


def test_docs_disabled_in_production(monkeypatch):
    for k, v in {"APP_ENV": "production", "SECRET_KEY": "p" * 20 + "Q7x!9zLm3Kd8Vr2Ws5Tn", "PUBLIC_SITE_ORIGIN": "https://site.example",
                 "COOKIE_SECURE": "true", "STORAGE_BACKEND": "cloudinary", "CLOUDINARY_URL": "cloudinary://k:s@demo",
                 "FRONTEND_ORIGIN": ""}.items():
        monkeypatch.setenv(k, v)
    from app.core.config import get_settings

    get_settings.cache_clear()
    from fastapi.testclient import TestClient

    from app.main import create_app

    c = TestClient(create_app())
    assert c.get("/docs").status_code == 404 and c.get("/openapi.json").status_code == 404
    assert "strict-transport-security" in c.get("/health").headers


@pytest.mark.parametrize("override,needle", [
    ({"SECRET_KEY": "short"}, "SECRET_KEY"),
    ({"SECRET_KEY": "change-me-change-me-change-me-change-me"}, "SECRET_KEY"),
    ({"PUBLIC_SITE_ORIGIN": "http://site.example"}, "PUBLIC_SITE_ORIGIN"),
    ({"COOKIE_SECURE": "false"}, "COOKIE_SECURE"),
    ({"STORAGE_BACKEND": "local"}, "STORAGE_BACKEND"),
    ({"FRONTEND_ORIGIN": "*"}, "FRONTEND_ORIGIN"),
])
def test_production_guard_refuses_unsafe_config(monkeypatch, override, needle):
    base = {"APP_ENV": "production", "SECRET_KEY": "Zk3" * 12, "PUBLIC_SITE_ORIGIN": "https://site.example",
            "COOKIE_SECURE": "true", "STORAGE_BACKEND": "cloudinary", "FRONTEND_ORIGIN": ""}
    for k, v in {**base, **override}.items():
        monkeypatch.setenv(k, v)
    from app.core.config import Settings

    with pytest.raises(ValueError, match=needle):
        Settings()


def test_sitemap_lists_only_published(admin, client):
    admin.post("/api/v1/admin/projects", json={"title": "Live one", "status": "published"})
    admin.post("/api/v1/admin/projects", json={"title": "Secret draft"})
    admin.post("/api/v1/admin/blog/posts", json={"title": "Public post", "status": "published"})
    xml = client.get("/sitemap.xml").text
    assert "/projects/live-one" in xml and "secret-draft" not in xml and "/blog/public-post" in xml
    assert xml.startswith("<?xml") and "http://testserver/about" in xml


def test_cli_create_admin_rules(monkeypatch, capsys):
    from app import cli

    monkeypatch.setenv("ADMIN_PASSWORD", "weak")
    with pytest.raises(SystemExit, match="Password rejected"):
        cli.main(["create-admin", "--email", "owner@example.com"])
    monkeypatch.setenv("ADMIN_PASSWORD", "Teal-Lantern-Harbor-2031")
    cli.main(["create-admin", "--email", "Owner@Example.com", "--name", "Owner"])
    assert "created" in capsys.readouterr().out
    with pytest.raises(SystemExit, match="already exists"):
        cli.main(["create-admin", "--email", "second@example.com"])
    with pytest.raises(SystemExit, match="valid email"):
        cli.main(["create-admin", "--email", "not-an-email", "--force-additional"])


def test_cli_seed_is_idempotent(capsys):
    from app import cli

    cli.main(["seed"])
    first = capsys.readouterr().out
    cli.main(["seed"])
    assert "projects=12" in first and "nothing new" in capsys.readouterr().out
