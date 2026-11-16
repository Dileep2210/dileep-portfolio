from functools import lru_cache
from urllib.parse import urlparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_PLACEHOLDER_HINTS = ("change-me", "changeme", "placeholder", "example", "your-")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # development | test | production
    app_env: str = "production"

    # --- core secrets -------------------------------------------------------
    secret_key: str = ""
    database_url: str = ""

    # Public origin of the website (the SPA). Admin requests must come from here.
    public_site_origin: str = "http://localhost:5173"
    # Extra origins allowed for cross-origin (CORS) calls to public endpoints, comma separated.
    frontend_origin: str = ""

    # --- auth ---------------------------------------------------------------
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    reauth_window_minutes: int = 5
    login_max_failures: int = 5
    login_lock_minutes: int = 15
    password_reset_minutes: int = 30
    invite_hours: int = 72
    cookie_secure: bool = True

    # --- email --------------------------------------------------------------
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_timeout_seconds: float = 10
    mail_from: str = ""
    mail_from_name: str = "Portfolio"
    contact_receiver_email: str = ""
    send_lead_acknowledgement: bool = True

    # --- abuse protection ---------------------------------------------------
    rate_limit_contact: str = "3/minute;10/hour"
    rate_limit_login: str = "10/minute;50/hour"
    rate_limit_storage_uri: str = "memory://"
    # Number of trusted reverse proxies in front of the API that append to X-Forwarded-For.
    # Railway only: 1. Vercel rewrite -> Railway: 2. Set 0 to ignore the header.
    trusted_proxy_hops: int = 1
    turnstile_secret_key: str = ""
    min_form_fill_ms: int = 2500

    # --- media --------------------------------------------------------------
    storage_backend: str = "local"  # local | cloudinary
    local_media_dir: str = "media_uploads"
    cloudinary_url: str = ""  # cloudinary://<key>:<secret>@<cloud_name>
    cloudinary_folder: str = "portfolio"
    max_image_mb: int = 5
    max_document_mb: int = 10

    @field_validator("frontend_origin")
    @classmethod
    def _no_wildcard(cls, v: str) -> str:
        if "*" in v:
            raise ValueError("FRONTEND_ORIGIN must list explicit origins, not '*'")
        return v

    @model_validator(mode="after")
    def _production_guard(self) -> "Settings":
        if not self.is_production:
            return self
        problems = []
        if len(self.secret_key) < 32 or any(h in self.secret_key.lower() for h in _PLACEHOLDER_HINTS):
            problems.append("SECRET_KEY must be a random value of at least 32 characters")
        if not self.database_url:
            problems.append("DATABASE_URL is required")
        if urlparse(self.public_site_origin).scheme != "https":
            problems.append("PUBLIC_SITE_ORIGIN must be https in production")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE must be true in production")
        if any(urlparse(o).scheme != "https" for o in self.extra_cors_origins):
            problems.append("FRONTEND_ORIGIN entries must be https in production")
        if self.storage_backend != "cloudinary":
            problems.append("STORAGE_BACKEND must be 'cloudinary' in production (container disk is ephemeral)")
        if problems:
            raise ValueError("Unsafe production configuration: " + "; ".join(problems))
        return self

    # --- derived ------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"development", "test"}

    @property
    def site_origin(self) -> str:
        return self.public_site_origin.rstrip("/")

    @property
    def extra_cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_origin.split(",") if o.strip()]

    @property
    def allowed_origins(self) -> list[str]:
        out = [self.site_origin, *self.extra_cors_origins]
        return list(dict.fromkeys(o for o in out if o))

    @property
    def smtp_configured(self) -> bool:
        return all([self.smtp_host, self.smtp_username, self.smtp_password, self.mail_from])


@lru_cache
def get_settings() -> Settings:
    return Settings()
