import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock, Star } from "lucide-react";
import { Link, useParams } from "react-router";
import CoverImage from "../components/CoverImage";
import Markdown from "../components/Markdown";
import PageHeader from "../components/PageHeader";
import Seo from "../components/Seo";
import SpotlightCard from "../components/SpotlightCard";
import { CardGridSkeleton, EmptyState, ErrorState, Skeleton } from "../components/States";
import { ApiError } from "../lib/api";
import { formatPrice } from "../lib/format";
import { iconFor } from "../lib/icons";
import { useService, useServices, useSite } from "../lib/queries";
import type { Service } from "../lib/types";
import NotFoundPage from "./NotFoundPage";

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const Icon = iconFor(service.icon);
  const price = formatPrice(service.starting_price, service.price_currency);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: (index % 3) * 0.06 }}>
      <SpotlightCard className="group relative flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40 hover:bg-surface-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 text-cyan">
            <Icon size={20} aria-hidden />
          </div>
          {service.featured && (
            <span className="flex items-center gap-1 rounded-full bg-violet/15 px-2 py-0.5 text-[11px] text-violet-200">
              <Star size={11} aria-hidden /> Popular
            </span>
          )}
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-white">
          <Link to={`/services/${service.slug}`} className="after:absolute after:inset-0">
            {service.title}
          </Link>
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-mist">{service.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist">
          {price && <span className="font-medium text-white">From {price}</span>}
          {service.delivery_estimate && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden /> {service.delivery_estimate}
            </span>
          )}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function ServicesPage() {
  const { data, isLoading, error, refetch } = useServices();
  return (
    <>
      <Seo pageKey="services" title="Services" path="/services" />
      <PageHeader eyebrow="Services" title="What I can build for you" description="From a business website to a production AI feature — designed, built, tested and deployed by one developer." />
      <section className="mx-auto max-w-6xl px-6 pb-28">
        {isLoading ? (
          <CardGridSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.length ? (
          <EmptyState title="No services listed yet" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </div>
        )}
        <div className="mt-14 flex flex-col items-center justify-between gap-6 rounded-3xl glass p-8 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-display text-lg font-semibold text-white">Not sure which one fits?</p>
            <p className="mt-1 text-sm text-mist">Describe the problem — I will suggest the simplest thing that solves it.</p>
          </div>
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white">
            Request a quote <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

export function ServiceDetailPage() {
  const { slug = "" } = useParams();
  const { data: s, isLoading, error, refetch } = useService(slug);
  const site = useSite().data;
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-36" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="service" />;
  if (error || !s) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-36">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }
  const Icon = iconFor(s.icon);
  const price = formatPrice(s.starting_price, s.price_currency);
  const base = (site?.settings.site_url || window.location.origin).replace(/\/$/, "");
  return (
    <article className="mx-auto max-w-4xl px-6 pb-28 pt-32">
      <Seo
        title={s.seo_title || s.title}
        description={s.seo_description || s.summary}
        path={`/services/${s.slug}`}
        image={s.cover_url}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.title,
          description: s.summary,
          url: `${base}/services/${s.slug}`,
          provider: { "@type": "Person", name: site?.settings.developer_name },
          ...(price ? { offers: { "@type": "Offer", price: s.starting_price, priceCurrency: s.price_currency } } : {}),
        }}
      />
      <Link to="/services" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-white">
        <ArrowLeft size={14} aria-hidden /> All services
      </Link>
      <header className="mt-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-cyan text-white">
          <Icon size={26} aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">{s.title}</h1>
          <p className="mt-3 text-lg text-mist">{s.summary}</p>
        </div>
      </header>
      {s.cover_url && (
        <div className="mt-8 overflow-hidden rounded-3xl border border-border">
          <CoverImage src={s.cover_url} title={s.title} eager className="aspect-[16/8] w-full object-cover" />
        </div>
      )}
      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_280px]">
        <div>
          {s.features.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-white">What's included</h2>
              <ul className="mt-4 space-y-2.5">
                {s.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/90">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Markdown className="mt-8">{s.content}</Markdown>
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-surface/60 p-5">
          {price ? (
            <p className="text-sm text-mist">
              Starting from <span className="block font-display text-2xl font-semibold text-white">{price}</span>
              {s.price_note && <span className="text-xs">{s.price_note}</span>}
            </p>
          ) : (
            <p className="text-sm text-mist">Pricing depends on scope — you get a fixed quote before work starts.</p>
          )}
          {s.delivery_estimate && (
            <p className="mt-4 flex items-center gap-2 text-sm text-white/90">
              <Clock size={14} aria-hidden /> {s.delivery_estimate}
            </p>
          )}
          {s.tech_stack.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-mist">Typical stack</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.tech_stack.map((t) => (
                  <span key={t} className="rounded-full border border-border bg-white/5 px-2.5 py-0.5 text-xs text-white/90">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          <Link
            to={`/contact?service=${encodeURIComponent(s.slug)}`}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-5 py-2.5 text-sm font-semibold text-white"
          >
            Request a quote <ArrowUpRight size={15} aria-hidden />
          </Link>
        </aside>
      </div>
    </article>
  );
}
