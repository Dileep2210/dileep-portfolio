# Dileep Kumar Panchumarthi — Portfolio & CMS

A dynamic developer portfolio with its own admin CMS.

| Part | Stack | Folder |
|---|---|---|
| Public site + admin dashboard | React 19, TypeScript, Vite, Tailwind 4, Framer Motion, React Router, TanStack Query, React Hook Form + Zod | `frontend/` |
| API | Python, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, Argon2, JWT cookies | `backend/` |
| Hosting | Vercel (site, rewrites `/api/*`) → Railway (API + PostgreSQL), Cloudinary (media), Brevo (email) | |

Everything on the site — profile, homepage sections, projects, services, testimonials, skills, experience, blog, navigation, social links, SEO, resume — is managed at **`/admin`**. Content changes appear without rebuilding the frontend.

## Documentation

| Doc | What |
|---|---|
| [docs/INITIAL_AUDIT.md](docs/INITIAL_AUDIT.md) | Starting point, verified project facts |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Tables, constraints, migrations |
| [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | Conventions + every endpoint |
| [docs/SECURITY_PLAN.md](docs/SECURITY_PLAN.md) | Threat model and controls |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Railway/Vercel setup, first admin, backups, rollback, local dev |
| [docs/ADMIN_USER_GUIDE.md](docs/ADMIN_USER_GUIDE.md) | Using the dashboard |
| [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) | What was tested and the results |
| [docs/SECURITY_RECOMMENDATIONS.md](docs/SECURITY_RECOMMENDATIONS.md) | Remaining risks and next steps |
| [docs/FINAL_AUDIT_REPORT.md](docs/FINAL_AUDIT_REPORT.md) | Summary report |

## Quick start (local)

See [DEPLOYMENT_GUIDE.md §10](docs/DEPLOYMENT_GUIDE.md#10-local-development). In short: PostgreSQL in Docker → `alembic upgrade head` → `python -m app.cli seed` → `python -m app.cli create-admin --email you@example.com` → `uvicorn app.main:app --reload` → `cd frontend && npm run dev`.
