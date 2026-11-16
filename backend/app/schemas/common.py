import re
import unicodedata
from typing import Annotated, Generic, TypeVar
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

T = TypeVar("T")

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")
_LINE_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f]")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value[:120] or "item"


def _single_line(v: str) -> str:
    if _LINE_CONTROL.search(v):
        raise ValueError("must be a single line without control characters")
    return v


def _multi_line(v: str) -> str:
    v = v.replace("\r\n", "\n").replace("\r", "\n")
    if _CONTROL.search(v):
        raise ValueError("contains invalid control characters")
    return v


def _slug(v: str) -> str:
    if v and not SLUG_RE.match(v):
        raise ValueError("use lowercase letters, numbers and single hyphens only")
    return v


def _check_url(v: str, *, allow_relative: bool, allow_mailto: bool = False, allow_anchor: bool = False) -> str:
    if not v:
        return v
    if _LINE_CONTROL.search(v) or " " in v:
        raise ValueError("must not contain spaces or control characters")
    if allow_anchor and re.fullmatch(r"#[A-Za-z][\w-]*", v):
        return v
    if allow_relative and v.startswith("/") and not v.startswith("//") and "\\" not in v:
        return v
    parsed = urlparse(v)
    if allow_mailto and parsed.scheme == "mailto" and "@" in parsed.path:
        return v
    if parsed.scheme == "https" and parsed.netloc:
        return v
    raise ValueError("must be an https:// URL" + (" or a site path starting with /" if allow_relative else ""))


def _https_url(v: str) -> str:
    return _check_url(v, allow_relative=False)


def _asset_url(v: str) -> str:
    return _check_url(v, allow_relative=True)


def _link(v: str) -> str:
    return _check_url(v, allow_relative=True, allow_mailto=True, allow_anchor=True)


Line = Annotated[str, AfterValidator(_single_line)]
Text = Annotated[str, AfterValidator(_multi_line)]
Slug = Annotated[str, Field(max_length=140), AfterValidator(_slug)]
HttpsUrl = Annotated[str, Field(max_length=500), AfterValidator(_https_url)]
AssetUrl = Annotated[str, Field(max_length=600), AfterValidator(_asset_url)]
Link = Annotated[str, Field(max_length=500), AfterValidator(_link)]
IconKey = Annotated[str, Field(max_length=40, pattern=r"^[A-Za-z0-9_-]*$")]
Color = Annotated[str, Field(max_length=9, pattern=r"^(#[0-9A-Fa-f]{3,8})?$")]
Status = Annotated[str, Field(pattern=r"^(draft|published)$")]
ShortList = Annotated[list[Annotated[str, Field(min_length=1, max_length=200), AfterValidator(_single_line)]], Field(max_length=30)]
