import math
import re
import uuid
from typing import Any

from fastapi import APIRouter
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ....core.deps import Auth
from ....core.errors import AppError
from ....models import (
    BlogCategory,
    BlogPost,
    BlogTag,
    Experience,
    HomepageSection,
    MediaAsset,
    NavigationItem,
    Project,
    ProjectCategory,
    ProjectMedia,
    ProjectTechnology,
    ResumeFile,
    SeoMetadata,
    Service,
    Skill,
    SkillCategory,
    SocialLink,
    Testimonial,
)
from ....schemas import content as s
from ....schemas.common import slugify
from .crud import Resource, build_router


def _invalid(msg: str) -> AppError:
    return AppError(msg, code="validation_error", status_code=422)


# ----------------------------------------------------------------------------- hooks


def _project_apply(db: Session, obj: Project, data: dict[str, Any], auth: Auth) -> None:
    techs = data.pop("technologies", None)
    if techs is not None:
        seen: list[str] = []
        for t in techs:
            if t.lower() not in {x.lower() for x in seen}:
                seen.append(t)
        # Reuse existing rows: the unit of work inserts new rows before deleting orphans, so
        # recreating a row with the same (project_id, name) would hit the unique constraint.
        existing = {link.name: link for link in obj.technology_links}
        links = []
        for i, name in enumerate(seen):
            link = existing.get(name) or ProjectTechnology(name=name)
            link.position = i
            links.append(link)
        obj.technology_links = links
    gallery = data.pop("gallery", None)
    if gallery is not None:
        ids = [uuid.UUID(str(g["media_id"])) for g in gallery]
        found = {
            m.id: m
            for m in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids), MediaAsset.deleted_at.is_(None)))
        }
        for media_id in ids:
            m = found.get(media_id)
            if m is None or m.kind != "image":
                raise _invalid("Every gallery item must be an existing image from the media library.")
        obj.gallery = [
            ProjectMedia(media_id=uuid.UUID(str(g["media_id"])), caption=g.get("caption", ""), position=i)
            for i, g in enumerate(gallery)
        ]


def _blog_apply(db: Session, obj: BlogPost, data: dict[str, Any], auth: Auth) -> None:
    tags = data.pop("tags", None)
    if tags is not None:
        result: list[BlogTag] = []
        for name in tags:
            slug = slugify(name)
            if any(t.slug == slug for t in result):
                continue
            tag = db.scalar(select(BlogTag).where(BlogTag.slug == slug))
            if tag is None:
                tag = BlogTag(name=name, slug=slug)
                db.add(tag)
            result.append(tag)
        obj.tag_objects = result
    if obj.author_id is None:
        obj.author_id = auth.user.id
    content = data.get("content", obj.content or "")
    words = len(re.findall(r"\w+", content or ""))
    obj.reading_minutes = max(1, math.ceil(words / 220))


def _testimonial_validate(db: Session, obj: Testimonial, data: dict[str, Any]) -> None:
    if obj.approval_status != "approved":
        if data.get("is_published") is True:
            raise _invalid("Only approved testimonials can be published.")
        obj.is_published = False  # rejecting / un-approving always takes it off the public site
    if obj.is_published and not obj.consent_confirmed:
        raise _invalid("Confirm the client's consent before publishing.")


def _resume_validate(db: Session, obj: ResumeFile, data: dict[str, Any]) -> None:
    media = db.get(MediaAsset, obj.media_id) if obj.media_id else None
    if media is None or media.deleted_at is not None or media.mime_type != "application/pdf":
        raise _invalid("Choose a PDF from the media library.")
    if obj.is_active:
        stmt = update(ResumeFile).where(ResumeFile.is_active.is_(True))
        if obj.id is not None:
            stmt = stmt.where(ResumeFile.id != obj.id)
        db.execute(stmt.values(is_active=False))


def _slug_of(source: str):
    def validate(db: Session, obj: Any, data: dict[str, Any]) -> None:
        if not obj.slug:
            obj.slug = slugify(getattr(obj, source))

    return validate


# ----------------------------------------------------------------------------- resources

RESOURCES = [
    Resource(
        path="projects", perm="projects", entity="project", model=Project,
        create=s.ProjectIn, patch=s.ProjectPatch, out=s.ProjectOut,
        search=["title", "tagline", "summary", "client_name"],
        filters={"status": str, "featured": bool, "category_id": uuid.UUID, "is_demo": bool},
        sorts=["position", "title", "created_at", "updated_at", "published_at"],
        slug_source="title", apply=_project_apply, relation_keys=("technologies", "gallery"),
    ),
    Resource(
        path="project-categories", perm="projects", entity="project_category", model=ProjectCategory,
        create=s.CategoryIn, patch=s.partial(s.CategoryIn, "ProjectCategoryPatch"), out=s.CategoryOut,
        search=["name"], sorts=["position", "name", "created_at"], validate=_slug_of("name"),
    ),
    Resource(
        path="services", perm="services", entity="service", model=Service,
        create=s.ServiceIn, patch=s.ServicePatch, out=s.ServiceOut,
        search=["title", "summary"], filters={"status": str, "featured": bool},
        sorts=["position", "title", "created_at", "updated_at"], slug_source="title",
    ),
    Resource(
        path="skills", perm="skills", entity="skill", model=Skill,
        create=s.SkillIn, patch=s.SkillPatch, out=s.SkillOut,
        search=["name"], filters={"category_id": uuid.UUID, "is_active": bool, "featured": bool, "is_learning": bool},
        sorts=["position", "name", "created_at"],
    ),
    Resource(
        path="skill-categories", perm="skills", entity="skill_category", model=SkillCategory,
        create=s.SkillCategoryIn, patch=s.partial(s.SkillCategoryIn, "SkillCategoryPatch"), out=s.SkillCategoryOut,
        search=["name"], sorts=["position", "name"], validate=_slug_of("name"),
    ),
    Resource(
        path="testimonials", perm="testimonials", entity="testimonial", model=Testimonial,
        create=s.TestimonialIn, patch=s.TestimonialPatch, out=s.TestimonialOut,
        search=["client_name", "company", "content"],
        filters={"approval_status": str, "is_published": bool, "featured": bool, "project_id": uuid.UUID, "source": str},
        sorts=["position", "created_at", "testimonial_date", "client_name"], default_sort="-created_at",
        validate=_testimonial_validate,
    ),
    Resource(
        path="blog/posts", perm="blog", entity="blog_post", model=BlogPost,
        create=s.BlogPostIn, patch=s.BlogPostPatch, out=s.BlogPostOut,
        search=["title", "excerpt", "content"], filters={"status": str, "category_id": uuid.UUID},
        sorts=["published_at", "created_at", "updated_at", "title"], default_sort="-created_at",
        slug_source="title", apply=_blog_apply, relation_keys=("tags",),
    ),
    Resource(
        path="blog/categories", perm="blog", entity="blog_category", model=BlogCategory,
        create=s.CategoryIn, patch=s.partial(s.CategoryIn, "BlogCategoryPatch"), out=s.CategoryOut,
        search=["name"], sorts=["name", "created_at"], default_sort="name", validate=_slug_of("name"),
    ),
    Resource(
        path="blog/tags", perm="blog", entity="blog_tag", model=BlogTag,
        create=s.TagIn, patch=s.partial(s.TagIn, "BlogTagPatch"), out=s.TagOut,
        search=["name"], sorts=["name", "created_at"], default_sort="name", validate=_slug_of("name"),
    ),
    Resource(
        path="experiences", perm="experiences", entity="experience", model=Experience,
        create=s.ExperienceIn, patch=s.ExperiencePatch, out=s.ExperienceOut,
        search=["title", "organization"], filters={"kind": str, "is_visible": bool},
        sorts=["position", "start_date", "created_at"],
    ),
    Resource(
        path="homepage-sections", perm="homepage", entity="homepage_section", model=HomepageSection,
        create=s.HomepageSectionIn, patch=s.HomepageSectionPatch, out=s.HomepageSectionOut,
        search=["key", "title"], sorts=["position", "key"],
    ),
    Resource(
        path="navigation", perm="navigation", entity="navigation_item", model=NavigationItem,
        create=s.NavigationItemIn, patch=s.NavigationItemPatch, out=s.NavigationItemOut,
        search=["label", "href"], filters={"location": str, "is_visible": bool}, sorts=["position", "label"],
    ),
    Resource(
        path="social-links", perm="social", entity="social_link", model=SocialLink,
        create=s.SocialLinkIn, patch=s.SocialLinkPatch, out=s.SocialLinkOut,
        search=["platform", "label", "url"], sorts=["position", "platform"],
    ),
    Resource(
        path="seo", perm="seo", entity="seo_metadata", model=SeoMetadata,
        create=s.SeoMetadataIn, patch=s.SeoMetadataPatch, out=s.SeoMetadataOut,
        search=["page_key", "title"], sorts=["page_key", "updated_at"], default_sort="page_key",
    ),
    Resource(
        path="resumes", perm="resume", entity="resume", model=ResumeFile,
        create=s.ResumeIn, patch=s.ResumePatch, out=s.ResumeOut,
        search=["label"], sorts=["created_at", "label"], default_sort="-created_at", validate=_resume_validate,
    ),
]


def content_router() -> APIRouter:
    router = APIRouter()
    for res in RESOURCES:
        router.include_router(build_router(res))
    return router
