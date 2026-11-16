from datetime import UTC, datetime, timedelta

import jwt
import pyotp
from sqlalchemy import select

from app.core.database import new_session
from app.core.security import ACCESS_COOKIE, AUDIENCE, ISSUER
from app.models import AuthSession, RefreshToken, User
from tests.conftest import ORIGIN, PASSWORD, login, make_user, new_client, reauth


def test_login_sets_httponly_cookies_and_me(client):
    make_user("a@example.com", ["editor"])
    r = client.post("/api/v1/auth/login", json={"email": "A@Example.com", "password": PASSWORD})
    assert r.status_code == 200
    assert r.json()["roles"] == ["editor"]
    cookies = r.headers.get_list("set-cookie")
    access = next(c for c in cookies if c.startswith("pf_access="))
    refresh = next(c for c in cookies if c.startswith("pf_refresh="))
    csrf = next(c for c in cookies if c.startswith("pf_csrf="))
    assert "HttpOnly" in access and "HttpOnly" in refresh and "HttpOnly" not in csrf
    assert "samesite=lax" in access.lower() and "Path=/api/v1/auth" in refresh
    assert "access_token" not in r.text  # tokens never in the body
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "a@example.com"
    assert "projects:write" in me.json()["permissions"]


def test_invalid_credentials_are_generic(client):
    make_user("a@example.com", ["editor"])
    wrong = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "nope-nope-nope"})
    unknown = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "nope-nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_lockout_after_repeated_failures(client):
    make_user("a@example.com", ["editor"])
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "wrong-password-1"})
    r = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
    assert r.status_code == 401  # locked even with the right password
    with new_session() as db:
        u = db.scalar(select(User).where(User.email == "a@example.com"))
        assert u.locked_until is not None
        u.locked_until = datetime.now(UTC) - timedelta(seconds=1)
        db.commit()
    assert client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}).status_code == 200


def test_login_rate_limited(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_LOGIN", "3/minute")
    from app.core.config import get_settings

    get_settings.cache_clear()
    codes = [client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": "whatever-123"}).status_code for _ in range(5)]
    assert codes[:3] == [401, 401, 401] and codes[3:] == [429, 429]


def test_inactive_user_cannot_login(client):
    make_user("a@example.com", ["editor"], is_active=False)
    assert client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}).status_code == 401


def test_no_public_registration(client):
    assert client.post("/api/v1/auth/register", json={"email": "x@example.com", "password": PASSWORD}).status_code in (404, 405)
    assert client.post("/api/v1/admin/users", json={"email": "x@example.com"}).status_code in (401, 403, 404, 405)


def test_refresh_rotates_and_detects_reuse(admin):
    old = admin.cookies.get("pf_refresh")
    r = admin.post("/api/v1/auth/refresh")
    assert r.status_code == 204
    new = admin.cookies.get("pf_refresh")
    assert new and new != old
    # Simulate an attacker replaying the old token later (outside the multi-tab grace window).
    with new_session() as db:
        for row in db.scalars(select(RefreshToken).where(RefreshToken.used_at.is_not(None))):
            row.used_at = datetime.now(UTC) - timedelta(minutes=5)
        db.commit()
    attacker = new_client(admin.app)
    attacker.cookies.set("pf_refresh", old, path="/api/v1/auth")
    attacker.headers["X-CSRF-Token"] = "x"
    attacker.cookies.set("pf_csrf", "x")
    assert attacker.post("/api/v1/auth/refresh").status_code == 401
    # the whole session is now revoked, so the legitimate client is signed out too
    with new_session() as db:
        assert db.scalar(select(AuthSession.revoked_reason)) == "refresh_reuse"


def test_logout_revokes_session_server_side(admin):
    token = admin.cookies.get("pf_access")
    assert admin.post("/api/v1/auth/logout").status_code == 204
    replay = new_client(admin.app)
    replay.cookies.set(ACCESS_COOKIE, token)
    r = replay.get("/api/v1/auth/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_revoked"


def test_expired_access_token(admin):
    with new_session() as db:
        sess = db.scalar(select(AuthSession))
        user = db.get(User, sess.user_id)
        past = datetime.now(UTC) - timedelta(hours=1)
        token = jwt.encode(
            {"sub": str(user.id), "sid": str(sess.id), "ver": 0, "type": "access", "iss": ISSUER, "aud": AUDIENCE,
             "iat": past, "exp": past + timedelta(minutes=15)},
            "test-secret-key-that-is-long-enough-0123456789", algorithm="HS256",
        )
    stale = new_client(admin.app)
    stale.cookies.set(ACCESS_COOKIE, token)
    r = stale.get("/api/v1/auth/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "token_expired"
    # the real client can still refresh (what the frontend does on token_expired)
    assert admin.post("/api/v1/auth/refresh").status_code == 204
    assert admin.get("/api/v1/auth/me").status_code == 200


def test_forged_token_rejected(client):
    make_user("a@example.com", ["super_admin"])
    forged = jwt.encode({"sub": "x", "sid": "y", "type": "access", "iss": ISSUER, "aud": AUDIENCE,
                         "iat": datetime.now(UTC), "exp": datetime.now(UTC) + timedelta(minutes=5)}, "wrong-key" * 5, algorithm="HS256")
    client.cookies.set(ACCESS_COOKIE, forged)
    assert client.get("/api/v1/auth/me").status_code == 401
    none_alg = jwt.encode({"sub": "x"}, None, algorithm="none")
    client.cookies.set(ACCESS_COOKIE, none_alg)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_csrf_and_origin_enforced(admin):
    body = {"title": "CSRF test", "status": "draft"}
    token = admin.headers.pop("X-CSRF-Token")
    r = admin.post("/api/v1/admin/projects", json=body)
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf_failed"
    r = admin.post("/api/v1/admin/projects", json=body, headers={"X-CSRF-Token": token, "Origin": "https://evil.example"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "origin_rejected"
    r = admin.post("/api/v1/admin/projects", json=body, headers={"X-CSRF-Token": token})
    assert r.status_code == 201


def test_login_from_foreign_origin_rejected(client):
    make_user("a@example.com", ["editor"])
    r = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403


def test_password_reset_flow(client, outbox):
    make_user("a@example.com", ["editor"])
    other = login(new_client(client.app), "a@example.com")
    r = client.post("/api/v1/auth/password-reset/request", json={"email": "ghost@example.com"})
    assert r.status_code == 202 and not outbox
    r2 = client.post("/api/v1/auth/password-reset/request", json={"email": "a@example.com"})
    assert r2.status_code == 202 and r2.json() == r.json()  # no enumeration
    assert len(outbox) == 1
    body = outbox[0].get_body(("plain",)).get_content()
    token = body.split("token=")[1].split()[0]
    assert client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "new_password": "short"}).status_code == 422
    new_pw = "A-Brand-New-Passphrase-42"
    assert client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "new_password": new_pw}).status_code == 204
    # the weak attempt did not consume the token (rolled back), so the second one succeeded
    assert client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": new_pw}).status_code == 200
    assert client.post("/api/v1/auth/password-reset/confirm", json={"token": token, "new_password": new_pw + "x"}).status_code == 400
    assert other.get("/api/v1/auth/me").status_code == 401  # old sessions revoked
    assert any("password was reset" in m["Subject"].lower() or "security" in m["Subject"].lower() for m in outbox)


def test_unverified_email_gets_no_reset(client, outbox):
    make_user("a@example.com", ["editor"])
    with new_session() as db:
        db.scalar(select(User)).email_verified_at = None
        db.commit()
    client.post("/api/v1/auth/password-reset/request", json={"email": "a@example.com"})
    assert outbox == []


def test_change_password_requires_current(admin):
    r = admin.post("/api/v1/auth/change-password", json={"current_password": "wrong", "new_password": "Another-Strong-Pass-77"})
    assert r.status_code == 403
    r = admin.post("/api/v1/auth/change-password", json={"current_password": PASSWORD, "new_password": "Another-Strong-Pass-77"})
    assert r.status_code == 204
    assert admin.get("/api/v1/auth/me").status_code == 200  # current session kept


def test_mfa_enrol_and_login(admin, client):
    assert admin.post("/api/v1/auth/mfa/setup").status_code == 403  # needs re-auth
    reauth(admin)
    setup = admin.post("/api/v1/auth/mfa/setup").json()
    totp = pyotp.TOTP(setup["secret"])
    assert admin.post("/api/v1/auth/mfa/enable", json={"code": "000000"}).status_code == 422
    assert admin.post("/api/v1/auth/mfa/enable", json={"code": totp.now()}).json()["mfa_enabled"] is True
    r = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": PASSWORD})
    assert r.status_code == 401 and r.json()["error"]["code"] == "mfa_required"
    r = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": PASSWORD, "totp_code": "123456"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "mfa_invalid"
    # the code already used for enrolment cannot be replayed; the next window's code works
    with new_session() as db:
        u = db.scalar(select(User).where(User.email == "admin@example.com"))
        u.mfa_last_counter -= 1
        db.commit()
    r = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": PASSWORD, "totp_code": totp.now()})
    assert r.status_code == 200


def test_sessions_list_and_idor(admin, editor):
    sessions = admin.get("/api/v1/auth/sessions").json()
    assert len(sessions) == 1 and sessions[0]["current"] is True
    editor_session = editor.get("/api/v1/auth/sessions").json()[0]["id"]
    assert admin.delete(f"/api/v1/auth/sessions/{editor_session}").status_code == 404
    assert editor.get("/api/v1/auth/me").status_code == 200


def test_logout_all(admin):
    second = login(new_client(admin.app), "admin@example.com")
    assert admin.post("/api/v1/auth/logout-all").status_code == 204
    assert second.get("/api/v1/auth/me").status_code == 401


def test_deactivated_user_loses_access(admin, editor):
    reauth(admin)
    uid = editor.get("/api/v1/auth/me").json()["id"]
    assert admin.patch(f"/api/v1/admin/users/{uid}", json={"is_active": False}).status_code == 200
    assert editor.get("/api/v1/auth/me").status_code == 401


def test_origin_constant():
    assert ORIGIN == "http://testserver"
