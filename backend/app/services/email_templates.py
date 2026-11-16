"""Plain-text + HTML email templates. Every dynamic value is HTML-escaped."""

from html import escape

from ..core.config import get_settings
from ..core.email import Mail


def _html(title: str, paragraphs: list[str], button: tuple[str, str] | None = None) -> str:
    body = "".join(f"<p style='margin:0 0 14px;line-height:1.55'>{p}</p>" for p in paragraphs)
    if button:
        label, href = button
        body += (
            f"<p style='margin:22px 0'><a href='{escape(href, quote=True)}' "
            "style='background:#0f172a;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none'>"
            f"{escape(label)}</a></p>"
        )
    return (
        "<!doctype html><html><body style='margin:0;background:#f4f5f7;font-family:Segoe UI,Arial,sans-serif;"
        "color:#0f172a'><div style='max-width:560px;margin:24px auto;background:#fff;border-radius:12px;"
        f"padding:28px'><h1 style='font-size:19px;margin:0 0 18px'>{escape(title)}</h1>{body}</div></body></html>"
    )


def lead_notification(lead) -> Mail:
    s = get_settings()
    rows = [
        ("Name", lead.name), ("Email", lead.email), ("Phone", lead.phone or "-"), ("Company", lead.company or "-"),
        ("Service", lead.service_label or "-"), ("Budget", lead.budget or "-"),
        ("Preferred contact", lead.preferred_contact),
    ]
    text = "New enquiry from your portfolio\n" + "-" * 32 + "\n"
    text += "\n".join(f"{k}: {v}" for k, v in rows) + f"\n\nMessage:\n{lead.message}\n"
    text += f"\nManage it in the admin: {s.site_origin}/admin/leads/{lead.id}\n"
    html = _html(
        "New portfolio enquiry",
        [f"<b>{escape(k)}:</b> {escape(str(v))}" for k, v in rows]
        + ["<b>Message:</b><br>" + escape(lead.message).replace("\n", "<br>")],
        ("Open in admin", f"{s.site_origin}/admin/leads/{lead.id}"),
    )
    return Mail(
        to=s.contact_receiver_email,
        subject=f"[Portfolio] New enquiry from {lead.name}"[:150],
        text=text,
        html=html,
        reply_to=lead.email,
        reply_to_name=lead.name,
    )


def lead_acknowledgement(lead, developer_name: str) -> Mail:
    # Deliberately does NOT echo the visitor's message: this address is unverified,
    # so the mail must be useless as a spam relay.
    text = (
        f"Hi {lead.name},\n\nThanks for getting in touch. I have received your enquiry and will reply "
        f"within 1-2 business days.\n\n— {developer_name}\n"
    )
    html = _html(
        "Thanks for your enquiry",
        [
            f"Hi {escape(lead.name)},",
            "Thanks for getting in touch. I have received your enquiry and will reply within 1–2 business days.",
            f"— {escape(developer_name)}",
        ],
    )
    return Mail(to=lead.email, subject="Thanks for your enquiry", text=text, html=html)


def password_reset(email: str, link: str, minutes: int) -> Mail:
    text = (
        f"A password reset was requested for your admin account ({email}).\n\n"
        f"Reset it here (valid for {minutes} minutes, single use):\n{link}\n\n"
        "If you did not request this, ignore this email — your password stays the same."
    )
    html = _html(
        "Reset your admin password",
        [
            f"A password reset was requested for <b>{escape(email)}</b>.",
            f"The link is valid for {minutes} minutes and can be used once.",
            "If you did not request this, ignore this email — your password stays the same.",
        ],
        ("Reset password", link),
    )
    return Mail(to=email, subject="Reset your admin password", text=text, html=html)


def invitation(email: str, link: str, hours: int, inviter: str) -> Mail:
    text = (
        f"{inviter} invited you to manage the portfolio website.\n\n"
        f"Set your password here (valid for {hours} hours):\n{link}\n"
    )
    html = _html(
        "You have been invited",
        [f"{escape(inviter)} invited you to manage the portfolio website.", f"The link is valid for {hours} hours."],
        ("Accept invitation", link),
    )
    return Mail(to=email, subject="Your portfolio admin invitation", text=text, html=html)


def security_notice(email: str, event: str) -> Mail:
    text = (
        f"Security notice for {email}: {event}.\n\n"
        "If this was not you, reset your password immediately and contact the site owner."
    )
    html = _html(
        "Security notice",
        [f"{escape(event)}.", "If this was not you, reset your password immediately and contact the site owner."],
    )
    return Mail(to=email, subject=f"Security notice: {event}"[:150], text=text, html=html)
