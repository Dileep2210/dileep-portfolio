# Security Recommendations

This application has been hardened and tested (see `FINAL_AUDIT_REPORT.md`), but **no application is completely secure** and nothing here is a certification. These are the remaining risks and the actions that reduce them, highest value first.

## Do before / at go-live

1. **Turn on two-factor authentication** for every Super Admin immediately after first sign-in.
2. **Strong, unique `SECRET_KEY`** (48+ random chars) set only in Railway. Rotating it signs everyone out and invalidates 2FA enrolments (users must re-enrol) — rotate only if leaked.
3. **Configure SMTP** (Brevo) so password-reset, invitation and security-notice emails work. Without it, password reset is unavailable and invitations must be shared manually.
4. **Replace the Railway URL in `frontend/vercel.json`** and set `PUBLIC_SITE_ORIGIN` exactly to the production origin; set `TRUSTED_PROXY_HOPS=2` so rate limits key on the real client IP.
5. **Database backups**: enable Railway backups or schedule `pg_dump` (see `DEPLOYMENT_GUIDE.md` §8) and test a restore once.
6. **Cloudinary**: use a dedicated account/folder; keep the API secret only in Railway.
7. **Custom domain**: once you have one, submit it to the HSTS preload list (the header already sends `preload`) and update `site_url`, `PUBLIC_SITE_ORIGIN` and the Vercel domain.

## Known limitations (accepted, documented)

| # | Limitation | Risk | Mitigation / next step |
|---|---|---|---|
| L1 | Rate limits, login throttles and lockout counters are per-instance in memory (`slowapi`), reset on deploy. | Low with one Railway instance | Set `RATE_LIMIT_STORAGE_URI=redis://…` before scaling to >1 instance. Add a Vercel/Cloudflare edge rate limit for bots. |
| L2 | No CAPTCHA by default; spam protection is honeypot + minimum fill time + rate limits. | Low–medium (contact spam) | Backend supports Cloudflare Turnstile (`TURNSTILE_SECRET_KEY`); the frontend widget is not wired yet — add it if spam appears. |
| L3 | 2FA has no one-time recovery codes. | Medium for a single admin | Keep a second Super Admin, or use the CLI recovery path in the admin guide. Recovery codes are a sensible next feature. |
| L4 | Account lockout can be triggered by an attacker who knows the admin email (denial of sign-in for 15 min). | Low | Lockout is time-boxed; per-IP rate limits apply first; another admin can unlock. |
| L5 | SPA rendering: crawlers that do not run JavaScript (and social preview bots) see the default `index.html` metadata, not per-page tags. | SEO, not security | Add pre-rendering (e.g. `vite-plugin-prerender` or Vercel edge middleware that injects meta from the API) if per-page social cards matter. |
| L6 | `style-src 'unsafe-inline'` in the CSP (needed by Framer Motion inline styles and Google Fonts CSS). | Low (scripts remain `'self'` only) | Self-host fonts and move to nonce-based styles if a stricter CSP is required. |
| L7 | `img-src https:` allows images from any https host because CMS fields accept https URLs. | Low (images cannot execute script) | Restrict to `'self' https://res.cloudinary.com` if you only ever use the media library. |
| L8 | Uploaded animated GIF/WebP files are verified but not re-encoded (other images are). | Low (served from Cloudinary with image content types) | Re-encode animations or disallow GIF if not needed. |
| L9 | PDF active-content check is a signature/keyword scan, not a full parser. | Low (PDFs are served as downloads from Cloudinary, sandboxed in the admin preview) | Run PDFs through a sanitiser (e.g. qpdf/Ghostscript rewrite) if untrusted users ever upload. Only admins can upload today. |
| L10 | Vercel preview deployments use the production API via the same rewrite. | Low (admin is blocked by the Origin check on previews; public data is public) | Point previews at a staging API if you want isolated testing. |
| L11 | Audit logs are append-only by convention, not cryptographically protected; a database admin can alter them. | Low | Ship logs to an external log store if you need tamper evidence. |
| L12 | Password policy checks length, variety and a small common list — no breached-password (HIBP) lookup. | Low with 2FA on | Add a k-anonymity HIBP range check on password set/reset. |

## Ongoing

- Keep dependencies patched: CI runs `npm audit`, `pip-audit`, Bandit and gitleaks on every push; review Dependabot alerts monthly.
- Review **Audit logs** and **Signed-in devices** periodically; remove users who no longer need access.
- Re-run the OWASP ZAP baseline against a staging deployment after major changes (command in `TEST_RESULTS.md`). Never run active scans against production without planning.
- Treat exported lead CSVs as personal data: store encrypted, delete when done.
