import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState, Skeleton } from "../../components/States";
import { ApiError, api, errorMessage } from "../../lib/api";
import type { SiteSettings } from "../../lib/types";
import { useAuth } from "../auth";
import ResourceForm, { type FieldDef } from "../ResourceForm";
import { PageTitle, useUi } from "../ui";

export const PROFILE_FIELDS: FieldDef[] = [
  { name: "developer_name", label: "Full name", type: "text", required: true, min: 2, max: 120, section: "Identity" },
  { name: "first_name", label: "First name", type: "text", max: 60, section: "Identity" },
  { name: "headline", label: "Professional headline", type: "text", max: 160, section: "Identity", full: true },
  { name: "rotating_roles", label: "Rotating hero roles", type: "list", section: "Identity", hint: "One per line." },
  { name: "availability", label: "Availability badge", type: "text", max: 120, section: "Identity", full: true },
  { name: "profile_image_url", label: "Profile picture", type: "image", section: "Identity" },
  { name: "introduction", label: "Short introduction (hero)", type: "textarea", max: 2000, section: "About" },
  { name: "bio", label: "Bio", type: "textarea", max: 5000, section: "About" },
  { name: "philosophy", label: "Development philosophy", type: "markdown", max: 5000, section: "About" },
  { name: "journey", label: "Professional journey", type: "markdown", max: 10000, section: "About", hint: "Only real, verifiable history." },
  { name: "trust_points", label: "Why work with me", type: "list", section: "About" },
  { name: "email", label: "Public email", type: "text", max: 254, section: "Contact" },
  { name: "phone", label: "Phone", type: "text", max: 30, section: "Contact" },
  { name: "location", label: "Location", type: "text", max: 120, section: "Contact" },
];

export const WEBSITE_FIELDS: FieldDef[] = [
  { name: "contact_cta_title", label: "Contact CTA title", type: "text", max: 160, section: "Calls to action", full: true },
  { name: "contact_cta_text", label: "Contact CTA text", type: "textarea", max: 1000, section: "Calls to action" },
  { name: "budget_options", label: "Budget options (contact form)", type: "list", section: "Calls to action" },
  { name: "show_testimonial_form", label: "Testimonial form", type: "checkbox", hint: "Let visitors submit testimonials for moderation", section: "Calls to action" },
  { name: "resume_url", label: "Fallback resume URL", type: "image", section: "Calls to action", hint: "Used only when no active resume is set in Resume Management." },
  { name: "footer_text", label: "Footer text", type: "text", max: 300, section: "Footer & theme", full: true },
  { name: "theme_default", label: "Default theme", type: "select", options: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "Follow system" }], section: "Footer & theme" },
  { name: "site_url", label: "Public site URL", type: "url", max: 500, section: "SEO defaults", hint: "Used for canonical URLs and the sitemap, e.g. https://example.com" },
  { name: "seo_default_title", label: "Default SEO title", type: "text", max: 70, section: "SEO defaults", full: true },
  { name: "seo_default_description", label: "Default meta description", type: "text", max: 170, section: "SEO defaults", full: true },
  { name: "og_image_url", label: "Default social share image", type: "image", section: "SEO defaults" },
];

export default function SettingsPage({ variant }: { variant: "profile" | "website" }) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { toast } = useUi();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api<SiteSettings>("/api/v1/admin/settings") });
  const fields = variant === "profile" ? PROFILE_FIELDS : WEBSITE_FIELDS;

  return (
    <div>
      <PageTitle
        title={variant === "profile" ? "Profile" : "Website settings"}
        description={
          variant === "profile"
            ? "Your name, headline, bio and contact details used across the site."
            : "Calls to action, footer, theme and SEO defaults. Secrets such as SMTP or API keys are environment variables and never editable here."
        }
      />
      {!can("settings:write") && <p className="mb-4 rounded-xl border border-border bg-white/[0.03] p-3 text-sm text-mist">You have read-only access.</p>}
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ResourceForm
          key={version}
          fields={fields}
          initial={{ ...data, email: data.email ?? "" } as unknown as Record<string, unknown>}
          submitLabel="Save settings"
          serverErrors={errors}
          onSubmit={async (payload) => {
            setErrors({});
            const body = { ...payload, email: payload.email || null };
            try {
              const saved = await api<SiteSettings>("/api/v1/admin/settings", { method: "PATCH", body });
              qc.setQueryData(["admin", "settings"], saved);
              await qc.invalidateQueries({ queryKey: ["site"] });
              setVersion((v) => v + 1);
              toast("success", "Settings saved. The public site updates immediately.");
            } catch (err) {
              if (err instanceof ApiError && err.details) setErrors(Object.fromEntries(err.details.map((d) => [d.field.split(".")[0], d.message])));
              toast("error", errorMessage(err));
            }
          }}
        />
      )}
    </div>
  );
}
