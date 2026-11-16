import base64
import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from .config import get_settings

ISSUER = "portfolio-api"
AUDIENCE = "portfolio-admin"
ACCESS_COOKIE = "pf_access"
REFRESH_COOKIE = "pf_refresh"
CSRF_COOKIE = "pf_csrf"
CSRF_HEADER = "x-csrf-token"

_hasher = PasswordHasher()  # Argon2id, library defaults (RFC 9106 low-memory profile)

COMMON_PASSWORDS = {
    "password1234", "123456789012", "qwertyuiop12", "adminadmin12", "letmein12345",
    "welcome12345", "passwordpassword", "iloveyou1234", "administrator", "changeme1234",
}


# ----------------------------------------------------------------------------- passwords


def hash_password(password: str) -> str:
    return _hasher.hash(password)


@lru_cache
def _dummy_hash() -> str:
    return _hasher.hash(secrets.token_urlsafe(16))


def verify_password(password: str, password_hash: str | None) -> bool:
    """Constant-ish time: always runs one Argon2 verification, even for unknown users."""
    try:
        return _hasher.verify(password_hash or _dummy_hash(), password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def password_problems(password: str, email: str = "") -> list[str]:
    problems = []
    if len(password) < 12:
        problems.append("Use at least 12 characters.")
    if len(password) > 128:
        problems.append("Use at most 128 characters.")
    if len(set(password)) < 5:
        problems.append("Use more varied characters.")
    if password.lower() in COMMON_PASSWORDS:
        problems.append("That password is too common.")
    local = email.split("@")[0].lower()
    if len(local) >= 4 and local in password.lower():
        problems.append("Do not include your email name in the password.")
    return problems


# ----------------------------------------------------------------------------- tokens


def _signing_key() -> str:
    key = get_settings().secret_key
    if len(key) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters")
    return key


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID, token_version: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "ver": token_version,
        "type": "access",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + timedelta(minutes=get_settings().access_token_minutes),
    }
    return jwt.encode(payload, _signing_key(), algorithm="HS256")


def decode_access_token(token: str) -> dict:
    """Raises jwt.ExpiredSignatureError / jwt.InvalidTokenError."""
    data = jwt.decode(
        token,
        _signing_key(),
        algorithms=["HS256"],
        audience=AUDIENCE,
        issuer=ISSUER,
        options={"require": ["exp", "iat", "sub", "sid", "type"]},
    )
    if data.get("type") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    return data


def new_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def tokens_equal(a: str | None, b: str | None) -> bool:
    return bool(a) and bool(b) and hmac.compare_digest(str(a), str(b))


def hmac_ip(ip: str | None) -> str:
    if not ip:
        return ""
    return hmac.new(_signing_key().encode(), ip.encode(), hashlib.sha256).hexdigest()


# ----------------------------------------------------------------------------- MFA (TOTP)


def _fernet() -> Fernet:
    hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=b"portfolio-mfa-v1", info=b"totp-secret")
    return Fernet(base64.urlsafe_b64encode(hkdf.derive(_signing_key().encode())))


def seal_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def unseal_secret(sealed: str | None) -> str | None:
    if not sealed:
        return None
    try:
        return _fernet().decrypt(sealed.encode()).decode()
    except InvalidToken:
        return None


def new_totp_secret() -> str:
    return pyotp.random_base32()


def totp_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Portfolio Admin")


def verify_totp(secret: str, code: str, last_counter: int) -> int | None:
    """Returns the accepted time-step counter, or None. Rejects reuse of an already-used step."""
    code = (code or "").strip().replace(" ", "")
    if not (code.isdigit() and len(code) == 6):
        return None
    totp = pyotp.TOTP(secret)
    now = datetime.now(UTC)
    for drift in (-1, 0, 1):
        at = now + timedelta(seconds=30 * drift)
        counter = totp.timecode(at)
        if counter > last_counter and hmac.compare_digest(totp.at(at), code):
            return counter
    return None
