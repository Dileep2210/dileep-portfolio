import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Pause, Play, Quote, Star } from "lucide-react";
import { Link } from "react-router";
import SectionHeading from "../SectionHeading";
import SpotlightCard from "../SpotlightCard";
import Magnetic from "../Magnetic";
import ProjectReel from "../ProjectReel";
import { CardGridSkeleton, ErrorState } from "../States";
import { iconFor } from "../../lib/icons";
import { useProjects, useServices, useSkills, useTestimonials } from "../../lib/queries";
import type { HomepageSection, PublicTestimonial, Site } from "../../lib/types";

type SectionProps = { section?: HomepageSection; site: Site };

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
};

// ----------------------------------------------------------------------------- About


type Pillar = { icon?: string; title: string; text: string };

export function AboutSection({ section, site }: SectionProps) {
  const s = site.settings;
  const pillars = ((section?.data?.pillars as Pillar[] | undefined) ?? []).filter((p) => p?.title);
  return (
    <section id="about" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="About" title={section?.title || "About me"} description={section?.subtitle} />
        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div {...fade} transition={{ duration: 0.6 }} className="glass relative overflow-hidden rounded-3xl p-8">
            <div className="animate-blob absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet/20 blur-3xl" />
            <p className="relative font-mono text-xs uppercase tracking-[0.2em] text-cyan">Who I am</p>
            <p className="relative mt-4 text-lg leading-relaxed text-white/90">{s.bio}</p>
            {s.highlights.length > 0 && (
              <dl className="relative mt-8 grid grid-cols-2 gap-4">
                {s.highlights.map((h) => (
                  <div key={h.label} className="rounded-2xl border border-border bg-white/[0.03] p-3">
                    <dt className="text-[11px] uppercase tracking-wider text-mist">{h.label}</dt>
                    <dd className="mt-1 text-sm font-medium text-white">{h.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Link to="/about" className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-cyan hover:text-white">
              More about me <ArrowUpRight size={14} aria-hidden />
            </Link>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2">
            {pillars.map((pillar, i) => {
              const Icon = iconFor(pillar.icon);
              return (
                <motion.div key={pillar.title} {...fade} transition={{ duration: 0.5, delay: i * 0.1 }}>
                  <SpotlightCard className="h-full rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40 hover:bg-surface-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 text-cyan">
                      <Icon size={20} aria-hidden />
                    </div>
                    <h3 className="mt-4 font-display text-base font-semibold text-white">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mist">{pillar.text}</p>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------- Services

export function ServicesSection({ section }: SectionProps) {
  const { data, isLoading, error, refetch } = useServices();
  const services = data ?? [];
  const featured = services.filter((s) => s.featured).slice(0, 6);
  const shown = featured.length ? featured : services.slice(0, 6);
  return (
    <section id="services" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="What I Can Build" title={section?.title || "Services"} description={section?.subtitle} />
        <div className="mt-12">
          {isLoading ? (
            <CardGridSkeleton count={3} />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((service, i) => {
                const Icon = iconFor(service.icon);
                return (
                  <motion.div key={service.id} {...fade} transition={{ duration: 0.5, delay: i * 0.06 }}>
                    <SpotlightCard className="group h-full rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40 hover:bg-surface-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 text-cyan">
                        <Icon size={20} aria-hidden />
                      </div>
                      <h3 className="mt-4 font-display text-base font-semibold text-white">
                        <Link to={`/services/${service.slug}`} className="after:absolute after:inset-0">
                          {service.title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-mist">{service.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {service.tech_stack.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-mist">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        <motion.div
          {...fade}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl glass p-8 text-center sm:flex-row sm:text-left"
        >
          <div>
            <p className="font-display text-lg font-semibold text-white">{services.length} services, one developer, end to end.</p>
            <p className="mt-1 text-sm text-mist">See everything I offer — or tell me what you are building.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/services" className="inline-flex items-center gap-2 rounded-full glass px-5 py-3 text-sm font-semibold text-white hover:border-white/30">
              All services
            </Link>
            <Magnetic strength={0.4}>
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition-transform duration-300 hover:scale-105"
              >
                Request a quote
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </Magnetic>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------- Projects

export function ProjectsSection({ section }: SectionProps) {
  const [paused, setPaused] = useState(false);
  const { data, isLoading, error, refetch } = useProjects({ page_size: 50 });
  const projects = data?.items ?? [];
  const featured = projects.filter((p) => p.featured);
  const genai = projects.filter((p) => p.category?.slug === "genai");
  const web = projects.filter((p) => p.category?.slug !== "genai" && !p.featured);
  const mid = Math.ceil(web.length / 2);
  return (
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="Selected Work" title={section?.title || "Projects"} description={section?.subtitle} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-white transition-colors hover:border-white/30"
            >
              {paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
              {paused ? "Play carousels" : "Pause carousels"}
            </button>
            <Link to="/projects" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink">
              All projects <ArrowUpRight size={13} aria-hidden />
            </Link>
          </div>
        </div>
        {isLoading ? (
          <div className="mt-12">
            <CardGridSkeleton count={3} />
          </div>
        ) : error ? (
          <div className="mt-12">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mt-12">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Featured</p>
                <div className="mt-5">
                  <ProjectReel projects={featured} direction="left" speed={Math.max(24, featured.length * 9)} paused={paused} />
                </div>
              </div>
            )}
            {web.length > 0 && (
              <div className="mt-12 space-y-5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-mist">Web development</p>
                <ProjectReel projects={web.slice(0, mid)} direction="right" speed={38} paused={paused} />
                <ProjectReel projects={web.slice(mid)} direction="left" speed={44} paused={paused} />
              </div>
            )}
            {genai.length > 0 && (
              <div className="mt-12">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-mist">GenAI engineering</p>
                <div className="mt-5">
                  <ProjectReel projects={genai} direction="left" speed={30} paused={paused} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------- Testimonials

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TestimonialCard({ t }: { t: PublicTestimonial }) {
  return (
    <SpotlightCard className="relative flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40">
      <Quote size={22} className="text-violet" aria-hidden />
      {t.rating ? (
        <p className="mt-3 flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={14} aria-hidden className={i < (t.rating ?? 0) ? "fill-amber-300 text-amber-300" : "text-white/20"} />
          ))}
        </p>
      ) : null}
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-white/90">{t.content}</blockquote>
      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        {t.avatar_url ? (
          <img src={t.avatar_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan text-xs font-semibold text-white">
            {initials(t.client_name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{t.client_name}</p>
          <p className="text-xs leading-snug text-mist">{[t.designation, t.company].filter(Boolean).join(", ")}</p>
          {t.project_slug && (
            <Link to={`/projects/${t.project_slug}`} className="text-xs text-cyan hover:text-white">
              {t.project_title}
            </Link>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}

export function TestimonialsSection({ section }: SectionProps) {
  const { data } = useTestimonials({ limit: 9 });
  if (!data?.length) return null; // only approved, published testimonials ever reach this list
  return (
    <section id="testimonials" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Testimonials" title={section?.title || "What clients say"} description={section?.subtitle} align="center" />
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {data.map((t, i) => (
            <motion.div key={t.id} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="w-full sm:w-[360px]">
              <TestimonialCard t={t} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------- Process & Why me

export function ProcessSection({ section }: SectionProps) {
  const steps = ((section?.data?.steps as { title: string; text: string }[] | undefined) ?? []).filter((s) => s?.title);
  if (!steps.length) return null;
  return (
    <section id="process" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Process" title={section?.title || "How I work"} description={section?.subtitle} />
        <ol className="mt-12 grid gap-5 md:grid-cols-5">
          {steps.map((step, i) => (
            <motion.li key={step.title} {...fade} transition={{ duration: 0.5, delay: i * 0.08 }} className="relative rounded-2xl border border-border bg-surface/60 p-5">
              <span className="font-mono text-xs text-cyan">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-display text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{step.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function WhyMeSection({ section, site }: SectionProps) {
  const points = site.settings.trust_points;
  if (!points.length) return null;
  return (
    <section id="why-me" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Why me" title={section?.title || "Why work with me"} description={section?.subtitle} />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {points.map((point, i) => (
            <motion.li key={point} {...fade} transition={{ duration: 0.4, delay: i * 0.06 }} className="flex items-start gap-3 rounded-2xl border border-border bg-surface/40 p-4 text-sm text-white/90">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
              {point}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------- Tech stack

export function TechStackSection({ section }: SectionProps) {
  const { data } = useSkills();
  const [activeIndex, setActiveIndex] = useState(0);
  const groups = data ?? [];
  if (!groups.length) return null;
  const active = groups[Math.min(activeIndex, groups.length - 1)];
  return (
    <section id="stack" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Tech Stack" title={section?.title || "Tools I reach for"} description={section?.subtitle} />
        <div role="tablist" aria-label="Skill categories" className="mt-10 flex flex-wrap gap-2">
          {groups.map((g, i) => (
            <button
              key={g.category.id}
              type="button"
              role="tab"
              aria-selected={active.category.id === g.category.id}
              onClick={() => setActiveIndex(i)}
              className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-300 ${active.category.id === g.category.id ? "text-ink" : "text-mist hover:text-white"}`}
            >
              {active.category.id === g.category.id && (
                <motion.span layoutId="stack-tab" className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan to-violet" transition={{ type: "spring", stiffness: 350, damping: 30 }} />
              )}
              <span className="relative">{g.category.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 font-mono text-xs text-mist">{active.category.blurb}</p>
        <div className="relative mt-8 min-h-[220px]" role="tabpanel">
          <AnimatePresence mode="wait">
            <motion.ul
              key={active.category.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {active.skills.map((item) => {
                const Icon = iconFor(item.icon);
                const color = item.color || "#22d3ee";
                return (
                  <li key={item.name}>
                    <SpotlightCard className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-4 transition-colors duration-300 hover:border-white/20">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a`, color }}>
                        <Icon size={22} aria-hidden />
                      </div>
                      <span className="text-sm font-medium text-white/90">
                        {item.name}
                        {item.is_learning && <span className="ml-1.5 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">learning</span>}
                      </span>
                    </SpotlightCard>
                  </li>
                );
              })}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------- Contact CTA

export function ContactCtaSection({ section, site }: SectionProps) {
  const s = site.settings;
  return (
    <section id="contact" className="relative py-28">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div {...fade} transition={{ duration: 0.6 }} className="glass relative overflow-hidden rounded-3xl p-10 text-center sm:p-14">
          <div className="animate-blob absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
          <div className="animate-blob absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan/20 blur-3xl" style={{ animationDelay: "-9s" }} />
          <h2 className="relative font-display text-3xl font-semibold text-white sm:text-4xl">{section?.title || s.contact_cta_title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-mist">{section?.subtitle || s.contact_cta_text}</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition-transform duration-300 hover:scale-105">
                Start a project <ArrowUpRight size={16} aria-hidden />
              </Link>
            </Magnetic>
            {s.email && (
              <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-white hover:border-white/30">
                {s.email}
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
