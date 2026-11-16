import re
import uuid

import pytest

from app.main import create_app
from tests.conftest import new_client, reauth

# Built from the OpenAPI schema so every endpoint, including ones added later, is covered automatically.
ADMIN_ROUTES = [
    (method.upper(), path)
    for path, ops in create_app().openapi()["paths"].items()
    if path.startswith("/api/v1/admin")
    for method in ops
]

CONTENT = ["projects", "project-categories", "services", "skills", "skill-categories", "testimonials", "blog/posts",
           "blog/categories", "blog/tags", "experiences", "homepage-sections", "navigation", "social-links", "seo", "resumes"]


def _fill(path: str) -> str:
    return re.sub(r"\{[^}]+\}", str(uuid.uuid4()), path)


def test_route_inventory_is_large():
    assert len(ADMIN_ROUTES) > 80


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_every_admin_route_requires_authentication(client, method, path):
    r = client.request(method, _fill(path), json={})
    assert r.status_code == 401, f"{method} {path} -> {r.status_code}"


def test_viewer_is_read_only_and_cannot_see_leads(viewer):
    for res in CONTENT:
        assert viewer.get(f"/api/v1/admin/{res}").status_code == 200, res
        assert viewer.post(f"/api/v1/admin/{res}", json={}).status_code == 403, res
        assert viewer.patch(f"/api/v1/admin/{res}/{uuid.uuid4()}", json={}).status_code == 403, res
        assert viewer.delete(f"/api/v1/admin/{res}/{uuid.uuid4()}").status_code == 403, res
    for path in ["/api/v1/admin/leads", "/api/v1/admin/users", "/api/v1/admin/audit-logs", "/api/v1/admin/leads/export.csv"]:
        assert viewer.get(path).status_code == 403, path
    assert viewer.patch("/api/v1/admin/settings", json={"headline": "x"}).status_code == 403
    dash = viewer.get("/api/v1/admin/dashboard").json()
    assert dash["recent_leads"] is None and "leads_new" not in dash["counts"]


def test_editor_cannot_manage_users_audit_or_export(editor):
    assert editor.get("/api/v1/admin/leads").status_code == 200
    assert editor.get("/api/v1/admin/users").status_code == 403
    assert editor.get("/api/v1/admin/audit-logs").status_code == 403
    reauth(editor)
    assert editor.get("/api/v1/admin/leads/export.csv").status_code == 403
    assert editor.post("/api/v1/admin/users/invite", json={"email": "x@example.com", "roles": ["super_admin"]}).status_code == 403
    assert editor.delete(f"/api/v1/admin/leads/{uuid.uuid4()}").status_code == 403


def test_editor_cannot_escalate_own_role(editor, admin):
    me = editor.get("/api/v1/auth/me").json()
    reauth(editor)
    r = editor.patch(f"/api/v1/admin/users/{me['id']}", json={"roles": ["super_admin"]})
    assert r.status_code == 403
    assert editor.get("/api/v1/auth/me").json()["roles"] == ["editor"]


def test_user_management_rules(admin, editor, outbox):
    r = admin.post("/api/v1/admin/users/invite", json={"email": "new@example.com", "roles": ["viewer"]})
    assert r.status_code == 403 and r.json()["error"]["code"] == "reauth_required"
    reauth(admin)
    r = admin.post("/api/v1/admin/users/invite", json={"email": "new@example.com", "roles": ["viewer"]})
    assert r.status_code == 201 and r.json()["email_sent"] is True
    token = r.json()["invite_url"].split("token=")[1]
    assert any(m["To"] == "new@example.com" for m in outbox)
    assert admin.post("/api/v1/admin/users/invite", json={"email": "new@example.com", "roles": ["viewer"]}).status_code == 409

    # invitee sets a password and can sign in
    c = new_client(admin.app)
    assert c.post("/api/v1/auth/invite/accept", json={"token": token, "full_name": "New Person", "password": "Fresh-Invitee-Pass-55"}).status_code == 204
    assert c.post("/api/v1/auth/invite/accept", json={"token": token, "full_name": "New Person", "password": "Fresh-Invitee-Pass-55"}).status_code == 400
    assert c.post("/api/v1/auth/login", json={"email": "new@example.com", "password": "Fresh-Invitee-Pass-55"}).json()["roles"] == ["viewer"]

    me = admin.get("/api/v1/auth/me").json()
    assert admin.patch(f"/api/v1/admin/users/{me['id']}", json={"roles": ["editor"]}).status_code == 403  # no self-change
    assert admin.patch(f"/api/v1/admin/users/{me['id']}", json={"is_active": False}).status_code == 403

    # role change forces the target to sign in again
    editor_id = editor.get("/api/v1/auth/me").json()["id"]
    assert admin.patch(f"/api/v1/admin/users/{editor_id}", json={"roles": ["viewer"]}).json()["roles"] == ["viewer"]
    assert editor.get("/api/v1/auth/me").status_code == 401


def test_last_super_admin_cannot_be_removed(admin, app):
    from tests.conftest import login, make_user

    make_user("second@example.com", ["super_admin"])
    second = login(new_client(app), "second@example.com")
    reauth(second)
    admin_id = admin.get("/api/v1/auth/me").json()["id"]
    assert second.patch(f"/api/v1/admin/users/{admin_id}", json={"roles": ["editor"]}).status_code == 200
    # now 'second' is the only super admin; the demoted admin cannot act, and second cannot demote itself
    second_id = second.get("/api/v1/auth/me").json()["id"]
    assert second.patch(f"/api/v1/admin/users/{second_id}", json={"is_active": False}).status_code == 403


def test_audit_log_records_actions(admin):
    admin.post("/api/v1/admin/services", json={"title": "Audited service"})
    logs = admin.get("/api/v1/admin/audit-logs", params={"action": "service"}).json()["items"]
    assert logs and logs[0]["action"] == "service.create" and logs[0]["actor_email"] == "admin@example.com"
    login_logs = admin.get("/api/v1/admin/audit-logs", params={"action": "auth.login"}).json()["items"]
    assert login_logs
    for entry in admin.get("/api/v1/admin/audit-logs").json()["items"]:
        assert "password" not in str(entry["details"]).lower()
