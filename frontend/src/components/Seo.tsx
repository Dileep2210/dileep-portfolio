import { useEffect } from "react";
import { useSeo, useSite } from "../lib/queries";

type SeoProps = {
  /** Key of an admin-managed SEO entry (home, about, services, projects, blog, contact). */
  pageKey?: string;
  title?: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  canonical?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function absolute(base: string, url: string | undefined) {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Updates the existing head tags in place (title, description, canonical, Open Graph, Twitter,
 * robots, JSON-LD). index.html keeps sensible defaults for crawlers that do not run JavaScript.
 */
export default function Seo({ pageKey, title, description, path, image, type = "website", noindex, jsonLd, canonical }: SeoProps) {
  const site = useSite().data?.settings;
  const managed = useSeo(pageKey ?? "").data;
  const usesManaged = Boolean(pageKey && managed);

  const name = site?.developer_name ?? "Dileep Kumar Panchumarthi";
  const base = (site?.site_url || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  const finalTitle = (usesManaged && managed?.title) || title || site?.seo_default_title || name;
  const fullTitle = finalTitle.includes(name) ? finalTitle : `${finalTitle} | ${name}`;
  const desc = (usesManaged && managed?.description) || description || site?.seo_default_description || "";
  const canonicalUrl = canonical || `${base}${(usesManaged && managed?.canonical_path) || path}`;
  const img = absolute(base, (usesManaged && managed?.og_image_url) || image || site?.og_image_url || "/og.png");
  const robots = noindex || managed?.noindex ? "noindex, nofollow" : undefined;
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", robots);
    upsertLink("canonical", canonicalUrl);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", img);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);

    const id = "page-jsonld";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (ld) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = id;
        document.head.appendChild(script);
      }
      script.textContent = ld;
    } else {
      script?.remove();
    }
  }, [fullTitle, desc, robots, canonicalUrl, type, img, ld]);

  return null;
}
