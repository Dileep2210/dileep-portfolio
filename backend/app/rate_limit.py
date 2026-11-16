from fastapi import Request
from slowapi import Limiter

from .config import get_settings


def client_key(request: Request) -> str:
    """Client IP. Behind Railway's proxy the real peer is the LAST X-Forwarded-For hop
    (appended by the trusted proxy); earlier hops are client-controlled and spoofable."""
    if get_settings().trust_proxy:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def contact_limit() -> str:
    return get_settings().rate_limit_contact


limiter = Limiter(
    key_func=client_key,
    storage_uri=get_settings().rate_limit_storage_uri,
    headers_enabled=False,
)
