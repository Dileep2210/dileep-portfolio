# Test Results

Run on 2026-11-16, local Windows 11 machine, PostgreSQL 17 (Docker), Python 3.13, Node 22.14, Chromium (Playwright). All numbers below come from suites that were actually executed on the final code of branch `feat/cms`. Nothing was run against production.

## Summary

| Suite | Total | Passed | Failed | Skipped |
|---|---|---|---|---|
| Backend — pytest (real PostgreSQL, real Alembic migration) | 194 | 194 | 0 | 0 |
| Frontend — Vitest + React Testing Library | 20 | 20 | 0 | 0 |
| End-to-end — Playwright (real API + DB + production build) | 42 | 42 | 0 | 0 |
| Type-check (`tsc -b`) | — | pass | — | — |
| Lint (`oxlint`) | — | 0 errors | — | 22 warnings¹ |
| Production build (`vite build`) | — | pass | — | — |

¹ All 22 are `only-export-components` hints (React Fast Refresh in development only); no correctness impact.

## Backend (pytest) — 193 tests

| File | Tests | Covers |
|---|---|---|
| `test_auth.py` | 20 | Login cookies (HttpOnly, SameSite, path), generic errors (no enumeration), lockout + unlock, login rate limit, inactive users, no public registration, refresh rotation + reuse detection (revokes session), server-side logout, expired/forged/`alg=none` tokens, CSRF + Origin enforcement, password reset (no enumeration, single-use, revokes sessions, policy), unverified email gets no reset, change password, TOTP enrol + login + replay protection, session list + IDOR, logout-all, deactivated user loses access |
| `test_permissions.py` | 108 | **Every one of the 101 admin endpoints** (built from the OpenAPI schema) returns 401 without a session; viewer is read-only and cannot see leads/users/audit/export; editor cannot manage users, audit, export or delete leads; no self role escalation; invite → accept → login; re-auth required; role change forces re-login; last super admin protected; audit log records actions without secrets |
| `test_content.py` | 22 | Project draft→publish→edit→delete→restore with public visibility; slug conflicts; validation (lengths, unknown fields, nulls); unsafe URLs (`javascript:`, `data:`, `http:`, `//`); nav/homepage link validation; XSS payloads returned as plain data; SQL-injection payloads in search/sort/filter; pagination & sorting limits; services; testimonial moderation (approval + consent + publish, rejection unpublishes); public testimonial submissions stay pending; blog draft/publish/schedule/tags/related/reading time; skills grouping, uniqueness, RESTRICT; settings/homepage/SEO reflect publicly; seeded content (15 services, 12 projects, no prices/testimonials invented); experience date rules; DB CHECK constraints; dashboard counts |
| `test_leads.py` | 23 | Lead stored + owner notification + acknowledgement (which never echoes the message); lead kept when SMTP fails; service reference; honeypot and too-fast submissions silently dropped; field validation incl. header-injection; unknown fields and >1 MB bodies; per-IP rate limit using trusted proxy hop (spoofing ignored); legacy `/api/contact` contract + CORS; lead status/notes/follow-up/search/delete; CSV export requires re-auth, neutralises formulas, is audited; public API never exposes leads |
| `test_media.py` | 6 | Image re-encode strips EXIF, random names, path traversal in filename, sandboxed serving; SVG/HTML/EXE/corrupt/polyglot/PDF-with-JavaScript rejected; size limits; resume PDF flow + single active; in-use media cannot be deleted; gallery validation; viewer cannot upload/delete |
| `test_platform.py` | 14 | `/health`, `/ready`; **models match migrations** (`alembic check`); security headers + request id; error envelope without internals; docs disabled + HSTS in production; production guard refuses 6 unsafe configs; sitemap lists only published; CLI create-admin rules; idempotent seed |

Migration was also verified manually: `alembic upgrade head` → `downgrade base` → `upgrade head` → `alembic check` (no drift).

## Frontend unit (Vitest + RTL) — 20 tests

| File | Tests | Covers |
|---|---|---|
| `api.test.ts` | 5 | CSRF header only on unsafe methods, silent refresh + retry on expiry, no refresh loop, error parsing (validation/429/network), query building |
| `components.test.tsx` | 6 | Markdown never renders raw HTML/`javascript:` links; contact form validation, payload (service preselect, honeypot, timing), failure keeps typed text; admin form value conversions; admin URL validation |
| `pages.test.tsx` | 9 | Homepage renders API content + JSON-LD + title; error state with retry; projects list + URL filters; project detail + 404; services links; admin redirect to login with `next`; login with MFA step; sidebar hides modules by permission; read-only role sees no write actions |

## End-to-end (Playwright) — 19 tests covering the 24-step scenario

| Test | Steps |
|---|---|
| 1 | Visitor opens homepage (API content, canonical, no console errors) |
| 2–3 | Projects page (12 projects) → MRS Fashion Jewel detail, live link, JSON-LD |
| 4 | Services (15) → detail → Request a quote pre-selects service |
| 5 | Contact enquiry submitted |
| 6 | Admin logs in, sees the enquiry, changes its status |
| 7–8 | Admin creates draft project → hidden publicly → publishes → visible |
| 9–10 | Admin edits project → public page updated |
| 11–12 | Admin creates service → visible |
| 13–16 | Draft testimonial hidden → approve + consent + publish → visible on project and homepage |
| 17–18 | Blog post published → listed and rendered; `<script>` in markdown not rendered |
| 19–20 | Homepage hero edited → live without rebuild |
| 21 | Signed-out visitor redirected from `/admin/users`; viewer cannot open Users, API write returns 403 |
| 22 | Protected API without session → 401; foreign Origin → 403; SQL-injection search → 200 |
| 23 | Dropped access token refreshed silently; no tokens → redirected to login |
| 24 | Logout → admin inaccessible, `/auth/me` 401 |
| + 3 | Mobile 375px, tablet 820px, desktop 1440px: 7 pages each, no horizontal overflow, no console errors, mobile menu + Escape |
| + 1 | robots.txt, dynamic sitemap.xml, resume.pdf served |

## Full admin + public walk-through (`e2e/full.spec.ts`) — 23 tests, added 2026-11-17

Drives every admin module through the UI and fails on any page error, console error or 5xx, reporting unexpected 4xx: all 20 sidebar modules; dashboard links; list search/sort/pagination/filters; media upload, alt text, rejected SVG, in-use protection; project with cover + gallery from the picker, Markdown preview, delete/restore; server validation errors keep input; priced service; skill + skill category; experience on About; blog category/tags/schedule/related/tag links/search; navigation, social link, SEO and homepage JSON edits; resume switch; profile + website settings (incl. invalid email); leads status/follow-up/notes/export with re-auth/delete; public testimonial → approve → visible with rating; invite → accept → role change → deactivate; audit filter; 2FA enrol, code sign-in, remote session sign-out, 2FA off; password change; forgot password; viewer read-only form; every public route + 404s; project filters + pagination; mobile menu, footer, skip link, CTAs; contact validation. Both E2E files were run together twice: 42/42 passed both times.

### Bugs found by this walk-through (root cause → fix)

| Bug | Root cause | Fix |
|---|---|---|
| Blog, Navigation, Social links and Resume admin lists showed "Could not load" (422 Unsupported sort field) when reached from the sidebar | All modules render the same list component; React reused one instance, so the previous module's table state (sort field) leaked into the next | Each resource route gets its own component instance (`key={config.key}`) |
| Admin sort by title put "Élané" and lowercase titles after "Z" | PostgreSQL default collation compares bytes | Text sorts use ICU collation `und-x-icu`; regression test added |
| Invitation / reset-password pages redirected to the login page mid-form | The "session expired" handler redirected from every `/admin` page except login, and fires on signed-out visitors' session check | Handler ignores the public admin pages (login, reset password, accept invite) |
| Clearing a project/blog filter and then typing in search brought the old filter back | The debounced search rebuilt the URL from a stale snapshot of the query parameters | Shared `useUrlFilters` updates from the live URL |
| Pressing Escape on a confirmation also closed the dialog underneath | Every open dialog handled Escape | Only the topmost dialog reacts |
| First Tab on page load skipped "Skip to main content" | Focus was moved to `<main>` on the initial render, not only on route changes | Focus moves only on later navigations |

## Security scans

| Tool | Scope | Result |
|---|---|---|
| `pip-audit` | backend `requirements.txt` | No known vulnerabilities |
| `npm audit` | frontend | 0 vulnerabilities (after upgrading react-router, zod and vitest from initially pinned versions that had advisories) |
| Bandit (SAST) | `backend/app` (4,537 LOC) | 0 issues (1 low false positive — `xml.sax` import — removed by switching to `html.escape`) |
| gitleaks | full git history (17 commits) + working tree | 5 history / 6 tree findings outside dependencies, **all test fixtures** (fake test keys/passwords). No real secrets. Allowlisted narrowly in `.gitleaks.toml`. |
| OWASP ZAP baseline | local production build + proxy (48 URLs) | **0 FAIL**, 7 WARN types (below) |
| OWASP ZAP baseline | local API (8 URLs) | **0 FAIL**, 2 WARN types (below) |

### ZAP warnings and disposition

| Alert | Where | Disposition |
|---|---|---|
| CSP: Wildcard directive [10055] | `img-src https:` | Accepted (Low). CMS allows https image URLs. Tighten to Cloudinary only if desired — SECURITY_RECOMMENDATIONS L7. |
| Sub Resource Integrity missing [90003] | Google Fonts stylesheet | Accepted (Low). Google Fonts CSS is generated per browser, SRI is not possible; self-host fonts to remove. App scripts are same-origin. |
| Cross-Origin-Embedder-Policy missing [90004] | all pages, API | Accepted (Informational). COEP would break cross-origin images (Cloudinary) and is not needed (no `SharedArrayBuffer`). |
| Storable and cacheable content [10049] | static assets, `/admin` shell in preview | Expected for hashed assets. Production `vercel.json` sets `no-store` on `/admin*` (preview mirrors only the global header set). API error responses now send `no-store` (fixed after the scan). |
| Information disclosure – suspicious comments [10027] | minified vendor bundle | False positive (library comments). |
| Private IP disclosure [2] | icon library bundle | False positive (numeric pattern inside SVG path data). |
| Modern web application [10109] | SPA | Informational. |

Re-run: `docker run --rm -v "$PWD:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:4173 -I` (with `VITE_ALLOWED_HOSTS=host.docker.internal npx vite preview --host 0.0.0.0` and the E2E API running).

## Defects found by the tests and fixed

| Found by | Defect | Fix |
|---|---|---|
| backend pytest | Rejecting an already-published testimonial returned 422 and left it **public** | Rejection/un-approval always unpublishes; only an explicit publish of an unapproved item is refused |
| backend pytest | Invalid settings value caused a 500 | Validation errors returned as 422; global handler for model validation errors |
| E2E | Saving a project with existing technologies hit a unique-constraint 409 on every edit | Reuse existing technology rows |
| E2E | Public responses cached 60 s in the browser, so edits looked stale | `Cache-Control: public, no-cache, s-maxage=30` |
| E2E (setup) | Static `public/sitemap.xml` would shadow the dynamic sitemap on Vercel | Removed; `/sitemap.xml` rewritten to the API |
| browser check | Empty SEO key requested `/seo/` (404) on every non-keyed page | Query disabled without a key |
| browser check | Markdown lists rendered without bullets/spacing | Added `.prose-cms` typography |

## Not executed

- Tests against the deployed Vercel/Railway production (not deployed — needs your approval and credentials).
- Real email delivery (SMTP not configured locally; sending is mocked in tests, logged as skipped in E2E).
- Real Cloudinary uploads (adapter implemented; tests use the local storage adapter).
- ZAP active scan / load testing (out of scope for a baseline; never against production).
- Browsers other than Chromium.
