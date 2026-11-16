import re
import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import EmailStr, Field, field_validator

from .common import Input, Line, Output, Text

PHONE_RE = re.compile(r"^\+?[0-9 ()\-.]{6,25}$")
LEAD_STATUSES = ("new", "contacted", "in_discussion", "converted", "closed")


class ContactIn(Input):
    name: Annotated[Line, Field(min_length=2, max_length=100)]
    email: Annotated[EmailStr, Field(max_length=254)]
    phone: Annotated[Line, Field(max_length=30)] = ""
    company: Annotated[Line, Field(max_length=120)] = ""
    service_id: uuid.UUID | None = None
    service_label: Annotated[Line, Field(max_length=120)] = ""
    budget: Annotated[Line, Field(max_length=60)] = ""
    message: Annotated[Text, Field(min_length=10, max_length=5000)]
    preferred_contact: Annotated[str, Field(pattern=r"^(email|phone|whatsapp)$")] = "email"
    website: Annotated[str, Field(max_length=500)] = ""  # honeypot
    elapsed_ms: Annotated[int, Field(ge=0, le=86_400_000)] | None = None
    turnstile_token: Annotated[str, Field(max_length=2048)] = ""

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if v and not PHONE_RE.match(v):
            raise ValueError("enter a valid phone number")
        return v


class LegacyContactIn(Input):
    """The original /api/contact contract, kept so the currently deployed site keeps working."""

    name: Annotated[Line, Field(min_length=2, max_length=100)]
    email: Annotated[EmailStr, Field(max_length=254)]
    subject: Annotated[Line, Field(min_length=3, max_length=150)]
    message: Annotated[Text, Field(min_length=10, max_length=5000)]
    website: Annotated[str, Field(max_length=500)] = ""


class LeadNoteOut(Output):
    id: uuid.UUID
    body: str
    author_email: str
    created_at: datetime


class LeadOut(Output):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    company: str
    service_id: uuid.UUID | None
    service_label: str
    budget: str
    message: str
    preferred_contact: str
    status: str
    follow_up_at: date | None
    source: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class LeadDetailOut(LeadOut):
    notes: list[LeadNoteOut]


class LeadPatch(Input):
    status: Annotated[str, Field(pattern="^(" + "|".join(LEAD_STATUSES) + ")$")] | None = None
    follow_up_at: date | None = None


class LeadNoteIn(Input):
    body: Annotated[Text, Field(min_length=1, max_length=5000)]
