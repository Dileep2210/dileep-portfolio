# Deployment Guide

Target: **Vercel** (React site) → rewrites `/api/*` → **Railway** (FastAPI) → **Railway PostgreSQL**, media on **Cloudinary**, email via **Brevo SMTP**.

> Nothing in this guide has been executed against production. Do the steps in order and keep the current site running until step 6 passes.

## 0. Before you start

- Back up anything already in production (the current site has no database, so only the Vercel project settings matter).
- The repository layout changed: the site now lives in `frontend/`. Set the Vercel **Root Directory = `frontend`** *before* merging this branch to `main`, or the next production build will fail.

## 1. PostgreSQL (Railway)

1. Railway project → **New → Database → PostgreSQL**.
2. Note the variable reference `${{Postgres.DATABASE_URL}}` — the API service will use it.
3. Turn on Railway's automated backups for the database (Database → Backups) if your plan includes them; otherwise use the manual procedure in §8.

## 2. Cloudinary

1. Create a free account → Dashboard → **API Keys** → copy the *API environment variable* (`cloudinary://<key>:<secret>@<cloud>`).
2. Optional: Settings → Security → restrict *allowed fetch domains*; enable *strict transformations*.

## 3. API service (Railway)

1. **New → GitHub repo** → this repository. Service **Settings → Root Directory = `backend`**.
2. `backend/railway.json` already sets: `preDeployCommand: alembic upgrade head`, the start command and the `/ready` health check.
3. **Variables** (see `backend/.env.example` for every option):

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `SECRET_KEY` | output of `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `PUBLIC_SITE_ORIGIN` | `https://<your-vercel-domain>` (exact, no trailing slash) |
| `COOKIE_SECURE` | `true` |
| `TRUSTED_PROXY_HOPS` | `2` (browser → Vercel → Railway) |
| `STORAGE_BACKEND` | `cloudinary` |
| `CLOUDINARY_URL` | from step 2 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Brevo SMTP credentials |
| `MAIL_FROM` | a sender verified in Brevo |
| `MAIL_FROM_NAME` | e.g. `Dileep Kumar Panchumarthi` |
| `CONTACT_RECEIVER_EMAIL` | where enquiries go |

The API **refuses to start** in production with a weak/missing `SECRET_KEY`, non-https origins, insecure cookies or local file storage — check the deploy logs if it does not come up.

4. Deploy. The pre-deploy step creates all tables and roles. Check `https://<api>.up.railway.app/ready` → `{"status":"ready","schema":"0001"}`.

## 4. Seed content and create the first admin (one time)

From your machine with the Railway CLI (`npm i -g @railway/cli`, `railway login`, `railway link`):

```bash
cd backend
railway run python -m app.cli seed                 # loads the migrated portfolio content (idempotent)
railway run python -m app.cli create-admin --email you@example.com --name "Your Name"
# prompts for the password (12+ chars). There is no web sign-up.
```

Then sign in at `/admin/login` and **turn on two-factor authentication** under *Security*.

## 5. Frontend (Vercel)

1. Edit `frontend/vercel.json`: replace both `https://REPLACE-WITH-YOUR-RAILWAY-API.up.railway.app` with your API URL.
2. Vercel project → **Settings → General → Root Directory = `frontend`**, Framework = Vite. No environment variables are needed.
3. Deploy a **preview** first (push the branch / open a PR) and test it. Note: on a preview URL, admin sign-in fails by design until that origin is set as `PUBLIC_SITE_ORIGIN` — test the public site there and admin on production, or temporarily point a staging API at the preview URL.
4. Merge to `main` → production deploy.

## 6. Verify

- `https://<site>/` loads with content; `/projects/mrs-fashion-jewel` renders.
- `https://<site>/api/v1/public/site` returns JSON (rewrite works); `https://<site>/sitemap.xml` lists projects.
- Submit the contact form → lead appears in `/admin/leads`, notification email arrives.
- Response headers on `/` include `Content-Security-Policy`, `Strict-Transport-Security`.
- `/admin` → sign in → create a draft project → publish → visible publicly.

## 7. Monitoring and logs

- Health: Railway health check on `/ready` (DB + migration version). Add an external uptime monitor (e.g. UptimeRobot) on `/health` and the site root.
- Logs: one line per request with `rid=<request id>`, method, path, status, duration and user id. Error responses include `request_id` — search Railway logs for it.
- Error tracking integration point: `app/main.py` `unhandled()` handler — add Sentry (`sentry-sdk[fastapi]`, `SENTRY_DSN`) there if wanted; do not send request bodies.

## 8. Backup and restore

```bash
# Backup (run regularly; keep copies off-platform, encrypted)
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > portfolio-$(date +%F).dump

# Restore into a NEW empty database first, verify, then switch DATABASE_URL
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET_DATABASE_URL" portfolio-YYYY-MM-DD.dump
```

Media lives in Cloudinary (back up via Cloudinary's backup option or export). The database stores only URLs and metadata.

## 9. Migrations and rollback

- Every deploy runs `alembic upgrade head` before the new version starts. A failed migration stops the deploy; the old version keeps running.
- **Always back up before deploying a migration.** To roll back code: Railway → Deployments → *Redeploy* the previous deployment. To roll back schema: `railway run alembic downgrade -1` (only for migrations whose downgrade is non-destructive; otherwise restore the backup).
- Frontend rollback: Vercel → Deployments → *Promote to production* on the previous deployment.

## 10. Local development

```bash
docker run -d --name portfolio-pg -e POSTGRES_USER=portfolio -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=portfolio -p 127.0.0.1:5544:5432 postgres:17-alpine
cd backend && python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env   # set APP_ENV=development, SECRET_KEY, DATABASE_URL=postgresql+psycopg://portfolio:dev@127.0.0.1:5544/portfolio,
                       # PUBLIC_SITE_ORIGIN=http://localhost:5173, COOKIE_SECURE=false, TRUSTED_PROXY_HOPS=0, STORAGE_BACKEND=local
alembic upgrade head && python -m app.cli seed && python -m app.cli create-admin --email you@example.com
uvicorn app.main:app --reload --port 8000
cd ../frontend && npm install && npm run dev        # http://localhost:5173 (proxies /api to :8000)
```

Tests: `cd backend && pytest` (needs a `portfolio_test` database; set `TEST_DATABASE_URL`), `cd frontend && npm test`, `npx playwright test` (needs a `portfolio_e2e` database; set `E2E_DATABASE_URL`).
