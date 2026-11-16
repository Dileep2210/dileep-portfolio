import logging

import httpx
from fastapi import BackgroundTasks, Request
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.email import send_email_quietly
from ..core.errors import AppError
from ..core.ratelimit import client_ip
from ..core.security import hmac_ip
from ..models import ContactLead, Service
from . import email_templates as tpl
from .site import load_settings

logger = logging.getLogger("leads")

TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str, ip: str) -> bool:
    secret = get_settings().turnstile_secret_key
    if not secret:
        return True  # bot challenge not configured: honeypot + timing + rate limits still apply
    if not token:
        return False
    try:
        r = httpx.post(TURNSTILE_URL, data={"secret": secret, "response": token, "remoteip": ip}, timeout=5)
        return bool(r.json().get("success"))
    except (httpx.HTTPError, ValueError):
        logger.warning("turnstile verification unavailable")
        return False


def looks_automated(honeypot: str, elapsed_ms: int | None) -> bool:
    if honeypot:
        return True
    return elapsed_ms is not None and elapsed_ms < get_settings().min_form_fill_ms


def create_lead(db: Session, request: Request, background: BackgroundTasks, data: dict, source: str) -> ContactLead | None:
    """Stores the enquiry first, then emails in the background, so a mail outage never loses a lead."""
    ip = client_ip(request)
    service_id = data.get("service_id")
    label = data.get("service_label", "")
    if service_id:
        service = db.get(Service, service_id)
        if service is None or service.deleted_at is not None or service.status != "published":
            raise AppError("Please choose a service from the list.", code="validation_error", status_code=422)
        label = service.title
    lead = ContactLead(
        name=data["name"],
        email=str(data["email"]).lower(),
        phone=data.get("phone", ""),
        company=data.get("company", ""),
        service_id=service_id,
        service_label=label,
        budget=data.get("budget", ""),
        message=data["message"],
        preferred_contact=data.get("preferred_contact", "email"),
        source=source,
        ip_hash=hmac_ip(ip),
        user_agent=request.headers.get("user-agent", "")[:300],
    )
    db.add(lead)
    db.commit()
    s = get_settings()
    if s.contact_receiver_email:
        background.add_task(send_email_quietly, tpl.lead_notification(lead), "lead_notification")
    if s.send_lead_acknowledgement:
        name = load_settings(db).developer_name
        background.add_task(send_email_quietly, tpl.lead_acknowledgement(lead, name), "lead_acknowledgement")
    logger.info("lead stored id=%s source=%s", lead.id, source)
    return lead
