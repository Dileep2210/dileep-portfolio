import type { ReactNode } from "react";
import { formatDate, formatPrice } from "../lib/format";
import type { Column, FilterDef } from "./DataTable";
import type { FieldDef } from "./ResourceForm";
import { Badge } from "./ui";

type Row = Record<string, unknown>;

export type ResourceConfig = {
  key: string; // admin route segment
  endpoint: string;
  title: string;
  singular: string;
  perm: string; // permission prefix
  description: string;
  columns: Column<Row>[];
  filters?: FilterDef[];
  defaultSort: string;
  fields: FieldDef[];
  defaults?: Row;
  softDelete?: boolean;
  publicUrl?: (row: Row) => string | null;
  searchPlaceholder?: string;
};

const statusBadge = (row: Row): ReactNode => {
  const status = String(row.status);
  const future = row.published_at && new Date(String(row.published_at)) > new Date();
  if (status === "published" && future) return <Badge tone="blue">Scheduled</Badge>;
  return status === "published" ? <Badge tone="green">Published</Badge> : <Badge tone="amber">Draft</Badge>;
};
const yes = (v: unknown) => (v ? <Badge tone="violet">Yes</Badge> : <span className="text-mist">—</span>);
const STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];
const BOOL = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];
const seoFields = (section = "SEO"): FieldDef[] => [
  { name: "seo_title", label: "SEO title", type: "text", max: 70, section, hint: "Up to 70 characters. Defaults to the title." },
  { name: "seo_description", label: "SEO description", type: "text", max: 170, section, full: true, hint: "Up to 170 characters. Defaults to the summary." },
];

export const RESOURCES: ResourceConfig[] = [
  {
    key: "projects",
    endpoint: "/api/v1/admin/projects",
    title: "Projects",
    singular: "project",
    perm: "projects",
    description: "Every project has its own public page. Drafts are never shown publicly.",
    softDelete: true,
    defaultSort: "position",
    publicUrl: (r) => (r.status === "published" ? `/projects/${r.slug}` : null),
    columns: [
      { key: "title", label: "Title", sortable: true, render: (r) => <span className="font-medium text-white">{String(r.title)}</span> },
      { key: "category", label: "Category", render: (r) => String((r.category as Row | null)?.name ?? "—") },
      { key: "status", label: "Status", render: statusBadge },
      { key: "featured", label: "Featured", render: (r) => yes(r.featured) },
      { key: "position", label: "Order", sortable: true },
      { key: "updated_at", label: "Updated", sortable: true, render: (r) => formatDate(String(r.updated_at)) },
    ],
    filters: [
      { key: "status", label: "Status", options: STATUS },
      { key: "featured", label: "Featured", options: BOOL },
    ],
    defaults: { status: "draft", position: 0 },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, min: 2, max: 120, section: "Basics" },
      { name: "slug", label: "Slug", type: "slug", max: 140, section: "Basics", hint: "Leave empty to generate from the title." },
      { name: "tagline", label: "Tagline", type: "text", max: 160, section: "Basics" },
      { name: "category_id", label: "Category", type: "relation", relation: { endpoint: "/api/v1/admin/project-categories", labelKey: "name" }, section: "Basics" },
      { name: "summary", label: "Summary", type: "textarea", max: 1000, section: "Basics", hint: "Shown on cards and as the default meta description." },
      { name: "status", label: "Status", type: "select", options: STATUS, section: "Publishing" },
      { name: "featured", label: "Featured", type: "checkbox", hint: "Show in the featured reel", section: "Publishing" },
      { name: "position", label: "Display order", type: "number", min: 0, required: true, section: "Publishing" },
      { name: "is_client_project", label: "Client project", type: "checkbox", hint: "Real client work", section: "Publishing" },
      { name: "is_demo", label: "Demo / MVP", type: "checkbox", hint: "Marks it as a demo", section: "Publishing" },
      { name: "client_name", label: "Client name", type: "text", max: 120, section: "Publishing" },
      { name: "timeline", label: "Timeline", type: "text", max: 120, section: "Publishing", hint: "Only if confirmed, e.g. “Sep – Nov 2026”." },
      { name: "cover_url", label: "Cover image", type: "image", section: "Media" },
      { name: "gallery", label: "Screenshots", type: "gallery", section: "Media" },
      { name: "live_url", label: "Live website", type: "url", max: 500, section: "Links" },
      { name: "github_url", label: "GitHub", type: "url", max: 500, section: "Links" },
      { name: "video_url", label: "Video demo", type: "url", max: 500, section: "Links" },
      { name: "highlight_label", label: "Highlight label", type: "text", max: 60, section: "Links" },
      { name: "highlight_value", label: "Highlight value", type: "text", max: 60, section: "Links" },
      { name: "technologies", label: "Technologies", type: "list", section: "Details", hint: "One per line, max 30." },
      { name: "features", label: "Main features", type: "list", section: "Details" },
      { name: "overview", label: "Overview", type: "markdown", section: "Case study" },
      { name: "architecture", label: "Technical architecture", type: "markdown", section: "Case study" },
      { name: "contribution", label: "My contribution", type: "markdown", section: "Case study" },
      { name: "challenges", label: "Challenges", type: "markdown", section: "Case study" },
      { name: "solutions", label: "Solutions", type: "markdown", section: "Case study" },
      { name: "outcomes", label: "Outcomes", type: "markdown", section: "Case study", hint: "Only verifiable outcomes — no invented metrics." },
      ...seoFields(),
    ],
  },
  {
    key: "services",
    endpoint: "/api/v1/admin/services",
    title: "Services",
    singular: "service",
    perm: "services",
    description: "Published services appear on /services, each with its own page and a Request a Quote button.",
    softDelete: true,
    defaultSort: "position",
    publicUrl: (r) => (r.status === "published" ? `/services/${r.slug}` : null),
    columns: [
      { key: "title", label: "Title", sortable: true, render: (r) => <span className="font-medium text-white">{String(r.title)}</span> },
      { key: "status", label: "Status", render: statusBadge },
      { key: "featured", label: "Featured", render: (r) => yes(r.featured) },
      { key: "starting_price", label: "From", render: (r) => formatPrice(r.starting_price as string | null, String(r.price_currency)) ?? "—" },
      { key: "position", label: "Order", sortable: true },
    ],
    filters: [
      { key: "status", label: "Status", options: STATUS },
      { key: "featured", label: "Featured", options: BOOL },
    ],
    defaults: { status: "draft", position: 0, price_currency: "INR" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, min: 2, max: 120, section: "Basics" },
      { name: "slug", label: "Slug", type: "slug", max: 140, section: "Basics" },
      { name: "icon", label: "Icon", type: "icon", section: "Basics" },
      { name: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Inactive (draft)" }, { value: "published", label: "Active (published)" }], section: "Basics" },
      { name: "featured", label: "Featured", type: "checkbox", hint: "Show on the homepage", section: "Basics" },
      { name: "position", label: "Display order", type: "number", required: true, section: "Basics" },
      { name: "summary", label: "Short description", type: "textarea", max: 1000, section: "Content" },
      { name: "content", label: "Detailed content", type: "markdown", section: "Content" },
      { name: "features", label: "Features", type: "list", section: "Content" },
      { name: "tech_stack", label: "Technology stack", type: "list", section: "Content" },
      { name: "cover_url", label: "Cover image", type: "image", section: "Content" },
      { name: "starting_price", label: "Starting price", type: "money", section: "Pricing", hint: "Optional. Leave empty to show “quote on request”." },
      { name: "price_currency", label: "Currency", type: "select", options: [{ value: "INR", label: "INR" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" }], section: "Pricing" },
      { name: "price_note", label: "Price note", type: "text", max: 120, section: "Pricing" },
      { name: "delivery_estimate", label: "Delivery estimate", type: "text", max: 80, section: "Pricing", placeholder: "e.g. 2–4 weeks" },
      ...seoFields(),
    ],
  },
  {
    key: "testimonials",
    endpoint: "/api/v1/admin/testimonials",
    title: "Testimonials",
    singular: "testimonial",
    perm: "testimonials",
    description: "Only approved, consented and published testimonials appear publicly. Never add a review the client has not given and approved.",
    softDelete: true,
    defaultSort: "-created_at",
    columns: [
      { key: "client_name", label: "Client", sortable: true, render: (r) => <span className="font-medium text-white">{String(r.client_name)}</span> },
      { key: "company", label: "Company" },
      {
        key: "approval_status",
        label: "Approval",
        render: (r) => <Badge tone={r.approval_status === "approved" ? "green" : r.approval_status === "rejected" ? "red" : "amber"}>{String(r.approval_status)}</Badge>,
      },
      { key: "is_published", label: "Public", render: (r) => (r.is_published ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>) },
      { key: "source", label: "Source", render: (r) => (r.source === "public_form" ? <Badge tone="blue">Website form</Badge> : "Admin") },
      { key: "created_at", label: "Added", sortable: true, render: (r) => formatDate(String(r.created_at)) },
    ],
    filters: [
      { key: "approval_status", label: "Approval", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] },
      { key: "is_published", label: "Public", options: BOOL },
    ],
    defaults: { approval_status: "pending", position: 0 },
    fields: [
      { name: "client_name", label: "Client name", type: "text", required: true, min: 2, max: 120 },
      { name: "company", label: "Company", type: "text", max: 120 },
      { name: "designation", label: "Designation", type: "text", max: 120 },
      { name: "project_id", label: "Associated project", type: "relation", relation: { endpoint: "/api/v1/admin/projects", labelKey: "title" } },
      { name: "content", label: "Review", type: "textarea", required: true, min: 10, max: 3000 },
      { name: "rating", label: "Star rating", type: "select", asNumber: true, options: [{ value: "", label: "No rating" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` }))] },
      { name: "testimonial_date", label: "Testimonial date", type: "date" },
      { name: "avatar_url", label: "Client photo", type: "image" },
      { name: "approval_status", label: "Approval status", type: "select", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }], section: "Moderation" },
      { name: "consent_confirmed", label: "Client consent", type: "checkbox", hint: "The client approved publishing this testimonial", section: "Moderation" },
      { name: "is_published", label: "Published", type: "checkbox", hint: "Show on the website (requires approval + consent)", section: "Moderation" },
      { name: "featured", label: "Featured", type: "checkbox", hint: "Show first", section: "Moderation" },
      { name: "position", label: "Display order", type: "number", required: true, section: "Moderation" },
    ],
  },
  {
    key: "skills",
    endpoint: "/api/v1/admin/skills",
    title: "Skills",
    singular: "skill",
    perm: "skills",
    description: "Skills grouped by category. No proficiency percentages are shown.",
    defaultSort: "position",
    columns: [
      { key: "name", label: "Skill", sortable: true, render: (r) => <span className="font-medium text-white">{String(r.name)}</span> },
      { key: "category", label: "Category", render: (r) => String((r.category as Row)?.name ?? "") },
      { key: "is_active", label: "Active", render: (r) => (r.is_active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>) },
      { key: "featured", label: "Featured", render: (r) => yes(r.featured) },
      { key: "position", label: "Order", sortable: true },
    ],
    filters: [{ key: "is_active", label: "Active", options: BOOL }],
    defaults: { is_active: true, position: 0 },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 60 },
      { name: "category_id", label: "Category", type: "relation", required: true, relation: { endpoint: "/api/v1/admin/skill-categories", labelKey: "name" } },
      { name: "icon", label: "Icon", type: "icon" },
      { name: "color", label: "Colour", type: "color" },
      { name: "note", label: "Note", type: "text", max: 200 },
      { name: "position", label: "Display order", type: "number", required: true },
      { name: "is_active", label: "Enabled", type: "checkbox", hint: "Show on the website" },
      { name: "featured", label: "Featured", type: "checkbox", hint: "Highlight this skill" },
      { name: "is_learning", label: "Currently learning", type: "checkbox", hint: "Show a “learning” tag" },
    ],
  },
  {
    key: "experiences",
    endpoint: "/api/v1/admin/experiences",
    title: "Experience",
    singular: "entry",
    perm: "experiences",
    description: "Work, education and achievements shown on the About page. Add only verified facts.",
    defaultSort: "position",
    columns: [
      { key: "title", label: "Title", sortable: true, render: (r) => <span className="font-medium text-white">{String(r.title)}</span> },
      { key: "kind", label: "Type", render: (r) => <Badge tone="blue">{String(r.kind)}</Badge> },
      { key: "organization", label: "Organisation" },
      { key: "start_date", label: "Start", sortable: true, render: (r) => formatDate(r.start_date as string) || "—" },
      { key: "is_visible", label: "Visible", render: (r) => yes(r.is_visible) },
    ],
    filters: [{ key: "kind", label: "Type", options: [{ value: "work", label: "Work" }, { value: "education", label: "Education" }, { value: "achievement", label: "Achievement" }] }],
    defaults: { kind: "work", is_visible: true, position: 0 },
    fields: [
      { name: "kind", label: "Type", type: "select", options: [{ value: "work", label: "Work" }, { value: "education", label: "Education" }, { value: "achievement", label: "Achievement" }] },
      { name: "title", label: "Title / role", type: "text", required: true, min: 2, max: 160 },
      { name: "organization", label: "Organisation", type: "text", max: 160 },
      { name: "location", label: "Location", type: "text", max: 120 },
      { name: "start_date", label: "Start date", type: "date" },
      { name: "end_date", label: "End date", type: "date" },
      { name: "is_current", label: "Current", type: "checkbox", hint: "Ongoing" },
      { name: "is_visible", label: "Visible", type: "checkbox", hint: "Show on the About page" },
      { name: "position", label: "Display order", type: "number", required: true },
      { name: "description", label: "Description", type: "markdown" },
      { name: "highlights", label: "Highlights", type: "list" },
    ],
  },
  {
    key: "blog/posts",
    endpoint: "/api/v1/admin/blog/posts",
    title: "Blog",
    singular: "article",
    perm: "blog",
    description: "Drafts stay private. Published articles with a future date are scheduled.",
    softDelete: true,
    defaultSort: "-created_at",
    publicUrl: (r) => (r.status === "published" ? `/blog/${r.slug}` : null),
    columns: [
      { key: "title", label: "Title", sortable: true, render: (r) => <span className="font-medium text-white">{String(r.title)}</span> },
      { key: "status", label: "Status", render: statusBadge },
      { key: "category", label: "Category", render: (r) => String((r.category as Row | null)?.name ?? "—") },
      { key: "published_at", label: "Publish date", sortable: true, render: (r) => formatDate(r.published_at as string) || "—" },
      { key: "reading_minutes", label: "Read", render: (r) => `${r.reading_minutes} min` },
    ],
    filters: [{ key: "status", label: "Status", options: STATUS }],
    defaults: { status: "draft" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, min: 3, max: 160, section: "Article" },
      { name: "slug", label: "Slug", type: "slug", max: 180, section: "Article" },
      { name: "excerpt", label: "Excerpt", type: "textarea", max: 400, section: "Article" },
      { name: "content", label: "Content", type: "markdown", max: 100000, section: "Article" },
      { name: "cover_url", label: "Cover image", type: "image", section: "Article" },
      { name: "category_id", label: "Category", type: "relation", relation: { endpoint: "/api/v1/admin/blog/categories", labelKey: "name" }, section: "Publishing" },
      { name: "tags", label: "Tags", type: "list", section: "Publishing", hint: "One per line, max 15." },
      { name: "status", label: "Status", type: "select", options: STATUS, section: "Publishing" },
      { name: "published_at", label: "Publish date", type: "datetime", section: "Publishing", hint: "Set a future date to schedule. Empty = now when published." },
      ...seoFields(),
      { name: "canonical_url", label: "Canonical URL", type: "url", max: 500, section: "SEO", hint: "Only if the article was first published elsewhere." },
    ],
  },
  {
    key: "homepage-sections",
    endpoint: "/api/v1/admin/homepage-sections",
    title: "Homepage",
    singular: "section",
    perm: "homepage",
    description: "Each homepage section's heading, text, order and visibility. Changes appear on the live site without a rebuild.",
    defaultSort: "position",
    publicUrl: () => "/",
    columns: [
      { key: "key", label: "Section", sortable: true, render: (r) => <code className="text-cyan">{String(r.key)}</code> },
      { key: "title", label: "Heading" },
      { key: "position", label: "Order", sortable: true },
      { key: "is_visible", label: "Visible", render: (r) => (r.is_visible ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>) },
    ],
    fields: [
      {
        name: "key",
        label: "Section",
        type: "select",
        options: ["hero", "intro", "about", "skills", "services", "projects", "testimonials", "process", "why_me", "contact_cta"].map((k) => ({ value: k, label: k })),
      },
      { name: "position", label: "Order", type: "number", required: true },
      { name: "title", label: "Heading", type: "text", max: 160, full: true },
      { name: "subtitle", label: "Subheading", type: "text", max: 300, full: true },
      { name: "body", label: "Body", type: "markdown", max: 10000 },
      { name: "is_visible", label: "Visible", type: "checkbox", hint: "Show this section" },
      {
        name: "data",
        label: "Structured content (JSON)",
        type: "json",
        hint: 'Hero: {"primary_cta":{"label","href"},"secondary_cta":{…}}. About: {"pillars":[{"icon","title","text"}]}. Process: {"steps":[{"title","text"}]}.',
      },
    ],
    defaults: { is_visible: true, position: 0, data: {} },
  },
  {
    key: "navigation",
    endpoint: "/api/v1/admin/navigation",
    title: "Navigation",
    singular: "link",
    perm: "navigation",
    description: "Header and footer links.",
    defaultSort: "position",
    columns: [
      { key: "label", label: "Label", sortable: true },
      { key: "href", label: "Link", render: (r) => <code className="text-xs text-mist">{String(r.href)}</code> },
      { key: "location", label: "Where", render: (r) => <Badge tone="blue">{String(r.location)}</Badge> },
      { key: "position", label: "Order", sortable: true },
      { key: "is_visible", label: "Visible", render: (r) => yes(r.is_visible) },
    ],
    filters: [{ key: "location", label: "Location", options: [{ value: "header", label: "Header" }, { value: "footer", label: "Footer" }] }],
    defaults: { location: "header", is_visible: true, position: 0 },
    fields: [
      { name: "label", label: "Label", type: "text", required: true, max: 60 },
      { name: "href", label: "Link", type: "link", required: true, max: 500, hint: "/path, #section, https://… or mailto:" },
      { name: "location", label: "Location", type: "select", options: [{ value: "header", label: "Header" }, { value: "footer", label: "Footer" }] },
      { name: "position", label: "Order", type: "number", required: true },
      { name: "is_visible", label: "Visible", type: "checkbox", hint: "Show this link" },
      { name: "open_in_new_tab", label: "New tab", type: "checkbox", hint: "Open in a new tab" },
    ],
  },
  {
    key: "social-links",
    endpoint: "/api/v1/admin/social-links",
    title: "Social links",
    singular: "social link",
    perm: "social",
    description: "Shown in the hero, contact page and footer.",
    defaultSort: "position",
    columns: [
      { key: "label", label: "Label", sortable: true },
      { key: "url", label: "URL", render: (r) => <code className="text-xs text-mist">{String(r.url)}</code> },
      { key: "position", label: "Order", sortable: true },
      { key: "is_visible", label: "Visible", render: (r) => yes(r.is_visible) },
    ],
    defaults: { is_visible: true, position: 0 },
    fields: [
      { name: "platform", label: "Platform", type: "text", required: true, min: 2, max: 40, placeholder: "github" },
      { name: "label", label: "Label", type: "text", required: true, max: 60 },
      { name: "url", label: "URL", type: "link", required: true, max: 500 },
      { name: "icon", label: "Icon", type: "icon" },
      { name: "position", label: "Order", type: "number", required: true },
      { name: "is_visible", label: "Visible", type: "checkbox", hint: "Show this link" },
    ],
  },
  {
    key: "seo",
    endpoint: "/api/v1/admin/seo",
    title: "SEO",
    singular: "page SEO",
    perm: "seo",
    description: "Titles and descriptions for the main pages. Projects, services and articles have their own SEO fields.",
    defaultSort: "page_key",
    columns: [
      { key: "page_key", label: "Page", sortable: true, render: (r) => <code className="text-cyan">{String(r.page_key)}</code> },
      { key: "title", label: "Title" },
      { key: "noindex", label: "Hidden from search", render: (r) => yes(r.noindex) },
    ],
    fields: [
      { name: "page_key", label: "Page", type: "select", options: ["home", "about", "services", "projects", "blog", "contact", "testimonials"].map((k) => ({ value: k, label: k })) },
      { name: "title", label: "Title", type: "text", max: 70, hint: "Up to 70 characters." },
      { name: "description", label: "Meta description", type: "text", max: 170, full: true, hint: "Up to 170 characters." },
      { name: "og_image_url", label: "Social share image", type: "image" },
      { name: "canonical_path", label: "Canonical path", type: "text", max: 300, placeholder: "/services" },
      { name: "noindex", label: "Hide from search engines", type: "checkbox", hint: "Add noindex" },
    ],
    defaults: { page_key: "home" },
  },
  {
    key: "resumes",
    endpoint: "/api/v1/admin/resumes",
    title: "Resume",
    singular: "resume",
    perm: "resume",
    description: "Upload PDFs in the media library and mark one as active. The active resume powers every Download Resume button.",
    defaultSort: "-created_at",
    columns: [
      { key: "label", label: "Label", sortable: true },
      { key: "url", label: "File", render: (r) => <a href={String(r.url)} target="_blank" rel="noreferrer" className="text-cyan hover:underline">Open</a> },
      { key: "is_active", label: "Active", render: (r) => (r.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>) },
      { key: "created_at", label: "Added", sortable: true, render: (r) => formatDate(String(r.created_at)) },
    ],
    defaults: { label: "Resume", is_active: true },
    fields: [
      { name: "label", label: "Label", type: "text", required: true, max: 120 },
      { name: "media_id", label: "PDF file", type: "media", mediaKind: "document", required: true },
      { name: "is_active", label: "Active", type: "checkbox", hint: "Use this resume on the website" },
    ],
  },
];

const categoryFields = (blurb = false): FieldDef[] => [
  { name: "name", label: "Name", type: "text", required: true, min: 2, max: 80 },
  { name: "slug", label: "Slug", type: "slug", max: 100 },
  blurb ? { name: "blurb", label: "Short description", type: "text", max: 200, full: true } : { name: "description", label: "Description", type: "text", max: 300, full: true },
  { name: "position", label: "Order", type: "number", required: true },
];

export const CATEGORY_RESOURCES: ResourceConfig[] = [
  {
    key: "project-categories",
    endpoint: "/api/v1/admin/project-categories",
    title: "Project categories",
    singular: "project category",
    perm: "projects",
    description: "Used as filters on the projects page.",
    defaultSort: "position",
    columns: [
      { key: "name", label: "Name", sortable: true },
      { key: "slug", label: "Slug" },
      { key: "position", label: "Order", sortable: true },
    ],
    fields: categoryFields(),
    defaults: { position: 0 },
  },
  {
    key: "skill-categories",
    endpoint: "/api/v1/admin/skill-categories",
    title: "Skill categories",
    singular: "skill category",
    perm: "skills",
    description: "Frontend, Backend, Database, AI / GenAI, Cloud / DevOps, Tools…",
    defaultSort: "position",
    columns: [
      { key: "name", label: "Name", sortable: true },
      { key: "blurb", label: "Description" },
      { key: "position", label: "Order", sortable: true },
    ],
    fields: categoryFields(true),
    defaults: { position: 0 },
  },
  {
    key: "blog/categories",
    endpoint: "/api/v1/admin/blog/categories",
    title: "Blog categories",
    singular: "blog category",
    perm: "blog",
    description: "Categories only show publicly once they contain a published article.",
    defaultSort: "name",
    columns: [
      { key: "name", label: "Name", sortable: true },
      { key: "slug", label: "Slug" },
    ],
    fields: categoryFields().filter((f) => f.name !== "position"),
  },
  {
    key: "blog/tags",
    endpoint: "/api/v1/admin/blog/tags",
    title: "Blog tags",
    singular: "tag",
    perm: "blog",
    description: "Tags are also created automatically when you add them to an article.",
    defaultSort: "name",
    columns: [
      { key: "name", label: "Name", sortable: true },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 60 },
      { name: "slug", label: "Slug", type: "slug", max: 80 },
    ],
  },
];

export const ALL_RESOURCES = [...RESOURCES, ...CATEGORY_RESOURCES];
