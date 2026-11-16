from fastapi import APIRouter

from . import leads, media, system
from .content import content_router


def admin_router() -> APIRouter:
    router = APIRouter(prefix="/admin")
    router.include_router(content_router())
    router.include_router(leads.router)
    router.include_router(media.router)
    router.include_router(system.router)
    return router
