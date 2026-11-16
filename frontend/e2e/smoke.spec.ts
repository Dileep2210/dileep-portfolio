import { expect, test, type Page } from "@playwright/test";

const API = "http://api.test/api/contact";

async function fillForm(page: Page, overrides: Partial<Record<string, string>> = {}) {
  const v = {
    name: "Jane Doe",
    email: "jane@example.com",
    subject: "Website project",
    message: "Hello, I would like a quote for a website.",
    ...overrides,
  };
  for (const [field, value] of Object.entries(v)) {
    await page.locator(`#${field}`).fill(value);
  }
}

test("home page renders core sections and metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Dileep Kumar Panchumarthi/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const id of ["home", "about", "work", "services", "stack", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\//);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og\.png$/);
  const ld = await page.locator('script[type="application/ld+json"]').evaluate((el) => JSON.parse(el.textContent ?? "{}"));
  expect(ld["@type"]).toBe("Person");
  expect(ld.name).toBe("Dileep Kumar Panchumarthi");
});

test("static SEO files and 404 page are served", async ({ request }) => {
  expect((await request.get("/robots.txt")).ok()).toBeTruthy();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("<urlset");
  expect((await request.get("/og.png")).ok()).toBeTruthy();
  expect((await request.get("/resume.pdf")).ok()).toBeTruthy();
  const notFound = await request.get("/404.html");
  expect(await notFound.text()).toContain("Page not found");
});

test("skip link is the first tab stop and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await expect(page.locator("main#main")).toBeAttached();
});

test("scrolling does not rewrite the URL hash", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.getElementById("contact")!.offsetTop));
  await page.waitForTimeout(600);
  expect(new URL(page.url()).hash).toBe("");
});

test("mobile menu exposes ARIA state and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const close = page.getByRole("button", { name: "Close menu" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("marquee can be paused and duplicates are not keyboard focusable", async ({ page }) => {
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Pause project carousels" });
  await pause.scrollIntoViewIfNeeded();
  await pause.click();
  await expect(page.getByRole("button", { name: "Play project carousels" })).toHaveAttribute("aria-pressed", "true");
  const states = await page.locator(".marquee-track").evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).animationPlayState),
  );
  expect(states.length).toBeGreaterThan(0);
  expect(states.every((s) => s === "paused")).toBe(true);
  const hiddenLinks = page.locator('a[aria-hidden="true"]');
  const n = await hiddenLinks.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await expect(hiddenLinks.nth(i)).toHaveAttribute("tabindex", "-1");
  }
});

test.describe("contact form", () => {
  test("client-side validation blocks bad input without calling the API", async ({ page }) => {
    let called = false;
    await page.route(API, (route) => {
      called = true;
      return route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/#contact");
    await fillForm(page, { email: "not-an-email", message: "short" });
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#message-error")).toBeVisible();
    expect(called).toBe(false);
  });

  test("success: sends JSON, shows confirmation", async ({ page }) => {
    let body: Record<string, string> = {};
    await page.route(API, async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/#contact");
    await fillForm(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Message sent")).toBeVisible();
    expect(body).toMatchObject({ name: "Jane Doe", email: "jane@example.com", subject: "Website project", website: "" });
  });

  test("failure keeps the typed text and shows an error", async ({ page }) => {
    await page.route(API, (route) =>
      route.fulfill({ status: 502, json: { ok: false, error: "Could not send your message right now." } }),
    );
    await page.goto("/#contact");
    await fillForm(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert")).toContainText("Could not send");
    await expect(page.locator("#message")).toHaveValue(/quote for a website/);
  });

  test("rate limit (429) and network errors are handled", async ({ page }) => {
    await page.route(API, (route) => route.fulfill({ status: 429, json: { ok: false, error: "x" } }));
    await page.goto("/#contact");
    await fillForm(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert")).toContainText("wait a bit");

    await page.unroute(API);
    await page.route(API, (route) => route.abort("failed"));
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert")).toContainText("reach the server");
    await expect(page.locator("#name")).toHaveValue("Jane Doe");
  });

  test("double submit sends only one request", async ({ page }) => {
    let count = 0;
    await page.route(API, async (route) => {
      count++;
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/#contact");
    await fillForm(page);
    const send = page.getByRole("button", { name: "Send message" });
    await send.dblclick();
    await expect(page.getByText("Message sent")).toBeVisible();
    expect(count).toBe(1);
  });
});
