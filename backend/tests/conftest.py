import pytest
from fastapi.testclient import TestClient

from app.config import get_settings

ORIGIN = "https://portfolio.example"


@pytest.fixture(autouse=True)
def env(monkeypatch):
    for k, v in {
        "APP_ENV": "development",
        "SMTP_HOST": "smtp.test",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "user",
        "SMTP_PASSWORD": "secret-pass",
        "MAIL_FROM": "sender@example.com",
        "CONTACT_RECEIVER_EMAIL": "owner@example.com",
        "FRONTEND_ORIGIN": ORIGIN,
        "RATE_LIMIT_CONTACT": "1000/minute",
        "TRUST_PROXY": "true",
    }.items():
        monkeypatch.setenv(k, v)
    get_settings.cache_clear()
    from app.rate_limit import limiter

    limiter.reset()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client():
    from app.main import create_app

    return TestClient(create_app())


@pytest.fixture
def valid():
    return {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "subject": "Website project",
        "message": "Hello, I would like a quote for a website.",
    }
