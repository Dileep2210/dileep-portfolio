import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { routes } from "../router";
import { mockFetch, project, renderRoutes, site } from "./utils";

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, page_size: 24 });
const base = {
  "/api/v1/public/site": site,
  "/api/v1/public/seo/home": null,
  "/api/v1/public/seo/projects": null,
  "/api/v1/public/seo/services": null,
  "/api/v1/public/seo/contact": null,
  "/api/v1/public/services": [],
  "/api/v1/public/projects": page([project()]),
  "/api/v1/public/skills": [],
  "/api/v1/public/testimonials": [],
  "/api/v1/public/project-categories": [{ id: "c1", name: "E-commerce", slug: "e-commerce" }],
  "/api/v1/public/projects/technologies": ["Next.js", "FastAPI"],
};

describe("public pages", () => {
  it("homepage renders content from the API (no hardcoded copy)", async () => {
    mockFetch(base);
    renderRoutes(routes, "/");
    expect(await screen.findByText("Hero subtitle from CMS")).toBeInTheDocument();
    expect(screen.getByText("Available for freelance")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view my projects/i })).toHaveAttribute("href", "/projects");
    expect(screen.getByText("Discover")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain("Dileep Kumar Panchumarthi"));
    expect(document.getElementById("page-jsonld")?.textContent).toContain('"@type":"Person"');
  });

  it("shows an error state with retry when the API is down", async () => {
    mockFetch({ ...base, "/api/v1/public/site": () => ({ status: 503, body: { error: { code: "x", message: "Down" } } }) });
    renderRoutes(routes, "/");
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("projects page lists projects and filters through the URL", async () => {
    const calls = mockFetch(base);
    const { router } = renderRoutes(routes, "/projects");
    expect(await screen.findByRole("link", { name: "MRS Fashion Jewel" })).toHaveAttribute("href", "/projects/mrs-fashion-jewel");
    expect(screen.getByText("Client project")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "E-commerce" }));
    await waitFor(() => expect(router.state.location.search).toContain("category=e-commerce"));
    await waitFor(() => expect(calls.some((c) => c.url.includes("category=e-commerce"))).toBe(true));
  });

  it("project detail page shows case study and live link; unknown slug shows 404", async () => {
    mockFetch({ ...base, "/api/v1/public/projects/mrs-fashion-jewel": { project: project(), testimonials: [], related: [] } });
    renderRoutes(routes, "/projects/mrs-fashion-jewel");
    expect(await screen.findByRole("heading", { level: 1, name: "MRS Fashion Jewel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /visit live site/i })).toHaveAttribute("href", "https://mrsfashionjewel.com/");
    expect(within(screen.getByRole("heading", { name: "Overview" }).parentElement!).getByText("bold").tagName).toBe("STRONG");

    mockFetch({ ...base, "/api/v1/public/projects/nope": { status: 404, body: { error: { code: "not_found", message: "Project not found." } } } });
    renderRoutes(routes, "/projects/nope");
    expect(await screen.findByText(/this project could not be found/i)).toBeInTheDocument();
  });

  it("services page links each service to its detail page", async () => {
    mockFetch({ ...base, "/api/v1/public/services": [{ id: "s1", title: "RAG Application Development", slug: "rag-application-development", summary: "Docs chatbot", icon: "FileSearch", featured: true, starting_price: null, price_currency: "INR", delivery_estimate: "" }] });
    renderRoutes(routes, "/services");
    expect(await screen.findByRole("link", { name: "RAG Application Development" })).toHaveAttribute("href", "/services/rag-application-development");
  });
});

describe("admin", () => {
  const me = { id: "u1", email: "admin@example.com", full_name: "Admin", roles: ["viewer"], permissions: ["dashboard:read", "projects:read"], mfa_enabled: false, last_login_at: null };

  it("redirects to login when not signed in", async () => {
    mockFetch({ "/api/v1/auth/me": { status: 401, body: { error: { code: "unauthorized", message: "x" } } }, "POST /api/v1/auth/refresh": { status: 401, body: {} } });
    const { router } = renderRoutes(routes, "/admin/projects");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/admin/login");
    expect(router.state.location.search).toContain("next=%2Fadmin%2Fprojects");
  });

  it("login asks for the authenticator code when MFA is on", async () => {
    let attempts = 0;
    const calls = mockFetch({
      "/api/v1/auth/me": { status: 401, body: { error: { code: "unauthorized", message: "x" } } },
      "POST /api/v1/auth/refresh": { status: 401, body: {} },
      "POST /api/v1/auth/login": () => (++attempts === 1 ? { status: 401, body: { error: { code: "mfa_required", message: "code" } } } : { body: me }),
      "/api/v1/admin/dashboard": { counts: { projects: 1, projects_published: 1, services: 0, services_published: 0, testimonials_published: 0, testimonials_pending: 0, blog_posts: 0, blog_published: 0 }, content_status: {}, recent_leads: null, leads_by_week: null, recent_activity: null },
    });
    renderRoutes(routes, "/admin/login");
    await userEvent.type(await screen.findByLabelText("Email"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret-password-1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await userEvent.type(await screen.findByLabelText("Authenticator code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.url === "/api/v1/auth/login")[1].body).toMatchObject({ totp_code: "123456" });
  });

  it("sidebar only shows modules the role can access", async () => {
    mockFetch({
      "/api/v1/auth/me": me,
      "/api/v1/admin/dashboard": { counts: { projects: 0, projects_published: 0, services: 0, services_published: 0, testimonials_published: 0, testimonials_pending: 0, blog_posts: 0, blog_published: 0 }, content_status: {}, recent_leads: null, leads_by_week: null, recent_activity: null },
    });
    renderRoutes(routes, "/admin");
    const nav = await screen.findByRole("navigation", { name: "Admin" });
    expect(within(nav).getByText("Projects")).toBeInTheDocument();
    expect(within(nav).queryByText("Contact leads")).toBeNull();
    expect(within(nav).queryByText("Users")).toBeNull();
  });

  it("resource list shows rows, empty state and hides write actions for read-only roles", async () => {
    mockFetch({ "/api/v1/auth/me": me, "/api/v1/admin/projects": { items: [project({ status: "draft" })], total: 1, page: 1, page_size: 20 } });
    renderRoutes(routes, "/admin/projects");
    expect(await screen.findByText("MRS Fashion Jewel")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Draft" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new project/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});
