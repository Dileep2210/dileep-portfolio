# Security Plan

References: OWASP ASVS 4.0.3 (Level 2 targets for auth/session/access control), OWASP Top 10 2021. This plan states the intended controls; `FINAL_AUDIT_REPORT.md` records what was verified and what remains open.

## Threat model (short)

| Asset | Threat | Primary controls |
|---|---|---|
| Admin account | credential stuffing, brute force, phishing reuse | Argon2id, per-IP + per-account lockout, optional TOTP, no account enumeration, security emails on reset |
| Admin session | XSS token theft, CSRF, replay of stolen refresh token | HttpOnly cookies (no tokens in JS/localStorage), SameSite=Lax, double-submit CSRF + Origin check, refresh rotation with family revocation on reuse, server-side session check per request |
| Content integrity | broken access control, IDOR, privilege escalation | permissions checked in backend dependencies on every admin route; tests call every admin route unauthenticated and as `viewer` |
| Visitors | stored XSS via CMS content | markdown rendered without raw HTML; URL fields restricted to `https:`/relative; icons are keys from a whitelist; CSP |
| Lead PII | data leak | admin-only, `leads:*` permissions, not returned by public APIs, IP stored as HMAC, export requires re-auth and is audit-logged, CSV formula neutralisation |
| Server | malicious uploads | MIME allow-list (JPEG/PNG/WebP/GIF/PDF, **no SVG/HTML**), magic-byte check, Pillow decode + re-encode (strips EXIF/GPS), pixel cap, size caps, random names, PDF active-content rejection |
| Infrastructure | secret exposure, verbose errors | env-only secrets, production startup guard, docs disabled in prod, uniform error envelope without stack traces, secret scanning in CI |

## Controls by area

**Authentication** — Argon2id (argon2-cffi defaults); minimum password length 12, max 128; constant-time dummy verify for unknown emails; lock account 15 min after 5 consecutive failures; slowapi 10/min per IP on login; generic "Invalid email or password". TOTP (RFC 6238, ±1 step, replay of the same step rejected) sealed with Fernet using a key derived from `SECRET_KEY` via HKDF.

**Session** — access JWT (HS256, 15 min, claims `sub`, `sid`, `ver`, `type`, `iat`, `exp`, `iss`) in `pf_access` (path `/api`); opaque 256-bit refresh token in `pf_refresh` (path `/api/v1/auth`, 7 days, stored as SHA-256). Every authenticated request verifies the `auth_sessions` row is unrevoked and `token_version` matches, so logout and password reset take effect immediately. Reuse of a rotated refresh token revokes the whole session.

**CSRF** — `pf_csrf` readable cookie + `X-CSRF-Token` header compared in constant time for every state-changing request that carries the session cookie; `Origin`/`Referer` must match `PUBLIC_SITE_ORIGIN` for those requests.

**Authorization** — roles `super_admin`, `editor`, `viewer`; permissions `<module>:read|write|delete` plus `leads:export`, `users:manage`, `audit:read`, `settings:write`, `security:manage`. Only `super_admin` can manage users/roles; a user cannot change their own roles; the last active super admin cannot be demoted or deactivated.

**Re-authentication** — `POST /auth/reauth` marks the session as re-authenticated for 5 minutes; required for user/role changes, MFA disable, lead export, password change.

**Password reset / recovery** — always `202` regardless of email; token 256-bit, hashed, 30 min, single use; only for active users with verified email; success revokes all sessions and sends a security notification. Invitations follow the same token scheme and verify the email.

**Bootstrap** — `python -m app.cli create-admin --email ...` prompts for the password (or reads `ADMIN_PASSWORD` env in CI); refuses if a super admin already exists unless `--force-additional`. No HTTP path can create the first admin.

**Input** — Pydantic with length limits on every field, `extra="forbid"`; ORM only (no string-built SQL); sort fields white-listed; URLs validated (`https://` or site-relative, no `javascript:`/`data:`); request body cap (1 MB JSON, uploads separately capped); no server-side URL fetching from user input (no SSRF surface) except Turnstile verification to a fixed host.

**Headers** — API: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cache-Control: no-store` on auth/admin, HSTS in production, `X-Request-ID`. Frontend (`vercel.json`): CSP (`default-src 'self'`, images from self + Cloudinary, `frame-ancestors 'none'`, no `unsafe-eval`), HSTS, Permissions-Policy, nosniff, Referrer-Policy.

**Logging** — request id, method, path, status, duration; never passwords, tokens, cookies, message bodies or SMTP errors with content.

**Spam** — honeypot, minimum fill time, per-IP rate limits, optional Cloudflare Turnstile (enabled when `TURNSTILE_SECRET_KEY` is set).

## Verification plan

pytest auth/authorization/IDOR/injection/upload suites · Playwright unauthorized-access flows · `pip-audit` · `npm audit` · Bandit (Python SAST) · oxlint · gitleaks-style secret scan · OWASP ZAP baseline against the **local** stack only. No testing against production or third-party systems.
