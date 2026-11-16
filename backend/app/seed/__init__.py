"""Idempotent content seed: inserts only what is missing (by slug/key), never overwrites edits."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    BlogCategory,
    HomepageSection,
    MediaAsset,
    NavigationItem,
    Project,
    ProjectCategory,
    ProjectTechnology,
    ResumeFile,
    SeoMetadata,
    Service,
    SiteSetting,
    Skill,
    SkillCategory,
    SocialLink,
)
from ..schemas.common import slugify
from ..schemas.settings import SiteSettings
from ..services.site import save_settings
from . import content as c


def seed_content(db: Session) -> dict[str, int]:
    added: dict[str, int] = {}

    def bump(key: str) -> None:
        added[key] = added.get(key, 0) + 1

    # settings: only keys that have never been saved
    existing_keys = set(db.scalars(select(SiteSetting.key)))
    missing = {k: v for k, v in SiteSettings.model_validate(c.PROFILE).model_dump(mode="json").items() if k not in existing_keys}
    if missing:
        save_settings(db, missing)
        added["settings"] = len(missing)

    if not db.scalar(select(NavigationItem.id).limit(1)):
        for i, (label, href, loc) in enumerate(c.NAVIGATION):
            db.add(NavigationItem(label=label, href=href, location=loc, position=i))
            bump("navigation")

    if not db.scalar(select(SocialLink.id).limit(1)):
        for i, (platform, label, url, icon) in enumerate(c.SOCIAL):
            db.add(SocialLink(platform=platform, label=label, url=url, icon=icon, position=i))
            bump("social_links")

    have_sections = set(db.scalars(select(HomepageSection.key)))
    for i, sec in enumerate(c.HOMEPAGE):
        if sec["key"] not in have_sections:
            db.add(HomepageSection(position=i, **{"title": "", "subtitle": "", "body": "", "data": {}, **sec}))
            bump("homepage_sections")

    have_seo = set(db.scalars(select(SeoMetadata.page_key)))
    for key, title, desc in c.SEO:
        if key not in have_seo:
            db.add(SeoMetadata(page_key=key, title=title, description=desc, canonical_path="" if key == "home" else f"/{key}"))
            bump("seo")

    cats = {x.slug: x for x in db.scalars(select(SkillCategory))}
    for i, (name, slug, blurb) in enumerate(c.SKILL_CATEGORIES):
        if slug not in cats:
            cats[slug] = SkillCategory(name=name, slug=slug, blurb=blurb, position=i)
            db.add(cats[slug])
            bump("skill_categories")
    db.flush()
    have_skills = {(s.category_id, s.name) for s in db.scalars(select(Skill))}
    for i, (cat, name, icon, color, featured, learning, note) in enumerate(c.SKILLS):
        if (cats[cat].id, name) not in have_skills:
            db.add(Skill(category_id=cats[cat].id, name=name, icon=icon, color=color, featured=featured,
                         is_learning=learning, note=note, position=i))
            bump("skills")

    pcats = {x.slug: x for x in db.scalars(select(ProjectCategory))}
    for i, (name, slug, desc) in enumerate(c.PROJECT_CATEGORIES):
        if slug not in pcats:
            pcats[slug] = ProjectCategory(name=name, slug=slug, description=desc, position=i)
            db.add(pcats[slug])
            bump("project_categories")
    db.flush()

    have_projects = set(db.scalars(select(Project.slug).where(Project.deleted_at.is_(None))))
    projects = [dict(p) for p in c.PROJECTS]
    for i, (name, cat, tagline, desc, metric, image, url, tags, highlights, is_demo, case) in enumerate(c.LEGACY_PROJECTS):
        projects.append({
            "title": name, "slug": slugify(name), "category": cat, "tagline": tagline, "summary": desc,
            "overview": case, "features": highlights, "is_demo": is_demo, "live_url": url,
            "highlight_label": metric[0], "highlight_value": metric[1], "cover_url": image,
            "status": "published", "position": 10 + i, "technologies": tags,
        })
    for p in projects:
        if p["slug"] in have_projects:
            continue
        techs = p.pop("technologies", [])
        cat = p.pop("category", None)
        proj = Project(**p, category_id=pcats[cat].id if cat else None)
        proj.technology_links = [ProjectTechnology(name=t, position=j) for j, t in enumerate(techs)]
        if proj.status == "published":
            from datetime import UTC, datetime

            proj.published_at = datetime.now(UTC)
        db.add(proj)
        bump("projects")

    have_services = set(db.scalars(select(Service.slug).where(Service.deleted_at.is_(None))))
    for i, (title, icon, featured, summary, features, stack) in enumerate(c.SERVICES):
        slug = slugify(title)
        if slug not in have_services:
            db.add(Service(title=title, slug=slug, icon=icon, featured=featured, summary=summary, features=features,
                           tech_stack=stack, status="published", position=i))
            bump("services")

    have_bcats = set(db.scalars(select(BlogCategory.slug)))
    for name in c.BLOG_CATEGORIES:
        if slugify(name) not in have_bcats:
            db.add(BlogCategory(name=name, slug=slugify(name)))
            bump("blog_categories")

    if not db.scalar(select(ResumeFile.id).limit(1)):
        asset = db.scalar(select(MediaAsset).where(MediaAsset.storage_key == "static:/resume.pdf"))
        if asset is None:
            asset = MediaAsset(provider="static", storage_key="static:/resume.pdf", url="/resume.pdf", kind="document",
                               mime_type="application/pdf", original_filename="resume.pdf", alt_text="Resume")
            db.add(asset)
            db.flush()
        db.add(ResumeFile(media_id=asset.id, label="Resume", is_active=True))
        bump("resume_files")

    db.commit()
    return added
