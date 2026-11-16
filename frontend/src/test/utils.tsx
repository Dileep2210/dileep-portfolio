import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryRouter, type RouteObject } from "react-router";
import { vi } from "vitest";
import type { Site } from "../lib/types";

type Handler = (url: URL, init: RequestInit) => { status?: number; body?: unknown } | undefined;

/** Routes fetch() calls to handlers by path; unmatched calls fail the test loudly. */
export function mockFetch(routes: Record<string, unknown | Handler>) {
  const calls: { method: string; url: string; body?: unknown; headers: Record<string, string> }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), "http://localhost");
    const method = (init.method ?? "GET").toUpperCase();
    calls.push({ method, url: url.pathname + url.search, body: init.body ? JSON.parse(String(init.body)) : undefined, headers: (init.headers ?? {}) as Record<string, string> });
    const key = Object.keys(routes).find((k) => k === `${method} ${url.pathname}` || k === url.pathname);
    if (!key) return new Response(JSON.stringify({ error: { code: "not_mocked", message: `${method} ${url.pathname}` } }), { status: 599 });
    const value = routes[key];
    const isResult = (v: unknown): v is { status: number; body?: unknown } =>
      typeof v === "object" && v !== null && typeof (v as { status?: unknown }).status === "number" && Object.keys(v).every((k) => k === "status" || k === "body");
    const result = typeof value === "function" ? (value as Handler)(url, init) : isResult(value) ? value : { body: value };
    const status = result?.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(result?.body ?? null), { status, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

export function renderRoutes(routes: RouteObject[], path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, qc };
}

export const site: Site = {
  settings: {
    developer_name: "Dileep Kumar Panchumarthi",
    first_name: "Dileep",
    headline: "Full Stack Developer & GenAI Developer",
    rotating_roles: ["Full Stack Developer"],
    introduction: "I build end to end.",
    bio: "Bio text from the CMS.",
    philosophy: "",
    journey: "",
    highlights: [{ label: "Focus", value: "Full-Stack" }],
    trust_points: ["Direct communication"],
    email: "hello@example.com",
    phone: "",
    location: "India",
    availability: "Available for freelance",
    profile_image_url: "/images/profile.webp",
    resume_url: "/resume.pdf",
    contact_cta_title: "Let's build",
    contact_cta_text: "Tell me about it.",
    footer_text: "Footer text",
    theme_default: "dark",
    site_url: "https://example.com",
    seo_default_title: "Default title",
    seo_default_description: "Default description",
    og_image_url: "/og.png",
    budget_options: ["Not sure yet"],
    show_testimonial_form: true,
  },
  navigation: [{ id: "n1", label: "Projects", href: "/projects", location: "header", open_in_new_tab: false }],
  social_links: [{ id: "s1", platform: "github", label: "GitHub", url: "https://github.com/x", icon: "github" }],
  homepage: [
    { id: "h1", key: "hero", title: "Hero title from CMS", subtitle: "Hero subtitle from CMS", body: "", data: { primary_cta: { label: "View My Projects", href: "/projects" } }, position: 0, is_visible: true },
    { id: "h2", key: "process", title: "How I work", subtitle: "", body: "", data: { steps: [{ title: "Discover", text: "Talk first." }] }, position: 1, is_visible: true },
  ],
  resume_url: "/resume.pdf",
};

export function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1", title: "MRS Fashion Jewel", slug: "mrs-fashion-jewel", tagline: "US jewelry e-commerce", summary: "Summary.", overview: "Overview **bold**",
    challenges: "", solutions: "", outcomes: "", contribution: "", architecture: "", features: ["Stripe checkout"], timeline: "", client_name: "MRS",
    is_client_project: true, is_demo: false, live_url: "https://mrsfashionjewel.com/", github_url: "", video_url: "", highlight_label: "", highlight_value: "",
    cover_url: "", featured: true, status: "published", position: 0, seo_title: "", seo_description: "", published_at: "2026-11-01T00:00:00Z",
    category_id: null, category: { id: "c1", name: "E-commerce", slug: "e-commerce" }, technologies: ["Next.js", "FastAPI"], gallery: [],
    created_at: "", updated_at: "", ...overrides,
  };
}
