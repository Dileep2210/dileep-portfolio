import { ArrowUpRight, Briefcase, FlaskConical, Zap } from "lucide-react";
import { Link } from "react-router";
import type { Project } from "../lib/types";
import CoverImage from "./CoverImage";

type ProjectPosterProps = {
  project: Project;
  /** Duplicate copies used to fill the marquee loop are hidden from the a11y tree. */
  ariaHidden?: boolean;
};

export default function ProjectPoster({ project, ariaHidden }: ProjectPosterProps) {
  return (
    <Link
      to={`/projects/${project.slug}`}
      aria-hidden={ariaHidden || undefined}
      tabIndex={ariaHidden ? -1 : undefined}
      className="group/poster relative block w-64 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface/60 transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.04] hover:border-cyan/40 hover:shadow-[0_20px_50px_-20px_rgba(34,211,238,0.35)] sm:w-72"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
        <CoverImage
          src={project.cover_url}
          title={project.title}
          className="h-full w-full scale-100 object-cover object-top transition-transform duration-700 ease-out group-hover/poster:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-80 transition-opacity duration-500 group-hover/poster:opacity-95" />
        <span
          aria-hidden
          className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 ease-out group-hover/poster:left-full group-hover/poster:opacity-100"
        />
        {project.is_client_project ? (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <Briefcase size={10} aria-hidden />
            Client project
          </span>
        ) : project.is_demo ? (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] font-medium text-amber-300">
            <FlaskConical size={10} aria-hidden />
            Demo
          </span>
        ) : null}
        <span className="absolute right-2.5 top-2.5 flex h-7 w-7 translate-y-1 items-center justify-center rounded-full glass text-white opacity-0 transition-all duration-300 group-hover/poster:translate-y-0 group-hover/poster:bg-white group-hover/poster:text-ink group-hover/poster:opacity-100">
          <ArrowUpRight size={13} aria-hidden />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <p className="font-display text-sm font-semibold leading-tight text-white">{project.title}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-cyan">{project.tagline}</p>
        </div>
      </div>
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover/poster:grid-rows-[1fr] group-focus-visible/poster:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="space-y-2.5 p-3.5 pt-3">
            <p className="line-clamp-3 text-xs leading-relaxed text-mist">{project.summary}</p>
            {project.highlight_label && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-200">
                <Zap size={11} className="shrink-0 text-violet-300" aria-hidden />
                <span className="truncate">
                  {project.highlight_label}: <span className="text-white">{project.highlight_value}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
