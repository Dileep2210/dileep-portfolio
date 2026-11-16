import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Markdown from "../components/Markdown";
import ContactForm from "../components/ContactForm";
import { toFormValues, toPayload, type FieldDef } from "../admin/ResourceForm";
import { mockFetch } from "./utils";

describe("Markdown", () => {
  it("never renders raw HTML or javascript: links", () => {
    const { container } = render(
      <MemoryRouter>
        <Markdown>{'Hello <script>alert(1)</script><img src=x onerror="alert(1)"> [click](javascript:alert(1)) [ok](https://example.com)'}</Markdown>
      </MemoryRouter>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[onerror]")).toBeNull();
    const links = Array.from(container.querySelectorAll("a"));
    expect(links.some((a) => a.getAttribute("href")?.startsWith("javascript"))).toBe(false);
    const ext = links.find((a) => a.getAttribute("href") === "https://example.com")!;
    expect(ext.getAttribute("rel")).toContain("noopener");
  });
});

describe("ContactForm", () => {
  const services = [{ id: "s1", slug: "rag-application-development", title: "RAG Application Development" }] as never[];

  it("shows validation errors and does not submit invalid data", async () => {
    const calls = mockFetch({});
    render(<ContactForm services={services} budgets={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("submits a valid enquiry with the preselected service", async () => {
    const calls = mockFetch({ "POST /api/v1/public/contact": { status: 201, body: { ok: true } } });
    render(<ContactForm services={services} budgets={["Not sure yet"]} defaultServiceSlug="rag-application-development" />);
    await userEvent.type(screen.getByLabelText(/^name/i), "Jane Doe");
    await userEvent.type(screen.getByRole("textbox", { name: /^email/i }), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/project description/i), "I need a RAG chatbot for our docs.");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText(/message sent/i)).toBeInTheDocument();
    expect(calls[0].body).toMatchObject({ name: "Jane Doe", email: "jane@example.com", service_id: "s1", preferred_contact: "email", website: "" });
    expect(typeof (calls[0].body as { elapsed_ms: number }).elapsed_ms).toBe("number");
  });

  it("keeps what the visitor typed when sending fails", async () => {
    mockFetch({ "POST /api/v1/public/contact": { status: 429, body: { error: { code: "rate_limited", message: "Too many" } } } });
    render(<ContactForm services={[]} budgets={[]} />);
    await userEvent.type(screen.getByLabelText(/^name/i), "Jane Doe");
    await userEvent.type(screen.getByRole("textbox", { name: /^email/i }), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/project description/i), "Long enough message here.");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wait a minute/i);
    expect(screen.getByLabelText(/project description/i)).toHaveValue("Long enough message here.");
  });
});

describe("ResourceForm conversions", () => {
  const fields: FieldDef[] = [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "technologies", label: "Tech", type: "list" },
    { name: "category_id", label: "Category", type: "relation", relation: { endpoint: "/x", labelKey: "name" } },
    { name: "position", label: "Order", type: "number", required: true },
    { name: "starting_price", label: "Price", type: "money" },
    { name: "rating", label: "Rating", type: "select", asNumber: true },
    { name: "data", label: "Data", type: "json" },
    { name: "featured", label: "Featured", type: "checkbox" },
  ];

  it("round-trips API records to form values and back", () => {
    const values = toFormValues(fields, { title: "A", technologies: ["React", "FastAPI"], category_id: null, position: 3, starting_price: null, rating: 5, data: { a: 1 }, featured: true });
    expect(values.technologies).toBe("React\nFastAPI");
    const payload = toPayload(fields, { ...values, technologies: "React\n\n FastAPI \n" });
    expect(payload).toEqual({ title: "A", technologies: ["React", "FastAPI"], category_id: null, position: 3, starting_price: null, rating: 5, data: { a: 1 }, featured: true });
    expect(toPayload(fields, { ...values, rating: "" }).rating).toBeNull();
  });
});

describe("validation rendering", () => {
  it("flags invalid URLs in admin forms", async () => {
    const { default: ResourceForm } = await import("../admin/ResourceForm");
    let submitted = false;
    render(
      <MemoryRouter>
        <ResourceForm fields={[{ name: "live_url", label: "Live URL", type: "url" }]} submitLabel="Save" onSubmit={async () => void (submitted = true)} />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText("Live URL"), "javascript:alert(1)");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/https:\/\//));
    expect(submitted).toBe(false);
  });
});
