# Dileep Kumar Panchumarthi — Portfolio

Personal portfolio for **Dileep Kumar Panchumarthi**, a Full Stack & GenAI
developer available for freelance work — end-to-end websites, web apps, and
AI-powered features (RAG, agents, LLM integrations).

**Live site:** https://dileep-portfolio-theta.vercel.app

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
                       # services, learning topics — edit this to update
                       # the site without touching component code
  components/         # one component per section (Hero, About, Projects, …)
  hooks/               # scroll-spy + smooth-scroll hooks
```

## Deployment

Deployed on [Vercel](https://vercel.com/) (Vite preset, no extra config
needed). Deployed manually via `vercel --prod` — auto-deploy on push isn't
wired up yet, since the Vercel account has no GitHub login connection.
To enable it: connect GitHub under Vercel account settings → Login
Connections, then link the Git repo in the project's Settings → Git.

## Contact

- Email: dileepfreelancer22@gmail.com
- GitHub: [@Dileep2210](https://github.com/Dileep2210)
- LinkedIn: [panchumarthi-dileep-kumar](https://www.linkedin.com/in/panchumarthi-dileep-kumar-a6a82a219/)
