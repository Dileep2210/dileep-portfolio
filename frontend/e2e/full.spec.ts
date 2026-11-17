/**
 * Exhaustive UI walk-through of every admin module and every public page.
 * Any page error, console error or 5xx response fails the test; unexpected 4xx are reported.
 */
import { createHmac } from "node:crypto";
import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { E2E_PASSWORD } from "../playwright.config";

// Ordered (one worker) but independent: a failure does not skip the remaining tests.
test.describe.configure({ mode: "default", timeout: 90_000 });
test.use({ trace: "off" });

const ADMIN = "e2e-admin@example.com";
const S = Date.now().toString(36);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

type Problems = string[];
const EXPECTED_4XX = [/\/api\/v1\/auth\/me$/, /\/api\/v1\/auth\/refresh$/];

function watch(page: Page, problems: Problems) {
  page.on("pageerror", (e) => problems.push(`pageerror ${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/status of (401|403|404|409|413|415|422)/.test(m.text())) problems.push(`console ${page.url()}: ${m.text()}`);
  });
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.request().method()} ${u}`);
    else if (r.status() >= 400 && u.includes("/api/") && !EXPECTED_4XX.some((re) => re.test(u)))
      problems.push(`HTTP ${r.status()} ${r.request().method()} ${u}`);
  });
}

function totp(secret: string, offset = 0): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "")) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Math.floor(Date.now() / 1000 / 30) + offset;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", key).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}

let ctx: BrowserContext;
let admin: Page;
const adminProblems: Problems = [];
/** Problems that are acceptable for the current step (e.g. a deliberate validation error). */
let allow: RegExp[] = [];

async function toast(page: Page, text: RegExp) {
  await expect(page.locator("[role=status],[role=alert]").filter({ hasText: text }).first()).toBeVisible();
}

async function confirmDialog(page: Page, button: string | RegExp) {
  const dialog = page.getByRole("dialog").last(); // confirmations open on top of other dialogs
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: button }).click();
}

/** Uploads files through the media library UI (each test brings its own files). */
async function uploadMedia(page: Page, files: { name: string; mimeType: string; buffer: Buffer }[]) {
  await page.goto("/admin/media");
  await page.getByLabel("Upload files").setInputFiles(files);
  await toast(page, new RegExp(`Uploaded ${files.length} file`));
}

/** Waits until the next 30-second TOTP window so a fresh, unused code is available. */
async function nextTotpWindow() {
  const start = Math.floor(Date.now() / 30000);
  while (Math.floor(Date.now() / 30000) === start) await new Promise((r) => setTimeout(r, 500));
}

async function reauthIfAsked(page: Page) {
  const pw = page.locator("#reauth-password");
  try {
    await pw.waitFor({ state: "visible", timeout: 2500 });
  } catch {
    return;
  }
  await pw.fill(E2E_PASSWORD);
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
}

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext();
  admin = await ctx.newPage();
  watch(admin, adminProblems);
  await admin.goto("/admin/login");
  await admin.locator("#login-email").fill(ADMIN);
  await admin.locator("#login-password").fill(E2E_PASSWORD);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await expect(admin.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test.afterEach(async () => {
  const real = adminProblems.filter((p) => !allow.some((re) => re.test(p)));
  adminProblems.length = 0;
  allow = [];
  expect(real, "admin page problems").toEqual([]);
});

test.afterAll(async () => ctx.close());

// --------------------------------------------------------------------------- admin

test("admin: every sidebar module opens without errors", async () => {
  const nav = admin.getByRole("navigation", { name: "Admin" });
  const labels = await nav.getByRole("link").allTextContents();
  expect(labels.length).toBe(20);
  const broken: string[] = [];
  for (const label of labels) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(admin.getByRole("heading", { level: 1 })).toBeVisible();
    await admin.waitForTimeout(700); // let the module's first request settle
    if (await admin.getByText(/could not load this content/i).count()) broken.push(`${label}: ${await admin.getByRole("alert").first().innerText()}`);
  }
  expect(broken).toEqual([]);
});

test("admin: dashboard stat cards link to their modules", async () => {
  await admin.goto("/admin");
  await admin.getByRole("link", { name: /^projects/i }).first().click();
  await expect(admin).toHaveURL(/\/admin\/projects$/);
});

test("admin: projects list search, sort, pagination, filters", async () => {
  await admin.goto("/admin/projects");
  const totalText = admin.getByText(/^\d+ items$/);
  await expect(totalText).toBeVisible();
  const total = Number((await totalText.innerText()).split(" ")[0]);
  expect(total).toBeGreaterThanOrEqual(12);
  await admin.getByPlaceholder("Search projects…").fill("jewel");
  await expect(admin.getByText(/^1 item$/)).toBeVisible();
  await admin.getByPlaceholder("Search projects…").fill("");
  await expect(admin.getByText(`${total} items`)).toBeVisible();
  await admin.getByRole("button", { name: /^Title/ }).click();
  await expect(admin.locator("tbody tr").first()).toContainText("Alden");
  await admin.getByRole("button", { name: /^Title/ }).click();
  await expect(admin.locator("tbody tr").first()).toContainText("Soda");
  await admin.locator("select").filter({ hasText: "Rows" }).or(admin.getByLabel("Rows")).first().selectOption("10");
  await expect(admin.locator("tbody tr")).toHaveCount(10);
  await admin.getByRole("button", { name: "Next page" }).click();
  await expect(admin.locator("tbody tr")).toHaveCount(Math.min(10, total - 10));
  await admin.getByRole("combobox", { name: "Featured" }).selectOption("true");
  await expect(admin.locator("tbody tr", { hasText: "MRS Fashion Jewel" })).toBeVisible();
  await expect(admin.locator("tbody tr", { hasText: "Soda" })).toHaveCount(0);
});

test("admin: media library upload, alt text, PDF, delete", async () => {
  await admin.goto("/admin/media");
  await admin.getByLabel("Upload files").setInputFiles([
    { name: `shot-${S}.png`, mimeType: "image/png", buffer: PNG },
    { name: `cv-${S}.pdf`, mimeType: "application/pdf", buffer: PDF },
  ]);
  await toast(admin, /Uploaded 2 files/);
  await admin.getByRole("button", { name: new RegExp(`shot-${S}`) }).click();
  await admin.locator("#media-alt").fill("E2E screenshot");
  await admin.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await toast(admin, /Alt text saved/);
  await admin.keyboard.press("Escape");
  await admin.getByPlaceholder("Search file name or alt text").fill("E2E screenshot");
  await expect(admin.getByRole("button", { name: new RegExp(`shot-${S}`) })).toBeVisible();
  // a rejected file shows an error, the rest of the UI keeps working
  allow = [/HTTP 415 POST .*\/admin\/media/];
  await admin.getByLabel("Upload files").setInputFiles({ name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg><script>alert(1)</script></svg>") });
  await toast(admin, /evil\.svg: Only JPEG, PNG/);
});

test("admin: create project with cover + gallery from the media picker, then delete and restore", async ({ page }) => {
  await uploadMedia(admin, [{ name: `cover-${S}.png`, mimeType: "image/png", buffer: PNG }]);
  await admin.goto("/admin/projects/new");
  await admin.locator("#f-title").fill(`Gallery Project ${S}`);
  await admin.locator("#f-category_id").selectOption({ label: "Web Development" });
  await admin.locator("#f-status").selectOption("published");
  await admin.getByRole("button", { name: "Choose from library" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: new RegExp(`cover-${S}`) }).click();
  await admin.getByRole("button", { name: "Add screenshot" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: new RegExp(`cover-${S}`) }).click();
  await admin.getByLabel("Caption for image 1").fill("Home page");
  await admin.locator("#f-features").fill("Fast\nSecure");
  await admin.locator("#f-overview").fill("## Hello\n\n- one\n- two");
  await admin.getByRole("tab", { name: "Preview" }).first().click();
  await expect(admin.locator(".prose-cms li").first()).toHaveText("one");
  await admin.getByRole("button", { name: "Create project" }).click();
  await expect(admin).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
  await toast(admin, /saved/);

  await page.goto(`/projects/gallery-project-${S}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Gallery Project ${S}`);
  await expect(page.getByRole("heading", { name: "Screenshots" })).toBeVisible();
  await expect(page.getByText("Home page")).toBeVisible();

  // media in use cannot be deleted
  allow = [/HTTP 409 DELETE .*\/admin\/media\//];
  await admin.goto("/admin/media");
  await admin.getByRole("button", { name: new RegExp(`cover-${S}`) }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await confirmDialog(admin, "Delete");
  await toast(admin, /still used/);
  await expect(admin.getByRole("dialog")).toHaveCount(1); // the confirmation closed, the detail view stays
  await admin.keyboard.press("Escape");
  await expect(admin.getByRole("dialog")).toHaveCount(0);

  await admin.goto("/admin/projects");
  await admin.getByPlaceholder("Search projects…").fill(`Gallery Project ${S}`);
  const row = admin.locator("tbody tr", { hasText: `Gallery Project ${S}` });
  await row.getByRole("button", { name: "Delete" }).click();
  await confirmDialog(admin, "Delete");
  await toast(admin, /Deleted/);
  await expect(row).toHaveCount(0);
  await admin.getByLabel("Show deleted").check();
  await admin.locator("tbody tr", { hasText: `Gallery Project ${S}` }).getByRole("button", { name: "Restore" }).click();
  await toast(admin, /Restored/);
});

test("admin: edit form shows server validation errors and keeps input", async () => {
  allow = [/HTTP 409 POST .*\/admin\/services/];
  await admin.goto("/admin/services/new");
  await admin.locator("#f-title").fill("Custom Website Development"); // already exists
  await admin.getByRole("button", { name: "Create service" }).click();
  await toast(admin, /already exists/);
  await expect(admin.locator("#f-title")).toHaveValue("Custom Website Development");
  await admin.locator("#f-title").fill("x");
  await admin.getByRole("button", { name: "Create service" }).click();
  await expect(admin.getByText("At least 2 characters.")).toBeVisible();
  await admin.locator("#f-title").fill(`Priced Service ${S}`);
  await admin.locator("#f-starting_price").fill("25000");
  await admin.locator("#f-delivery_estimate").fill("2–3 weeks");
  await admin.locator("#f-icon").selectOption("Rocket");
  await admin.locator("#f-status").selectOption("published");
  await admin.getByRole("button", { name: "Create service" }).click();
  await toast(admin, /saved/);
});

test("public: priced service shows price and quote link", async ({ page }) => {
  await page.goto(`/services/priced-service-${S}`);
  await expect(page.getByText("₹25,000")).toBeVisible();
  await expect(page.getByText("2–3 weeks")).toBeVisible();
});

test("admin: skills + categories tabs", async ({ page }) => {
  await admin.goto("/admin/categories");
  await admin.getByRole("tab", { name: "Skill categories" }).click();
  await admin.getByRole("button", { name: /New skill category/ }).click();
  await admin.locator("#f-name").fill(`Testing ${S}`);
  await admin.getByRole("button", { name: "Create skill category" }).click();
  await toast(admin, /saved/);
  await admin.goto("/admin/skills/new");
  await admin.locator("#f-name").fill(`Playwright${S}`);
  await admin.locator("#f-category_id").selectOption({ label: `Testing ${S}` });
  await admin.locator("#f-icon").selectOption("SiReact");
  await admin.locator("#f-color").fill("#22d3ee");
  await admin.getByRole("button", { name: "Create skill" }).click();
  await toast(admin, /saved/);
  await page.goto("/about");
  await page.getByRole("tab", { name: `Testing ${S}` }).click();
  await expect(page.getByText(`Playwright${S}`)).toBeVisible();

  for (const tab of ["Project categories", "Blog categories", "Blog tags"]) {
    await admin.goto("/admin/categories");
    await admin.getByRole("tab", { name: tab }).click();
    await expect(admin.locator("tbody tr").first()).toBeVisible();
  }
});

test("admin: experience appears on the About page", async ({ page }) => {
  await admin.goto("/admin/experiences/new");
  await admin.locator("#f-title").fill(`Freelance Developer ${S}`);
  await admin.locator("#f-organization").fill("Self-employed");
  await admin.locator("#f-start_date").fill("2024-01-01");
  await admin.locator("#f-is_current").check();
  await admin.locator("#f-highlights").fill("Shipped client sites");
  await admin.getByRole("button", { name: "Create entry" }).click();
  await toast(admin, /saved/);
  await page.goto("/about");
  await expect(page.getByText(`Freelance Developer ${S}`)).toBeVisible();
  await expect(page.getByText(/Present/)).toBeVisible();
});

test("admin: blog with category, tags, schedule; public filters, tags, related", async ({ page }) => {
  for (const [title, extra] of [
    [`Alpha Post ${S}`, async () => {}],
    [`Beta Post ${S}`, async () => {}],
    [`Future Post ${S}`, async () => admin.locator("#f-published_at").fill("2030-01-01T10:00")],
  ] as const) {
    await admin.goto("/admin/blog/posts/new");
    await admin.locator("#f-title").fill(title);
    await admin.locator("#f-excerpt").fill("Excerpt");
    await admin.locator("#f-content").fill("Body text about **FastAPI**.");
    await admin.locator("#f-category_id").selectOption({ label: "FastAPI" });
    await admin.locator("#f-tags").fill(`E2E Tag ${S}\nSecurity`);
    await admin.locator("#f-status").selectOption("published");
    await extra();
    await admin.getByRole("button", { name: "Create article" }).click();
    await toast(admin, /saved/);
  }
  await admin.goto("/admin/blog/posts");
  await expect(admin.locator("tbody tr", { hasText: `Future Post ${S}` }).getByText("Scheduled")).toBeVisible();

  await page.goto("/blog");
  await expect(page.getByRole("link", { name: `Alpha Post ${S}` })).toBeVisible();
  await expect(page.getByRole("link", { name: `Future Post ${S}` })).toHaveCount(0);
  await page.getByRole("button", { name: "FastAPI" }).click();
  await expect(page).toHaveURL(/category=fastapi/);
  await page.getByRole("link", { name: `Alpha Post ${S}` }).click();
  await expect(page.getByRole("heading", { name: "Related articles" })).toBeVisible();
  await expect(page.getByRole("link", { name: `Beta Post ${S}` })).toBeVisible();
  await page.getByRole("link", { name: `#E2E Tag ${S}` }).click();
  await expect(page).toHaveURL(new RegExp(`tag=e2e-tag-${S}`));
  await expect(page.getByRole("link", { name: `Alpha Post ${S}` })).toBeVisible();
  await page.getByPlaceholder("Search articles…").fill(`Beta Post ${S}`);
  await expect(page.getByRole("link", { name: `Alpha Post ${S}` })).toHaveCount(0);
});

test("admin: navigation, social links, SEO and homepage edits reflect publicly", async ({ page }) => {
  await admin.goto("/admin/navigation/new");
  await admin.locator("#f-label").fill(`Docs${S}`);
  await admin.locator("#f-href").fill("/blog");
  await admin.locator("#f-position").fill("99");
  await admin.getByRole("button", { name: "Create link" }).click();
  await toast(admin, /saved/);

  await admin.goto("/admin/social-links/new");
  await admin.locator("#f-platform").fill("youtube");
  await admin.locator("#f-label").fill(`YouTube${S}`);
  await admin.locator("#f-url").fill("https://youtube.com/@example");
  await admin.locator("#f-icon").selectOption("youtube");
  await admin.getByRole("button", { name: "Create social link" }).click();
  await toast(admin, /saved/);

  await admin.goto("/admin/seo");
  await admin.getByRole("cell", { name: "contact", exact: true }).click();
  await admin.locator("#f-title").fill(`Contact SEO ${S}`);
  await admin.getByRole("button", { name: "Save changes" }).click();
  await toast(admin, /saved/);

  await admin.goto("/admin/homepage-sections");
  await admin.getByRole("cell", { name: "process", exact: true }).click();
  await admin.locator("#f-data").fill(JSON.stringify({ steps: [{ title: `Step ${S}`, text: "Edited" }] }));
  await admin.getByRole("button", { name: "Save changes" }).click();
  await toast(admin, /saved/);

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: `Docs${S}` })).toBeVisible();
  await expect(page.getByText(`Step ${S}`)).toBeVisible();
  await expect(page.getByRole("link", { name: `YouTube${S}` }).or(page.getByLabel(`YouTube${S}`)).first()).toBeVisible();
  await page.goto("/contact");
  await expect(page).toHaveTitle(new RegExp(`Contact SEO ${S}`));

  // invalid JSON is caught in the form
  await admin.goto("/admin/homepage-sections");
  await admin.getByRole("cell", { name: "process", exact: true }).click();
  await admin.locator("#f-data").fill("{not json");
  await admin.getByRole("button", { name: "Save changes" }).click();
  await expect(admin.getByText("Must be a valid JSON object.")).toBeVisible();
});

test("admin: resume management switches the public download", async ({ page }) => {
  await uploadMedia(admin, [{ name: `resume-${S}.pdf`, mimeType: "application/pdf", buffer: PDF }]);
  await admin.goto("/admin/resumes/new");
  await admin.locator("#f-label").fill(`Resume ${S}`);
  await admin.getByRole("button", { name: /Choose file/ }).click();
  await admin.getByRole("dialog").getByRole("button", { name: new RegExp(`resume-${S}`) }).click();
  await admin.getByRole("button", { name: "Create resume" }).click();
  await toast(admin, /saved/);
  await page.goto("/");
  const href = await page.getByRole("link", { name: /Download Resume/ }).getAttribute("href");
  expect(href).toMatch(/\/media\/[0-9a-f]{32}\.pdf$/);
  expect((await page.request.get(href!)).status()).toBe(200);
});

test("admin: profile + website settings save and reflect publicly; bad values rejected", async ({ page }) => {
  await admin.goto("/admin/profile");
  await admin.locator("#f-headline").fill(`Headline ${S}`);
  await admin.locator("#f-location").fill("Hyderabad, India");
  await admin.getByRole("button", { name: "Save settings" }).click();
  await toast(admin, /Settings saved/);
  await page.goto("/about");
  await expect(page.getByText(`Headline ${S}`)).toBeVisible();
  await expect(page.getByText("Hyderabad, India")).toBeVisible();

  allow = [/HTTP 422 PATCH .*\/admin\/settings/];
  await admin.locator("#f-email").fill("not-an-email");
  await admin.getByRole("button", { name: "Save settings" }).click();
  await toast(admin, /invalid/i);

  await admin.goto("/admin/settings");
  await admin.locator("#f-contact_cta_title").fill(`CTA ${S}`);
  await admin.locator("#f-budget_options").fill("Small\nLarge");
  await admin.getByRole("button", { name: "Save settings" }).click();
  await toast(admin, /Settings saved/);
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`CTA ${S}`);
  await expect(page.locator("#budget option", { hasText: "Large" })).toHaveCount(1);
});

test("admin: leads detail, status, follow-up, notes, export, delete", async ({ page }) => {
  await page.goto("/contact");
  await page.locator("#name").fill(`Lead ${S}`);
  await page.locator("#email").fill("lead@example.com");
  await page.locator("#phone").fill("+91 98765 43210");
  await page.locator("#company").fill("Acme");
  await page.locator("#message").fill("Please build an admin dashboard.");
  await page.getByLabel("WhatsApp").check();
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText("Message sent")).toBeVisible();

  await admin.goto("/admin/leads");
  await admin.getByPlaceholder(/Search name/).fill(`Lead ${S}`);
  await admin.getByRole("cell", { name: `Lead ${S}` }).click();
  await expect(admin.getByText("whatsapp")).toBeVisible();
  await admin.locator("#lead-status").selectOption("in_discussion");
  await toast(admin, /Enquiry updated/);
  await admin.locator("#lead-follow").fill("2030-05-01");
  await toast(admin, /Enquiry updated/);
  await admin.getByLabel("New note").fill("Call on Monday");
  await admin.getByRole("button", { name: "Add note" }).click();
  await expect(admin.getByText("Call on Monday")).toBeVisible();
  await admin.getByRole("button", { name: "Delete note" }).click();
  await confirmDialog(admin, "Delete");
  await expect(admin.getByText("Call on Monday")).toHaveCount(0);

  await admin.goto("/admin/leads");
  await admin.getByRole("combobox", { name: "Status" }).selectOption("in_discussion");
  await expect(admin.getByRole("cell", { name: `Lead ${S}` })).toBeVisible();
  const download = admin.waitForEvent("download");
  allow = [/HTTP 403 GET .*export\.csv/];
  await admin.getByRole("button", { name: "Export CSV" }).click();
  await reauthIfAsked(admin);
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^enquiries-.*\.csv$/);

  await admin.getByRole("cell", { name: `Lead ${S}` }).click();
  await admin.getByRole("button", { name: "Delete" }).click();
  await confirmDialog(admin, "Delete");
  await expect(admin).toHaveURL(/\/admin\/leads$/);
});

test("public: testimonial submission → admin approves → visible", async ({ page }) => {
  await page.goto("/contact");
  await page.locator("#t-name").fill(`Happy Client ${S}`);
  await page.locator("#t-email").fill("client@example.com");
  await page.locator("#t-content").fill("Great communication and solid delivery.");
  await page.locator("#t-rating").selectOption("5");
  await page.getByLabel(/I agree that this testimonial/).check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/will appear once it has been reviewed/)).toBeVisible();

  await admin.goto("/admin/testimonials");
  await admin.getByRole("cell", { name: `Happy Client ${S}` }).click();
  await expect(admin.locator("#f-rating")).toHaveValue("5");
  await admin.locator("#f-approval_status").selectOption("approved");
  await admin.locator("#f-consent_confirmed").check();
  await admin.locator("#f-is_published").check();
  await admin.getByRole("button", { name: "Save changes" }).click();
  await toast(admin, /saved/);
  await page.goto("/");
  await expect(page.getByText("Great communication and solid delivery.")).toBeVisible();
  await expect(page.getByLabel("5 out of 5 stars")).toBeVisible();
});

test("admin: users invite → accept → role change → deactivate", async ({ browser }) => {
  await admin.goto("/admin/users");
  await admin.getByRole("button", { name: "Invite user" }).click();
  await admin.locator("#inv-email").fill(`new-${S}@example.com`);
  await admin.locator("#inv-role").selectOption("editor");
  allow = [/HTTP 403 POST .*invite/];
  await admin.getByRole("dialog").getByRole("button", { name: "Send invitation" }).click();
  await reauthIfAsked(admin);
  const link = await admin.getByLabel("Invitation link").inputValue();
  expect(link).toContain("/admin/accept-invite?token=");
  await admin.getByRole("button", { name: "Done" }).click();

  const other = await browser.newContext();
  const p = await other.newPage();
  const otherProblems: Problems = [];
  watch(p, otherProblems);
  await p.goto(new URL(link).pathname + new URL(link).search);
  await p.locator("#inv-name").fill("New Editor");
  await p.locator("#inv-pw").fill("Editor-Strong-Passphrase-9");
  await p.getByRole("button", { name: "Create account" }).click();
  await expect(p).toHaveURL(/\/admin\/login$/);
  await p.locator("#login-email").fill(`new-${S}@example.com`);
  await p.locator("#login-password").fill("Editor-Strong-Passphrase-9");
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.getByRole("heading", { name: /welcome back, new/i })).toBeVisible();
  await expect(p.getByRole("navigation", { name: "Admin" }).getByText("Users")).toHaveCount(0);
  expect(otherProblems.filter((x) => !/auth\/(me|refresh)/.test(x))).toEqual([]);

  await admin.goto("/admin/users");
  await admin.getByLabel(`Role for new-${S}@example.com`).selectOption("viewer");
  await toast(admin, /Role updated/);
  const row = admin.locator("tbody tr", { hasText: `new-${S}@example.com` });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await confirmDialog(admin, "Deactivate");
  await toast(admin, /deactivated/);
  await expect(row.getByText("Deactivated")).toBeVisible();
  await other.close();
});

test("admin: audit log lists and filters activity", async () => {
  await admin.goto("/admin/audit-logs");
  await expect(admin.locator("tbody tr").first()).toBeVisible();
  await admin.getByRole("combobox", { name: "Area" }).selectOption("user");
  await expect(admin.getByText("user.invite").first()).toBeVisible();
});

test("admin: security — 2FA on, sign-in with code, 2FA off, sessions", async ({ browser }) => {
  await admin.goto("/admin/security");
  allow = [/HTTP 403 POST .*mfa\/setup/];
  await admin.getByRole("button", { name: "Set up two-factor" }).click();
  await reauthIfAsked(admin);
  const secret = await admin.locator("#mfa-secret").inputValue();
  await admin.locator("#mfa-code").fill(totp(secret));
  await admin.getByRole("button", { name: "Verify and turn on" }).click();
  await toast(admin, /Two-factor authentication is on/);

  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto("/admin/login");
  await p.locator("#login-email").fill(ADMIN);
  await p.locator("#login-password").fill(E2E_PASSWORD);
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.locator("#login-code").fill(totp(secret, 1));
  await p.getByRole("button", { name: "Verify" }).click();
  await expect(p.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  await admin.reload();
  await expect(admin.getByText("This device")).toBeVisible();
  await expect(admin.locator("li", { hasText: "Sign out" }).getByRole("button", { name: "Sign out" }).first()).toBeVisible();
  await admin.locator("li", { hasNotText: "This device" }).getByRole("button", { name: "Sign out" }).first().click();
  await toast(admin, /Device signed out/);
  await p.goto("/admin/projects");
  await expect(p).toHaveURL(/\/admin\/login/);
  await other.close();

  await nextTotpWindow(); // codes already used for enrolment and sign-in cannot be replayed
  await admin.locator("#mfa-off").fill(totp(secret, 1));
  await admin.getByRole("button", { name: "Turn off" }).click();
  await confirmDialog(admin, "Turn off");
  await reauthIfAsked(admin);
  await toast(admin, /turned off/);
});

test("admin: change password, forgot-password page, read-only viewer edit form", async ({ browser }) => {
  await admin.goto("/admin/security");
  await admin.locator("#pw-current").fill(E2E_PASSWORD);
  await admin.locator("#pw-new").fill("Temporary-Passphrase-123");
  await admin.locator("#pw-repeat").fill("Temporary-Passphrase-123");
  await admin.getByRole("button", { name: "Update password" }).click();
  await toast(admin, /Password changed/);
  await admin.locator("#pw-current").fill("Temporary-Passphrase-123");
  await admin.locator("#pw-new").fill(E2E_PASSWORD);
  await admin.locator("#pw-repeat").fill(E2E_PASSWORD);
  await admin.getByRole("button", { name: "Update password" }).click();
  await toast(admin, /Password changed/);

  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto("/admin/login");
  await p.getByRole("link", { name: /Forgot your password/ }).click();
  await p.locator("#reset-email").fill("nobody@example.com");
  await p.getByRole("button", { name: "Send reset link" }).click();
  await expect(p.getByText(/If an account exists/)).toBeVisible();

  await p.goto("/admin/login");
  await p.locator("#login-email").fill("e2e-viewer@example.com");
  await p.locator("#login-password").fill(E2E_PASSWORD);
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await p.goto("/admin/projects");
  await p.locator("tbody tr").first().click();
  await expect(p.getByText(/read-only access/)).toBeVisible();
  await other.close();
});

// --------------------------------------------------------------------------- public

test("public: every route renders, 404s are handled", async ({ page }) => {
  const problems: Problems = [];
  watch(page, problems);
  for (const path of ["/", "/about", "/services", "/services/ai-chatbot-development", "/projects", "/projects/cartinminutes", "/blog", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  for (const path of ["/nope", "/projects/does-not-exist", "/services/nope", "/blog/nope"]) {
    await page.goto(path);
    await expect(page.getByText(/could not be found/)).toBeVisible();
  }
  expect(problems.filter((p) => !/HTTP 404 GET .*\/public\/(projects|services|blog)\//.test(p))).toEqual([]);
});

test("public: projects filters, tech select, pagination, card navigation", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("combobox", { name: "Filter by technology" }).selectOption("FastAPI");
  await expect(page).toHaveURL(/tech=FastAPI/);
  await expect(page.getByRole("link", { name: "MRS Fashion Jewel" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Soda" })).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("combobox", { name: "Filter by technology" }).selectOption("");
  await page.getByPlaceholder("Search projects…").fill("zzzz-no-match");
  await expect(page.getByText("No projects match these filters")).toBeVisible();
  await page.getByPlaceholder("Search projects…").fill("");
  await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.locator("article a").first().click();
  await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+$/);
});

test("public: homepage links, mobile menu navigation, footer, skip link, resume", async ({ browser }) => {
  const m = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await m.newPage();
  const problems: Problems = [];
  watch(page, problems);
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-menu").getByRole("link", { name: "Services" }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator("#mobile-menu")).toHaveCount(0);
  await page.getByRole("contentinfo").getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto("/");
  // Press on <body>: with another page (the admin session) open, window-level keyboard input
  // may go to that page instead.
  await page.locator("body").press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.getByRole("link", { name: /view my projects/i }).first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto("/");
  await page.getByRole("link", { name: /Hire Me/ }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  expect(problems).toEqual([]);
  await m.close();
});

test("public: contact form validation and phone format", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText(/Name must be at least 2/)).toBeVisible();
  await page.locator("#phone").fill("abc");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText("Enter a valid phone number.")).toBeVisible();
});
