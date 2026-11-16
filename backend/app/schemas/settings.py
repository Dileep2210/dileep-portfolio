from typing import Annotated

from pydantic import EmailStr, Field, field_validator

from .common import AssetUrl, HttpsUrl, Input, Line, Output, ShortList, Text


class Highlight(Input):
    label: Annotated[Line, Field(min_length=1, max_length=60)]
    value: Annotated[Line, Field(min_length=1, max_length=120)]


class SiteSettings(Input):
    """Public-facing site settings. Secrets never live here: they are environment variables."""

    developer_name: Annotated[Line, Field(min_length=2, max_length=120)] = "Dileep Kumar Panchumarthi"
    first_name: Annotated[Line, Field(max_length=60)] = "Dileep"
    headline: Annotated[Line, Field(max_length=160)] = ""
    rotating_roles: ShortList = []
    introduction: Annotated[Text, Field(max_length=2000)] = ""
    bio: Annotated[Text, Field(max_length=5000)] = ""
    philosophy: Annotated[Text, Field(max_length=5000)] = ""
    journey: Annotated[Text, Field(max_length=10000)] = ""
    highlights: Annotated[list[Highlight], Field(max_length=8)] = []
    trust_points: ShortList = []
    email: EmailStr | None = None
    phone: Annotated[Line, Field(max_length=30)] = ""
    location: Annotated[Line, Field(max_length=120)] = ""
    availability: Annotated[Line, Field(max_length=120)] = ""
    profile_image_url: AssetUrl = ""
    resume_url: AssetUrl = ""
    contact_cta_title: Annotated[Line, Field(max_length=160)] = ""
    contact_cta_text: Annotated[Text, Field(max_length=1000)] = ""
    footer_text: Annotated[Line, Field(max_length=300)] = ""
    theme_default: Annotated[str, Field(pattern=r"^(dark|light|system)$")] = "dark"
    site_url: HttpsUrl = ""
    seo_default_title: Annotated[Line, Field(max_length=70)] = ""
    seo_default_description: Annotated[Line, Field(max_length=170)] = ""
    og_image_url: AssetUrl = ""
    budget_options: ShortList = []
    show_testimonial_form: bool = True

    @field_validator("email", mode="before")
    @classmethod
    def _blank_email(cls, v):
        return v or None


class SiteSettingsOut(Output, SiteSettings):
    pass


SETTINGS_KEYS = tuple(SiteSettings.model_fields)
