import io
import os

from PIL import Image

from tests.conftest import MEDIA_DIR

A = "/api/v1/admin"


def _png(size=(40, 30), exif=False) -> bytes:
    img = Image.new("RGB", size, (200, 50, 50))
    buf = io.BytesIO()
    if exif:
        ex = Image.Exif()
        ex[0x010F] = "SecretCameraMaker"
        img.save(buf, "JPEG", exif=ex)
    else:
        img.save(buf, "PNG")
    return buf.getvalue()


PDF_OK = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


def upload(c, data: bytes, name: str, ctype: str = "application/octet-stream", alt: str = ""):
    return c.post(f"{A}/media", files={"file": (name, data, ctype)}, data={"alt_text": alt})


def test_image_upload_is_validated_renamed_and_reencoded(admin):
    r = upload(admin, _png(exif=True), "../../etc/passwd.jpg", "image/jpeg", alt="Profile")
    assert r.status_code == 201, r.text
    m = r.json()
    assert m["mime_type"] == "image/jpeg" and m["width"] == 40 and m["alt_text"] == "Profile"
    assert m["original_filename"] == "passwd.jpg"
    stored = os.path.join(MEDIA_DIR, m["url"].rsplit("/", 1)[1])
    assert os.path.exists(stored) and ".." not in m["url"]
    assert b"SecretCameraMaker" not in open(stored, "rb").read()  # EXIF stripped
    served = admin.get(m["url"])
    assert served.status_code == 200 and "sandbox" in served.headers["content-security-policy"]


def test_dangerous_files_rejected(admin):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    assert upload(admin, svg, "logo.svg", "image/svg+xml").status_code == 415
    assert upload(admin, b"<html><script>alert(1)</script></html>", "x.png", "image/png").status_code == 415
    assert upload(admin, b"MZ\x90\x00" + b"\x00" * 100, "setup.exe").status_code == 415
    assert upload(admin, b"\x89PNG\r\n\x1a\n" + b"garbage" * 10, "broken.png", "image/png").status_code == 415
    polyglot = _png() + b"<?php system($_GET['c']); ?>"
    r = upload(admin, polyglot, "shell.php.png", "image/png")
    if r.status_code == 201:  # accepted only after re-encoding, which drops the trailing payload
        path = os.path.join(MEDIA_DIR, r.json()["url"].rsplit("/", 1)[1])
        assert b"<?php" not in open(path, "rb").read()
    js_pdf = PDF_OK.replace(b"/Type/Catalog", b"/Type/Catalog/OpenAction<</S/JavaScript/JS(app.alert(1))>>")
    assert upload(admin, js_pdf, "cv.pdf", "application/pdf").status_code == 415
    assert upload(admin, b"", "empty.png").status_code == 400


def test_size_limits(admin, monkeypatch):
    monkeypatch.setenv("MAX_IMAGE_MB", "1")
    from app.core.config import get_settings

    get_settings.cache_clear()
    big = _png(size=(3000, 3000))
    noisy = Image.effect_noise((1400, 1400), 100).convert("RGB")
    buf = io.BytesIO()
    noisy.save(buf, "PNG")
    assert len(buf.getvalue()) > 1024 * 1024
    assert upload(admin, buf.getvalue(), "big.png", "image/png").status_code == 413
    assert upload(admin, big, "fine.png", "image/png").status_code in (201, 413)


def test_pdf_resume_flow_and_in_use_protection(admin, client):
    pdf = upload(admin, PDF_OK, "resume.pdf", "application/pdf").json()
    img = upload(admin, _png(), "a.png", "image/png").json()
    assert admin.post(f"{A}/resumes", json={"media_id": img["id"], "label": "Wrong"}).status_code == 422
    first = admin.post(f"{A}/resumes", json={"media_id": pdf["id"], "label": "2026", "is_active": True}).json()
    pdf2 = upload(admin, PDF_OK, "resume2.pdf", "application/pdf").json()
    admin.post(f"{A}/resumes", json={"media_id": pdf2["id"], "label": "2027", "is_active": True})
    actives = [r for r in admin.get(f"{A}/resumes").json()["items"] if r["is_active"]]
    assert len(actives) == 1 and actives[0]["label"] == "2027"
    assert client.get("/api/v1/public/site").json()["resume_url"] == pdf2["url"]
    r = admin.delete(f"{A}/media/{pdf['id']}")
    assert r.status_code == 409 and r.json()["error"]["code"] == "in_use"
    admin.delete(f"{A}/resumes/{first['id']}")
    assert admin.delete(f"{A}/media/{pdf['id']}").status_code == 204


def test_gallery_and_cover_usage(admin, client):
    img = upload(admin, _png(), "shot.png", "image/png").json()
    proj = admin.post(f"{A}/projects", json={"title": "Gallery", "status": "published", "cover_url": img["url"],
                                             "gallery": [{"media_id": img["id"], "caption": "Home page"}]}).json()
    assert proj["gallery"][0]["url"] == img["url"]
    assert client.get("/api/v1/public/projects/gallery").json()["project"]["gallery"][0]["caption"] == "Home page"
    assert admin.delete(f"{A}/media/{img['id']}").status_code == 409
    import uuid

    bad = admin.post(f"{A}/projects", json={"title": "Bad gallery", "gallery": [{"media_id": str(uuid.uuid4())}]})
    assert bad.status_code == 422


def test_media_library_search_and_alt_text(admin, viewer):
    m = upload(admin, _png(), "team-photo.png", "image/png").json()
    assert admin.get(f"{A}/media", params={"q": "team"}).json()["total"] == 1
    assert admin.patch(f"{A}/media/{m['id']}", json={"alt_text": "Team at work"}).json()["alt_text"] == "Team at work"
    assert viewer.get(f"{A}/media").status_code == 200
    assert upload(viewer, _png(), "x.png", "image/png").status_code == 403
    assert viewer.delete(f"{A}/media/{m['id']}").status_code == 403
