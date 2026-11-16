from fastapi import APIRouter

from . import auth, public
from .admin import admin_router


def v1_router() -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    router.include_router(auth.router)
    router.include_router(public.router)
    router.include_router(admin_router())
    return router
