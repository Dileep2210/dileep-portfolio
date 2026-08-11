import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, ChevronDown, FlaskConical } from "lucide-react";
import type { Project } from "../data/portfolio";

type ProjectCardProps = {
  project: Project;
  index: number;
};

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40"
    >
      <a
        href={project.url}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-[16/10] overflow-hidden border-b border-border"
      >
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
      </a>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="font-display text-base font-semibold text-white transition-colors hover:text-cyan"
          >
            {project.name}
          </a>
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

        {project.caseStudy && (
          <div className="mt-4 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between text-sm font-medium text-cyan"
            >
              {expanded ? "Hide case study" : "Read case study"}
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="pt-3 text-sm leading-relaxed text-mist">
                    {project.caseStudy}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
