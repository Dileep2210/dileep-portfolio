import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { ErrorState, Skeleton } from "../components/States";
import { ApiError, api, errorMessage } from "../lib/api";
import type { Page } from "../lib/types";
import { useAuth } from "./auth";
import DataTable, { useTableState } from "./DataTable";
import ResourceForm from "./ResourceForm";
import type { ResourceConfig } from "./resources";
import { Button, PageTitle, Select, useUi } from "./ui";

type Row = Record<string, unknown>;

export function ResourceListPage({ config, embedded = false }: { config: ResourceConfig; embedded?: boolean }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, confirm } = useUi();
  const [state, update] = useTableState(config.defaultSort);
  const [showDeleted, setShowDeleted] = useState(false);
  const query = useQuery({
    queryKey: ["admin", config.key, state, showDeleted],
    queryFn: () =>
      api<Page<Row>>(config.endpoint, {
        query: { page: state.page, page_size: state.pageSize, q: state.q, sort: state.sort, include_deleted: showDeleted || undefined, ...state.filters },
      }),
    placeholderData: keepPreviousData,
  });
  const canWrite = can(`${config.perm}:write`);
  const canDelete = can(`${config.perm}:delete`);

  const remove = async (row: Row) => {
    const label = String(row.title ?? row.name ?? row.label ?? row.client_name ?? row.key ?? row.page_key ?? "this item");
    const ok = await confirm({
      title: `Delete ${config.singular}?`,
      message: config.softDelete ? `“${label}” will be removed from the site. You can restore it later.` : `“${label}” will be permanently deleted.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`${config.endpoint}/${row.id}`, { method: "DELETE" });
      toast("success", `Deleted “${label}”.`);
      await qc.invalidateQueries({ queryKey: ["admin", config.key] });
    } catch (err) {
      toast("error", errorMessage(err));
    }
  };

  const restore = async (row: Row) => {
    try {
      await api(`${config.endpoint}/${row.id}/restore`, { method: "POST" });
      toast("success", "Restored.");
      await qc.invalidateQueries({ queryKey: ["admin", config.key] });
    } catch (err) {
      toast("error", errorMessage(err));
    }
  };

  return (
    <div>
      {!embedded && (
        <PageTitle
          title={config.title}
          description={config.description}
          actions={
            canWrite && (
              <Button variant="primary" onClick={() => navigate(`/admin/${config.key}/new`)}>
                <Plus size={15} aria-hidden /> New {config.singular}
              </Button>
            )
          }
        />
      )}
      {embedded && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-mist">{config.description}</p>
          {canWrite && (
            <Button variant="primary" size="sm" onClick={() => navigate(`/admin/${config.key}/new`)}>
              <Plus size={14} aria-hidden /> New {config.singular}
            </Button>
          )}
        </div>
      )}
      <DataTable<Row>
        columns={config.columns}
        data={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onChange={update}
        filters={config.filters}
        rowKey={(r) => String(r.id)}
        onRowClick={(r) => navigate(`/admin/${config.key}/${r.id}`)}
        emptyText={`No ${config.title.toLowerCase()} yet.`}
        searchPlaceholder={config.searchPlaceholder ?? `Search ${config.title.toLowerCase()}…`}
        toolbar={
          config.softDelete && canDelete ? (
            <label className="flex items-center gap-2 text-xs text-mist">
              <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="accent-cyan-400" />
              Show deleted
            </label>
          ) : undefined
        }
        actions={(row) => (
          <>
            {config.publicUrl?.(row) && !row.deleted_at && (
              <a href={config.publicUrl(row)!} target="_blank" rel="noreferrer" aria-label="View on site" className="rounded-lg p-1.5 text-mist hover:bg-white/10 hover:text-white">
                <ExternalLink size={15} />
              </a>
            )}
            <button type="button" aria-label="Edit" onClick={() => navigate(`/admin/${config.key}/${row.id}`)} className="rounded-lg p-1.5 text-mist hover:bg-white/10 hover:text-white">
              <Pencil size={15} />
            </button>
            {canDelete &&
              (row.deleted_at ? (
                <button type="button" aria-label="Restore" onClick={() => restore(row)} className="rounded-lg p-1.5 text-mist hover:bg-white/10 hover:text-white">
                  <RotateCcw size={15} />
                </button>
              ) : (
                <button type="button" aria-label="Delete" onClick={() => remove(row)} className="rounded-lg p-1.5 text-mist hover:bg-red-500/20 hover:text-red-300">
                  <Trash2 size={15} />
                </button>
              ))}
          </>
        )}
      />
    </div>
  );
}

function serverFieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof ApiError && err.details) {
    for (const d of err.details) {
      const key = d.field.split(".")[0];
      if (key && !out[key]) out[key] = d.message.replace(/^Value error, /, "");
    }
  }
  return out;
}

export function ResourceEditPage({ config }: { config: ResourceConfig }) {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useUi();
  const { can } = useAuth();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formKey, setFormKey] = useState(0);
  const record = useQuery({
    queryKey: ["admin", config.key, "item", id],
    queryFn: () => api<Row>(`${config.endpoint}/${id}`),
    enabled: !isNew,
  });
  const canWrite = can(`${config.perm}:write`);

  const submit = async (payload: Row) => {
    setFieldErrors({});
    try {
      const saved = await api<Row>(isNew ? config.endpoint : `${config.endpoint}/${id}`, { method: isNew ? "POST" : "PATCH", body: payload });
      toast("success", `${config.singular[0].toUpperCase()}${config.singular.slice(1)} saved.`);
      await qc.invalidateQueries({ queryKey: ["admin", config.key] });
      qc.setQueryData(["admin", config.key, "item", String(saved.id)], saved);
      if (isNew) navigate(`/admin/${config.key}/${saved.id}`, { replace: true });
      else setFormKey((k) => k + 1); // reset dirty state to the saved values
    } catch (err) {
      setFieldErrors(serverFieldErrors(err));
      toast("error", errorMessage(err));
    }
  };

  const publicUrl = record.data ? config.publicUrl?.(record.data) : null;
  return (
    <div>
      <Link to={`/admin/${config.key}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-mist hover:text-white">
        <ArrowLeft size={14} aria-hidden /> {config.title}
      </Link>
      <PageTitle
        title={isNew ? `New ${config.singular}` : String(record.data?.title ?? record.data?.name ?? record.data?.label ?? record.data?.client_name ?? record.data?.key ?? record.data?.page_key ?? `Edit ${config.singular}`)}
        actions={
          publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-white hover:bg-white/5">
              View on site <ExternalLink size={14} aria-hidden />
            </a>
          ) : undefined
        }
      />
      {!canWrite && <p className="mb-4 rounded-xl border border-border bg-white/[0.03] p-3 text-sm text-mist">You have read-only access. Changes cannot be saved.</p>}
      {!isNew && record.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !isNew && record.error ? (
        <ErrorState error={record.error} onRetry={() => record.refetch()} />
      ) : (
        <ResourceForm
          key={`${id}-${formKey}`}
          fields={config.fields}
          initial={isNew ? undefined : record.data}
          defaults={config.defaults}
          submitLabel={isNew ? `Create ${config.singular}` : "Save changes"}
          onSubmit={submit}
          serverErrors={fieldErrors}
        />
      )}
    </div>
  );
}

/** Tabs that group the four category-like resources under one sidebar entry. */
export function CategoriesPage({ configs }: { configs: ResourceConfig[] }) {
  const { can } = useAuth();
  const visible = configs.filter((c) => can(`${c.perm}:read`));
  const [active, setActive] = useState(visible[0]?.key);
  const current = visible.find((c) => c.key === active) ?? visible[0];
  if (!current) return <p className="text-sm text-mist">No categories available for your role.</p>;
  return (
    <div>
      <PageTitle title="Categories" description="Project, skill and blog categories, and blog tags." />
      <div className="mb-4 hidden gap-1 rounded-xl border border-border bg-surface/70 p-1 sm:inline-flex" role="tablist">
        {visible.map((c) => (
          <button key={c.key} type="button" role="tab" aria-selected={c.key === current.key} onClick={() => setActive(c.key)} className={`rounded-lg px-3 py-1.5 text-sm ${c.key === current.key ? "bg-white/10 text-white" : "text-mist hover:text-white"}`}>
            {c.title}
          </button>
        ))}
      </div>
      <Select aria-label="Category type" className="mb-4 sm:hidden" value={current.key} onChange={(e) => setActive(e.target.value)}>
        {visible.map((c) => (
          <option key={c.key} value={c.key}>
            {c.title}
          </option>
        ))}
      </Select>
      <ResourceListPage key={current.key} config={current} embedded />
    </div>
  );
}
