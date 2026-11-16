import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "../playwright.config";

// One ordered story, matching the acceptance scenario in the specification.
test.describe.configure({ mode: "serial" });

const ADMIN = "e2e-admin@example.com";
const VIEWER = "e2e-viewer@example.com";
const stamp = Date.now().toString(36);
const PROJECT = `E2E Launch ${stamp}`;
const PROJECT_SLUG = `e2e-launch-${stamp}`;
const SERVICE = `E2E Service ${stamp}`;
const POST = `E2E Article ${stamp}`;

function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // A signed-out session check legitimately returns 401 on admin pages.
    if (m.type() === "error" && !/status of 401/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

async function login(page: Page, email = ADMIN) {
  await page.goto("/admin/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
}

async function saveForm(page: Page, label: RegExp | string) {
  await page.getByRole("button", { name: label }).click();
  await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible();
}

let admin: Page;

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage();
});

test("1. visitor opens the homepage (content from the API)", async ({ page }) => {
  const errors = trackConsole(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dileep");
  await expect(page.getByRole("link", { name: /view my projects/i }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(page).toHaveTitle(/Dileep Kumar Panchumarthi/);
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/^https:\/\//);
  expect(errors).toEqual([]);
});

test("2–3. visitor views projects and opens MRS Fashion Jewel", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByText(/12 projects/)).toBeVisible();
  await page.getByRole("link", { name: "MRS Fashion Jewel" }).click();
  await expect(page).toHaveURL(/\/projects\/mrs-fashion-jewel$/);
  await expect(page.getByRole("heading", { level: 1, name: "MRS Fashion Jewel" })).toBeVisible();
  await expect(page.getByText(/Client project · MRS Ladies Fashion/)).toBeVisible();
  await expect(page.getByRole("link", { name: /visit live site/i })).toHaveAttribute("href", "https://mrsfashionjewel.com/");
  await expect(page.getByRole("heading", { name: "Technical architecture" })).toBeVisible();
  const ld = await page.locator("#page-jsonld").textContent();
  expect(JSON.parse(ld ?? "{}")["@type"]).toBe("CreativeWork");
});

test("4. visitor views services", async ({ page }) => {
  await page.goto("/services");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(15);
  await page.getByRole("link", { name: "RAG Application Development" }).click();
  await expect(page.getByRole("link", { name: /request a quote/i })).toHaveAttribute("href", "/contact?service=rag-application-development");
});

test("5. visitor submits a contact enquiry", async ({ page }) => {
  await page.goto("/contact?service=rag-application-development");
  await page.locator("#name").fill("E2E Visitor");
  await page.locator("#email").fill("visitor@example.com");
  await page.locator("#message").fill(`Need a RAG assistant for our docs (${stamp}).`);
  await expect(page.locator("#service_id")).not.toHaveValue("");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText("Message sent")).toBeVisible();
});

test("6. admin logs in and sees the stored enquiry", async () => {
  await login(admin);
  await admin.goto("/admin/leads");
  await expect(admin.getByRole("cell", { name: "E2E Visitor" })).toBeVisible();
  await admin.getByRole("cell", { name: "E2E Visitor" }).click();
  await expect(admin.getByText(`(${stamp})`, { exact: false })).toBeVisible();
  await admin.locator("#lead-status").selectOption("contacted");
  await expect(admin.getByText("Enquiry updated.")).toBeVisible();
});

test("7–8. admin creates a draft project; it stays hidden until published", async ({ page }) => {
  await admin.goto("/admin/projects/new");
  await admin.locator("#f-title").fill(PROJECT);
  await admin.locator("#f-summary").fill("Created by the end-to-end test.");
  await admin.locator("#f-technologies").fill("React\nFastAPI");
  await admin.getByRole("button", { name: "Create project" }).click();
  await expect(admin).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);

  await page.goto(`/projects/${PROJECT_SLUG}`);
  await expect(page.getByText(/this project could not be found/i)).toBeVisible();

  await admin.locator("#f-status").selectOption("published");
  await saveForm(admin, "Save changes");
  await page.goto(`/projects/${PROJECT_SLUG}`);
  await expect(page.getByRole("heading", { level: 1, name: PROJECT })).toBeVisible();
});

test("9–10. admin edits the project and the public page reflects it", async ({ page }) => {
  await admin.locator("#f-tagline").fill("Edited tagline from admin");
  await saveForm(admin, "Save changes");
  await page.goto(`/projects/${PROJECT_SLUG}`);
  await expect(page.getByText("Edited tagline from admin")).toBeVisible();
});

test("11–12. admin creates a service and it appears publicly", async ({ page }) => {
  await admin.goto("/admin/services/new");
  await admin.locator("#f-title").fill(SERVICE);
  await admin.locator("#f-summary").fill("A service created during E2E.");
  await admin.locator("#f-status").selectOption("published");
  await admin.getByRole("button", { name: "Create service" }).click();
  await expect(admin).toHaveURL(/\/admin\/services\/[0-9a-f-]{36}$/);
  await page.goto("/services");
  await expect(page.getByRole("link", { name: SERVICE })).toBeVisible();
});

test("13–16. testimonial moderation: draft hidden, approved visible", async ({ page }) => {
  await admin.goto("/admin/testimonials/new");
  await admin.locator("#f-client_name").fill("E2E Client");
  await admin.locator("#f-content").fill("Delivered exactly what we needed, on time.");
  await admin.locator("#f-project_id").selectOption({ label: PROJECT });
  await admin.getByRole("button", { name: "Create testimonial" }).click();
  await expect(admin).toHaveURL(/\/admin\/testimonials\/[0-9a-f-]{36}$/);

  await page.goto(`/projects/${PROJECT_SLUG}`);
  await expect(page.getByRole("heading", { level: 1, name: PROJECT })).toBeVisible();
  await expect(page.getByText("Delivered exactly what we needed")).toHaveCount(0);

  await admin.locator("#f-approval_status").selectOption("approved");
  await admin.locator("#f-consent_confirmed").check();
  await admin.locator("#f-is_published").check();
  await saveForm(admin, "Save changes");
  await page.goto(`/projects/${PROJECT_SLUG}`);
  await expect(page.getByText("Delivered exactly what we needed, on time.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What clients say" })).toBeVisible();
});

test("17–18. admin publishes a blog post and it appears publicly", async ({ page }) => {
  await admin.goto("/admin/blog/posts/new");
  await admin.locator("#f-title").fill(POST);
  await admin.locator("#f-excerpt").fill("Written by the end-to-end test.");
  await admin.locator("#f-content").fill("## Heading\n\nSome **markdown** with <script>alert(1)</script>.");
  await admin.locator("#f-status").selectOption("published");
  await admin.getByRole("button", { name: "Create article" }).click();
  await expect(admin).toHaveURL(/\/admin\/blog\/posts\/[0-9a-f-]{36}$/);
  await page.goto("/blog");
  await page.getByRole("link", { name: POST }).click();
  await expect(page.getByRole("heading", { level: 1, name: POST })).toBeVisible();
  await expect(page.locator("article strong", { hasText: "markdown" })).toBeVisible();
  expect(await page.locator("article script").count()).toBe(0);
});

test("19–20. admin updates homepage content; live without a rebuild", async ({ page }) => {
  await admin.goto("/admin/homepage-sections");
  await admin.getByRole("cell", { name: "hero" }).click();
  await admin.locator("#f-subtitle").fill(`Updated from the CMS ${stamp}`);
  await saveForm(admin, "Save changes");
  await page.goto("/");
  await expect(page.getByText(`Updated from the CMS ${stamp}`)).toBeVisible();
});

test("21. unauthorized visitor cannot open the admin", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fusers/);
  await login(page, VIEWER);
  // a viewer is signed in but has no Users / Leads modules and cannot write
  await expect(page.getByRole("navigation", { name: "Admin" }).getByText("Users")).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page.getByText(/does not include access/i)).toBeVisible();
  const r = await page.request.post("/api/v1/admin/projects", { data: { title: "Viewer attempt" }, headers: { Origin: "http://localhost:4173" } });
  expect(r.status()).toBe(403);
  await ctx.close();
});

test("22. protected API requests without a session are rejected", async ({ request }) => {
  expect((await request.get("/api/v1/admin/leads")).status()).toBe(401);
  expect((await request.post("/api/v1/admin/projects", { data: { title: "x" }, headers: { Origin: "http://localhost:4173" } })).status()).toBe(401);
  expect((await request.post("/api/v1/admin/projects", { data: { title: "x" }, headers: { Origin: "https://evil.example" } })).status()).toBe(403);
  const pub = await request.get(`/api/v1/public/projects?q=${encodeURIComponent("' OR 1=1 --")}`);
  expect(pub.status()).toBe(200);
});

test("23. expired sessions refresh silently, revoked sessions go to login", async () => {
  const ctx = admin.context();
  const cookies = await ctx.cookies();
  await ctx.clearCookies();
  await ctx.addCookies(cookies.filter((c) => c.name !== "pf_access")); // access token expired/dropped
  await admin.goto("/admin/projects");
  await expect(admin.getByRole("cell", { name: PROJECT })).toBeVisible(); // refreshed transparently
  await ctx.clearCookies(); // refresh token gone too
  await admin.goto("/admin/services");
  await expect(admin).toHaveURL(/\/admin\/login/);
  await login(admin);
});

test("24. admin logs out and the session is gone", async () => {
  await admin.getByRole("button", { name: /log out/i }).click();
  await expect(admin).toHaveURL(/\/admin\/login$/);
  await admin.goto("/admin");
  await expect(admin).toHaveURL(/\/admin\/login/);
  expect((await admin.request.get("/api/v1/auth/me")).status()).toBe(401);
});

for (const [name, viewport] of [
  ["mobile", { width: 375, height: 812 }],
  ["tablet", { width: 820, height: 1180 }],
  ["desktop", { width: 1440, height: 900 }],
] as const) {
  test(`responsive ${name}: key pages render without overflow or console errors`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = trackConsole(page);
    for (const path of ["/", "/projects", "/projects/mrs-fashion-jewel", "/services", "/blog", "/contact", "/about"]) {
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
    }
    if (name === "mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.locator("#mobile-menu")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#mobile-menu")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test("SEO files are served", async ({ request }) => {
  expect((await request.get("/robots.txt")).ok()).toBeTruthy();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/projects/mrs-fashion-jewel");
  expect((await request.get("/resume.pdf")).ok()).toBeTruthy();
});
