import { ArrowLeft, ArrowUpRight, Briefcase, CheckCircle2, FlaskConical, PlayCircle } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { Link, useParams } from "react-router";
import CoverImage from "../components/CoverImage";
import Markdown from "../components/Markdown";
import Seo from "../components/Seo";
import { ErrorState, Skeleton } from "../components/States";
import { TestimonialCard } from "../components/home/Sections";
import { ApiError } from "../lib/api";
import { useProject, useSite } from "../lib/queries";
import NotFoundPage from "./NotFoundPage";
import { ProjectCard } from "./ProjectsPage";

function Block({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
      <Markdown className="mt-4">{body}</Markdown>
    </section>
  );
}

export default function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const { data, isLoading, error, refetch } = useProject(slug);
  const site = useSite().data;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 pt-36" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 aspect-[16/8] w-full" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="project" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-36">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const { project: p, testimonials, related } = data;
  const base = (site?.settings.site_url || window.location.origin).replace(/\/$/, "");
  return (
    <article className="mx-auto max-w-5xl px-6 pb-28 pt-32">
      <Seo
        title={p.seo_title || p.title}
        description={p.seo_description || p.summary}
        path={`/projects/${p.slug}`}
        image={p.cover_url}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: p.title,
          description: p.summary,
          url: `${base}/projects/${p.slug}`,
          image: p.cover_url ? new URL(p.cover_url, base).toString() : undefined,
          creator: { "@type": "Person", name: site?.settings.developer_name },
          keywords: p.technologies.join(", "),
          ...(p.live_url ? { sameAs: p.live_url } : {}),
        }}
      />
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-white">
        <ArrowLeft size={14} aria-hidden /> All projects
      </Link>
      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          {p.category && <span className="font-mono text-xs uppercase tracking-wider text-cyan">{p.category.name}</span>}
          {p.is_client_project && (
            <span className="flex items-center gap-1 rounded-full glass px-2.5 py-0.5 text-xs text-emerald-300">
              <Briefcase size={12} aria-hidden /> Client project{p.client_name ? ` · ${p.client_name}` : ""}
            </span>
          )}
          {p.is_demo && (
            <span className="flex items-center gap-1 rounded-full glass px-2.5 py-0.5 text-xs text-amber-300">
              <FlaskConical size={12} aria-hidden /> Demo / MVP
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{p.title}</h1>
        <p className="mt-3 text-lg text-white/80">{p.tagline}</p>
        <p className="mt-4 max-w-3xl text-mist">{p.summary}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {p.live_url && (
            <a href={p.live_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-semibold text-white">
              Visit live site <ArrowUpRight size={15} aria-hidden />
            </a>
          )}
          {p.github_url && (
            <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-semibold text-white">
              <FaGithub size={15} aria-hidden /> Source code
            </a>
          )}
          {p.video_url && (
            <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-semibold text-white">
              <PlayCircle size={15} aria-hidden /> Watch demo
            </a>
          )}
        </div>
      </header>

      <div className="mt-10 overflow-hidden rounded-3xl border border-border">
        <CoverImage src={p.cover_url} title={p.title} eager className="aspect-[16/9] w-full object-cover object-top" />
      </div>

      <dl className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface/40 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wider text-mist">Technologies</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {p.technologies.map((t) => (
              <Link key={t} to={`/projects?tech=${encodeURIComponent(t)}`} className="rounded-full border border-border bg-white/5 px-2.5 py-0.5 text-xs text-white/90 hover:border-cyan/50">
                {t}
              </Link>
            ))}
          </dd>
        </div>
        {p.highlight_label && (
          <div>
            <dt className="text-xs uppercase tracking-wider text-mist">{p.highlight_label}</dt>
            <dd className="mt-2 text-sm font-medium text-white">{p.highlight_value}</dd>
          </div>
        )}
        {p.timeline && (
          <div>
            <dt className="text-xs uppercase tracking-wider text-mist">Timeline</dt>
            <dd className="mt-2 text-sm font-medium text-white">{p.timeline}</dd>
          </div>
        )}
      </dl>

      <Block title="Overview" body={p.overview} />
      {p.features.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-white">Main features</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface/40 p-3 text-sm text-white/90">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
      <Block title="Technical architecture" body={p.architecture} />
      <Block title="My contribution" body={p.contribution} />
      <Block title="Challenges" body={p.challenges} />
      <Block title="Solutions" body={p.solutions} />
      <Block title="Outcomes" body={p.outcomes} />

      {p.gallery.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-white">Screenshots</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {p.gallery.map((g) => (
              <figure key={g.media_id} className="overflow-hidden rounded-2xl border border-border">
                <a href={g.url} target="_blank" rel="noopener noreferrer">
                  <img src={g.url} alt={g.alt_text || g.caption || `${p.title} screenshot`} loading="lazy" decoding="async" className="w-full object-cover" />
                </a>
                {g.caption && <figcaption className="p-3 text-xs text-mist">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-white">Client feedback</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 rounded-3xl glass p-8 text-center">
        <p className="font-display text-xl font-semibold text-white">Want something similar?</p>
        <p className="mt-2 text-sm text-mist">Tell me about your project and I will reply with an honest plan.</p>
        <Link to="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink">
          Start a project <ArrowUpRight size={15} aria-hidden />
        </Link>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-white">More projects</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ProjectCard key={r.id} project={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
