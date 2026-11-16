import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, Download, Loader2, MapPin } from "lucide-react";
import { useSearchParams } from "react-router";
import ContactForm from "../components/ContactForm";
import PageHeader from "../components/PageHeader";
import Seo from "../components/Seo";
import { ErrorState, Skeleton } from "../components/States";
import { ApiError, api } from "../lib/api";
import { iconFor } from "../lib/icons";
import { useServices, useSite } from "../lib/queries";

const testimonialSchema = z.object({
  client_name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  company: z.string().trim().max(120),
  designation: z.string().trim().max(120),
  content: z.string().trim().min(20, "Please write at least 20 characters.").max(3000),
  rating: z.string(),
  consent: z.boolean().refine((v) => v, "Please agree so the testimonial can be reviewed and published."),
  website: z.string().max(500),
});
type TestimonialValues = z.infer<typeof testimonialSchema>;

function TestimonialForm() {
  const [done, setDone] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TestimonialValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: { client_name: "", email: "", company: "", designation: "", content: "", rating: "", consent: false, website: "" },
  });
  const field = "w-full rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan/60";
  if (done) return <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">{done}</p>;
  return (
    <form
      noValidate
      aria-label="Testimonial form"
      onSubmit={handleSubmit(async (v) => {
        setFailure(null);
        try {
          const r = await api<{ message: string }>("/api/v1/public/testimonials", {
            method: "POST",
            body: { ...v, rating: v.rating ? Number(v.rating) : null },
          });
          setDone(r.message);
        } catch (err) {
          setFailure(err instanceof ApiError ? err.message : "Could not submit. Please try again.");
        }
      })}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="t-name" className="mb-1 block text-xs text-white/90">Your name *</label>
        <input id="t-name" {...register("client_name")} className={field} aria-invalid={!!errors.client_name} />
        {errors.client_name && <p className="mt-1 text-xs text-red-300">{errors.client_name.message}</p>}
      </div>
      <div>
        <label htmlFor="t-email" className="mb-1 block text-xs text-white/90">Email * <span className="text-mist">(never shown)</span></label>
        <input id="t-email" type="email" {...register("email")} className={field} aria-invalid={!!errors.email} />
        {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="t-company" className="mb-1 block text-xs text-white/90">Company</label>
        <input id="t-company" {...register("company")} className={field} />
      </div>
      <div>
        <label htmlFor="t-role" className="mb-1 block text-xs text-white/90">Role</label>
        <input id="t-role" {...register("designation")} className={field} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="t-content" className="mb-1 block text-xs text-white/90">Your testimonial *</label>
        <textarea id="t-content" rows={4} {...register("content")} className={field} aria-invalid={!!errors.content} />
        {errors.content && <p className="mt-1 text-xs text-red-300">{errors.content.message}</p>}
      </div>
      <div>
        <label htmlFor="t-rating" className="mb-1 block text-xs text-white/90">Rating</label>
        <select id="t-rating" {...register("rating")} className={field}>
          <option value="">No rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      <label className="flex items-start gap-2 text-xs text-mist sm:col-span-2">
        <input type="checkbox" {...register("consent")} className="mt-0.5 accent-cyan-400" />
        I agree that this testimonial may be reviewed and, once approved, published on this website with my name.
      </label>
      {errors.consent && <p className="text-xs text-red-300 sm:col-span-2">{errors.consent.message}</p>}
      {failure && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{failure}</p>}
      <button type="submit" disabled={isSubmitting} className="inline-flex w-fit items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {isSubmitting && <Loader2 size={14} className="animate-spin" aria-hidden />} Submit for review
      </button>
    </form>
  );
}

export default function ContactPage() {
  const { data: site, isLoading, error, refetch } = useSite();
  const services = useServices().data ?? [];
  const [params] = useSearchParams();
  const [copied, setCopied] = useState(false);
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-36" role="status" aria-label="Loading">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="mt-6 h-80 w-full" />
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
  return (
    <>
      <Seo pageKey="contact" title="Contact" path="/contact" />
      <PageHeader eyebrow="Contact" title={s.contact_cta_title || "Let's work together"} description={s.contact_cta_text} />
      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 lg:grid-cols-[1.5fr_0.8fr]">
        <div className="glass relative rounded-3xl p-6 sm:p-8">
          <ContactForm services={services} budgets={s.budget_options} defaultServiceSlug={params.get("service") ?? undefined} />
        </div>
        <aside className="space-y-4">
          {s.email && (
            <div className="rounded-2xl border border-border bg-surface/60 p-5">
              <p className="text-xs uppercase tracking-wider text-mist">Email</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <a href={`mailto:${s.email}`} className="break-all text-sm font-medium text-white hover:text-cyan">
                  {s.email}
                </a>
                <button
                  type="button"
                  aria-label="Copy email address"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(s.email ?? "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    } catch {
                      /* clipboard unavailable */
                    }
                  }}
                  className="rounded-full p-2 text-mist hover:text-white"
                >
                  {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                </button>
              </div>
            </div>
          )}
          {s.location && (
            <p className="flex items-center gap-2 rounded-2xl border border-border bg-surface/60 p-5 text-sm text-white">
              <MapPin size={16} className="text-cyan" aria-hidden /> {s.location}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {site.social_links.map((l) => {
              const Icon = iconFor(l.icon);
              return (
                <a key={l.id} href={l.url} target={l.url.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-white">
                  <Icon size={15} aria-hidden /> {l.label}
                </a>
              );
            })}
            {site.resume_url && (
              <a href={site.resume_url} download className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-white">
                <Download size={15} aria-hidden /> Resume
              </a>
            )}
          </div>
          {s.trust_points.length > 0 && (
            <ul className="space-y-2 rounded-2xl border border-border bg-surface/40 p-5 text-sm text-mist">
              {s.trust_points.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          )}
        </aside>
      </section>
      {s.show_testimonial_form && (
        <section className="mx-auto max-w-3xl px-6 pb-28">
          <h2 className="font-display text-2xl font-semibold text-white">Worked with me? Leave a testimonial</h2>
          <p className="mt-2 text-sm text-mist">Every testimonial is reviewed before it appears on the site.</p>
          <div className="mt-6 rounded-3xl border border-border bg-surface/40 p-6">
            <TestimonialForm />
          </div>
        </section>
      )}
    </>
  );
}
