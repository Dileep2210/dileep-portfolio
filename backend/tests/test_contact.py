import logging
import smtplib
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.email_service import build_message
from app.schemas import ContactRequest
from tests.conftest import ORIGIN

SMTP = "app.email_service.smtplib.SMTP"


def mock_smtp(smtp):
    server = smtp.return_value
    server.__enter__.return_value = server  # real SMTP.__enter__ returns self
    server.__exit__.return_value = False
    return server


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_success_sends_email(client, valid):
    with patch(SMTP) as smtp:
        server = mock_smtp(smtp)
        r = client.post("/api/contact", json=valid)
    assert r.status_code == 200 and r.json()["ok"] is True
    server.starttls.assert_called_once()
    server.login.assert_called_once_with("user", "secret-pass")
    sent = server.send_message.call_args[0][0]
    assert sent["To"] == "owner@example.com"
    assert "jane@example.com" in sent["Reply-To"]
    assert "sender@example.com" in sent["From"]
    body = sent.get_content()
    assert "Jane Doe" in body and "Website project" in body and "quote" in body


@pytest.mark.parametrize("field", ["name", "email", "subject", "message"])
def test_empty_or_missing_field(client, valid, field):
    bad = {**valid, field: ""}
    assert client.post("/api/contact", json=bad).status_code == 422
    del bad[field]
    assert client.post("/api/contact", json=bad).status_code == 422


@pytest.mark.parametrize("email", ["nope", "a@b", "a b@example.com", "@example.com", "x@@example.com"])
def test_invalid_email(client, valid, email):
    assert client.post("/api/contact", json={**valid, "email": email}).status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [("name", "x" * 101), ("subject", "x" * 151), ("message", "x" * 5001), ("message", "short")],
)
def test_length_limits(client, valid, field, value):
    assert client.post("/api/contact", json={**valid, field: value}).status_code == 422


def test_header_injection_rejected(client, valid):
    r = client.post("/api/contact", json={**valid, "subject": "Hi\r\nBcc: evil@x.com"})
    assert r.status_code == 422
    r = client.post("/api/contact", json={**valid, "name": "Bob\nBcc: evil@x.com"})
    assert r.status_code == 422


def test_extra_fields_rejected(client, valid):
    assert client.post("/api/contact", json={**valid, "admin": True}).status_code == 422


def test_validation_response_does_not_echo_input(client, valid):
    r = client.post("/api/contact", json={**valid, "email": "secret-value-xyz"})
    assert "secret-value-xyz" not in r.text


def test_honeypot_silently_succeeds_without_sending(client, valid):
    with patch(SMTP) as smtp:
        r = client.post("/api/contact", json={**valid, "website": "http://spam"})
    assert r.status_code == 200
    smtp.assert_not_called()


def test_smtp_failure_returns_502_without_leaking(client, valid):
    with patch(SMTP, side_effect=smtplib.SMTPAuthenticationError(535, b"bad creds secret-pass")):
        r = client.post("/api/contact", json=valid)
    assert r.status_code == 502
    assert "secret-pass" not in r.text and "535" not in r.text


def test_smtp_timeout_returns_502(client, valid):
    with patch(SMTP, side_effect=TimeoutError("timed out")):
        assert client.post("/api/contact", json=valid).status_code == 502


def test_unconfigured_returns_503(client, valid, monkeypatch):
    monkeypatch.setenv("SMTP_PASSWORD", "")
    get_settings.cache_clear()
    with patch(SMTP) as smtp:
        r = client.post("/api/contact", json=valid)
    assert r.status_code == 503
    smtp.assert_not_called()


def test_rate_limit(client, valid, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_CONTACT", "2/minute")
    get_settings.cache_clear()
    from app.rate_limit import limiter

    limiter.reset()
    with patch(SMTP) as smtp:
        mock_smtp(smtp)
        codes = [client.post("/api/contact", json=valid).status_code for _ in range(4)]
    assert codes == [200, 200, 429, 429]


def test_rate_limit_is_per_client(client, valid, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_CONTACT", "1/minute")
    get_settings.cache_clear()
    from app.rate_limit import limiter

    limiter.reset()
    with patch(SMTP) as smtp:
        mock_smtp(smtp)
        a = client.post("/api/contact", json=valid, headers={"X-Forwarded-For": "1.1.1.1"})
        b = client.post("/api/contact", json=valid, headers={"X-Forwarded-For": "2.2.2.2"})
        c = client.post("/api/contact", json=valid, headers={"X-Forwarded-For": "1.1.1.1"})
    assert (a.status_code, b.status_code, c.status_code) == (200, 200, 429)


def test_cors_allows_only_configured_origin(client):
    ok = client.options(
        "/api/contact",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert ok.headers.get("access-control-allow-origin") == ORIGIN
    bad = client.options(
        "/api/contact",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in bad.headers


def test_wildcard_origin_refused(monkeypatch):
    monkeypatch.setenv("FRONTEND_ORIGIN", "*")
    get_settings.cache_clear()
    with pytest.raises(Exception):
        get_settings()


def test_oversized_body_rejected(client):
    r = client.post("/api/contact", content=b"x" * 20000, headers={"Content-Type": "application/json"})
    assert r.status_code == 413


def test_docs_hidden_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    from app.main import create_app

    assert TestClient(create_app()).get("/docs").status_code == 404


def test_logs_do_not_contain_message_or_email(client, valid, caplog):
    caplog.set_level(logging.DEBUG)
    with patch(SMTP) as smtp:
        mock_smtp(smtp)
        client.post("/api/contact", json=valid)
    with patch(SMTP, side_effect=smtplib.SMTPException("boom jane@example.com")):
        client.post("/api/contact", json=valid)
    text = caplog.text
    assert "jane@example.com" not in text
    assert "quote for a website" not in text
    assert "secret-pass" not in text


def test_build_message_headers():
    data = ContactRequest(name="A B", email="a@b.co", subject="Sub", message="long enough message")
    msg = build_message(get_settings(), data)
    assert msg["Subject"] == "[Portfolio] Sub"
