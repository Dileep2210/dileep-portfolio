import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { ApiError, api } from "../lib/api";
import type { Service } from "../lib/types";

const singleLine = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min > 0 ? `${label} must be at least ${min} characters.` : undefined)
    .max(max, `${label} must be at most ${max} characters.`)
    .refine((v) => !/[\r\n\t]/.test(v), `${label} must be a single line.`);

export const contactSchema = z.object({
  name: singleLine("Name", 2, 100),
  email: z.string().trim().max(254).email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || /^\+?[0-9 ()\-.]{6,25}$/.test(v), "Enter a valid phone number."),
  company: singleLine("Company", 0, 120),
  service_id: z.string(),
  budget: z.string().max(60),
  message: z.string().trim().min(10, "Tell me a little more (at least 10 characters).").max(5000, "Please keep it under 5000 characters."),
  preferred_contact: z.enum(["email", "phone", "whatsapp"]),
  website: z.string().max(500), // honeypot
});

export type ContactValues = z.infer<typeof contactSchema>;

type Props = { services: Service[]; budgets: string[]; defaultServiceSlug?: string };

const field =
  "w-full rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-mist/60 outline-none transition focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20 aria-[invalid=true]:border-red-400/70";

export default function ContactForm({ services, budgets, defaultServiceSlug }: Props) {
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message?: string }>({ kind: "idle" });
  const defaultService = services.find((s) => s.slug === defaultServiceSlug)?.id ?? "";
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", company: "", service_id: defaultService, budget: "", message: "", preferred_contact: "email", website: "" },
  });

  useEffect(() => {
    if (defaultService) setValue("service_id", defaultService);
  }, [defaultService, setValue]);

  const onSubmit = async (values: ContactValues) => {
    setStatus({ kind: "idle" });
    try {
      await api("/api/v1/public/contact", {
        method: "POST",
        body: {
          ...values,
          service_id: values.service_id || null,
          elapsed_ms: Date.now() - startedAt.current,
        },
      });
      reset();
      setStatus({ kind: "success", message: "Thanks! Your message has been received. I usually reply within 1–2 business days." });
    } catch (err) {
      // Keep everything the visitor typed so nothing is lost.
      const message =
        err instanceof ApiError && err.status === 429
          ? "You've sent a few messages in a short time. Please wait a minute and try again."
          : err instanceof ApiError
            ? err.message
            : "Could not send your message. Please try again or email me directly.";
      setStatus({ kind: "error", message });
    }
  };

  if (status.kind === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-8 text-center">
        <CheckCircle2 className="text-emerald-400" size={32} aria-hidden />
        <p className="font-medium text-white">Message sent</p>
        <p className="max-w-md text-sm text-mist">{status.message}</p>
        <button type="button" onClick={() => setStatus({ kind: "idle" })} className="mt-2 text-sm text-cyan hover:text-white">
          Send another message
        </button>
      </div>
    );
  }

  const err = (name: keyof ContactValues) =>
    errors[name] ? (
      <p id={`${name}-error`} className="mt-1.5 text-xs text-red-300">
        {errors[name]?.message as string}
      </p>
    ) : null;
  const a11y = (name: keyof ContactValues) => ({
    id: name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2" aria-label="Contact form">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm text-white/90">Name *</label>
        <input {...register("name")} {...a11y("name")} autoComplete="name" className={field} />
        {err("name")}
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-white/90">Email *</label>
        <input {...register("email")} {...a11y("email")} type="email" autoComplete="email" className={field} />
        {err("email")}
      </div>
      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm text-white/90">Phone <span className="text-mist">(optional)</span></label>
        <input {...register("phone")} {...a11y("phone")} type="tel" autoComplete="tel" className={field} />
        {err("phone")}
      </div>
      <div>
        <label htmlFor="company" className="mb-1.5 block text-sm text-white/90">Company <span className="text-mist">(optional)</span></label>
        <input {...register("company")} {...a11y("company")} autoComplete="organization" className={field} />
        {err("company")}
      </div>
      <div>
        <label htmlFor="service_id" className="mb-1.5 block text-sm text-white/90">Service needed</label>
        <select {...register("service_id")} {...a11y("service_id")} className={field}>
          <option value="">Not sure yet / something else</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="budget" className="mb-1.5 block text-sm text-white/90">Budget <span className="text-mist">(optional)</span></label>
        <select {...register("budget")} {...a11y("budget")} className={field}>
          <option value="">Prefer not to say</option>
          {budgets.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="message" className="mb-1.5 block text-sm text-white/90">Project description *</label>
        <textarea {...register("message")} {...a11y("message")} rows={6} className={field} placeholder="What are you building, who is it for, and when do you need it?" />
        {err("message")}
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm text-white/90">Preferred contact method</legend>
        <div className="flex flex-wrap gap-3">
          {(["email", "phone", "whatsapp"] as const).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-mist has-[:checked]:border-cyan/60 has-[:checked]:text-white">
              <input type="radio" value={m} {...register("preferred_contact")} className="accent-cyan-400" />
              {m === "whatsapp" ? "WhatsApp" : m[0].toUpperCase() + m.slice(1)}
            </label>
          ))}
        </div>
      </fieldset>
      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      {status.kind === "error" && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:col-span-2">
          {status.message}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
          {isSubmitting ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
