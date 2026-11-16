import { useMemo, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Trash2 } from "lucide-react";
import Markdown from "../components/Markdown";
import { api } from "../lib/api";
import { ICON_KEYS, iconFor } from "../lib/icons";
import type { Page } from "../lib/types";
import MediaPicker, { type MediaAsset } from "./MediaPicker";
import { Button, Field, Input, Select, Textarea } from "./ui";

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "money"
  | "checkbox"
  | "select"
  | "relation"
  | "list"
  | "date"
  | "datetime"
  | "url"
  | "link"
  | "image"
  | "media"
  | "gallery"
  | "icon"
  | "color"
  | "json"
  | "slug";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  relation?: { endpoint: string; labelKey: string };
  mediaKind?: "image" | "document";
  /** select only: send the value as a number ("" → null). */
  asNumber?: boolean;
  full?: boolean;
  section?: string;
};

type Values = Record<string, unknown>;

const isHttps = (v: string) => /^https:\/\/[^\s]+$/.test(v);
const isSitePath = (v: string) => v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v);

function zodFor(f: FieldDef): z.ZodTypeAny {
  const max = f.max ?? 20000;
  switch (f.type) {
    case "checkbox":
      return z.boolean();
    case "gallery":
      return z.array(z.object({ media_id: z.string(), url: z.string(), caption: z.string().max(200) })).max(30);
    case "number":
    case "money":
      return z
        .string()
        .refine((v) => (f.required ? v !== "" : true), "Required.")
        .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= (f.min ?? 0)), `Enter a number${f.min !== undefined ? ` ≥ ${f.min}` : ""}.`);
    case "json":
      return z.string().refine((v) => {
        if (!v.trim()) return true;
        try {
          const parsed = JSON.parse(v);
          return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
        } catch {
          return false;
        }
      }, "Must be a valid JSON object.");
    case "list":
      return z.string().refine((v) => v.split("\n").filter((x) => x.trim()).length <= 30, "At most 30 lines.");
    default: {
      let s = z.string().max(max, `At most ${max} characters.`);
      if (f.required) s = s.min(Math.max(1, f.min ?? 1), f.min && f.min > 1 ? `At least ${f.min} characters.` : "Required.");
      let out: z.ZodTypeAny = s;
      if (f.type === "url") out = s.refine((v) => !v || isHttps(v), "Must start with https://");
      if (f.type === "image") out = s.refine((v) => !v || isHttps(v) || isSitePath(v), "Use an https:// URL or choose from the media library.");
      if (f.type === "link") out = s.refine((v) => !v || isHttps(v) || isSitePath(v) || /^#[A-Za-z][\w-]*$/.test(v) || /^mailto:[^\s@]+@[^\s@]+$/.test(v), "Use https://…, /path, #section or mailto:");
      if (f.type === "slug") out = s.refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Lowercase letters, numbers and hyphens only.");
      if (f.type === "color") out = s.refine((v) => !v || /^#[0-9A-Fa-f]{3,8}$/.test(v), "Use a hex colour like #22d3ee.");
      return out;
    }
  }
}

/** API record → form values. */
export function toFormValues(fields: FieldDef[], record: Values | undefined, defaults: Values = {}): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = record?.[f.name] ?? defaults[f.name];
    switch (f.type) {
      case "checkbox":
        out[f.name] = Boolean(v);
        break;
      case "list":
        out[f.name] = Array.isArray(v) ? (v as string[]).join("\n") : "";
        break;
      case "json":
        out[f.name] = v && typeof v === "object" ? JSON.stringify(v, null, 2) : "{}";
        break;
      case "gallery":
        out[f.name] = Array.isArray(v) ? (v as { media_id: string; url: string; caption?: string }[]).map((g) => ({ media_id: g.media_id, url: g.url, caption: g.caption ?? "" })) : [];
        break;
      case "datetime":
        out[f.name] = typeof v === "string" && v ? toLocalInput(v) : "";
        break;
      case "number":
      case "money":
        out[f.name] = v === null || v === undefined ? "" : String(v);
        break;
      default:
        out[f.name] = v === null || v === undefined ? "" : String(v);
    }
  }
  return out;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Form values → API payload. */
export function toPayload(fields: FieldDef[], values: Values): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = values[f.name];
    switch (f.type) {
      case "list":
        out[f.name] = String(v ?? "")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        break;
      case "json":
        out[f.name] = String(v ?? "").trim() ? JSON.parse(String(v)) : {};
        break;
      case "gallery":
        out[f.name] = ((v as { media_id: string; caption: string }[]) ?? []).map((g) => ({ media_id: g.media_id, caption: g.caption }));
        break;
      case "number":
        out[f.name] = v === "" ? (f.required ? 0 : null) : Number(v);
        break;
      case "money":
        out[f.name] = v === "" ? null : String(v);
        break;
      case "relation":
      case "date":
      case "media":
        out[f.name] = v === "" ? null : v;
        break;
      case "select":
        out[f.name] = f.asNumber ? (v === "" ? null : Number(v)) : v;
        break;
      case "datetime":
        out[f.name] = v ? new Date(String(v)).toISOString() : null;
        break;
      default:
        out[f.name] = v;
    }
  }
  return out;
}

function RelationSelect({ field, value, onChange, id }: { field: FieldDef; value: string; onChange: (v: string) => void; id: string }) {
  const { data } = useQuery({
    queryKey: ["admin", "relation", field.relation!.endpoint],
    queryFn: () => api<Page<Values>>(field.relation!.endpoint, { query: { page_size: 100 } }),
  });
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{field.required ? "Choose…" : "None"}</option>
      {data?.items.map((item) => (
        <option key={String(item.id)} value={String(item.id)}>
          {String(item[field.relation!.labelKey] ?? item.id)}
        </option>
      ))}
    </Select>
  );
}

function ImageField({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white/5">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={18} className="text-mist" aria-hidden />}
      </div>
      <div className="flex-1 space-y-2">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or /images/…" aria-invalid={invalid || undefined} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            Choose from library
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={() => onChange("")}>
              Clear
            </Button>
          )}
        </div>
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(m) => {
          onChange(m.url);
          setOpen(false);
        }}
      />
    </div>
  );
}

function MediaIdField({ value, onChange, kind }: { value: string; onChange: (v: string) => void; kind: "image" | "document" }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<MediaAsset | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-white/90">
        <FileText size={14} aria-hidden /> {picked?.original_filename ?? (value ? "Selected file" : "No file selected")}
      </span>
      <Button size="sm" onClick={() => setOpen(true)}>
        {value ? "Change" : "Choose"} file
      </Button>
      <MediaPicker
        kind={kind}
        open={open}
        onClose={() => setOpen(false)}
        onPick={(m) => {
          setPicked(m);
          onChange(m.id);
          setOpen(false);
        }}
      />
    </div>
  );
}

type GalleryItem = { media_id: string; url: string; caption: string };

function GalleryField({ value, onChange }: { value: GalleryItem[]; onChange: (v: GalleryItem[]) => void }) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((g, i) => (
        <div key={`${g.media_id}-${i}`} className="flex items-center gap-3 rounded-lg border border-border p-2">
          <img src={g.url} alt="" className="h-12 w-20 rounded object-cover" />
          <Input aria-label={`Caption for image ${i + 1}`} value={g.caption} placeholder="Caption" maxLength={200} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
          <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
            <ArrowUp size={14} />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
            <ArrowDown size={14} />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Remove image" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button size="sm" onClick={() => setOpen(true)} disabled={value.length >= 30}>
        <ImagePlus size={14} aria-hidden /> Add screenshot
      </Button>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onPick={(m) => {
          onChange([...value, { media_id: m.id, url: m.url, caption: m.alt_text }]);
          setOpen(false);
        }}
      />
    </div>
  );
}

function MarkdownField({ id, value, onChange, invalid, rows = 10 }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; rows?: number }) {
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex gap-1 text-xs" role="tablist">
        <button type="button" role="tab" aria-selected={!preview} onClick={() => setPreview(false)} className={`rounded px-2 py-1 ${!preview ? "bg-white/10 text-white" : "text-mist"}`}>
          Write
        </button>
        <button type="button" role="tab" aria-selected={preview} onClick={() => setPreview(true)} className={`rounded px-2 py-1 ${preview ? "bg-white/10 text-white" : "text-mist"}`}>
          Preview
        </button>
        <span className="ml-auto text-mist">Markdown supported · HTML is not rendered</span>
      </div>
      {preview ? (
        <div className="min-h-[120px] rounded-lg border border-border p-3">{value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-mist">Nothing to preview.</p>}</div>
      ) : (
        <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} className="font-mono text-[13px]" />
      )}
    </div>
  );
}

function renderInput(f: FieldDef, control: Control<Values>, error?: string) {
  const id = `f-${f.name}`;
  return (
    <Controller
      name={f.name}
      control={control}
      render={({ field }) => {
        const v = field.value as never;
        const set = field.onChange;
        const invalid = Boolean(error);
        switch (f.type) {
          case "checkbox":
            return (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white/90">
                <input id={id} type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
                {f.hint ?? "Yes"}
              </label>
            );
          case "textarea":
          case "list":
            return <Textarea id={id} rows={f.type === "list" ? 5 : 4} value={v ?? ""} onChange={(e) => set(e.target.value)} placeholder={f.type === "list" ? "One item per line" : f.placeholder} aria-invalid={invalid || undefined} />;
          case "json":
            return <Textarea id={id} rows={10} value={v ?? ""} onChange={(e) => set(e.target.value)} aria-invalid={invalid || undefined} className="font-mono text-[12px]" />;
          case "markdown":
            return <MarkdownField id={id} value={v ?? ""} onChange={set} invalid={invalid} />;
          case "select":
            return (
              <Select id={id} value={v ?? ""} onChange={(e) => set(e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            );
          case "relation":
            return <RelationSelect id={id} field={f} value={v ?? ""} onChange={set} />;
          case "icon": {
            const Icon = iconFor(v);
            return (
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-cyan">
                  <Icon size={18} aria-hidden />
                </span>
                <Select id={id} value={v ?? ""} onChange={(e) => set(e.target.value)}>
                  <option value="">Default</option>
                  {ICON_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </div>
            );
          }
          case "color":
            return (
              <div className="flex items-center gap-2">
                <input type="color" aria-label={`${f.label} picker`} value={/^#[0-9a-fA-F]{6}$/.test(v ?? "") ? v : "#22d3ee"} onChange={(e) => set(e.target.value)} className="h-9 w-12 rounded border border-border bg-transparent" />
                <Input id={id} value={v ?? ""} onChange={(e) => set(e.target.value)} placeholder="#22d3ee" aria-invalid={invalid || undefined} />
              </div>
            );
          case "image":
            return <ImageField id={id} value={v ?? ""} onChange={set} invalid={invalid} />;
          case "media":
            return <MediaIdField value={v ?? ""} onChange={set} kind={f.mediaKind ?? "document"} />;
          case "gallery":
            return <GalleryField value={(v as GalleryItem[]) ?? []} onChange={set} />;
          case "date":
            return <Input id={id} type="date" value={v ?? ""} onChange={(e) => set(e.target.value)} aria-invalid={invalid || undefined} />;
          case "datetime":
            return <Input id={id} type="datetime-local" value={v ?? ""} onChange={(e) => set(e.target.value)} aria-invalid={invalid || undefined} />;
          case "number":
          case "money":
            return <Input id={id} inputMode="decimal" value={v ?? ""} onChange={(e) => set(e.target.value)} aria-invalid={invalid || undefined} placeholder={f.placeholder} />;
          default:
            return <Input id={id} value={v ?? ""} onChange={(e) => set(e.target.value)} maxLength={f.max} placeholder={f.placeholder} aria-invalid={invalid || undefined} />;
        }
      }}
    />
  );
}

type Props = {
  fields: FieldDef[];
  initial?: Values;
  defaults?: Values;
  submitLabel: string;
  onSubmit: (payload: Values) => Promise<void>;
  serverErrors?: Record<string, string>;
  extraActions?: React.ReactNode;
};

export default function ResourceForm({ fields, initial, defaults, submitLabel, onSubmit, serverErrors = {}, extraActions }: Props) {
  const schema = useMemo(() => z.object(Object.fromEntries(fields.map((f) => [f.name, zodFor(f)]))), [fields]);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toFormValues(fields, initial, defaults) });

  const sections = Array.from(new Set(fields.map((f) => f.section ?? "")));
  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(toPayload(fields, values)))} className="space-y-6">
      {sections.map((section) => (
        <fieldset key={section || "main"} className="rounded-2xl border border-border bg-surface/70 p-5">
          {section && <legend className="px-1 font-display text-sm font-semibold text-white">{section}</legend>}
          <div className="grid gap-4 md:grid-cols-2">
            {fields
              .filter((f) => (f.section ?? "") === section)
              .map((f) => {
                const err = (errors[f.name]?.message as string | undefined) ?? serverErrors[f.name];
                const wide = f.full || ["markdown", "textarea", "list", "json", "gallery", "image"].includes(f.type);
                return (
                  <Field key={f.name} label={f.label} htmlFor={`f-${f.name}`} required={f.required} error={err} hint={f.type === "checkbox" ? undefined : f.hint} className={wide ? "md:col-span-2" : ""}>
                    {renderInput(f, control, err)}
                  </Field>
                );
              })}
          </div>
        </fieldset>
      ))}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-ink/90 px-4 py-3 backdrop-blur">
        {isDirty && <span className="mr-auto text-xs text-amber-200">Unsaved changes</span>}
        {extraActions}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
