# Portfolio CMS API (FastAPI)

See the project docs in [`../docs`](../docs): architecture, database design, API specification, security plan and the deployment guide (including local development).

```
app/
  main.py          app factory: middleware (request id, security headers, body cap, CSRF/Origin), errors, routers
  cli.py           python -m app.cli create-admin | seed | sync-roles | prune-sessions
  core/            config (production guard), database, security (Argon2/JWT/TOTP), permissions, deps, audit, email, storage, rate limit
  models/          SQLAlchemy 2 models
  schemas/         Pydantic request/response models
  services/        auth sessions, leads, site settings, email templates
  api/misc.py      /health, /ready, /sitemap.xml, legacy /api/contact
  api/v1/          auth, public, admin/* (generic CRUD + leads, media, users, audit, settings, dashboard)
  seed/            initial content (migrated from the old static site)
alembic/           migrations — the only way the schema changes
scripts/           e2e_server.py (throwaway API for Playwright)
tests/             pytest against a real PostgreSQL database
```

Common commands: `alembic upgrade head`, `pytest`, `python -m bandit -r app -q`, `python -m pip_audit -r requirements.txt`.
