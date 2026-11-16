import uuid
from datetime import datetime
from typing import Annotated

from pydantic import EmailStr, Field, field_validator

from .common import Input, Line, Output

Password = Annotated[str, Field(min_length=1, max_length=128)]


class LoginIn(Input):
    email: EmailStr
    password: Password
    totp_code: Annotated[str, Field(max_length=10)] | None = None

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()


class PasswordIn(Input):
    password: Password


class ChangePasswordIn(Input):
    current_password: Password
    new_password: Password


class ResetRequestIn(Input):
    email: EmailStr


class ResetConfirmIn(Input):
    token: Annotated[str, Field(min_length=20, max_length=200)]
    new_password: Password


class InviteAcceptIn(Input):
    token: Annotated[str, Field(min_length=20, max_length=200)]
    full_name: Annotated[Line, Field(min_length=2, max_length=120)]
    password: Password


class TotpCodeIn(Input):
    code: Annotated[str, Field(min_length=6, max_length=10)]


class MeOut(Output):
    id: uuid.UUID
    email: str
    full_name: str
    roles: list[str]
    permissions: list[str]
    mfa_enabled: bool
    last_login_at: datetime | None


class SessionOut(Output):
    id: uuid.UUID
    created_at: datetime
    last_seen_at: datetime | None
    expires_at: datetime
    ip: str | None
    user_agent: str | None
    current: bool = False


class MfaSetupOut(Output):
    secret: str
    otpauth_uri: str
