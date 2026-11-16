import csv
import io

import pytest
from sqlalchemy import select

from app.core.database import new_session
from app.models import ContactLead
from tests.conftest import reauth

P = "/api/v1/public"
A = "/api/v1/admin"

VALID = {
    "name": "Jane Doe", "email": "Jane@Example.com", "phone": "+91 98765 43210", "company": "Acme",
    "budget": "Not sure yet", "message": "Hello, I would like a quote for a website.", "preferred_contact": "email",
    "elapsed_ms": 9000,
}


def _leads():
    with new_session() as db:
        return list(db.scalars(select(ContactLead)))


def test_contact_stores_lead_and_sends_emails(client, outbox):
    r = client.post(f"{P}/contact", json=VALID)
    assert r.status_code == 201 and r.json()["ok"] is True
    leads = _leads()
    assert len(leads) == 1 and leads[0].email == "jane@example.com" and leads[0].status == "new"
    assert leads[0].ip_hash and "testclient" not in leads[0].ip_hash  # IP is stored only as an HMAC
    to = sorted(m["To"] for m in outbox)
    assert to == ["jane@example.com", "owner@example.com"]
    note = next(m for m in outbox if m["To"] == "owner@example.com")
    assert "jane@example.com" in note["Reply-To"] and "quote for a website" in note.get_body(("plain",)).get_content()
    ack = next(m for m in outbox if m["To"] == "jane@example.com")
    assert "quote for a website" not in ack.get_body(("plain",)).get_content()  # never echoes the visitor's text


def test_lead_is_kept_when_email_fails(client, monkeypatch):
    import smtplib

    def boom(settings, msg):
        raise smtplib.SMTPServerDisconnected("down")

    monkeypatch.setattr("app.core.email._send_once", boom)
    monkeypatch.setattr("app.core.email.time.sleep", lambda s: None)
    assert client.post(f"{P}/contact", json=VALID).status_code == 201
    assert len(_leads()) == 1


def test_contact_with_service_reference(client, admin):
    svc = admin.post(f"{A}/services", json={"title": "AI Chatbot Development", "status": "published"}).json()
    assert client.post(f"{P}/contact", json={**VALID, "service_id": svc["id"]}).status_code == 201
    assert _leads()[0].service_label == "AI Chatbot Development"
    draft = admin.post(f"{A}/services", json={"title": "Hidden service"}).json()
    assert client.post(f"{P}/contact", json={**VALID, "service_id": draft["id"]}).status_code == 422


@pytest.mark.parametrize("extra", [{"website": "http://spam.example"}, {"elapsed_ms": 300}])
def test_bots_get_fake_success_and_nothing_is_stored(client, outbox, extra):
    r = client.post(f"{P}/contact", json={**VALID, **extra})
    assert r.status_code == 201 and _leads() == [] and outbox == []


@pytest.mark.parametrize("field,value", [
    ("name", ""), ("name", "x" * 101), ("email", "nope"), ("email", "a@b"), ("email", "x@@example.com"),
    ("message", "short"), ("message", "x" * 5001), ("phone", "call me maybe"), ("preferred_contact", "pigeon"),
    ("name", "Evil\r\nBcc: victim@example.com"), ("company", "x\ny"),
])
def test_contact_validation(client, field, value):
    r = client.post(f"{P}/contact", json={**VALID, field: value})
    assert r.status_code == 422
    assert value not in r.text or value == ""  # submitted values are not echoed back


def test_contact_rejects_unknown_fields_and_large_bodies(client):
    assert client.post(f"{P}/contact", json={**VALID, "is_admin": True}).status_code == 422
    big = {**VALID, "message": "x" * (1024 * 1024 + 10)}
    assert client.post(f"{P}/contact", json=big).status_code == 413


def test_contact_rate_limited_per_client_ip(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_CONTACT", "2/minute")
    from app.core.config import get_settings

    get_settings.cache_clear()
    hdr = {"X-Forwarded-For": "1.1.1.1, 9.9.9.9"}
    codes = [client.post(f"{P}/contact", json=VALID, headers=hdr).status_code for _ in range(3)]
    assert codes == [201, 201, 429]
    # a different real client IP (last hop) has its own budget; a spoofed first hop does not help
    assert client.post(f"{P}/contact", json=VALID, headers={"X-Forwarded-For": "1.1.1.1, 8.8.8.8"}).status_code == 201
    assert client.post(f"{P}/contact", json=VALID, headers={"X-Forwarded-For": "7.7.7.7, 9.9.9.9"}).status_code == 429


def test_legacy_contact_endpoint_still_works(client, outbox):
    legacy = {"name": "Jane Doe", "email": "jane@example.com", "subject": "Website project", "message": "Hello, I would like a quote."}
    r = client.post("/api/contact", json=legacy, headers={"Origin": "https://legacy.example"})
    assert r.status_code == 200 and r.json() == {"ok": True, "message": "Message sent"}
    assert r.headers["access-control-allow-origin"] == "https://legacy.example"
    assert "Subject: Website project" in _leads()[0].message
    bad = client.post("/api/contact", json={**legacy, "email": "nope"})
    assert bad.status_code == 422 and bad.json()["ok"] is False and "detail" in bad.json()
    assert client.post("/api/contact", json={**legacy, "website": "x"}).json()["ok"] is True
    assert len(_leads()) == 1


def test_cors_rejects_unknown_origin(client):
    r = client.options("/api/contact", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


def test_lead_management(admin, client):
    client.post(f"{P}/contact", json=VALID)
    client.post(f"{P}/contact", json={**VALID, "name": "Bob Builder", "email": "bob@example.com"})
    page = admin.get(f"{A}/leads").json()
    assert page["total"] == 2
    lead_id = next(x["id"] for x in page["items"] if x["name"] == "Jane Doe")
    r = admin.patch(f"{A}/leads/{lead_id}", json={"status": "in_discussion", "follow_up_at": "2030-01-15"})
    assert r.status_code == 200 and r.json()["status"] == "in_discussion"
    assert admin.patch(f"{A}/leads/{lead_id}", json={"status": "spam"}).status_code == 422
    note = admin.post(f"{A}/leads/{lead_id}/notes", json={"body": "Called, wants e-commerce."}).json()
    detail = admin.get(f"{A}/leads/{lead_id}").json()
    assert detail["notes"][0]["body"] == "Called, wants e-commerce." and detail["notes"][0]["author_email"] == "admin@example.com"
    assert admin.get(f"{A}/leads", params={"status": "in_discussion"}).json()["total"] == 1
    assert admin.get(f"{A}/leads", params={"q": "bob"}).json()["total"] == 1
    assert admin.get(f"{A}/leads", params={"follow_up_before": "2030-02-01"}).json()["total"] == 1
    assert admin.delete(f"{A}/leads/{lead_id}/notes/{note['id']}").status_code == 204
    assert admin.delete(f"{A}/leads/{lead_id}").status_code == 204
    assert admin.get(f"{A}/leads").json()["total"] == 1


def test_lead_export_requires_reauth_and_neutralises_formulas(admin, client):
    client.post(f"{P}/contact", json={**VALID, "name": "=HYPERLINK(\"http://x\")", "company": "+cmd"})
    r = admin.get(f"{A}/leads/export.csv")
    assert r.status_code == 403 and r.json()["error"]["code"] == "reauth_required"
    reauth(admin)
    r = admin.get(f"{A}/leads/export.csv")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    rows = list(csv.reader(io.StringIO(r.text)))
    assert rows[0][1] == "name" and rows[1][1].startswith("'=") and rows[1][4].startswith("'+")
    logs = admin.get(f"{A}/audit-logs", params={"action": "leads.export"}).json()["items"]
    assert logs and logs[0]["details"]["rows"] == 1


def test_public_api_never_exposes_leads(client):
    client.post(f"{P}/contact", json=VALID)
    for path in ["/api/v1/public/leads", "/api/v1/public/contact"]:
        r = client.get(path)
        assert r.status_code in (404, 405) and "jane" not in r.text.lower()
