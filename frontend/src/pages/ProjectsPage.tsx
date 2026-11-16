import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, FlaskConical, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import CoverImage from "../components/CoverImage";
import PageHeader from "../components/PageHeader";
import Seo from "../components/Seo";
import { CardGridSkeleton, EmptyState, ErrorState } from "../components/States";
import { useProjectCategories, useProjects, useProjectTechnologies } from "../lib/queries";
import type { Project } from "../lib/types";

const PAGE_SIZE = 12;

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface/60 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
        <CoverImage src={project.cover_url} title={project.title} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex gap-2">
          {project.is_client_project && (
            <span className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[11px] font-medium text-emerald-300">
              <Briefcase size={11} aria-hidden /> Client project
            </span>
          )}
          {project.is_demo && (
            <span className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[11px] font-medium text-amber-300">
              <FlaskConical size={11} aria-hidden /> Demo
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {project.category && <p className="font-mono text-[11px] uppercase tracking-wider text-cyan">{project.category.name}</p>}
        <h2 className="mt-1.5 font-display text-lg font-semibold text-white">
          <Link to={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-white/70">{project.tagline}</p>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-mist">{project.summary}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
          {project.technologies.slice(0, 5).map((t) => (
            <li key={t} className="rounded-full border border-border bg-white/5 px-2.5 py-0.5 text-[11px] text-mist">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const tech = params.get("tech") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(q);

  // Debounce typing into the URL (shareable, back-button friendly filters).
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== q) update({ q: search, page: "" });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  }

  const { data, isLoading, isFetching, error, refetch } = useProjects({ q, category, tech, page, page_size: PAGE_SIZE });
  const categories = useProjectCategories().data ?? [];
  const technologies = useProjectTechnologies().data ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <Seo pageKey="projects" title="Projects" path="/projects" />
      <PageHeader eyebrow="Portfolio" title="Projects" description="Client work, live products and demos — each one built end to end." />
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/40 p-4 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search projects</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan/60"
            />
          </label>
          <label className="md:w-56">
            <span className="sr-only">Filter by technology</span>
            <select
              value={tech}
              onChange={(e) => update({ tech: e.target.value, page: "" })}
              className="w-full rounded-xl border border-border bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/60"
            >
              <option value="">All technologies</option>
              {technologies.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ slug: "", name: "All" }, ...categories].map((c) => (
            <button
              key={c.slug || "all"}
              type="button"
              aria-pressed={category === c.slug}
              onClick={() => update({ category: c.slug, page: "" })}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${category === c.slug ? "bg-white text-ink" : "border border-border text-mist hover:text-white"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mt-8" aria-live="polite" aria-busy={isFetching}>
          {isLoading ? (
            <CardGridSkeleton />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : !data?.items.length ? (
            <EmptyState title="No projects match these filters" text="Try a different search or clear the filters." />
          ) : (
            <>
              <p className="mb-4 text-sm text-mist">
                {data.total} project{data.total === 1 ? "" : "s"}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <ProjectCard project={p} />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="rounded-full border border-border px-4 py-2 text-sm text-white disabled:opacity-40">
              Previous
            </button>
            <span className="px-3 text-sm text-mist">
              Page {page} of {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} className="rounded-full border border-border px-4 py-2 text-sm text-white disabled:opacity-40">
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
