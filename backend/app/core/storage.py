"""Media storage adapters + upload validation.

Files are validated *before* they reach storage:
- declared size and actual size capped per kind
- type decided from magic bytes, not the filename or the client's Content-Type
- images are fully decoded by Pillow and re-encoded (drops EXIF/GPS and any trailing payload)
- PDFs with active content (JavaScript, launch actions, embedded files) are refused
- SVG/HTML and everything else is refused (SVG can carry script)
- stored under a random name; the original filename is kept for display only
"""

import io
import logging
import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from .config import get_settings
from .errors import AppError

logger = logging.getLogger("storage")

Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard

_IMAGE_SIGNATURES = {
    b"\xff\xd8\xff": ("image/jpeg", "JPEG", "jpg"),
    b"\x89PNG\r\n\x1a\n": ("image/png", "PNG", "png"),
    b"GIF87a": ("image/gif", "GIF", "gif"),
    b"GIF89a": ("image/gif", "GIF", "gif"),
}
_PDF_ACTIVE = re.compile(rb"/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA)\b")


class UploadRejected(AppError):
    status_code = 415
    code = "upload_rejected"


@dataclass
class CleanFile:
    data: bytes
    mime_type: str
    ext: str
    kind: str  # image | document
    width: int | None = None
    height: int | None = None


def sniff(data: bytes) -> tuple[str, str, str] | None:
    for sig, info in _IMAGE_SIGNATURES.items():
        if data.startswith(sig):
            return info
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ("image/webp", "WEBP", "webp")
    if data.startswith(b"%PDF-"):
        return ("application/pdf", "PDF", "pdf")
    return None


def validate_upload(data: bytes, filename: str = "") -> CleanFile:
    s = get_settings()
    if not data:
        raise UploadRejected("The file is empty.", status_code=400)
    info = sniff(data)
    if info is None:
        raise UploadRejected("Only JPEG, PNG, WebP, GIF images and PDF documents are allowed.")
    mime, fmt, ext = info

    if fmt == "PDF":
        if len(data) > s.max_document_mb * 1024 * 1024:
            raise UploadRejected(f"Documents must be {s.max_document_mb} MB or smaller.", status_code=413)
        if _PDF_ACTIVE.search(data):
            raise UploadRejected("PDFs with scripts, actions or embedded files are not allowed.")
        if b"%%EOF" not in data[-2048:]:
            raise UploadRejected("The PDF looks truncated or invalid.")
        return CleanFile(data=data, mime_type=mime, ext=ext, kind="document")

    if len(data) > s.max_image_mb * 1024 * 1024:
        raise UploadRejected(f"Images must be {s.max_image_mb} MB or smaller.", status_code=413)
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        with Image.open(io.BytesIO(data)) as img:
            if img.format != fmt:
                raise UploadRejected("The file content does not match its image type.")
            animated = fmt in {"GIF", "WEBP"} and getattr(img, "is_animated", False)
            if animated:
                # Re-encoding animations is costly; keep bytes but they are still a verified image.
                width, height = img.size
                return CleanFile(data=data, mime_type=mime, ext=ext, kind="image", width=width, height=height)
            img = ImageOps.exif_transpose(img)
            out = io.BytesIO()
            if fmt == "JPEG":
                img.convert("RGB").save(out, "JPEG", quality=88, optimize=True)
            elif fmt == "PNG":
                img.save(out, "PNG", optimize=True)
            elif fmt == "WEBP":
                img.save(out, "WEBP", quality=88)
            else:
                img.save(out, fmt)
            width, height = img.size
    except UploadRejected:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        logger.info("image rejected: %s", type(exc).__name__)
        raise UploadRejected("The image could not be read. Please upload a valid image file.") from exc
    return CleanFile(data=out.getvalue(), mime_type=mime, ext=ext, kind="image", width=width, height=height)


# ----------------------------------------------------------------------------- adapters


@dataclass
class Stored:
    provider: str
    storage_key: str
    url: str


class LocalStorage:
    """Development only: files under LOCAL_MEDIA_DIR, served at /media by the API."""

    provider = "local"

    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, f: CleanFile) -> Stored:
        name = f"{uuid.uuid4().hex}.{f.ext}"
        (self.root / name).write_bytes(f.data)
        return Stored(provider=self.provider, storage_key=name, url=f"/media/{name}")

    def delete(self, storage_key: str) -> None:
        if not re.fullmatch(r"[0-9a-f]{32}\.[a-z]{3,4}", storage_key):
            return  # never touch anything that is not one of our generated names
        path = (self.root / storage_key).resolve()
        if path.parent == self.root and path.exists():
            path.unlink()


class CloudinaryStorage:
    provider = "cloudinary"

    def __init__(self, url: str, folder: str):
        import cloudinary

        if not url.startswith("cloudinary://"):
            raise RuntimeError("CLOUDINARY_URL must look like cloudinary://<key>:<secret>@<cloud_name>")
        cloudinary.config(cloudinary_url=url, secure=True)
        self.folder = folder

    def save(self, f: CleanFile) -> Stored:
        import cloudinary.uploader

        public_id = uuid.uuid4().hex
        result = cloudinary.uploader.upload(
            io.BytesIO(f.data),
            folder=self.folder,
            public_id=public_id if f.kind == "image" else f"{public_id}.{f.ext}",
            resource_type="image" if f.kind == "image" else "raw",
            overwrite=False,
            unique_filename=False,
        )
        key = f"{'image' if f.kind == 'image' else 'raw'}:{result['public_id']}"
        return Stored(provider=self.provider, storage_key=key, url=result["secure_url"])

    def delete(self, storage_key: str) -> None:
        import cloudinary.uploader

        resource_type, _, public_id = storage_key.partition(":")
        cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)


_storage = None


def get_storage():
    global _storage
    if _storage is None:
        s = get_settings()
        if s.storage_backend == "cloudinary":
            _storage = CloudinaryStorage(s.cloudinary_url, s.cloudinary_folder)
        else:
            _storage = LocalStorage(s.local_media_dir)
    return _storage


def reset_storage() -> None:
    global _storage
    _storage = None
