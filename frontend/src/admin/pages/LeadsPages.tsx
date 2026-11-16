import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Mail, Phone, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { ErrorState, Skeleton } from "../../components/States";
import { api, errorMessage } from "../../lib/api";
import { formatDate, formatDateTime } from "../../lib/format";
import type { Page } from "../../lib/types";
import { useAuth } from "../auth";
import DataTable, { useTableState } from "../DataTable";
import { Badge, Button, Card, Field, Input, PageTitle, Select, Textarea, useUi } from "../ui";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  service_label: string;
  budget: string;
  message: string;
  preferred_contact: string;
  status: string;
  follow_up_at: string | null;
  source: string;
  created_at: string;
  notes?: { id: string; body: string; author_email: string; created_at: string }[];
};

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_discussion", label: "In discussion" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];
const TONE: Record<string, "amber" | "blue" | "violet" | "green" | "gray"> = { new: "amber", contacted: "blue", in_discussion: "violet", converted: "green", closed: "gray" };
const statusLabel = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;

export function LeadsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { toast, withReauth } = useUi();
  const [state, update] = useTableState("-created_at");
  const [exporting, setExporting] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "leads", state],
    queryFn: () => api<Page<Lead>>("/api/v1/admin/leads", { query: { page: state.page, page_size: state.pageSize, q: state.q, sort: state.sort, ...state.filters } }),
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await withReauth(() => api<Blob>("/api/v1/admin/leads/export.csv", { query: { status: state.filters.status, q: state.q }, raw: true }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "Export downloaded. It contains personal data — store it securely.");
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageTitle
        title="Contact leads"
        description="Enquiries from the contact form. This is personal data — it is never shown on the public site."
        actions={
          can("leads:export") && (
            <Button onClick={exportCsv} loading={exporting}>
              <Download size={15} aria-hidden /> Export CSV
            </Button>
          )
        }
      />
      <DataTable<Lead>
        columns={[
          { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-medium text-white">{r.name}</span> },
          { key: "email", label: "Email" },
          { key: "service_label", label: "Service", render: (r) => r.service_label || "—" },
          { key: "status", label: "Status", sortable: true, render: (r) => <Badge tone={TONE[r.status]}>{statusLabel(r.status)}</Badge> },
          { key: "follow_up_at", label: "Follow up", sortable: true, render: (r) => formatDate(r.follow_up_at) || "—" },
          { key: "created_at", label: "Received", sortable: true, render: (r) => formatDate(r.created_at) },
        ]}
        data={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onChange={update}
        filters={[{ key: "status", label: "Status", options: STATUSES }]}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/admin/leads/${r.id}`)}
        emptyText="No enquiries yet. They appear here when someone uses the contact form."
        searchPlaceholder="Search name, email, company, message…"
      />
    </div>
  );
}

export function LeadDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { toast, confirm } = useUi();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: lead, isLoading, error, refetch } = useQuery({ queryKey: ["admin", "leads", "item", id], queryFn: () => api<Lead>(`/api/v1/admin/leads/${id}`) });
  const canWrite = can("leads:write");

  const patch = async (body: Partial<Lead>) => {
    try {
      const updated = await api<Lead>(`/api/v1/admin/leads/${id}`, { method: "PATCH", body });
      qc.setQueryData(["admin", "leads", "item", id], updated);
      await qc.invalidateQueries({ queryKey: ["admin", "leads"], exact: false });
      toast("success", "Enquiry updated.");
    } catch (err) {
      toast("error", errorMessage(err));
    }
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !lead) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <Link to="/admin/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-mist hover:text-white">
        <ArrowLeft size={14} aria-hidden /> All leads
      </Link>
      <PageTitle
        title={lead.name}
        description={`Received ${formatDateTime(lead.created_at)} via ${lead.source.replace("_", " ")}`}
        actions={
          can("leads:delete") && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!(await confirm({ title: "Delete enquiry?", message: "It will be removed from the list.", confirmLabel: "Delete", danger: true }))) return;
                try {
                  await api(`/api/v1/admin/leads/${id}`, { method: "DELETE" });
                  toast("success", "Enquiry deleted.");
                  await qc.invalidateQueries({ queryKey: ["admin", "leads"] });
                  navigate("/admin/leads");
                } catch (err) {
                  toast("error", errorMessage(err));
                }
              }}
            >
              <Trash2 size={15} aria-hidden /> Delete
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Enquiry">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-mist">Email</dt><dd><a className="text-cyan hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
            <div><dt className="text-xs text-mist">Phone</dt><dd className="text-white">{lead.phone || "—"}</dd></div>
            <div><dt className="text-xs text-mist">Company</dt><dd className="text-white">{lead.company || "—"}</dd></div>
            <div><dt className="text-xs text-mist">Service</dt><dd className="text-white">{lead.service_label || "—"}</dd></div>
            <div><dt className="text-xs text-mist">Budget</dt><dd className="text-white">{lead.budget || "—"}</dd></div>
            <div><dt className="text-xs text-mist">Prefers</dt><dd className="text-white">{lead.preferred_contact}</dd></div>
          </dl>
          <h3 className="mt-5 text-xs uppercase tracking-wider text-mist">Message</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{lead.message}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-white hover:bg-white/5">
              <Mail size={14} aria-hidden /> Reply by email
            </a>
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-white hover:bg-white/5">
                <Phone size={14} aria-hidden /> Call
              </a>
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Pipeline">
            <div className="space-y-4">
              <Field label="Status" htmlFor="lead-status">
                <Select id="lead-status" value={lead.status} disabled={!canWrite} onChange={(e) => patch({ status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Follow-up date" htmlFor="lead-follow">
                <Input id="lead-follow" type="date" disabled={!canWrite} value={lead.follow_up_at ?? ""} onChange={(e) => patch({ follow_up_at: e.target.value || null })} />
              </Field>
            </div>
          </Card>
          <Card title="Internal notes">
            {canWrite && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  setSaving(true);
                  try {
                    await api(`/api/v1/admin/leads/${id}/notes`, { method: "POST", body: { body: note } });
                    setNote("");
                    await refetch();
                  } catch (err) {
                    toast("error", errorMessage(err));
                  } finally {
                    setSaving(false);
                  }
                }}
                className="space-y-2"
              >
                <Textarea aria-label="New note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note…" maxLength={5000} />
                <Button type="submit" size="sm" variant="primary" loading={saving} disabled={!note.trim()}>
                  Add note
                </Button>
              </form>
            )}
            <ul className="mt-4 space-y-3">
              {lead.notes?.length ? (
                lead.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-border p-3">
                    <p className="whitespace-pre-wrap text-sm text-white/90">{n.body}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-mist">
                      <span>{n.author_email} · {formatDateTime(n.created_at)}</span>
                      {canWrite && (
                        <button
                          type="button"
                          aria-label="Delete note"
                          className="hover:text-red-300"
                          onClick={async () => {
                            if (!(await confirm({ title: "Delete note?", message: "This cannot be undone.", danger: true, confirmLabel: "Delete" }))) return;
                            try {
                              await api(`/api/v1/admin/leads/${id}/notes/${n.id}`, { method: "DELETE" });
                              await refetch();
                            } catch (err) {
                              toast("error", errorMessage(err));
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-mist">No notes yet.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
