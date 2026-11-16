"""Read-only public API. Every query here filters to published, non-deleted, visible content."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.errors import AppError, NotFound
from ...core.ratelimit import client_ip, contact_limit, limiter
from ...models import (
    BlogCategory,
    BlogPost,
    BlogTag,
    Experience,
    HomepageSection,
    NavigationItem,
    Project,
    ProjectCategory,
    ProjectTechnology,
    ResumeFile,
    SeoMetadata,
    Service,
    Skill,
    SkillCategory,
    SocialLink,
    Testimonial,
    blog_post_tags,
)
from ...schemas.common import Page
from ...schemas.content import (
    BlogPostOut,
    CategoryOut,
    ExperienceOut,
    HomepageSectionOut,
    NavigationItemOut,
    ProjectOut,
    SeoMetadataOut,
    ServiceOut,
    SkillCategoryOut,
    SocialLinkOut,
    TagOut,
    TestimonialSubmit,
)
from ...schemas.leads import ContactIn
from ...schemas.settings import SiteSettings
from ...services.leads import create_lead, looks_automated, verify_turnstile
from ...services.site import load_settings
from .admin.crud import paginate

router = APIRouter(prefix="/public", tags=["public"])

PageNo = Annotated[int, Query(ge=1, le=10_000)]
PageSize = Annotated[int, Query(ge=1, le=50)]
Search = Annotated[str | None, Query(max_length=100)]


def _cache(response: Response, seconds: int = 60) -> None:
    # Browsers always revalidate, so CMS edits are visible on the next page load. A shared cache
    # (CDN) may hold it briefly; TanStack Query already de-duplicates requests in the SPA.
    response.headers["Cache-Control"] = f"public, no-cache, s-maxage={min(seconds, 30)}"


def _like(q: str) -> str:
    return f"%{q.strip()[:100].replace('%', r'\%').replace('_', r'\_')}%"


def _published_project():
    return and_(Project.status == "published", Project.deleted_at.is_(None))


def _published_service():
    return and_(Service.status == "published", Service.deleted_at.is_(None))


def _published_post():
    return and_(
        BlogPost.status == "published",
        BlogPost.deleted_at.is_(None),
        BlogPost.published_at.is_not(None),
        BlogPost.published_at <= datetime.now(UTC),
    )


def _public_testimonial():
    return and_(
        Testimonial.approval_status == "approved",
        Testimonial.is_published.is_(True),
        Testimonial.consent_confirmed.is_(True),
        Testimonial.deleted_at.is_(None),
    )


# ----------------------------------------------------------------------------- public output models


class PublicTestimonial(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    client_name: str
    company: str
    designation: str
    content: str
    rating: int | None
    testimonial_date: str | None
    avatar_url: str
    featured: bool
    project_slug: str | None = None
    project_title: str | None = None


def _testimonial(t: Testimonial) -> PublicTestimonial:
    return PublicTestimonial(
        id=str(t.id),
        client_name=t.client_name,
        company=t.company,
        designation=t.designation,
        content=t.content,
        rating=t.rating,
        testimonial_date=t.testimonial_date.isoformat() if t.testimonial_date else None,
        avatar_url=t.avatar_url,
        featured=t.featured,
        project_slug=t.project.slug if t.project and t.project.status == "published" and not t.project.deleted_at else None,
        project_title=t.project.title if t.project and t.project.status == "published" and not t.project.deleted_at else None,
    )


class SkillPublic(BaseModel):
    model_config = {"from_attributes": True}
    name: str
    icon: str
    color: str
    note: str
    featured: bool
    is_learning: bool


class SkillGroup(BaseModel):
    category: SkillCategoryOut
    skills: list[SkillPublic]


class SiteOut(BaseModel):
    settings: SiteSettings
    navigation: list[NavigationItemOut]
    social_links: list[SocialLinkOut]
    homepage: list[HomepageSectionOut]
    resume_url: str | None


class ProjectDetailOut(BaseModel):
    project: ProjectOut
    testimonials: list[PublicTestimonial]
    related: list[ProjectOut]


class PostDetailOut(BaseModel):
    post: BlogPostOut
    related: list[BlogPostOut]


# ----------------------------------------------------------------------------- site


@router.get("/site", response_model=SiteOut)
def site(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    nav = db.scalars(select(NavigationItem).where(NavigationItem.is_visible.is_(True)).order_by(NavigationItem.position))
    social = db.scalars(select(SocialLink).where(SocialLink.is_visible.is_(True)).order_by(SocialLink.position))
    sections = db.scalars(
        select(HomepageSection).where(HomepageSection.is_visible.is_(True)).order_by(HomepageSection.position)
    )
    resume = db.scalar(select(ResumeFile).where(ResumeFile.is_active.is_(True)))
    settings = load_settings(db)
    return SiteOut(
        settings=settings,
        navigation=list(nav),
        social_links=list(social),
        homepage=list(sections),
        resume_url=(resume.url if resume and resume.media.deleted_at is None else None) or settings.resume_url or None,
    )


@router.get("/seo/{page_key}", response_model=SeoMetadataOut | None)
def seo(page_key: str, response: Response, db: Session = Depends(get_db)):
    _cache(response, 300)
    return db.scalar(select(SeoMetadata).where(SeoMetadata.page_key == page_key[:40]))


@router.get("/experiences", response_model=list[ExperienceOut])
def experiences(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    return list(
        db.scalars(
            select(Experience)
            .where(Experience.is_visible.is_(True))
            .order_by(Experience.position, Experience.start_date.desc().nullslast())
        )
    )


@router.get("/skills", response_model=list[SkillGroup])
def skills(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    cats = list(db.scalars(select(SkillCategory).order_by(SkillCategory.position, SkillCategory.name)))
    rows = list(db.scalars(select(Skill).where(Skill.is_active.is_(True)).order_by(Skill.position, Skill.name)))
    groups = []
    for c in cats:
        items = [r for r in rows if r.category_id == c.id]
        if items:
            groups.append(SkillGroup(category=SkillCategoryOut.model_validate(c), skills=items))
    return groups


# ----------------------------------------------------------------------------- projects


@router.get("/project-categories", response_model=list[CategoryOut])
def project_categories(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    has_projects = exists().where(Project.category_id == ProjectCategory.id, _published_project())
    return list(db.scalars(select(ProjectCategory).where(has_projects).order_by(ProjectCategory.position)))


@router.get("/projects/technologies", response_model=list[str])
def project_technologies(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    stmt = (
        select(ProjectTechnology.name)
        .join(Project, Project.id == ProjectTechnology.project_id)
        .where(_published_project())
        .group_by(ProjectTechnology.name)
        .order_by(func.count().desc(), ProjectTechnology.name)
        .limit(40)
    )
    return list(db.scalars(stmt))


@router.get("/projects", response_model=Page[ProjectOut])
def projects(
    response: Response,
    db: Session = Depends(get_db),
    page: PageNo = 1,
    page_size: PageSize = 24,
    q: Search = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
    tech: Annotated[str | None, Query(max_length=60)] = None,
    featured: bool | None = None,
):
    _cache(response)
    stmt = select(Project).where(_published_project())
    if q:
        term = _like(q)
        stmt = stmt.where(
            or_(
                Project.title.ilike(term, escape="\\"),
                Project.tagline.ilike(term, escape="\\"),
                Project.summary.ilike(term, escape="\\"),
                Project.client_name.ilike(term, escape="\\"),
            )
        )
    if category:
        stmt = stmt.join(ProjectCategory, ProjectCategory.id == Project.category_id).where(ProjectCategory.slug == category)
    if tech:
        stmt = stmt.where(
            exists().where(ProjectTechnology.project_id == Project.id, func.lower(ProjectTechnology.name) == tech.lower())
        )
    if featured is not None:
        stmt = stmt.where(Project.featured.is_(featured))
    stmt = stmt.order_by(Project.featured.desc(), Project.position, Project.published_at.desc().nullslast())
    rows, total = paginate(db, stmt, page, page_size)
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@router.get("/projects/{slug}", response_model=ProjectDetailOut)
def project_detail(slug: str, response: Response, db: Session = Depends(get_db)):
    _cache(response)
    project = db.scalar(select(Project).where(Project.slug == slug[:140], _published_project()))
    if project is None:
        raise NotFound("Project not found.")
    testimonials = db.scalars(
        select(Testimonial)
        .where(_public_testimonial(), Testimonial.project_id == project.id)
        .order_by(Testimonial.position, Testimonial.created_at.desc())
    )
    related_stmt = select(Project).where(_published_project(), Project.id != project.id)
    if project.category_id:
        related_stmt = related_stmt.order_by((Project.category_id == project.category_id).desc(), Project.position)
    else:
        related_stmt = related_stmt.order_by(Project.position)
    related = list(db.scalars(related_stmt.limit(3)).unique())
    return ProjectDetailOut(
        project=ProjectOut.model_validate(project),
        testimonials=[_testimonial(t) for t in testimonials],
        related=[ProjectOut.model_validate(p) for p in related],
    )


# ----------------------------------------------------------------------------- services


@router.get("/services", response_model=list[ServiceOut])
def services(response: Response, db: Session = Depends(get_db), featured: bool | None = None):
    _cache(response)
    stmt = select(Service).where(_published_service())
    if featured is not None:
        stmt = stmt.where(Service.featured.is_(featured))
    return list(db.scalars(stmt.order_by(Service.position, Service.title)))


@router.get("/services/{slug}", response_model=ServiceOut)
def service_detail(slug: str, response: Response, db: Session = Depends(get_db)):
    _cache(response)
    service = db.scalar(select(Service).where(Service.slug == slug[:140], _published_service()))
    if service is None:
        raise NotFound("Service not found.")
    return service


# ----------------------------------------------------------------------------- testimonials


@router.get("/testimonials", response_model=list[PublicTestimonial])
def testimonials(
    response: Response,
    db: Session = Depends(get_db),
    project: Annotated[str | None, Query(max_length=140)] = None,
    featured: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    _cache(response)
    stmt = select(Testimonial).where(_public_testimonial())
    if project:
        stmt = stmt.join(Project, Project.id == Testimonial.project_id).where(Project.slug == project, _published_project())
    if featured is not None:
        stmt = stmt.where(Testimonial.featured.is_(featured))
    rows = db.scalars(stmt.order_by(Testimonial.featured.desc(), Testimonial.position, Testimonial.created_at.desc()).limit(limit))
    return [_testimonial(t) for t in rows]


@router.post("/testimonials", status_code=202)
@limiter.limit("3/hour")
def submit_testimonial(request: Request, payload: TestimonialSubmit, db: Session = Depends(get_db)):
    if payload.website:
        return {"message": "Thank you! Your testimonial will appear once it has been reviewed."}
    if not load_settings(db).show_testimonial_form:
        raise AppError("Testimonial submissions are closed.", code="closed", status_code=403)
    project_id = None
    if payload.project_slug:
        project = db.scalar(select(Project).where(Project.slug == payload.project_slug, _published_project()))
        project_id = project.id if project else None
    db.add(
        Testimonial(
            client_name=payload.client_name,
            company=payload.company,
            designation=payload.designation,
            content=payload.content,
            rating=payload.rating,
            submitter_email=str(payload.email).lower(),
            project_id=project_id,
            approval_status="pending",
            is_published=False,
            consent_confirmed=False,  # the owner confirms consent when approving
            source="public_form",
        )
    )
    db.commit()
    return {"message": "Thank you! Your testimonial will appear once it has been reviewed."}


# ----------------------------------------------------------------------------- blog


@router.get("/blog/categories", response_model=list[CategoryOut])
def blog_categories(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    has_posts = exists().where(BlogPost.category_id == BlogCategory.id, _published_post())
    return list(db.scalars(select(BlogCategory).where(has_posts).order_by(BlogCategory.name)))


@router.get("/blog/tags", response_model=list[TagOut])
def blog_tags(response: Response, db: Session = Depends(get_db)):
    _cache(response)
    used = exists().where(
        blog_post_tags.c.tag_id == BlogTag.id, blog_post_tags.c.post_id == BlogPost.id, _published_post()
    )
    return list(db.scalars(select(BlogTag).where(used).order_by(BlogTag.name)))


@router.get("/blog", response_model=Page[BlogPostOut])
def blog(
    response: Response,
    db: Session = Depends(get_db),
    page: PageNo = 1,
    page_size: PageSize = 12,
    q: Search = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
    tag: Annotated[str | None, Query(max_length=80)] = None,
):
    _cache(response)
    stmt = select(BlogPost).where(_published_post())
    if q:
        term = _like(q)
        stmt = stmt.where(
            or_(BlogPost.title.ilike(term, escape="\\"), BlogPost.excerpt.ilike(term, escape="\\"), BlogPost.content.ilike(term, escape="\\"))
        )
    if category:
        stmt = stmt.join(BlogCategory, BlogCategory.id == BlogPost.category_id).where(BlogCategory.slug == category)
    if tag:
        stmt = stmt.where(
            exists().where(
                blog_post_tags.c.post_id == BlogPost.id, blog_post_tags.c.tag_id == BlogTag.id, BlogTag.slug == tag
            )
        )
    rows, total = paginate(db, stmt.order_by(BlogPost.published_at.desc()), page, page_size)
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@router.get("/blog/{slug}", response_model=PostDetailOut)
def blog_post(slug: str, response: Response, db: Session = Depends(get_db)):
    _cache(response)
    post = db.scalar(select(BlogPost).where(BlogPost.slug == slug[:180], _published_post()))
    if post is None:
        raise NotFound("Article not found.")
    tag_ids = [t.id for t in post.tag_objects]
    shared_tag = exists().where(blog_post_tags.c.post_id == BlogPost.id, blog_post_tags.c.tag_id.in_(tag_ids))
    conditions = [shared_tag]
    if post.category_id:
        conditions.append(BlogPost.category_id == post.category_id)
    related = list(
        db.scalars(
            select(BlogPost)
            .where(_published_post(), BlogPost.id != post.id, or_(*conditions))
            .order_by(BlogPost.published_at.desc())
            .limit(3)
        ).unique()
    )
    return PostDetailOut(post=BlogPostOut.model_validate(post), related=[BlogPostOut.model_validate(p) for p in related])


# ----------------------------------------------------------------------------- contact


@router.post("/contact", status_code=201)
@limiter.limit(contact_limit)
def contact(request: Request, payload: ContactIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    if looks_automated(payload.website, payload.elapsed_ms):
        # Pretend success so bots learn nothing; nothing is stored or sent.
        return {"ok": True, "message": "Thanks! Your message has been received."}
    if not verify_turnstile(payload.turnstile_token, client_ip(request)):
        raise AppError("Please complete the anti-spam check and try again.", code="captcha_failed", status_code=400)
    create_lead(db, request, background, payload.model_dump(), source="contact_form")
    return {"ok": True, "message": "Thanks! Your message has been received."}
