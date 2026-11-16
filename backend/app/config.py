from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "production"

    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_timeout_seconds: float = 10

    mail_from: str = ""
    mail_from_name: str = "Portfolio Contact Form"
    contact_receiver_email: str = ""

    frontend_origin: str = ""

    rate_limit_contact: str = "2/minute;5/hour"
    rate_limit_storage_uri: str = "memory://"
    trust_proxy: bool = True

    @field_validator("frontend_origin")
    @classmethod
    def _no_wildcard(cls, v: str) -> str:
        if "*" in v:
            raise ValueError("FRONTEND_ORIGIN must list explicit origins, not '*'")
        return v

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_origin.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() == "development"

    @property
    def smtp_configured(self) -> bool:
        return all(
            [
                self.smtp_host,
                self.smtp_username,
                self.smtp_password,
                self.mail_from,
                self.contact_receiver_email,
            ]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
