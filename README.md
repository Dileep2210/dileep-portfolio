# Dileep Kumar Panchumarthi — Portfolio

Personal portfolio for **Dileep Kumar Panchumarthi**, a Full Stack & GenAI
developer available for freelance work — end-to-end websites, web apps, and
AI-powered features (RAG, agents, LLM integrations).

**Live site:** https://dileepkumar-dev.vercel.app

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) (build tool)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://motion.dev/) and [Lenis](https://github.com/darkroomengineering/lenis) for animation and smooth scrolling
- [Lucide](https://lucide.dev/) & [react-icons](https://react-icons.github.io/react-icons/)
- Backend: [FastAPI](https://fastapi.tiangolo.com/) contact API (`backend/`) sending mail through Brevo SMTP
- Tests: [Playwright](https://playwright.dev/) smoke tests, pytest for the backend

## Getting Started

```bash
cd frontend
npm install
npm run dev         # frontend dev server (http://localhost:5173)
npm run build       # type-check + production build
npm run preview     # preview the production build
npm run lint        # oxlint
npm run test:e2e    # Playwright smoke tests (builds + previews the site, API is mocked)
```

To run the contact form end to end locally, start the backend too (see [backend/README.md](backend/README.md)).

## Project Structure

```
frontend/                 # React + Vite site (deployed to Vercel)
  src/
    data/portfolio.ts     # all site content: profile, tech stack, projects, services, testimonials
    components/           # one component per section (Hero, About, Projects, ...)
    hooks/                # scroll-spy + smooth-scroll hooks
  e2e/                    # Playwright smoke tests
  public/                 # favicon, resume.pdf, og.png, robots.txt, sitemap.xml, 404.html
  index.html, package.json, vite.config.ts, .env.example
backend/                  # FastAPI contact API (deployed to Railway): app/, tests/, .env.example
docs/DEPLOYMENT.md        # Railway + Vercel + Brevo setup and production checklist
```

## Environment variables

| Where | Variable | Purpose |
|---|---|---|
| Frontend (Vercel / `.env`) | `VITE_API_URL` | Base URL of the backend, e.g. `https://your-service.up.railway.app`. Public, so never put secrets in `VITE_*` variables. |
| Backend (Railway / `backend/.env`) | `SMTP_*`, `MAIL_FROM`, `CONTACT_RECEIVER_EMAIL`, `FRONTEND_ORIGIN`, `RATE_LIMIT_CONTACT` | See [backend/.env.example](backend/.env.example). |

Copy `frontend/.env.example` and `backend/.env.example` (backend) to `.env` files for local work. Real `.env` files are git-ignored.

## Content notes

- **Resume**: the nav and Contact links point to `frontend/public/resume.pdf`. Replace the file to update it.
- **Testimonials**: the section hides itself while `testimonials` in `portfolio.ts` is empty. Add real quotes only.
- **SEO**: canonical URL, Open Graph/Twitter tags and JSON-LD live in `frontend/index.html`; update them if the production domain changes (also `frontend/public/sitemap.xml` and `robots.txt`).

## Deployment

Frontend on [Vercel](https://vercel.com/) (Vite preset), backend on Railway, email through Brevo.
Step-by-step instructions and the production test checklist are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
CI (`.github/workflows/ci.yml`) runs lint, build, audit, Playwright and the backend tests on every push and PR.

## Contact

- Email: dileepfreelancer22@gmail.com
- GitHub: [@Dileep2210](https://github.com/Dileep2210)
- LinkedIn: [panchumarthi-dileep-kumar](https://www.linkedin.com/in/panchumarthi-dileep-kumar-a6a82a219/)
