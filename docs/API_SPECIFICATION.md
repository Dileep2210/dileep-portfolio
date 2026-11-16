# API Specification

Base path `/api/v1`. Interactive OpenAPI docs are served at `/docs` when `APP_ENV=development` (disabled in production). The endpoint table at the end is generated from the running app's OpenAPI schema, so it matches the code.

## Conventions

| Topic | Rule |
|---|---|
| Auth | HttpOnly cookies set by `POST /auth/login`: `pf_access` (JWT, 15 min, path `/api`), `pf_refresh` (opaque, 7 days, path `/api/v1/auth`). `pf_csrf` is readable by JS. |
| CSRF | Every `POST/PATCH/DELETE` under `/auth` and `/admin` must send `Origin` (or `Referer`) equal to `PUBLIC_SITE_ORIGIN`; requests carrying a session cookie must also send `X-CSRF-Token` = `pf_csrf` cookie. |
| Permissions | Admin routes require `<module>:read|write|delete` (see `app/core/permissions.py`). 401 = not signed in, 403 = signed in without permission. |
| Re-auth | Lead export, user invite/role/active changes, MFA setup/disable and reset-MFA require `POST /auth/reauth` within the last 5 minutes (else `403 reauth_required`). |
| Lists | `?page=1&page_size=20&q=search&sort=-created_at&<filter>=value` → `{"items": [...], "total": n, "page": 1, "page_size": 20}`. `page_size` ≤ 100 (public ≤ 50). Sort fields are whitelisted per resource (422 otherwise). |
| Updates | `PATCH` applies only the fields sent. Unknown fields → 422. |
| Deletes | Projects, services, testimonials, blog posts, leads and media are soft-deleted (`POST /{id}/restore` undoes it). Media still in use returns `409 in_use`. |
| Errors | `{"error": {"code": "...", "message": "...", "details": [{"field","message"}]}, "request_id": "..."}`. Submitted values are never echoed. The legacy `/api/contact` keeps its original `{"ok": false, "error": "..."}` shape. |
| Status codes | 200/201/202/204 success · 401 auth · 403 permission/CSRF/origin/reauth · 404 · 409 conflict (duplicate slug, in use) · 413 too large · 415 rejected upload · 422 validation · 429 rate limited · 503 not ready. |
| Request IDs | Every response has `X-Request-ID` (client may supply a short alphanumeric one). |
| Caching | Public `GET`s: `Cache-Control: public, no-cache, s-maxage=30` (browsers always revalidate, so edits show on next load). Admin/auth: `no-store`. |

## Public behaviour

Public endpoints return only: projects/services/posts with `status=published` and not deleted; posts whose `published_at` is in the past (future = scheduled); testimonials that are `approved` **and** `is_published` **and** `consent_confirmed`; visible navigation/social/homepage sections; active skills. Leads, users, audit logs and submitter emails are never exposed publicly.

## Key request bodies

- `POST /public/contact` — `name, email, phone?, company?, service_id?, budget?, message, preferred_contact (email|phone|whatsapp), website (honeypot, leave empty), elapsed_ms?, turnstile_token?` → `201 {"ok": true}`.
- `POST /public/testimonials` — `client_name, email, company?, designation?, content, rating? (1-5), project_slug?, consent (must be true)` → `202`, stored as pending.
- `POST /auth/login` — `email, password, totp_code?` → `200 Me` or `401 invalid_credentials | mfa_required | mfa_invalid`.
- `POST /admin/media` — multipart `file`, `alt_text?`. JPEG/PNG/WebP/GIF ≤ 5 MB, PDF ≤ 10 MB.
- `PATCH /admin/settings` — any subset of the site settings keys (see `app/schemas/settings.py`).

## Endpoints

### admin:audit

| Method | Path |
|---|---|
| GET | `/api/v1/admin/audit-logs` |

### admin:blog/categories

| Method | Path |
|---|---|
| GET | `/api/v1/admin/blog/categories` |
| POST | `/api/v1/admin/blog/categories` |
| GET | `/api/v1/admin/blog/categories/{item_id}` |
| PATCH | `/api/v1/admin/blog/categories/{item_id}` |
| DELETE | `/api/v1/admin/blog/categories/{item_id}` |

### admin:blog/posts

| Method | Path |
|---|---|
| GET | `/api/v1/admin/blog/posts` |
| POST | `/api/v1/admin/blog/posts` |
| GET | `/api/v1/admin/blog/posts/{item_id}` |
| PATCH | `/api/v1/admin/blog/posts/{item_id}` |
| DELETE | `/api/v1/admin/blog/posts/{item_id}` |
| POST | `/api/v1/admin/blog/posts/{item_id}/restore` |

### admin:blog/tags

| Method | Path |
|---|---|
| GET | `/api/v1/admin/blog/tags` |
| POST | `/api/v1/admin/blog/tags` |
| GET | `/api/v1/admin/blog/tags/{item_id}` |
| PATCH | `/api/v1/admin/blog/tags/{item_id}` |
| DELETE | `/api/v1/admin/blog/tags/{item_id}` |

### admin:dashboard

| Method | Path |
|---|---|
| GET | `/api/v1/admin/dashboard` |

### admin:experiences

| Method | Path |
|---|---|
| GET | `/api/v1/admin/experiences` |
| POST | `/api/v1/admin/experiences` |
| GET | `/api/v1/admin/experiences/{item_id}` |
| PATCH | `/api/v1/admin/experiences/{item_id}` |
| DELETE | `/api/v1/admin/experiences/{item_id}` |

### admin:homepage-sections

| Method | Path |
|---|---|
| GET | `/api/v1/admin/homepage-sections` |
| POST | `/api/v1/admin/homepage-sections` |
| GET | `/api/v1/admin/homepage-sections/{item_id}` |
| PATCH | `/api/v1/admin/homepage-sections/{item_id}` |
| DELETE | `/api/v1/admin/homepage-sections/{item_id}` |

### admin:leads

| Method | Path |
|---|---|
| GET | `/api/v1/admin/leads` |
| GET | `/api/v1/admin/leads/export.csv` |
| GET | `/api/v1/admin/leads/{lead_id}` |
| PATCH | `/api/v1/admin/leads/{lead_id}` |
| DELETE | `/api/v1/admin/leads/{lead_id}` |
| POST | `/api/v1/admin/leads/{lead_id}/notes` |
| DELETE | `/api/v1/admin/leads/{lead_id}/notes/{note_id}` |
| POST | `/api/v1/admin/leads/{lead_id}/restore` |

### admin:media

| Method | Path |
|---|---|
| GET | `/api/v1/admin/media` |
| POST | `/api/v1/admin/media` |
| PATCH | `/api/v1/admin/media/{media_id}` |
| DELETE | `/api/v1/admin/media/{media_id}` |

### admin:navigation

| Method | Path |
|---|---|
| GET | `/api/v1/admin/navigation` |
| POST | `/api/v1/admin/navigation` |
| GET | `/api/v1/admin/navigation/{item_id}` |
| PATCH | `/api/v1/admin/navigation/{item_id}` |
| DELETE | `/api/v1/admin/navigation/{item_id}` |

### admin:project-categories

| Method | Path |
|---|---|
| GET | `/api/v1/admin/project-categories` |
| POST | `/api/v1/admin/project-categories` |
| GET | `/api/v1/admin/project-categories/{item_id}` |
| PATCH | `/api/v1/admin/project-categories/{item_id}` |
| DELETE | `/api/v1/admin/project-categories/{item_id}` |

### admin:projects

| Method | Path |
|---|---|
| GET | `/api/v1/admin/projects` |
| POST | `/api/v1/admin/projects` |
| GET | `/api/v1/admin/projects/{item_id}` |
| PATCH | `/api/v1/admin/projects/{item_id}` |
| DELETE | `/api/v1/admin/projects/{item_id}` |
| POST | `/api/v1/admin/projects/{item_id}/restore` |

### admin:resumes

| Method | Path |
|---|---|
| GET | `/api/v1/admin/resumes` |
| POST | `/api/v1/admin/resumes` |
| GET | `/api/v1/admin/resumes/{item_id}` |
| PATCH | `/api/v1/admin/resumes/{item_id}` |
| DELETE | `/api/v1/admin/resumes/{item_id}` |

### admin:seo

| Method | Path |
|---|---|
| GET | `/api/v1/admin/seo` |
| POST | `/api/v1/admin/seo` |
| GET | `/api/v1/admin/seo/{item_id}` |
| PATCH | `/api/v1/admin/seo/{item_id}` |
| DELETE | `/api/v1/admin/seo/{item_id}` |

### admin:services

| Method | Path |
|---|---|
| GET | `/api/v1/admin/services` |
| POST | `/api/v1/admin/services` |
| GET | `/api/v1/admin/services/{item_id}` |
| PATCH | `/api/v1/admin/services/{item_id}` |
| DELETE | `/api/v1/admin/services/{item_id}` |
| POST | `/api/v1/admin/services/{item_id}/restore` |

### admin:settings

| Method | Path |
|---|---|
| GET | `/api/v1/admin/settings` |
| PATCH | `/api/v1/admin/settings` |

### admin:skill-categories

| Method | Path |
|---|---|
| GET | `/api/v1/admin/skill-categories` |
| POST | `/api/v1/admin/skill-categories` |
| GET | `/api/v1/admin/skill-categories/{item_id}` |
| PATCH | `/api/v1/admin/skill-categories/{item_id}` |
| DELETE | `/api/v1/admin/skill-categories/{item_id}` |

### admin:skills

| Method | Path |
|---|---|
| GET | `/api/v1/admin/skills` |
| POST | `/api/v1/admin/skills` |
| GET | `/api/v1/admin/skills/{item_id}` |
| PATCH | `/api/v1/admin/skills/{item_id}` |
| DELETE | `/api/v1/admin/skills/{item_id}` |

### admin:social-links

| Method | Path |
|---|---|
| GET | `/api/v1/admin/social-links` |
| POST | `/api/v1/admin/social-links` |
| GET | `/api/v1/admin/social-links/{item_id}` |
| PATCH | `/api/v1/admin/social-links/{item_id}` |
| DELETE | `/api/v1/admin/social-links/{item_id}` |

### admin:testimonials

| Method | Path |
|---|---|
| GET | `/api/v1/admin/testimonials` |
| POST | `/api/v1/admin/testimonials` |
| GET | `/api/v1/admin/testimonials/{item_id}` |
| PATCH | `/api/v1/admin/testimonials/{item_id}` |
| DELETE | `/api/v1/admin/testimonials/{item_id}` |
| POST | `/api/v1/admin/testimonials/{item_id}/restore` |

### admin:users

| Method | Path |
|---|---|
| GET | `/api/v1/admin/users` |
| POST | `/api/v1/admin/users/invite` |
| PATCH | `/api/v1/admin/users/{user_id}` |
| POST | `/api/v1/admin/users/{user_id}/reset-mfa` |
| POST | `/api/v1/admin/users/{user_id}/unlock` |
| GET | `/api/v1/admin/roles` |

### auth

| Method | Path |
|---|---|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/logout-all` |
| GET | `/api/v1/auth/me` |
| POST | `/api/v1/auth/reauth` |
| POST | `/api/v1/auth/change-password` |
| POST | `/api/v1/auth/password-reset/request` |
| POST | `/api/v1/auth/password-reset/confirm` |
| POST | `/api/v1/auth/invite/accept` |
| GET | `/api/v1/auth/sessions` |
| DELETE | `/api/v1/auth/sessions/{session_id}` |
| POST | `/api/v1/auth/mfa/setup` |
| POST | `/api/v1/auth/mfa/enable` |
| POST | `/api/v1/auth/mfa/disable` |

### ops

| Method | Path |
|---|---|
| GET | `/health` |
| GET | `/ready` |

### public

| Method | Path |
|---|---|
| GET | `/sitemap.xml` |
| GET | `/api/v1/public/site` |
| GET | `/api/v1/public/seo/{page_key}` |
| GET | `/api/v1/public/experiences` |
| GET | `/api/v1/public/skills` |
| GET | `/api/v1/public/project-categories` |
| GET | `/api/v1/public/projects/technologies` |
| GET | `/api/v1/public/projects` |
| GET | `/api/v1/public/projects/{slug}` |
| GET | `/api/v1/public/services` |
| GET | `/api/v1/public/services/{slug}` |
| GET | `/api/v1/public/testimonials` |
| POST | `/api/v1/public/testimonials` |
| GET | `/api/v1/public/blog/categories` |
| GET | `/api/v1/public/blog/tags` |
| GET | `/api/v1/public/blog` |
| GET | `/api/v1/public/blog/{slug}` |
| POST | `/api/v1/public/contact` |

_Total: 136 operations._
