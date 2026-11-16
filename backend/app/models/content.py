import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDelete, Timestamps, UUIDPk

STATUS_CHECK = "status IN ('draft','published')"


def _live_slug_index(table: str) -> Index:
    return Index(f"uq_{table}_slug_live", "slug", unique=True, postgresql_where=text("deleted_at IS NULL"))


# --------------------------------------------------------------------------- media


class MediaAsset(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "media_assets"
    __table_args__ = (
        CheckConstraint("provider IN ('cloudinary','local','static')", name="provider"),
        CheckConstraint("kind IN ('image','document')", name="kind"),
    )
    provider: Mapped[str] = mapped_column(String(20))
    storage_key: Mapped[str] = mapped_column(String(300), unique=True)
    url: Mapped[str] = mapped_column(String(600))
    kind: Mapped[str] = mapped_column(String(20))
    mime_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    original_filename: Mapped[str] = mapped_column(String(255), default="")
    alt_text: Mapped[str] = mapped_column(String(300), default="")
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class ResumeFile(UUIDPk, Timestamps, Base):
    __tablename__ = "resume_files"
    __table_args__ = (
        Index("uq_resume_files_one_active", "is_active", unique=True, postgresql_where=text("is_active")),
    )
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media_assets.id", ondelete="RESTRICT"))
    label: Mapped[str] = mapped_column(String(120), default="Resume")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    media: Mapped[MediaAsset] = relationship(lazy="joined")

    @property
    def url(self) -> str:
        return self.media.url


# --------------------------------------------------------------------------- projects


class ProjectCategory(UUIDPk, Timestamps, Base):
    __tablename__ = "project_categories"
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(String(300), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)


class ProjectTechnology(UUIDPk, Base):
    __tablename__ = "project_technologies"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_project_technologies_project_name"),)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    position: Mapped[int] = mapped_column(Integer, default=0)


class ProjectMedia(UUIDPk, Base):
    __tablename__ = "project_media"
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media_assets.id", ondelete="RESTRICT"), index=True)
    caption: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    media: Mapped[MediaAsset] = relationship(lazy="joined")

    @property
    def url(self) -> str:
        return self.media.url

    @property
    def alt_text(self) -> str:
        return self.media.alt_text


class Project(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(STATUS_CHECK, name="status"),
        _live_slug_index("projects"),
        Index("ix_projects_status_position", "status", "position"),
    )
    title: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140))
    tagline: Mapped[str] = mapped_column(String(160), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    overview: Mapped[str] = mapped_column(Text, default="")
    challenges: Mapped[str] = mapped_column(Text, default="")
    solutions: Mapped[str] = mapped_column(Text, default="")
    outcomes: Mapped[str] = mapped_column(Text, default="")
    contribution: Mapped[str] = mapped_column(Text, default="")
    architecture: Mapped[str] = mapped_column(Text, default="")
    features: Mapped[list] = mapped_column(JSONB, default=list)
    timeline: Mapped[str] = mapped_column(String(120), default="")
    client_name: Mapped[str] = mapped_column(String(120), default="")
    is_client_project: Mapped[bool] = mapped_column(Boolean, default=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    live_url: Mapped[str] = mapped_column(String(500), default="")
    github_url: Mapped[str] = mapped_column(String(500), default="")
    video_url: Mapped[str] = mapped_column(String(500), default="")
    highlight_label: Mapped[str] = mapped_column(String(60), default="")
    highlight_value: Mapped[str] = mapped_column(String(60), default="")
    cover_url: Mapped[str] = mapped_column(String(600), default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    position: Mapped[int] = mapped_column(Integer, default=0)
    seo_title: Mapped[str] = mapped_column(String(70), default="")
    seo_description: Mapped[str] = mapped_column(String(170), default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("project_categories.id", ondelete="SET NULL"), index=True
    )

    category: Mapped[ProjectCategory | None] = relationship(lazy="joined")
    technology_links: Mapped[list[ProjectTechnology]] = relationship(
        order_by=ProjectTechnology.position, cascade="all, delete-orphan", lazy="selectin"
    )
    gallery: Mapped[list[ProjectMedia]] = relationship(
        order_by=ProjectMedia.position, cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def technologies(self) -> list[str]:
        return [t.name for t in self.technology_links]


# --------------------------------------------------------------------------- services


class Service(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint(STATUS_CHECK, name="status"),
        CheckConstraint("starting_price IS NULL OR starting_price >= 0", name="price_non_negative"),
        _live_slug_index("services"),
    )
    title: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140))
    summary: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    features: Mapped[list] = mapped_column(JSONB, default=list)
    tech_stack: Mapped[list] = mapped_column(JSONB, default=list)
    icon: Mapped[str] = mapped_column(String(40), default="")
    cover_url: Mapped[str] = mapped_column(String(600), default="")
    starting_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    price_currency: Mapped[str] = mapped_column(String(3), default="INR")
    price_note: Mapped[str] = mapped_column(String(120), default="")
    delivery_estimate: Mapped[str] = mapped_column(String(80), default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    position: Mapped[int] = mapped_column(Integer, default=0)
    seo_title: Mapped[str] = mapped_column(String(70), default="")
    seo_description: Mapped[str] = mapped_column(String(170), default="")


# --------------------------------------------------------------------------- skills


class SkillCategory(UUIDPk, Timestamps, Base):
    __tablename__ = "skill_categories"
    name: Mapped[str] = mapped_column(String(60))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    blurb: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)


class Skill(UUIDPk, Timestamps, Base):
    __tablename__ = "skills"
    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_skills_category_name"),)
    name: Mapped[str] = mapped_column(String(60))
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skill_categories.id", ondelete="RESTRICT"), index=True)
    icon: Mapped[str] = mapped_column(String(40), default="")
    color: Mapped[str] = mapped_column(String(9), default="")
    note: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_learning: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[SkillCategory] = relationship(lazy="joined")


# --------------------------------------------------------------------------- testimonials


class Testimonial(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "testimonials"
    __table_args__ = (
        CheckConstraint("rating IS NULL OR (rating BETWEEN 1 AND 5)", name="rating_range"),
        CheckConstraint("approval_status IN ('pending','approved','rejected')", name="approval_status"),
        CheckConstraint("source IN ('admin','public_form')", name="source"),
        Index("ix_testimonials_public", "approval_status", "is_published"),
    )
    client_name: Mapped[str] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(120), default="")
    designation: Mapped[str] = mapped_column(String(120), default="")
    content: Mapped[str] = mapped_column(Text)
    rating: Mapped[int | None] = mapped_column(Integer)
    testimonial_date: Mapped[date | None] = mapped_column(Date)
    avatar_url: Mapped[str] = mapped_column(String(600), default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_status: Mapped[str] = mapped_column(String(20), default="pending")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(20), default="admin")
    submitter_email: Mapped[str] = mapped_column(String(254), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    project: Mapped[Project | None] = relationship(lazy="joined")


# --------------------------------------------------------------------------- blog

blog_post_tags = Table(
    "blog_post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("blog_posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("blog_tags.id", ondelete="CASCADE"), primary_key=True),
)


class BlogCategory(UUIDPk, Timestamps, Base):
    __tablename__ = "blog_categories"
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str] = mapped_column(String(300), default="")


class BlogTag(UUIDPk, Timestamps, Base):
    __tablename__ = "blog_tags"
    name: Mapped[str] = mapped_column(String(60))
    slug: Mapped[str] = mapped_column(String(80), unique=True)


class BlogPost(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "blog_posts"
    __table_args__ = (
        CheckConstraint(STATUS_CHECK, name="status"),
        _live_slug_index("blog_posts"),
        Index("ix_blog_posts_public", "status", "published_at"),
    )
    title: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(180))
    excerpt: Mapped[str] = mapped_column(String(400), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    cover_url: Mapped[str] = mapped_column(String(600), default="")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reading_minutes: Mapped[int] = mapped_column(Integer, default=1)
    seo_title: Mapped[str] = mapped_column(String(70), default="")
    seo_description: Mapped[str] = mapped_column(String(170), default="")
    canonical_url: Mapped[str] = mapped_column(String(500), default="")
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("blog_categories.id", ondelete="SET NULL"), index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    category: Mapped[BlogCategory | None] = relationship(lazy="joined")
    tag_objects: Mapped[list[BlogTag]] = relationship(secondary=blog_post_tags, lazy="selectin", order_by=BlogTag.name)

    @property
    def tags(self) -> list[str]:
        return [t.name for t in self.tag_objects]


# --------------------------------------------------------------------------- profile & site


class Experience(UUIDPk, Timestamps, Base):
    __tablename__ = "experiences"
    __table_args__ = (CheckConstraint("kind IN ('work','education','achievement')", name="kind"),)
    kind: Mapped[str] = mapped_column(String(20), default="work")
    title: Mapped[str] = mapped_column(String(160))
    organization: Mapped[str] = mapped_column(String(160), default="")
    location: Mapped[str] = mapped_column(String(120), default="")
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str] = mapped_column(Text, default="")
    highlights: Mapped[list] = mapped_column(JSONB, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)


class HomepageSection(UUIDPk, Timestamps, Base):
    __tablename__ = "homepage_sections"
    key: Mapped[str] = mapped_column(String(40), unique=True)
    title: Mapped[str] = mapped_column(String(160), default="")
    subtitle: Mapped[str] = mapped_column(String(300), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)


class NavigationItem(UUIDPk, Timestamps, Base):
    __tablename__ = "navigation_items"
    __table_args__ = (CheckConstraint("location IN ('header','footer')", name="location"),)
    label: Mapped[str] = mapped_column(String(60))
    href: Mapped[str] = mapped_column(String(300))
    location: Mapped[str] = mapped_column(String(20), default="header")
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    open_in_new_tab: Mapped[bool] = mapped_column(Boolean, default=False)


class SocialLink(UUIDPk, Timestamps, Base):
    __tablename__ = "social_links"
    platform: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(60))
    url: Mapped[str] = mapped_column(String(500))
    icon: Mapped[str] = mapped_column(String(40), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)


class SeoMetadata(UUIDPk, Timestamps, Base):
    __tablename__ = "seo_metadata"
    page_key: Mapped[str] = mapped_column(String(40), unique=True)
    title: Mapped[str] = mapped_column(String(70), default="")
    description: Mapped[str] = mapped_column(String(170), default="")
    og_image_url: Mapped[str] = mapped_column(String(600), default="")
    canonical_path: Mapped[str] = mapped_column(String(300), default="")
    noindex: Mapped[bool] = mapped_column(Boolean, default=False)


class SiteSetting(UUIDPk, Timestamps, Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(60), unique=True)
    value: Mapped[dict | list | str | int | bool | None] = mapped_column(JSONB)


# --------------------------------------------------------------------------- leads


class ContactLead(UUIDPk, Timestamps, SoftDelete, Base):
    __tablename__ = "contact_leads"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new','contacted','in_discussion','converted','closed')", name="status"
        ),
        CheckConstraint("preferred_contact IN ('email','phone','whatsapp')", name="preferred_contact"),
        Index("ix_contact_leads_status_created", "status", "created_at"),
    )
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254), index=True)
    phone: Mapped[str] = mapped_column(String(30), default="")
    company: Mapped[str] = mapped_column(String(120), default="")
    service_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"))
    service_label: Mapped[str] = mapped_column(String(120), default="")
    budget: Mapped[str] = mapped_column(String(60), default="")
    message: Mapped[str] = mapped_column(Text)
    preferred_contact: Mapped[str] = mapped_column(String(20), default="email")
    status: Mapped[str] = mapped_column(String(20), default="new")
    follow_up_at: Mapped[date | None] = mapped_column(Date)
    source: Mapped[str] = mapped_column(String(40), default="contact_form")
    ip_hash: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(300), default="")

    notes: Mapped[list["LeadNote"]] = relationship(
        back_populates="lead", order_by="LeadNote.created_at.desc()", cascade="all, delete-orphan", lazy="selectin"
    )


class LeadNote(UUIDPk, Timestamps, Base):
    __tablename__ = "lead_notes"
    lead_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contact_leads.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    author_email: Mapped[str] = mapped_column(String(254), default="")
    body: Mapped[str] = mapped_column(Text)
    lead: Mapped[ContactLead] = relationship(back_populates="notes")
