import logging
import smtplib
import ssl
import time
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr

from .config import Settings, get_settings

logger = logging.getLogger("email")


class EmailNotConfigured(Exception):
    pass


class EmailSendError(Exception):
    pass


@dataclass
class Mail:
    to: str
    subject: str
    text: str
    html: str | None = None
    reply_to: str | None = None
    reply_to_name: str | None = None


def build_message(settings: Settings, mail: Mail) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.mail_from_name, settings.mail_from))
    msg["To"] = mail.to
    if mail.reply_to:
        msg["Reply-To"] = formataddr((mail.reply_to_name or "", mail.reply_to))
    msg["Subject"] = mail.subject
    msg.set_content(mail.text)
    if mail.html:
        msg.add_alternative(mail.html, subtype="html")
    return msg


def _send_once(settings: Settings, msg: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.smtp_port == 465:
        server = smtplib.SMTP_SSL(
            settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds, context=context
        )
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout_seconds)
    with server:
        if settings.smtp_port != 465:
            server.starttls(context=context)
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(msg)


def send_email(mail: Mail, *, attempts: int = 3, backoff: float = 1.0) -> None:
    """Blocking send with retries. Never logs recipients' content or SMTP error text."""
    settings = get_settings()
    if not settings.smtp_configured:
        raise EmailNotConfigured()
    msg = build_message(settings, mail)
    last: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            _send_once(settings, msg)
            return
        except smtplib.SMTPAuthenticationError as exc:  # retrying will not help
            last = exc
            break
        except (smtplib.SMTPException, OSError) as exc:
            last = exc
            if attempt < attempts:
                time.sleep(backoff * attempt)
    logger.error("SMTP send failed after retries: %s", type(last).__name__ if last else "unknown")
    raise EmailSendError() from last


def send_email_quietly(mail: Mail, label: str) -> bool:
    """For background tasks: never raises."""
    try:
        send_email(mail)
        logger.info("email sent kind=%s", label)
        return True
    except EmailNotConfigured:
        logger.warning("email not sent (SMTP not configured) kind=%s", label)
    except EmailSendError:
        logger.error("email failed kind=%s", label)
    return False
