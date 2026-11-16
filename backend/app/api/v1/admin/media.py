import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile
from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from ....core import audit
from ....core.config import get_settings
from ....core.database import get_db
from ....core.deps import Auth, require
from ....core.errors import AppError, Conflict, NotFound
from ....core.ratelimit import limiter
from ....core.storage import get_storage, validate_upload
from ....models import (
    BlogPost,
    MediaAsset,
    Project,
    ProjectMedia,
    ResumeFile,
    Service,
    SiteSetting,
    Testimonial,
)
from ....schemas.common import Page
from ....schemas.content import MediaOut, MediaPatch
from .crud import apply_listing, commit, paginate

router = APIRouter(prefix="/media", tags=["admin:media"])
logger = logging.getLogger("media")


@router.get("", response_model=Page[MediaOut])
def list_media(
    db: Session = Depends(get_db),
    auth: Auth = Depends(require("media:read")),
    page: int = Query(1, ge=1, le=10_000),
    page_size: int = Query(24, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    kind: str | None = Query(None, pattern=r"^(image|document)$"),
    sort: str | None = Query(None, max_length=40),
):
    stmt = select(MediaAsset).where(MediaAsset.deleted_at.is_(None))
    if kind:
        stmt = stmt.where(MediaAsset.kind == kind)
    stmt = apply_listing(
        stmt, MediaAsset, q=q, search=["original_filename", "alt_text"], sort=sort,
        sorts=["created_at", "size_bytes", "original_filename"], default_sort="-created_at",
    )
    rows, total = paginate(db, stmt, page, page_size)
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=MediaOut, status_code=201)
@limiter.limit("30/minute")
async def upload(
    request: Request,
    file: UploadFile = File(...),
    alt_text: str = Form("", max_length=300),
    db: Session = Depends(get_db),
    auth: Auth = Depends(require("media:write")),
):
    s = get_settings()
    limit = max(s.max_image_mb, s.max_document_mb) * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise AppError("The file is too large.", code="upload_rejected", status_code=413)
    clean = validate_upload(data, file.filename or "")
    stored = get_storage().save(clean)
    name = (file.filename or "upload").replace("\\", "/").split("/")[-1][:255]
    asset = MediaAsset(
        provider=stored.provider,
        storage_key=stored.storage_key,
        url=stored.url,
        kind=clean.kind,
        mime_type=clean.mime_type,
        size_bytes=len(clean.data),
        width=clean.width,
        height=clean.height,
        original_filename=name,
        alt_text=alt_text.strip()[:300],
        uploaded_by=auth.user.id,
    )
    db.add(asset)
    db.flush()
    audit.record(db, request, auth.user, "media.upload", "media_asset", asset.id, {"mime": clean.mime_type, "bytes": len(clean.data)})
    commit(db)
    return asset


def _get(db: Session, media_id: uuid.UUID) -> MediaAsset:
    asset = db.get(MediaAsset, media_id)
    if asset is None or asset.deleted_at is not None:
        raise NotFound("File not found.")
    return asset


@router.patch("/{media_id}", response_model=MediaOut)
def update_media(
    media_id: uuid.UUID, payload: MediaPatch, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("media:write"))
):
    asset = _get(db, media_id)
    asset.alt_text = payload.alt_text
    audit.record(db, request, auth.user, "media.update", "media_asset", asset.id)
    commit(db)
    return asset


def usages(db: Session, asset: MediaAsset) -> list[str]:
    url = asset.url
    found: list[str] = []
    if db.scalar(select(ProjectMedia.id).where(ProjectMedia.media_id == asset.id).limit(1)):
        found.append("project gallery")
    if db.scalar(select(ResumeFile.id).where(ResumeFile.media_id == asset.id).limit(1)):
        found.append("resume")
    checks = [
        (Project, Project.cover_url, "project cover"),
        (Service, Service.cover_url, "service cover"),
        (BlogPost, BlogPost.cover_url, "blog cover"),
        (Testimonial, Testimonial.avatar_url, "testimonial photo"),
    ]
    for model, col, label in checks:
        if db.scalar(select(model.id).where(col == url, model.deleted_at.is_(None)).limit(1)):
            found.append(label)
    if db.scalar(select(SiteSetting.id).where(SiteSetting.value.op("@>")(func.to_jsonb(cast(url, String)))).limit(1)):
        found.append("site settings")
    return found


@router.delete("/{media_id}", status_code=204)
def delete_media(media_id: uuid.UUID, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("media:delete"))):
    asset = _get(db, media_id)
    used = usages(db, asset)
    if used:
        raise Conflict(f"This file is still used in: {', '.join(used)}. Remove it there first.", code="in_use")
    asset.deleted_at = datetime.now(UTC)
    audit.record(db, request, auth.user, "media.delete", "media_asset", asset.id)
    commit(db)
    if asset.provider == get_storage().provider:
        try:
            get_storage().delete(asset.storage_key)
        except Exception:  # noqa: BLE001 - storage cleanup must never fail the request
            logger.warning("could not remove stored file for media %s", asset.id)
    return Response(status_code=204)
