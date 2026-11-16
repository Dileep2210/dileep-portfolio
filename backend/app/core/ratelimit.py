from fastapi import Request
from slowapi import Limiter

from .config import get_settings


def client_ip(request: Request) -> str:
    """Real client IP behind N trusted proxies.

    Each trusted proxy appends the address it received the request from, so the client is the
    N-th entry from the right. Entries further left are client-controlled and ignored.
    """
    hops = get_settings().trusted_proxy_hops
    if hops > 0:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            if parts:
                return parts[-hops] if len(parts) >= hops else parts[0]
    return request.client.host if request.client else "unknown"


def contact_limit() -> str:
    return get_settings().rate_limit_contact


def login_limit() -> str:
    return get_settings().rate_limit_login


limiter = Limiter(key_func=client_ip, storage_uri=get_settings().rate_limit_storage_uri, headers_enabled=False)
