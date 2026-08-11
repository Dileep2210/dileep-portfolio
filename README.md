# Dileep Kumar Panchumarthi — Portfolio

Personal portfolio for **Dileep Kumar Panchumarthi**, a Full Stack & GenAI
developer available for freelance work — end-to-end websites, web apps, and
AI-powered features (RAG, agents, LLM integrations).

**Live site:** https://dileepkumar-dev.vercel.app

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) (build tool)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Framer Motion](https://motion.dev/) — animations & page transitions
- [Lenis](https://github.com/darkroomengineering/lenis) — smooth scrolling
- [Lucide](https://lucide.dev/) & [react-icons](https://react-icons.github.io/react-icons/) — iconography

## Getting Started

```bash
npm install
npm run dev       # start local dev server
npm run build     # type-check + production build
npm run preview   # preview the production build locally
npm run lint       # run oxlint
```

## Project Structure

```
src/
  data/portfolio.ts   # all site content — profile, tech stack, projects,
                       # services, learning topics, testimonials — edit
                       # this to update the site without touching layout
  components/         # one component per section (Hero, About, Projects, …)
  hooks/               # scroll-spy + smooth-scroll hooks
```

## Setup still needed

Two things are wired up but need your own values before they fully work:

1. **Resume download** — the nav and Contact section both link to
   `/resume.pdf`. Drop your actual resume PDF into `public/resume.pdf`
   (create the file with that exact name) and both buttons work immediately.
2. **Contact form** — sign up free at [formspree.io](https://formspree.io),
   create a form, and set `VITE_FORMSPREE_ID` to its ID — either in a local
   `.env` file (copy `.env.example`) for dev, or in your Vercel project's
   Environment Variables for production. Until set, the form shows a
   friendly "email me directly" fallback instead of failing silently.

**Testimonials** — the section hides itself automatically while
`testimonials` in `portfolio.ts` is empty. Add a real quote there once you
have one; no layout changes needed.

## Deployment

Deployed on [Vercel](https://vercel.com/) (Vite preset, no extra config
needed). The Vercel project is connected to this GitHub repo — every push
to `main` triggers an automatic production deployment.

## Contact

- Email: dileepfreelancer22@gmail.com
- GitHub: [@Dileep2210](https://github.com/Dileep2210)
- LinkedIn: [panchumarthi-dileep-kumar](https://www.linkedin.com/in/panchumarthi-dileep-kumar-a6a82a219/)
