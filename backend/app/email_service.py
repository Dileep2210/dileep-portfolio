import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from .config import Settings
from .schemas import ContactRequest

logger = logging.getLogger("contact")


class EmailNotConfigured(Exception):
    pass


class EmailSendError(Exception):
    pass


def build_message(settings: Settings, data: ContactRequest) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.mail_from_name, settings.mail_from))
    msg["To"] = settings.contact_receiver_email
    # Replies go straight to the visitor (address already validated by Pydantic).
    msg["Reply-To"] = formataddr((data.name, str(data.email)))
    msg["Subject"] = f"[Portfolio] {data.subject}"
    msg.set_content(
        "New enquiry from your portfolio contact form\n"
        "---------------------------------------------\n"
        f"Name:    {data.name}\n"
        f"Email:   {data.email}\n"
        f"Subject: {data.subject}\n"
        "\nMessage:\n"
        f"{data.message}\n"
    )
    return msg


def send_contact_email(settings: Settings, data: ContactRequest) -> None:
    """Blocking SMTP send (call from a worker thread). Never logs message content."""
    if not settings.smtp_configured:
        raise EmailNotConfigured()

    msg = build_message(settings, data)
    try:
        context = ssl.create_default_context()
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
                context=context,
            )
        else:
            server = smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )
        with server:
            if settings.smtp_port != 465:
                server.starttls(context=context)
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except (smtplib.SMTPException, OSError) as exc:
        # Log only the exception class: messages can echo credentials/recipients.
        logger.error("SMTP send failed: %s", type(exc).__name__)
        raise EmailSendError() from exc
