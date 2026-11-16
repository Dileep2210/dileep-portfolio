# Final Audit Report — Portfolio CMS

Branch `feat/cms`, 2026-11-16. Status: **implemented and tested locally; not deployed.** Deployment needs your approval and credentials (Railway, Cloudinary, SMTP).

## 1. Existing architecture findings

Static React 19 + Vite SPA with all content hardcoded in `src/data/portfolio.ts`; a FastAPI service with one endpoint that emailed contact-form messages (nothing stored); no database, auth or admin. Solid baseline: input validation, honeypot, rate limit, CI, Playwright smoke tests. Gaps: no CMS, no persistence, no security headers on the site, single-URL SEO. The repo restructure into `frontend/` + `backend/` was uncommitted; it is now committed on `feat/cms` (`main` is untouched). Details: `INITIAL_AUDIT.md`.

## 2. Features implemented

- **Public site** (existing design kept): Home (all sections API-driven, order/visibility from admin), About (bio, philosophy, journey, experience timeline, skills), Services + 15 detail pages with Request a Quote, Projects gallery (search, category, technology filters, pagination) + SEO detail pages (case study, gallery, video/live/GitHub links, linked testimonials, related), Blog (search, categories, tags, reading time, share buttons, related, scheduling), Contact (new fields, service preselect, budget, preferred contact, moderated testimonial submission), 404, dynamic SEO tags + JSON-LD (Person, ProfessionalService, CreativeWork, Service, BlogPosting), dynamic sitemap.
- **Admin `/admin`** with all 20 modules (§5), tables with search/filter/sort/pagination/loading/empty/error states, confirmation dialogs, toasts, schema-driven validated forms, media picker, Markdown preview.
- **Lead management**: storage, status pipeline, notes, follow-ups, CSV export.
- **Testimonial moderation**: pending → approved + consent + published.
- **Auth**: cookie sessions, refresh rotation, CSRF, lockout, TOTP 2FA, password reset, invitations, re-auth, RBAC, audit log, CLI bootstrap.
- **Media**: validated uploads, Cloudinary adapter (local adapter for dev/tests).
- **Content migration**: profile, socials, 44 skills in 6 categories, the 10 existing projects (copy unchanged), **MRS Fashion Jewel** (verified from its source repo and live site, real screenshot cover) and **CartInMinutes** (verified from its repo; labelled Demo/MVP, no live link), all 15 required services (no invented prices), 9 blog categories, homepage sections, SEO entries, resume.

## 3. Database tables created (31 + `alembic_version`)

`users, roles, permissions, role_permissions, user_roles, auth_sessions, refresh_tokens, auth_tokens, audit_logs, media_assets, resume_files, project_categories, projects, project_technologies, project_media, services, skill_categories, skills, testimonials, blog_categories, blog_tags, blog_posts, blog_post_tags, experiences, homepage_sections, navigation_items, social_links, seo_metadata, site_settings, contact_leads, lead_notes`. UUID keys, FKs with explicit CASCADE/SET NULL/RESTRICT, CHECK constraints, partial unique slug indexes, soft delete. Single migration `0001`, reversible, verified up/down/up and drift-free. See `DATABASE_DESIGN.md`.

## 4. API endpoints

136 documented operations: auth (15), public (17), admin (101 — generic CRUD for 15 resources plus leads, media, settings, users, roles, audit logs, dashboard), and `/health`, `/ready`, `/sitemap.xml`. The legacy `POST /api/contact` is kept for backward compatibility but hidden from the schema. Full list: `API_SPECIFICATION.md`.

## 5. Admin dashboard modules

Dashboard · Homepage · Profile · Services · Projects · Testimonials · Skills · Experience · Blog · Categories (project, skill, blog categories, tags) · Contact Leads · Media Library · SEO · Navigation · Social Links · Resume · Users · Audit Logs · Website Settings · Security. Each is functional end to end; the sidebar shows only modules the role can access, and the API enforces the same rules.

## 6. Security improvements

Argon2id; 15-min JWT access cookie + opaque rotating refresh cookie (hashed), reuse detection revokes the session; server-side session check on every request (logout/password reset are immediate); HttpOnly + SameSite=Lax + Secure cookies, no tokens in JS storage; double-submit CSRF + Origin check; same-origin architecture via Vercel rewrite; per-IP + per-account lockout; TOTP with replay protection, secrets sealed with HKDF/Fernet; re-auth for sensitive actions; no public registration, CLI-only first admin; RBAC on every route; last-super-admin and self-change guards; audit log without secrets; strict input schemas (`extra=forbid`, lengths, URL scheme rules, control-character checks); ORM-only queries with whitelisted sort fields and escaped LIKE; Markdown rendered without HTML; whitelisted icon keys; upload magic-byte checks, Pillow re-encode (EXIF stripped), size and pixel caps, PDF active-content rejection, random names, sandboxed serving, in-use protection; CSV formula neutralisation; IP stored as HMAC; acknowledgement email does not echo visitor text; security headers on API and site (CSP, HSTS, nosniff, frame-deny, referrer, permissions policy, COOP); production startup guard; docs off in production; uniform error envelope; request IDs; CI with pip-audit, npm audit, Bandit, gitleaks.

## 7. Security findings and severity

| # | Finding | Severity | Status |
|---|---|---|---|
| F1 | No security headers on the existing Vercel site | Medium | Fixed (`vercel.json`) |
| F2 | Testimonial could stay public after rejection (found in testing) | Medium | Fixed + test |
| F3 | Initially pinned react-router/zod/vitest versions had published advisories (2 critical in dev tooling, 2 high) | High (dev/build) | Fixed (upgraded, `npm audit` clean) |
| F4 | Static sitemap would shadow dynamic one in production | Low | Fixed |
| F5 | uvicorn `--proxy-headers` with all IPs trusted would let clients spoof their IP for rate limits | Medium | Avoided (removed; app resolves IP by trusted hop count) |
| F6 | Error responses cacheable (ZAP 10049) | Low | Fixed |
| F7 | Remaining ZAP warnings (CSP `img-src https:`, `style-src 'unsafe-inline'`, no SRI on Google Fonts, no COEP) | Low / Info | Accepted, documented |
| F8 | In-memory rate limits; no CAPTCHA widget; no 2FA recovery codes; no breached-password check; SPA meta for non-JS bots | Low–Medium | Documented with mitigations in `SECURITY_RECOMMENDATIONS.md` |

No critical or high-severity finding remains open. This is not a security certification.

## 8–10. Test results

Backend 193/193 passed · Frontend unit 20/20 passed · E2E 19/19 passed (all 24 scenario steps + 3 viewports + SEO files) · 0 failed · 0 skipped. Details, per-file coverage and defects found: `TEST_RESULTS.md`.

## 11. Dependency scan results

`pip-audit`: no known vulnerabilities. `npm audit`: 0 vulnerabilities. jsdom pinned to v26 because v27+ requires a newer Node than the 22.14 installed locally (CI uses Node 22 latest).

## 12. OWASP ZAP findings

Baseline on the local production build (48 URLs): 0 FAIL, 7 WARN. On the API: 0 FAIL, 2 WARN. All Low/Informational or false positives; dispositions in `TEST_RESULTS.md`.

## 13. Remaining issues / what needs you

1. **Credentials**: Railway (API + Postgres), Cloudinary URL, Brevo SMTP — not configured; email and Cloudinary are implemented but untested against the real services.
2. **`frontend/vercel.json`**: replace the Railway placeholder URL.
3. **Vercel Root Directory → `frontend`** before merging to `main`.
4. **Confirm MRS details**: client name "MRS Ladies Fashion" is shown publicly and the case study says you built the whole platform — confirm both are OK with the client. No timeline is shown (not confirmed).
5. **CartInMinutes** has no cover image or public link (private repo, no live demo) — upload a screenshot in the admin, or make the repo public and add the link.
6. Two existing claims carried over unchanged for your review: GoVastra "a live, operating store today", Calculator Cart "earning passive ad revenue since launch".
7. Real client testimonials: none exist yet, so the section is hidden until you add and approve one.
8. Nice-to-haves listed in `SECURITY_RECOMMENDATIONS.md` (Turnstile widget, 2FA recovery codes, Redis rate limits, pre-rendering for social previews).

## 14. Deployment instructions

`DEPLOYMENT_GUIDE.md` (Postgres → Cloudinary → Railway API with pre-deploy migration → seed + create admin → Vercel → verify → monitoring, backup, rollback, local dev).

## 15. Environment variables required

Backend (Railway): `APP_ENV=production`, `SECRET_KEY`, `DATABASE_URL`, `PUBLIC_SITE_ORIGIN`, `COOKIE_SECURE=true`, `TRUSTED_PROXY_HOPS=2`, `STORAGE_BACKEND=cloudinary`, `CLOUDINARY_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, `MAIL_FROM_NAME`, `CONTACT_RECEIVER_EMAIL`. Optional: `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_*`, `RATE_LIMIT_STORAGE_URI`, session tuning. Template: `backend/.env.example`. Frontend: none.

## 16. First admin account

`cd backend && railway run python -m app.cli create-admin --email you@example.com --name "Your Name"` → enter a 12+ character password → sign in at `/admin/login` → enable 2FA under Security. The command refuses if a super admin already exists (unless `--force-additional`). Further users: **Users → Invite user**.

## 17. Adding projects and services

Admin → **Projects → New project** (title, summary, category, cover/screenshots from the media library, technologies one per line, case-study sections in Markdown, status Published). **Services → New service** similarly, status Active. Both appear publicly immediately. Step-by-step: `ADMIN_USER_GUIDE.md`.

## 18. Managing client testimonials

Add in **Testimonials** (or receive via the website form as Pending). Public only when *Approved* + *Client consent* + *Published*. Link to a project to show it on that project page. Rejecting unpublishes immediately. Never publish a review the client has not given and approved.

## 19. Database backup and restore

`pg_dump --format=custom --no-owner "$DATABASE_URL" > portfolio-YYYY-MM-DD.dump`; restore with `pg_restore --clean --if-exists --no-owner -d "$TARGET_DATABASE_URL" <file>` into a new database first, verify, then switch. Back up before every migration. Details and rollback: `DEPLOYMENT_GUIDE.md` §8–9.
