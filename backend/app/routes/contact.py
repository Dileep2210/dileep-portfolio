import logging
import uuid

from fastapi import APIRouter, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from ..config import get_settings
from ..email_service import EmailNotConfigured, EmailSendError, send_contact_email
from ..rate_limit import contact_limit, limiter
from ..schemas import ContactRequest, ContactResponse

router = APIRouter()
logger = logging.getLogger("contact")


@router.post("/api/contact", response_model=ContactResponse)
@limiter.limit(contact_limit)
async def submit_contact(request: Request, payload: ContactRequest):
    ref = uuid.uuid4().hex[:8]

    if payload.website:
        # Bot filled the honeypot: pretend success, send nothing.
        logger.info("honeypot triggered ref=%s", ref)
        return ContactResponse()

    settings = get_settings()
    try:
        await run_in_threadpool(send_contact_email, settings, payload)
    except EmailNotConfigured:
        logger.error("contact email not configured ref=%s", ref)
        return JSONResponse(
            status_code=503,
            content={"ok": False, "error": "Contact service is temporarily unavailable."},
        )
    except EmailSendError:
        logger.error("contact email failed ref=%s", ref)
        return JSONResponse(
            status_code=502,
            content={
                "ok": False,
                "error": "Could not send your message right now. Please try again later.",
            },
        )

    logger.info("contact email sent ref=%s", ref)
    return ContactResponse()
