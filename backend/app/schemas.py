import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# C0/C1 control characters have no place in names or subjects
# (and newlines there are the classic email header-injection vector).
_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f]")
# Same, but tab and newline are fine inside a multi-line message body.
_BODY_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f]")


class ContactRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=5000)
    # Honeypot: real visitors never see or fill this field.
    website: str = Field(default="", max_length=500)

    @field_validator("name", "subject")
    @classmethod
    def _single_line(cls, v: str) -> str:
        if _CONTROL.search(v):
            raise ValueError("must not contain control characters or line breaks")
        return v

    @field_validator("message")
    @classmethod
    def _message_chars(cls, v: str) -> str:
        v = v.replace("\r\n", "\n").replace("\r", "\n")
        if _BODY_CONTROL.search(v):
            raise ValueError("contains invalid control characters")
        return v


class ContactResponse(BaseModel):
    ok: bool = True
    message: str = "Message sent"
