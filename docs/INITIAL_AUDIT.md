# Initial Audit: Portfolio → Dynamic CMS

Date: 2026-11-16 · Phase 1 of the CMS upgrade · No application code was changed during this audit.

## 1. Current architecture

```
Browser ──► Vercel (static React SPA, built from repo)          content = hardcoded in src/data/portfolio.ts
   │
   └─POST /api/contact──► FastAPI on Railway ──SMTP──► Brevo ──► owner inbox      (no database)
```

| Layer | What exists | Notes |
|---|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind 4, Framer Motion 12, Lenis, lucide/react-icons | Single page, hash-anchor nav (`#home #about #work #services #stack #contact`). No router, no data fetching library. |
| Content | `frontend/src/data/portfolio.ts` (470 lines) | Profile, highlights, trust points, socials, nav, 5 tech categories (~40 skills), 10 projects, 5 services, empty testimonials array. Images are bundled `.webp` in `src/assets`. |
| Backend | FastAPI, pydantic-settings, slowapi | Only `GET /health` and `POST /api/contact`. Emails the enquiry; **nothing is stored**. |
| Database | none | |
| Auth / admin | none | |
| SEO | Static `index.html` meta, Person JSON-LD, static `robots.txt` / `sitemap.xml`, `og.png`, `404.html` | Single URL only; the live site renders client-side (a plain fetch sees only the `<title>`). |
| Tests | Backend pytest (30), Playwright smoke (11) | No React unit tests. |
| CI | `.github/workflows/ci.yml`: lint, build, `npm audit`, Playwright, pytest | |
| Deploy | Vercel (frontend), Railway Nixpacks (`backend/railway.json`), Brevo SMTP | `docs/DEPLOYMENT.md` |

### Components (frontend/src/components)
Navbar, Hero (rotating tagline, CTA buttons, socials), About, Projects → ProjectReel → ProjectPoster (cinematic scrolling reels, GenAI / Web split), Testimonials (auto-hidden when empty), Services, TechStack, Contact + ContactForm, Footer; effects: BackgroundFX, CursorGlow, Magnetic, SpotlightCard, ScrollProgress; hooks: useActiveSection, useSmoothScroll. `MotionConfig reducedMotion="user"` and a skip link are already present — keep both.

### Existing contact form
Fields: name, email, subject, message, hidden honeypot `website`. Backend validates lengths, blocks control characters / header injection, rate-limits per IP (`2/minute;5/hour`), caps body at 16 KB, never echoes input in errors, returns 503/502 on mail failures. This is solid and should be **extended, not replaced**.

## 2. Baseline (before any change)

| Check | Result |
|---|---|
| `pytest` (backend) | 30 passed, 0 failed, 1 deprecation warning |
| `oxlint` | clean |
| `npm run build` | OK, main JS 451 kB (145 kB gzip) |
| `npm audit --audit-level=high` | 0 vulnerabilities |
| Playwright (`e2e/smoke.spec.ts`) | 11 passed |

## 3. Repository state warning

The last commit (`9e4ff8d`) still has the frontend at the repo root. The move to `frontend/` plus the new `backend/`, `docs/`, `.github/` folders are **uncommitted**. Consequences:

1. Nothing protects this work yet — it should be committed (on a branch) before the CMS work starts.
2. When it is pushed, the Vercel project must have **Root Directory = `frontend`**, or the live site build breaks. Verify the Vercel setting before pushing to `main`.

## 4. Gaps against the CMS specification

| Area | Today | Needed |
|---|---|---|
| Content source | TS file, needs rebuild | PostgreSQL via API, edits live without rebuild |
| Pages | One page | Router: `/`, `/about`, `/services`, `/services/:slug`, `/projects`, `/projects/:slug`, `/blog`, `/blog/:slug`, `/contact`, `/admin/*` |
| Admin | none | Auth, RBAC, 20 modules |
| Database / migrations | none | SQLAlchemy 2 + Alembic, ~27 tables |
| Leads | email only | stored, status pipeline, notes, follow-ups, CSV export |
| Media | bundled assets | Cloudinary uploads with validation |
| Blog, testimonials moderation, experience, resume mgmt, audit logs | none | full CRUD |
| SEO | static, single URL | per-page meta, dynamic sitemap, JSON-LD per type |
| Frontend tests | none | Vitest + React Testing Library |

## 5. Security observations (current code)

| # | Finding | Severity | Note |
|---|---|---|---|
| S1 | No security headers configured for the Vercel site (no `vercel.json` in `frontend/`) | Medium | Add CSP, HSTS, `nosniff`, `frame-ancestors`, Referrer-Policy. Required before an admin UI ships on the same origin. |
| S2 | Rate limit store is in-memory | Low | Fine for one Railway instance; resets on deploy. Document; optional Redis. |
| S3 | `client_key` trusts the last `X-Forwarded-For` hop | Low | Correct behind exactly one trusted proxy (Railway). Must be revisited if a CDN/Vercel rewrite is put in front. |
| S4 | API docs disabled outside `development` | Good | Keep. |
| S5 | No secrets in repo; `.env*` git-ignored; `VITE_` warning present | Good | Will add secret scanning to CI. |

No critical or high issues exist today, mainly because there is no auth, no database and no uploads. Those are exactly what the CMS adds, so the risk surface grows substantially; see the forthcoming `SECURITY_PLAN.md`.

## 6. Content verification for new projects

### MRS Fashion Jewel — verified from source (`Downloads/MRS Jewellary`, 87 commits, all by Dileep Kumar, 2026-09-30 → 2026-11-16) and the live site

Confirmed:
- US jewelry e-commerce ("delivers premium jewelry across the USA", prices in $, CST support hours).
- **Three apps**: Next.js 16 storefront (server-rendered for SEO), React + Vite staff portal, FastAPI + SQLAlchemy 2 + PostgreSQL API.
- Customer accounts with **emailed verification codes** (15-minute expiry), password reset, lockout after failed sign-ins.
- Staff portal: invitation-only accounts, **TOTP two-factor with recovery codes**, re-authentication for sensitive actions, roles/permissions, audit-logged exports.
- Catalog, collections, search, wishlist, cart, **Stripe card checkout** (server-side pricing, stock locked during order placement), order management, returns flow, coupons, invoicing, POS/stores, reviews module.
- Shipping: flat rate by default; tax and advanced shipping are optional features shipped switched off.
- Real-time updates via Server-Sent Events; Telegram order alerts; on-site chat.
- SEO: per-page meta, canonical, OG/Twitter, JSON-LD (Organization, WebSite, Product, BreadcrumbList, ItemList, FAQPage), live `sitemap.xml` and `robots.txt` (both confirmed live).
- Images on Cloudinary (confirmed live: `res.cloudinary.com`).
- Security/regression work: `audit-reports/` (security findings, hardening, remediation log), `security-reports/`, QA run reports, load-testing and performance docs.
- Deployment: two Vercel projects (storefront, admin) + Docker API host; docs name "Railway / Render / any Docker host" — **the exact API host should be confirmed by you before it is published.**

Not to be claimed: customer reviews (live site shows none yet), traffic/revenue figures, timeline beyond the commit dates. Client testimonial = draft slot only until the client approves.

### CartInMinutes — verified from source (private repo `Dileep2210/cartinminutes`, created 2026-09-03, last push 2026-11-03)

Confirmed from the README: a quick-commerce grocery & essentials delivery **MVP** under the original demo brand "Zippi".
- Next.js 15 / React 19 / TypeScript / Tailwind storefront **and** admin; Zustand, React Query, React Hook Form + Zod, Framer Motion, Recharts.
- FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, PostgreSQL, optional Redis, WebSockets; Docker Compose; `render.yaml` present.
- Search with suggestions, category filters, product pages, server cart with guest-cart merge, coupons, Buy Now, address book, live order tracking (6-stage timeline, simulated delivery map), notifications over WebSockets, JWT access + refresh (refresh hashed at rest), forgot-password OTP, role-based admin with CRUD, analytics, rider application flow.
- Payments and maps sit behind abstraction layers with **demo fallbacks**.

Presented as a **demo / MVP**, not production usage. No live URL is known; the repo is private, so no GitHub link is shown publicly unless you make it public.

### Existing projects
The 10 existing projects are migrated as-is, including their `isDemo` flags. Two existing claims I cannot verify and will carry over unchanged but flag for your review: GoVastra "a live, operating store today" and Calculator Cart "earning passive ad revenue since launch".

## 7. Proposed approach (summary — detailed in Phase 2 docs)

- **Keep** Vite + React SPA (Vercel) and FastAPI (Railway); add PostgreSQL (Railway), Cloudinary.
- **Backend**: restructure into `app/core`, `models`, `schemas`, `repositories`, `services`, `api/v1`; keep `/health` and the existing `POST /api/contact` contract working (alias to the new leads endpoint) so the live form never breaks mid-migration.
- **Auth**: Argon2id, 15-min access JWT + rotating refresh token (hashed in DB, family revocation on reuse), both in HttpOnly cookies; double-submit CSRF token; Origin check; per-account + per-IP lockout; optional TOTP; RBAC enforced by backend dependencies. Bootstrap admin via CLI only.
- **Frontend**: React Router with lazy routes, TanStack Query, React Hook Form + Zod; existing visual components refactored to take API data rather than rewritten; admin under `/admin` as a separate lazy bundle.
- **SEO for an SPA**: per-route meta via a head manager, plus backend-generated `sitemap.xml` and a Vercel rewrite. Note: crawlers that don't run JS will still see only the shell; full prerendering/SSR is a documented follow-up, not a silent gap.
- **Delivery in milestones**, each ending green on tests:
  1. Backend foundation: DB, migrations, auth, RBAC, audit log, core content models + public/admin APIs, seed from `portfolio.ts`.
  2. Public site on the API + router + new pages (projects/services/blog detail, about, contact v2).
  3. Admin dashboard: all modules.
  4. Media (Cloudinary), email templates, SEO, settings.
  5. Security hardening, full test pass (pytest, RTL, Playwright, ZAP baseline, pip-audit/npm audit, secret scan), final docs.

## 8. Needs from the owner

| Item | Why |
|---|---|
| Local PostgreSQL (Docker Desktop is installed but not running) | Migrations and integration tests |
| CartInMinutes repo or URL | To publish it accurately |
| Confirm MRS API host (Railway?) and that you may name the client publicly | Accuracy and client consent |
| Cloudinary credentials (later, milestone 4) | Real uploads; tests use a mocked storage adapter until then |
| Real testimonials with client approval | Section stays hidden until one is approved |
