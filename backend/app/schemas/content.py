import json
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Optional

from pydantic import EmailStr, Field, create_model, field_validator, model_validator

from .common import (
    AssetUrl,
    Color,
    HttpsUrl,
    IconKey,
    Input,
    Line,
    Link,
    Output,
    ShortList,
    Slug,
    Status,
    Text,
    _link,
)

Position = Annotated[int, Field(ge=0, le=100_000)]


def partial(model: type[Input], name: str) -> type[Input]:
    """Same fields, all optional, for PATCH bodies (only sent fields are applied)."""
    fields: dict[str, Any] = {}
    for fname, f in model.model_fields.items():
        fields[fname] = (Optional[f.annotation], Field(default=None, **({"alias": f.alias} if f.alias else {})))  # noqa: UP045
    return create_model(name, __base__=Input, **fields)


class Stamped(Output):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ----------------------------------------------------------------------------- categories


class CategoryIn(Input):
    name: Annotated[Line, Field(min_length=2, max_length=80)]
    slug: Slug = ""
    description: Annotated[Line, Field(max_length=300)] = ""
    position: Position = 0


class CategoryOut(Stamped):
    name: str
    slug: str
    description: str = ""
    position: int = 0


class SkillCategoryIn(Input):
    name: Annotated[Line, Field(min_length=2, max_length=60)]
    slug: Slug = ""
    blurb: Annotated[Line, Field(max_length=200)] = ""
    position: Position = 0


class SkillCategoryOut(Stamped):
    name: str
    slug: str
    blurb: str
    position: int


class TagIn(Input):
    name: Annotated[Line, Field(min_length=1, max_length=60)]
    slug: Slug = ""


class TagOut(Stamped):
    name: str
    slug: str


# ----------------------------------------------------------------------------- projects


class GalleryItemIn(Input):
    media_id: uuid.UUID
    caption: Annotated[Line, Field(max_length=200)] = ""


class GalleryItemOut(Output):
    media_id: uuid.UUID
    url: str
    alt_text: str
    caption: str


class ProjectIn(Input):
    title: Annotated[Line, Field(min_length=2, max_length=120)]
    slug: Slug = ""
    tagline: Annotated[Line, Field(max_length=160)] = ""
    summary: Annotated[Text, Field(max_length=1000)] = ""
    overview: Annotated[Text, Field(max_length=20000)] = ""
    challenges: Annotated[Text, Field(max_length=20000)] = ""
    solutions: Annotated[Text, Field(max_length=20000)] = ""
    outcomes: Annotated[Text, Field(max_length=20000)] = ""
    contribution: Annotated[Text, Field(max_length=20000)] = ""
    architecture: Annotated[Text, Field(max_length=20000)] = ""
    features: ShortList = []
    timeline: Annotated[Line, Field(max_length=120)] = ""
    client_name: Annotated[Line, Field(max_length=120)] = ""
    is_client_project: bool = False
    is_demo: bool = False
    live_url: HttpsUrl = ""
    github_url: HttpsUrl = ""
    video_url: HttpsUrl = ""
    highlight_label: Annotated[Line, Field(max_length=60)] = ""
    highlight_value: Annotated[Line, Field(max_length=60)] = ""
    cover_url: AssetUrl = ""
    featured: bool = False
    status: Status = "draft"
    position: Position = 0
    seo_title: Annotated[Line, Field(max_length=70)] = ""
    seo_description: Annotated[Line, Field(max_length=170)] = ""
    category_id: uuid.UUID | None = None
    technologies: Annotated[list[Annotated[Line, Field(min_length=1, max_length=60)]], Field(max_length=30)] = []
    gallery: Annotated[list[GalleryItemIn], Field(max_length=30)] = []


ProjectPatch = partial(ProjectIn, "ProjectPatch")


class ProjectOut(Stamped):
    title: str
    slug: str
    tagline: str
    summary: str
    overview: str
    challenges: str
    solutions: str
    outcomes: str
    contribution: str
    architecture: str
    features: list[str]
    timeline: str
    client_name: str
    is_client_project: bool
    is_demo: bool
    live_url: str
    github_url: str
    video_url: str
    highlight_label: str
    highlight_value: str
    cover_url: str
    featured: bool
    status: str
    position: int
    seo_title: str
    seo_description: str
    published_at: datetime | None
    category_id: uuid.UUID | None
    category: CategoryOut | None
    technologies: list[str]
    gallery: list[GalleryItemOut]
    deleted_at: datetime | None = None


# ----------------------------------------------------------------------------- services


class ServiceIn(Input):
    title: Annotated[Line, Field(min_length=2, max_length=120)]
    slug: Slug = ""
    summary: Annotated[Text, Field(max_length=1000)] = ""
    content: Annotated[Text, Field(max_length=20000)] = ""
    features: ShortList = []
    tech_stack: ShortList = []
    icon: IconKey = ""
    cover_url: AssetUrl = ""
    starting_price: Annotated[Decimal, Field(ge=0, le=100_000_000, max_digits=12, decimal_places=2)] | None = None
    price_currency: Annotated[str, Field(pattern=r"^[A-Z]{3}$")] = "INR"
    price_note: Annotated[Line, Field(max_length=120)] = ""
    delivery_estimate: Annotated[Line, Field(max_length=80)] = ""
    featured: bool = False
    status: Status = "draft"
    position: Position = 0
    seo_title: Annotated[Line, Field(max_length=70)] = ""
    seo_description: Annotated[Line, Field(max_length=170)] = ""


ServicePatch = partial(ServiceIn, "ServicePatch")


class ServiceOut(Stamped):
    title: str
    slug: str
    summary: str
    content: str
    features: list[str]
    tech_stack: list[str]
    icon: str
    cover_url: str
    starting_price: Decimal | None
    price_currency: str
    price_note: str
    delivery_estimate: str
    featured: bool
    status: str
    position: int
    seo_title: str
    seo_description: str
    deleted_at: datetime | None = None


# ----------------------------------------------------------------------------- skills


class SkillIn(Input):
    name: Annotated[Line, Field(min_length=1, max_length=60)]
    category_id: uuid.UUID
    icon: IconKey = ""
    color: Color = ""
    note: Annotated[Line, Field(max_length=200)] = ""
    position: Position = 0
    featured: bool = False
    is_active: bool = True
    is_learning: bool = False


SkillPatch = partial(SkillIn, "SkillPatch")


class SkillOut(Stamped):
    name: str
    category_id: uuid.UUID
    category: SkillCategoryOut
    icon: str
    color: str
    note: str
    position: int
    featured: bool
    is_active: bool
    is_learning: bool


# ----------------------------------------------------------------------------- testimonials


class TestimonialIn(Input):
    client_name: Annotated[Line, Field(min_length=2, max_length=120)]
    company: Annotated[Line, Field(max_length=120)] = ""
    designation: Annotated[Line, Field(max_length=120)] = ""
    content: Annotated[Text, Field(min_length=10, max_length=3000)]
    rating: Annotated[int, Field(ge=1, le=5)] | None = None
    testimonial_date: date | None = None
    avatar_url: AssetUrl = ""
    featured: bool = False
    approval_status: Annotated[str, Field(pattern=r"^(pending|approved|rejected)$")] = "pending"
    is_published: bool = False
    consent_confirmed: bool = False
    position: Position = 0
    project_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _publish_rules(self):
        if self.is_published and self.approval_status != "approved":
            raise ValueError("Only approved testimonials can be published.")
        if self.is_published and not self.consent_confirmed:
            raise ValueError("Confirm the client's consent before publishing.")
        return self


TestimonialPatch = partial(TestimonialIn, "TestimonialPatch")  # merged-state rules checked in the resource hook


class TestimonialOut(Stamped):
    client_name: str
    company: str
    designation: str
    content: str
    rating: int | None
    testimonial_date: date | None
    avatar_url: str
    featured: bool
    approval_status: str
    is_published: bool
    consent_confirmed: bool
    source: str
    submitter_email: str
    position: int
    project_id: uuid.UUID | None
    deleted_at: datetime | None = None


class TestimonialSubmit(Input):
    """Public, moderated submission. Never published automatically."""

    client_name: Annotated[Line, Field(min_length=2, max_length=120)]
    email: EmailStr
    company: Annotated[Line, Field(max_length=120)] = ""
    designation: Annotated[Line, Field(max_length=120)] = ""
    content: Annotated[Text, Field(min_length=20, max_length=3000)]
    rating: Annotated[int, Field(ge=1, le=5)] | None = None
    project_slug: Annotated[str, Field(max_length=140)] = ""
    consent: bool
    website: Annotated[str, Field(max_length=500)] = ""  # honeypot

    @field_validator("consent")
    @classmethod
    def _must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Please agree to have your testimonial reviewed and published.")
        return v


# ----------------------------------------------------------------------------- blog


class BlogPostIn(Input):
    title: Annotated[Line, Field(min_length=3, max_length=160)]
    slug: Slug = ""
    excerpt: Annotated[Text, Field(max_length=400)] = ""
    content: Annotated[Text, Field(max_length=100_000)] = ""
    cover_url: AssetUrl = ""
    status: Status = "draft"
    published_at: datetime | None = None
    seo_title: Annotated[Line, Field(max_length=70)] = ""
    seo_description: Annotated[Line, Field(max_length=170)] = ""
    canonical_url: HttpsUrl = ""
    category_id: uuid.UUID | None = None
    tags: Annotated[list[Annotated[Line, Field(min_length=1, max_length=60)]], Field(max_length=15)] = []


BlogPostPatch = partial(BlogPostIn, "BlogPostPatch")


class BlogPostOut(Stamped):
    title: str
    slug: str
    excerpt: str
    content: str
    cover_url: str
    status: str
    published_at: datetime | None
    reading_minutes: int
    seo_title: str
    seo_description: str
    canonical_url: str
    category_id: uuid.UUID | None
    category: CategoryOut | None
    tags: list[str]
    deleted_at: datetime | None = None


# ----------------------------------------------------------------------------- experience


class ExperienceIn(Input):
    kind: Annotated[str, Field(pattern=r"^(work|education|achievement)$")] = "work"
    title: Annotated[Line, Field(min_length=2, max_length=160)]
    organization: Annotated[Line, Field(max_length=160)] = ""
    location: Annotated[Line, Field(max_length=120)] = ""
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool = False
    description: Annotated[Text, Field(max_length=5000)] = ""
    highlights: ShortList = []
    position: Position = 0
    is_visible: bool = True

    @model_validator(mode="after")
    def _dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must be after the start date.")
        return self


ExperiencePatch = partial(ExperienceIn, "ExperiencePatch")


class ExperienceOut(Stamped):
    kind: str
    title: str
    organization: str
    location: str
    start_date: date | None
    end_date: date | None
    is_current: bool
    description: str
    highlights: list[str]
    position: int
    is_visible: bool


# ----------------------------------------------------------------------------- homepage / nav / social / seo

HOMEPAGE_KEYS = (
    "hero", "intro", "about", "skills", "services", "projects", "testimonials", "process", "why_me", "contact_cta",
)


def _check_data(value: Any, depth: int = 0) -> None:
    if depth > 4:
        raise ValueError("data is nested too deeply")
    if isinstance(value, dict):
        if len(value) > 40:
            raise ValueError("too many keys in data")
        for k, v in value.items():
            if not isinstance(k, str) or len(k) > 40:
                raise ValueError("invalid key in data")
            if isinstance(v, str) and (k.endswith("href") or k.endswith("url")):
                _link(v)
            _check_data(v, depth + 1)
    elif isinstance(value, list):
        if len(value) > 40:
            raise ValueError("too many items in data")
        for v in value:
            _check_data(v, depth + 1)
    elif isinstance(value, str):
        if len(value) > 3000:
            raise ValueError("text in data is too long")
    elif value is not None and not isinstance(value, (int, float, bool)):
        raise ValueError("unsupported value in data")


class HomepageSectionIn(Input):
    key: Annotated[str, Field(pattern="^(" + "|".join(HOMEPAGE_KEYS) + ")$")]
    title: Annotated[Line, Field(max_length=160)] = ""
    subtitle: Annotated[Line, Field(max_length=300)] = ""
    body: Annotated[Text, Field(max_length=10000)] = ""
    data: dict[str, Any] = {}
    position: Position = 0
    is_visible: bool = True

    @field_validator("data")
    @classmethod
    def _data(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(v)) > 30_000:
            raise ValueError("data is too large")
        _check_data(v)
        return v


HomepageSectionPatch = partial(HomepageSectionIn, "HomepageSectionPatch")


class HomepageSectionOut(Stamped):
    key: str
    title: str
    subtitle: str
    body: str
    data: dict[str, Any]
    position: int
    is_visible: bool


class NavigationItemIn(Input):
    label: Annotated[Line, Field(min_length=1, max_length=60)]
    href: Link
    location: Annotated[str, Field(pattern=r"^(header|footer)$")] = "header"
    position: Position = 0
    is_visible: bool = True
    open_in_new_tab: bool = False


NavigationItemPatch = partial(NavigationItemIn, "NavigationItemPatch")


class NavigationItemOut(Stamped):
    label: str
    href: str
    location: str
    position: int
    is_visible: bool
    open_in_new_tab: bool


class SocialLinkIn(Input):
    platform: Annotated[Line, Field(min_length=2, max_length=40)]
    label: Annotated[Line, Field(min_length=1, max_length=60)]
    url: Annotated[Link, Field(min_length=1)]
    icon: IconKey = ""
    position: Position = 0
    is_visible: bool = True


SocialLinkPatch = partial(SocialLinkIn, "SocialLinkPatch")


class SocialLinkOut(Stamped):
    platform: str
    label: str
    url: str
    icon: str
    position: int
    is_visible: bool


SEO_PAGE_KEYS = ("home", "about", "services", "projects", "blog", "contact", "testimonials")


class SeoMetadataIn(Input):
    page_key: Annotated[str, Field(pattern="^(" + "|".join(SEO_PAGE_KEYS) + ")$")]
    title: Annotated[Line, Field(max_length=70)] = ""
    description: Annotated[Line, Field(max_length=170)] = ""
    og_image_url: AssetUrl = ""
    canonical_path: Annotated[str, Field(max_length=300, pattern=r"^(/[A-Za-z0-9/_-]*)?$")] = ""
    noindex: bool = False


SeoMetadataPatch = partial(SeoMetadataIn, "SeoMetadataPatch")


class SeoMetadataOut(Stamped):
    page_key: str
    title: str
    description: str
    og_image_url: str
    canonical_path: str
    noindex: bool


# ----------------------------------------------------------------------------- media / resume


class MediaOut(Stamped):
    provider: str
    url: str
    kind: str
    mime_type: str
    size_bytes: int
    width: int | None
    height: int | None
    original_filename: str
    alt_text: str


class MediaPatch(Input):
    alt_text: Annotated[Line, Field(max_length=300)]


class ResumeIn(Input):
    media_id: uuid.UUID
    label: Annotated[Line, Field(min_length=1, max_length=120)] = "Resume"
    is_active: bool = False


ResumePatch = partial(ResumeIn, "ResumePatch")


class ResumeOut(Stamped):
    media_id: uuid.UUID
    label: str
    is_active: bool
    url: str
