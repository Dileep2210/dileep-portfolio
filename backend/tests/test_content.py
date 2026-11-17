from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.database import new_session

P = "/api/v1/public"
A = "/api/v1/admin"


def test_project_lifecycle_draft_publish_edit_delete(admin, client):
    cat = admin.post(f"{A}/project-categories", json={"name": "Client Work"}).json()
    assert cat["slug"] == "client-work"
    r = admin.post(f"{A}/projects", json={
        "title": "Acme Store", "summary": "A store.", "category_id": cat["id"],
        "technologies": ["React", "FastAPI", "react"], "features": ["Cart"], "live_url": "https://acme.example",
    })
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["slug"] == "acme-store" and p["status"] == "draft" and p["technologies"] == ["React", "FastAPI"]
    assert client.get(f"{P}/projects/acme-store").status_code == 404
    assert client.get(f"{P}/projects").json()["total"] == 0

    pub = admin.patch(f"{A}/projects/{p['id']}", json={"status": "published"}).json()
    assert pub["published_at"] is not None
    assert client.get(f"{P}/projects").json()["total"] == 1
    detail = client.get(f"{P}/projects/acme-store").json()
    assert detail["project"]["title"] == "Acme Store" and detail["project"]["category"]["slug"] == "client-work"

    # Re-sending the same technologies (as the admin form does) must not violate the unique constraint.
    r = admin.patch(f"{A}/projects/{p['id']}", json={"technologies": ["FastAPI", "React", "Docker"], "slug": "acme-store"})
    assert r.status_code == 200, r.text
    assert r.json()["technologies"] == ["FastAPI", "React", "Docker"]
    admin.patch(f"{A}/projects/{p['id']}", json={"title": "Acme Store v2", "featured": True})
    assert client.get(f"{P}/projects/acme-store").json()["project"]["title"] == "Acme Store v2"
    assert client.get(f"{P}/projects", params={"featured": True}).json()["total"] == 1
    assert client.get(f"{P}/projects", params={"tech": "fastapi"}).json()["total"] == 1
    assert client.get(f"{P}/projects", params={"category": "client-work"}).json()["total"] == 1
    assert client.get(f"{P}/projects", params={"q": "acme"}).json()["total"] == 1
    assert client.get(f"{P}/project-categories").json()[0]["slug"] == "client-work"

    assert admin.delete(f"{A}/projects/{p['id']}").status_code == 204
    assert client.get(f"{P}/projects/acme-store").status_code == 404
    assert admin.get(f"{A}/projects").json()["total"] == 0
    assert admin.get(f"{A}/projects", params={"include_deleted": True}).json()["total"] == 1
    assert admin.post(f"{A}/projects/{p['id']}/restore").json()["deleted_at"] is None


def test_slug_conflict_and_validation(admin):
    assert admin.post(f"{A}/services", json={"title": "Same"}).status_code == 201
    r = admin.post(f"{A}/services", json={"title": "Same"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "duplicate"
    assert admin.post(f"{A}/services", json={"title": "Bad slug", "slug": "Not A Slug"}).status_code == 422
    assert admin.post(f"{A}/services", json={"title": "x"}).status_code == 422  # too short
    assert admin.post(f"{A}/services", json={"title": "Price", "starting_price": -1}).status_code == 422
    assert admin.post(f"{A}/services", json={"title": "Extra", "unknown_field": 1}).status_code == 422
    assert admin.patch(f"{A}/services/{admin.get(f'{A}/services').json()['items'][0]['id']}", json={"title": None}).status_code == 422


@pytest.mark.parametrize("field,value", [
    ("live_url", "javascript:alert(1)"), ("live_url", "http://insecure.example"), ("github_url", "data:text/html,x"),
    ("cover_url", "//evil.example/x.png"), ("cover_url", "javascript:alert(1)"), ("video_url", "https://ok.example/a b"),
])
def test_unsafe_urls_rejected(admin, field, value):
    assert admin.post(f"{A}/projects", json={"title": "Url test", field: value}).status_code == 422


def test_unsafe_navigation_and_homepage_links_rejected(admin):
    assert admin.post(f"{A}/navigation", json={"label": "x", "href": "javascript:alert(1)"}).status_code == 422
    assert admin.post(f"{A}/navigation", json={"label": "ok", "href": "#contact"}).status_code == 201
    bad = {"key": "hero", "data": {"primary_cta": {"label": "Go", "href": "javascript:alert(1)"}}}
    assert admin.post(f"{A}/homepage-sections", json=bad).status_code == 422


def test_xss_payload_stored_as_plain_text(admin, client):
    payload = '<script>alert("x")</script><img src=x onerror=alert(1)>'
    s = admin.post(f"{A}/services", json={"title": "XSS check", "summary": payload, "status": "published"}).json()
    body = client.get(f"{P}/services/{s['slug']}")
    assert body.headers["content-type"].startswith("application/json")
    assert body.json()["summary"] == payload  # returned as data; the frontend renders text, never HTML


def test_sql_injection_payloads_are_inert(admin, client):
    admin.post(f"{A}/projects", json={"title": "Real project", "status": "published"})
    for q in ["' OR 1=1 --", "%'; DROP TABLE projects; --", "_%", "\\"]:
        r = client.get(f"{P}/projects", params={"q": q})
        assert r.status_code == 200 and r.json()["total"] == 0, q
        assert admin.get(f"{A}/projects", params={"q": q}).status_code == 200
    assert admin.get(f"{A}/projects", params={"sort": "title; DROP TABLE projects"}).status_code == 422
    assert admin.get(f"{A}/projects", params={"status": "x' OR '1'='1"}).json()["total"] == 0
    assert client.get(f"{P}/projects").json()["total"] == 1


def test_pagination_and_sorting(admin):
    for i in range(7):
        admin.post(f"{A}/skill-categories", json={"name": f"Category {i}", "position": 7 - i})
    page = admin.get(f"{A}/skill-categories", params={"page": 2, "page_size": 3, "sort": "name"}).json()
    assert page["total"] == 7 and page["page"] == 2 and [x["name"] for x in page["items"]] == ["Category 3", "Category 4", "Category 5"]
    desc = admin.get(f"{A}/skill-categories", params={"sort": "-position", "page_size": 1}).json()
    assert desc["items"][0]["name"] == "Category 0"
    assert admin.get(f"{A}/skill-categories", params={"page_size": 1000}).status_code == 422


def test_text_sorting_is_human_order(admin):
    # Byte-order collation put accented and lowercase titles after "Z"; ICU sorts them naturally.
    for title in ["Zebra Site", "Élané Salon", "apple shop", "Soda"]:
        admin.post(f"{A}/projects", json={"title": title})
    titles = [p["title"] for p in admin.get(f"{A}/projects", params={"sort": "title"}).json()["items"]]
    assert titles == ["apple shop", "Élané Salon", "Soda", "Zebra Site"]


def test_service_crud_and_public(admin, client):
    s = admin.post(f"{A}/services", json={
        "title": "API Integration", "summary": "Connect things.", "features": ["Webhooks"], "tech_stack": ["FastAPI"],
        "icon": "Cable", "starting_price": "15000", "delivery_estimate": "1-2 weeks", "status": "published",
    }).json()
    assert client.get(f"{P}/services").json()[0]["slug"] == "api-integration"
    assert client.get(f"{P}/services/api-integration").json()["starting_price"] == "15000.00"
    admin.patch(f"{A}/services/{s['id']}", json={"status": "draft"})
    assert client.get(f"{P}/services").json() == []
    assert client.get(f"{P}/services/api-integration").status_code == 404


def test_testimonial_moderation(admin, client):
    proj = admin.post(f"{A}/projects", json={"title": "Client Site", "status": "published"}).json()
    t = admin.post(f"{A}/testimonials", json={
        "client_name": "Jane Client", "content": "Great work on our store.", "rating": 5, "project_id": proj["id"],
    }).json()
    assert t["approval_status"] == "pending" and t["is_published"] is False
    assert client.get(f"{P}/testimonials").json() == []
    r = admin.patch(f"{A}/testimonials/{t['id']}", json={"is_published": True})
    assert r.status_code == 422  # not approved yet
    r = admin.patch(f"{A}/testimonials/{t['id']}", json={"approval_status": "approved", "is_published": True})
    assert r.status_code == 422  # consent not confirmed
    assert admin.patch(f"{A}/testimonials/{t['id']}", json={"approval_status": "approved", "consent_confirmed": True, "is_published": True}).status_code == 200
    pub = client.get(f"{P}/testimonials").json()
    assert len(pub) == 1 and pub[0]["project_slug"] == "client-site" and "submitter_email" not in pub[0]
    assert len(client.get(f"{P}/projects/client-site").json()["testimonials"]) == 1
    assert admin.post(f"{A}/testimonials", json={"client_name": "X Y", "content": "Rating too high!", "rating": 6}).status_code == 422
    admin.patch(f"{A}/testimonials/{t['id']}", json={"approval_status": "rejected"})
    assert client.get(f"{P}/testimonials").json() == []


def test_public_testimonial_submission_is_moderated(client, admin):
    r = client.post(f"{P}/testimonials", json={
        "client_name": "Visitor Person", "email": "v@example.com", "content": "Working together was smooth and quick.",
        "rating": 4, "consent": True,
    })
    assert r.status_code == 202
    assert client.get(f"{P}/testimonials").json() == []
    items = admin.get(f"{A}/testimonials", params={"source": "public_form"}).json()["items"]
    assert len(items) == 1 and items[0]["approval_status"] == "pending" and items[0]["submitter_email"] == "v@example.com"
    assert client.post(f"{P}/testimonials", json={"client_name": "No Consent", "email": "v@example.com", "content": "x" * 30, "consent": False}).status_code == 422


def test_blog_draft_publish_schedule_and_related(admin, client):
    cat = admin.post(f"{A}/blog/categories", json={"name": "FastAPI"}).json()
    words = " ".join(["word"] * 900)
    a = admin.post(f"{A}/blog/posts", json={"title": "Securing FastAPI", "content": words, "category_id": cat["id"], "tags": ["Security", "FastAPI", "security"]}).json()
    assert a["status"] == "draft" and a["reading_minutes"] == 5 and sorted(a["tags"]) == ["FastAPI", "Security"]
    assert client.get(f"{P}/blog").json()["total"] == 0
    admin.patch(f"{A}/blog/posts/{a['id']}", json={"status": "published"})
    future = (datetime.now(UTC) + timedelta(days=3)).isoformat()
    admin.post(f"{A}/blog/posts", json={"title": "Scheduled post", "status": "published", "published_at": future, "category_id": cat["id"]})
    b = admin.post(f"{A}/blog/posts", json={"title": "Related post", "status": "published", "tags": ["Security"]}).json()
    listing = client.get(f"{P}/blog").json()
    assert listing["total"] == 2  # scheduled one hidden until its date
    assert client.get(f"{P}/blog/scheduled-post").status_code == 404
    detail = client.get(f"{P}/blog/securing-fastapi").json()
    assert [r["slug"] for r in detail["related"]] == [b["slug"]]
    assert client.get(f"{P}/blog", params={"category": "fastapi"}).json()["total"] == 1
    assert client.get(f"{P}/blog", params={"tag": "security"}).json()["total"] == 2
    assert client.get(f"{P}/blog", params={"q": "securing"}).json()["total"] == 1
    assert [c["slug"] for c in client.get(f"{P}/blog/categories").json()] == ["fastapi"]
    assert admin.post(f"{A}/blog/posts", json={"title": "Canon", "canonical_url": "http://x.example"}).status_code == 422


def test_skills_grouping_and_inactive_hidden(admin, client):
    cat = admin.post(f"{A}/skill-categories", json={"name": "Backend"}).json()
    admin.post(f"{A}/skills", json={"name": "FastAPI", "category_id": cat["id"], "icon": "SiFastapi", "color": "#009688"})
    off = admin.post(f"{A}/skills", json={"name": "COBOL", "category_id": cat["id"], "is_active": False}).json()
    groups = client.get(f"{P}/skills").json()
    assert [s["name"] for s in groups[0]["skills"]] == ["FastAPI"]
    assert admin.post(f"{A}/skills", json={"name": "FastAPI", "category_id": cat["id"]}).status_code == 409
    assert admin.post(f"{A}/skills", json={"name": "Bad", "category_id": cat["id"], "icon": "<svg>"}).status_code == 422
    assert admin.delete(f"{A}/skill-categories/{cat['id']}").status_code == 409  # still has skills (RESTRICT)
    assert admin.delete(f"{A}/skills/{off['id']}").status_code == 204


def test_homepage_settings_nav_social_seo_reflect_publicly(admin, client, seeded):
    site = client.get(f"{P}/site").json()
    assert site["settings"]["developer_name"] == "Dileep Kumar Panchumarthi"
    hero = next(s for s in admin.get(f"{A}/homepage-sections", params={"page_size": 50}).json()["items"] if s["key"] == "hero")
    admin.patch(f"{A}/homepage-sections/{hero['id']}", json={"title": "Updated hero headline"})
    admin.patch(f"{A}/settings", json={"headline": "New headline", "location": "Hyderabad, India"})
    site = client.get(f"{P}/site").json()
    assert next(s for s in site["homepage"] if s["key"] == "hero")["title"] == "Updated hero headline"
    assert site["settings"]["headline"] == "New headline" and site["settings"]["location"] == "Hyderabad, India"
    assert site["resume_url"] == "/resume.pdf"
    assert admin.patch(f"{A}/settings", json={"smtp_password": "x"}).status_code == 422
    assert admin.patch(f"{A}/settings", json={"email": "not-an-email"}).status_code == 422
    assert admin.patch(f"{A}/settings", json={"profile_image_url": "javascript:alert(1)"}).status_code == 422
    seo = client.get(f"{P}/seo/projects").json()
    assert seo["title"].startswith("Projects")


def test_seeded_content_is_complete(client, seeded):
    services = client.get(f"{P}/services").json()
    assert len(services) == 15
    assert all(s["starting_price"] is None for s in services)  # no invented prices
    projects = client.get(f"{P}/projects", params={"page_size": 50}).json()
    slugs = [p["slug"] for p in projects["items"]]
    assert projects["total"] == 12 and slugs[0] == "mrs-fashion-jewel"
    mrs = client.get(f"{P}/projects/mrs-fashion-jewel").json()["project"]
    assert mrs["is_client_project"] and mrs["live_url"] == "https://mrsfashionjewel.com/" and "Stripe" in mrs["technologies"]
    cart = client.get(f"{P}/projects/cartinminutes").json()["project"]
    assert cart["is_demo"] is True and cart["live_url"] == ""
    assert client.get(f"{P}/testimonials").json() == []  # nothing invented


def test_experience_and_resume(admin, client):
    assert admin.post(f"{A}/experiences", json={"title": "Bad dates", "start_date": "2024-05-01", "end_date": "2023-01-01"}).status_code == 422
    admin.post(f"{A}/experiences", json={"title": "Freelance developer", "kind": "work", "start_date": "2024-01-01", "is_current": True})
    assert client.get(f"{P}/experiences").json()[0]["title"] == "Freelance developer"


def test_database_constraints(admin):
    with new_session() as db:
        with pytest.raises(IntegrityError):
            db.execute(text("INSERT INTO testimonials (id, client_name, content, rating, approval_status, is_published, source, featured, consent_confirmed, company, designation, avatar_url, submitter_email, position, created_at, updated_at) VALUES (gen_random_uuid(), 'x', 'y', 9, 'pending', false, 'admin', false, false, '', '', '', '', 0, now(), now())"))
        db.rollback()
        with pytest.raises(IntegrityError):
            db.execute(text("INSERT INTO projects (id, title, slug, status, tagline, summary, overview, challenges, solutions, outcomes, contribution, architecture, features, timeline, client_name, is_client_project, is_demo, live_url, github_url, video_url, highlight_label, highlight_value, cover_url, featured, position, seo_title, seo_description, created_at, updated_at) VALUES (gen_random_uuid(), 'x', 'x', 'archived', '', '', '', '', '', '', '', '', '[]', '', '', false, false, '', '', '', '', '', '', false, 0, '', '', now(), now())"))
        db.rollback()


def test_dashboard_counts_are_real(admin, seeded):
    d = admin.get(f"{A}/dashboard").json()
    assert d["counts"]["projects"] == 12 and d["counts"]["services_published"] == 15
    assert d["counts"]["leads_new"] == 0 and len(d["leads_by_week"]) == 8
    assert d["recent_activity"] is not None
