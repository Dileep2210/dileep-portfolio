"""Unversioned endpoints: health, readiness, sitemap and the legacy contact form."""

from datetime import UTC, datetime
from html import escape

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.database import get_db, new_session
from ..core.ratelimit import contact_limit, limiter
from ..models import BlogPost, Project, Service, SeoMetadata
from ..schemas.leads import LegacyContactIn
from ..services.leads import create_lead

router = APIRouter()


@router.get("/health", tags=["ops"])
def health() -> dict:
    return {"status": "ok"}


@router.get("/ready", tags=["ops"])
def ready():
    try:
        with new_session() as db:
            db.execute(text("SELECT 1"))
            version = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
    except Exception:  # noqa: BLE001
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready", "schema": version}


@router.post("/api/contact", tags=["public"], include_in_schema=False)
@limiter.limit(contact_limit)
def legacy_contact(request: Request, payload: LegacyContactIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    if payload.website:
        return {"ok": True, "message": "Message sent"}
    create_lead(
        db,
        request,
        background,
        {
            "name": payload.name,
            "email": payload.email,
            "message": f"Subject: {payload.subject}\n\n{payload.message}",
            "service_label": "",
        },
        source="legacy_form",
    )
    return {"ok": True, "message": "Message sent"}


STATIC_PAGES = [("", "home", "1.0"), ("/about", "about", "0.8"), ("/services", "services", "0.9"),
                ("/projects", "projects", "0.9"), ("/blog", "blog", "0.7"), ("/contact", "contact", "0.6")]


@router.get("/sitemap.xml", tags=["public"])
def sitemap(db: Session = Depends(get_db)):
    base = get_settings().site_origin
    noindex = set(db.scalars(select(SeoMetadata.page_key).where(SeoMetadata.noindex.is_(True))))
    urls: list[tuple[str, datetime | None, str]] = [(base + p, None, prio) for p, key, prio in STATIC_PAGES if key not in noindex]
    for slug, updated in db.execute(
        select(Project.slug, Project.updated_at).where(Project.status == "published", Project.deleted_at.is_(None))
    ):
        urls.append((f"{base}/projects/{slug}", updated, "0.8"))
    for slug, updated in db.execute(
        select(Service.slug, Service.updated_at).where(Service.status == "published", Service.deleted_at.is_(None))
    ):
        urls.append((f"{base}/services/{slug}", updated, "0.7"))
    for slug, updated in db.execute(
        select(BlogPost.slug, BlogPost.updated_at).where(
            BlogPost.status == "published", BlogPost.deleted_at.is_(None), BlogPost.published_at <= datetime.now(UTC)
        )
    ):
        urls.append((f"{base}/blog/{slug}", updated, "0.6"))
    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, updated, prio in urls:
        body.append("  <url>")
        body.append(f"    <loc>{escape(loc)}</loc>")
        if updated:
            body.append(f"    <lastmod>{updated.date().isoformat()}</lastmod>")
        body.append(f"    <priority>{prio}</priority>")
        body.append("  </url>")
    body.append("</urlset>")
    return Response("\n".join(body), media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})
