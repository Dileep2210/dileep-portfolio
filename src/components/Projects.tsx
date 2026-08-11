import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, FlaskConical } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { projects } from "../data/portfolio";

export default function Projects() {
  return (
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Selected Work"
          title="Live projects, built solo end to end"
          description="Two live businesses and two AI demos I designed, built and shipped by myself — from idea to a real, live URL. Proof I can take a freelance project the whole way."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {projects.map((project, i) => (
            <motion.a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40"
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
                <img
                  src={project.image}
                  alt={`${project.name} preview`}
                  loading="lazy"
                  className="h-full w-full scale-100 object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-60" />
                {project.isDemo && (
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    <FlaskConical size={12} />
                    Demo Project
                  </span>
                )}
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full glass text-white transition-transform duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-ink">
                  <ArrowUpRight size={15} />
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-base font-semibold text-white">
                    {project.name}
                  </h3>
                  <span className="whitespace-nowrap font-mono text-xs text-cyan">
                    {project.tagline}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-mist">
                  {project.description}
                </p>

                <ul className="mt-3 space-y-1">
                  {project.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-sm text-white/80"
                    >
                      <CheckCircle2
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-400"
                      />
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-white/5 px-2.5 py-0.5 text-xs text-mist"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
