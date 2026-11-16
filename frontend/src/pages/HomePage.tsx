import Hero from "../components/Hero";
import Seo from "../components/Seo";
import { ErrorState, Skeleton } from "../components/States";
import {
  AboutSection,
  ContactCtaSection,
  ProcessSection,
  ProjectsSection,
  ServicesSection,
  TechStackSection,
  TestimonialsSection,
  WhyMeSection,
} from "../components/home/Sections";
import { useSite } from "../lib/queries";
import type { HomepageSection, Site } from "../lib/types";

type SectionComponent = (p: { section?: HomepageSection; site: Site }) => React.ReactNode;

// Rendering order and visibility come from the admin (Homepage Management).
const RENDERERS: Record<string, SectionComponent> = {
  about: AboutSection,
  services: ServicesSection,
  projects: ProjectsSection,
  testimonials: TestimonialsSection,
  process: ProcessSection,
  why_me: WhyMeSection,
  skills: TechStackSection,
  contact_cta: ContactCtaSection,
};

export default function HomePage() {
  const { data: site, isLoading, error, refetch } = useSite();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-40" role="status" aria-label="Loading">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-6 h-14 w-full max-w-2xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      </div>
    );
  }
  if (error || !site) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-40">
        <ErrorState error={error} onRetry={refetch} title="The site content could not be loaded" />
      </div>
    );
  }

  const s = site.settings;
  const hero = site.homepage.find((x) => x.key === "hero");
  const sameAs = site.social_links.filter((l) => l.url.startsWith("https://")).map((l) => l.url);
  const base = (s.site_url || window.location.origin).replace(/\/$/, "");

  return (
    <>
      <Seo
        pageKey="home"
        path="/"
        type="profile"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: s.developer_name,
            jobTitle: s.headline,
            description: s.introduction || s.bio,
            url: `${base}/`,
            image: s.profile_image_url ? new URL(s.profile_image_url, base).toString() : undefined,
            email: s.email ? `mailto:${s.email}` : undefined,
            address: s.location ? { "@type": "PostalAddress", addressLocality: s.location } : undefined,
            sameAs,
          },
          {
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: `${s.developer_name} — ${s.headline}`,
            url: `${base}/`,
            areaServed: "Worldwide",
            provider: { "@type": "Person", name: s.developer_name },
          },
        ]}
      />
      {(!hero || hero.is_visible) && <Hero site={site} section={hero} />}
      {site.homepage
        .filter((sec) => sec.key !== "hero" && RENDERERS[sec.key])
        .map((sec) => {
          const Render = RENDERERS[sec.key];
          return <Render key={sec.id} section={sec} site={site} />;
        })}
    </>
  );
}
