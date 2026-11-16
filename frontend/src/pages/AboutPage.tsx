import { ArrowUpRight, Award, Briefcase, GraduationCap } from "lucide-react";
import { Link } from "react-router";
import Markdown from "../components/Markdown";
import PageHeader from "../components/PageHeader";
import Seo from "../components/Seo";
import { ErrorState, Skeleton } from "../components/States";
import { TechStackSection, WhyMeSection } from "../components/home/Sections";
import { formatDate } from "../lib/format";
import { useExperiences, useSite } from "../lib/queries";
import type { Experience } from "../lib/types";

const KIND = {
  work: { label: "Experience", icon: Briefcase },
  education: { label: "Education", icon: GraduationCap },
  achievement: { label: "Achievements", icon: Award },
} as const;

function range(e: Experience) {
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short" };
  const start = formatDate(e.start_date, opts);
  const end = e.is_current ? "Present" : formatDate(e.end_date, opts);
  return [start, end].filter(Boolean).join(" – ");
}

export default function AboutPage() {
  const { data: site, isLoading, error, refetch } = useSite();
  const experiences = useExperiences().data ?? [];
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-36" role="status" aria-label="Loading">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }
  if (error || !site) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-36">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }
  const s = site.settings;
  const groups = (Object.keys(KIND) as (keyof typeof KIND)[])
    .map((k) => ({ kind: k, items: experiences.filter((e) => e.kind === k) }))
    .filter((g) => g.items.length);

  return (
    <>
      <Seo pageKey="about" title={`About ${s.developer_name}`} path="/about" type="profile" />
      <PageHeader eyebrow="About" title={s.developer_name} description={s.headline} />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-lg leading-relaxed text-white/90">{s.bio}</p>
            {s.philosophy && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-semibold text-white">How I work</h2>
                <Markdown className="mt-4">{s.philosophy}</Markdown>
              </section>
            )}
            {s.journey && (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-semibold text-white">My journey</h2>
                <Markdown className="mt-4">{s.journey}</Markdown>
              </section>
            )}
          </div>
          <aside className="h-fit space-y-4 rounded-3xl glass p-6">
            {s.profile_image_url && <img src={s.profile_image_url} alt={s.developer_name} className="mx-auto max-h-72 object-contain" loading="lazy" />}
            <dl className="grid gap-3">
              {s.highlights.map((h) => (
                <div key={h.label}>
                  <dt className="text-xs uppercase tracking-wider text-mist">{h.label}</dt>
                  <dd className="text-sm font-medium text-white">{h.value}</dd>
                </div>
              ))}
              {s.location && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-mist">Location</dt>
                  <dd className="text-sm font-medium text-white">{s.location}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              {site.resume_url && (
                <a href={site.resume_url} download className="rounded-full border border-border px-4 py-2 text-sm text-white">
                  Download resume
                </a>
              )}
              <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">
                Hire me <ArrowUpRight size={14} aria-hidden />
              </Link>
            </div>
          </aside>
        </div>

        {groups.map(({ kind, items }) => {
          const { label, icon: Icon } = KIND[kind];
          return (
            <section key={kind} className="mt-20">
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-white">
                <Icon size={20} className="text-cyan" aria-hidden /> {label}
              </h2>
              <ol className="mt-6 space-y-4 border-l border-border pl-6">
                {items.map((e) => (
                  <li key={e.id} className="relative">
                    <span aria-hidden className="absolute -left-[29px] top-2 h-2.5 w-2.5 rounded-full bg-cyan" />
                    <p className="text-xs text-mist">{range(e)}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-white">
                      {e.title}
                      {e.organization && <span className="font-normal text-mist"> · {e.organization}</span>}
                    </h3>
                    {e.description && <Markdown className="mt-2 text-sm">{e.description}</Markdown>}
                    {e.highlights.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
                        {e.highlights.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      <TechStackSection site={site} section={site.homepage.find((x) => x.key === "skills")} />
      <WhyMeSection site={site} section={site.homepage.find((x) => x.key === "why_me")} />
    </>
  );
}
