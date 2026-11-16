# Deployment guide

Architecture: **Vercel** serves the React site; **Railway** runs the FastAPI backend in `backend/`;
**Brevo** relays the contact-form email over SMTP.

```
Browser (Vercel) --POST JSON--> FastAPI (Railway) --SMTP 587/STARTTLS--> Brevo --> your inbox
```

## 1. Brevo SMTP setup

1. Create a free account at brevo.com.
2. **Verify a sender**: *Senders, Domains & Dedicated IPs → Senders → Add a sender*. Use an address you
   can receive mail at and click the confirmation link. This address becomes `MAIL_FROM`.
   (For best deliverability, authenticate a domain you own with Brevo's DKIM/DMARC records.)
3. Get SMTP credentials: *top-right menu → SMTP & API → SMTP tab*.
   - Server: `smtp-relay.brevo.com`, port `587`
   - **Login** (looks like `xxxx@smtp-brevo.com`) → `SMTP_USERNAME`
   - **Generate a new SMTP key** → `SMTP_PASSWORD` (shown once; store it only in Railway/your local `.env`)
4. If Brevo reports your account is not activated for SMTP, contact Brevo support to enable it.

## 2. Deploy the backend on Railway

1. Push this repo to GitHub (make sure `backend/.env` is **not** committed; it is git-ignored).
2. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
3. Service **Settings → Source → Root Directory** = `backend`. Railway detects Python from
   `requirements.txt`; `backend/railway.json` sets the start command
   (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`) and the `/health` healthcheck.
4. **Variables** tab, add (values: see `backend/.env.example`):

   | Variable | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `SMTP_HOST` | `smtp-relay.brevo.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USERNAME` | your Brevo SMTP login |
   | `SMTP_PASSWORD` | your Brevo SMTP key |
   | `MAIL_FROM` | the sender you verified in Brevo |
   | `MAIL_FROM_NAME` | `Portfolio Contact Form` |
   | `CONTACT_RECEIVER_EMAIL` | the inbox that should receive enquiries |
   | `FRONTEND_ORIGIN` | `https://dileepkumar-dev.vercel.app` (exact origin, no trailing slash; comma-separate if you also use a custom domain) |
   | `RATE_LIMIT_CONTACT` | `2/minute;5/hour` |
   | `TRUST_PROXY` | `true` |

5. **Settings → Networking → Generate Domain** to get `https://<name>.up.railway.app`.
6. Check `https://<name>.up.railway.app/health` returns `{"status":"ok"}`.

Keep **one replica**: the default rate limiter stores counters in memory. To scale out, add a Railway Redis
service and set `RATE_LIMIT_STORAGE_URI` to its URL (`redis://...`; also `pip install redis`).

## 3. Configure Vercel (frontend)

In Vercel, import the repo and set **Root Directory** = `frontend` (Vite preset, build `npm run build`, output `dist`).
Then *Project → Settings → Environment Variables* (Production, and Preview if you want it):

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://<name>.up.railway.app` (no trailing slash) |

Redeploy afterwards: Vite bakes `VITE_*` values in at build time. This is the **only** frontend variable;
never put SMTP credentials or any secret in a `VITE_*` variable (they ship to every visitor).
The old `VITE_FORMSPREE_ID` is no longer used and can be deleted.

## 4. Production testing checklist

- [ ] `GET <railway-url>/health` → `200 {"status":"ok"}`
- [ ] `GET <railway-url>/docs` → `404` (docs disabled in production)
- [ ] Open the live site, submit the form with real details → "Message sent" appears
- [ ] **The email arrives** at `CONTACT_RECEIVER_EMAIL` (check spam once); sender/name/email/subject/message are shown
- [ ] Hit *Reply*: the To field is the visitor's address (Reply-To works)
- [ ] Browser DevTools → Network: request goes to the Railway URL, no CORS errors
- [ ] CORS lock: from another origin, e.g. `curl -i -X OPTIONS <railway-url>/api/contact -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST"` has **no** `access-control-allow-origin`
- [ ] Rate limit: submit 3+ times within a minute → the 3rd shows the "wait a bit" message (HTTP 429)
- [ ] Invalid input (bad email, empty fields, short message) shows inline errors
- [ ] Turn off Wi-Fi and submit → friendly network error, typed text kept
- [ ] Railway logs contain no names, emails or message text (only `ref=` ids)
- [ ] `https://dileepkumar-dev.vercel.app/robots.txt`, `/sitemap.xml`, `/og.png`, and a bad URL (404 page) work
- [ ] Paste the site URL into a LinkedIn/WhatsApp/Slack preview or the opengraph.xyz checker to confirm the card
