import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ErrorState, Skeleton } from "../components/States";
import type { Page } from "../lib/types";
import { Input, Select } from "./ui";

export type Column<T> = { key: string; label: string; sortable?: boolean; render?: (row: T) => ReactNode; className?: string };
export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };
export type TableState = { page: number; pageSize: number; q: string; sort: string; filters: Record<string, string> };

export function useTableState(defaultSort: string, pageSize = 20): [TableState, (patch: Partial<TableState>) => void] {
  const [state, setState] = useState<TableState>({ page: 1, pageSize, q: "", sort: defaultSort, filters: {} });
  const update = (patch: Partial<TableState>) =>
    setState((s) => ({ ...s, ...patch, page: patch.page ?? (patch.q !== undefined || patch.filters || patch.sort ? 1 : s.page) }));
  return [state, update];
}

type Props<T> = {
  columns: Column<T>[];
  data?: Page<T>;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  state: TableState;
  onChange: (patch: Partial<TableState>) => void;
  filters?: FilterDef[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  emptyText?: string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
};

export default function DataTable<T>({ columns, data, loading, error, onRetry, state, onChange, filters = [], rowKey, onRowClick, actions, emptyText = "Nothing here yet.", searchPlaceholder = "Search…", toolbar }: Props<T>) {
  const [q, setQ] = useState(state.q);
  useEffect(() => {
    const id = setTimeout(() => q !== state.q && onChange({ q }), 300);
    return () => clearTimeout(id);
  }, [q, state.q, onChange]);
  const pages = data ? Math.max(1, Math.ceil(data.total / state.pageSize)) : 1;
  const sortName = state.sort.replace(/^-/, "");
  const desc = state.sort.startsWith("-");

  return (
    <div className="rounded-2xl border border-border bg-surface/70">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" aria-hidden />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="pl-9" />
        </label>
        {filters.map((f) => (
          <label key={f.key} className="min-w-[150px]">
            <span className="sr-only">{f.label}</span>
            <Select value={state.filters[f.key] ?? ""} onChange={(e) => onChange({ filters: { ...state.filters, [f.key]: e.target.value } })}>
              <option value="">{f.label}: all</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
        {toolbar}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-mist">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 font-medium ${c.className ?? ""}`} aria-sort={sortName === c.key ? (desc ? "descending" : "ascending") : undefined}>
                  {c.sortable ? (
                    <button type="button" onClick={() => onChange({ sort: sortName === c.key && !desc ? `-${c.key}` : c.key })} className="inline-flex items-center gap-1 hover:text-white">
                      {c.label}
                      {sortName === c.key ? desc ? <ArrowDown size={12} /> : <ArrowUp size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-border/60">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[180px]" />
                    </td>
                  ))}
                  {actions && <td />}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="p-6">
                  <ErrorState error={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-sm text-mist">
                  {state.q || Object.values(state.filters).some(Boolean) ? "No results match your search or filters." : emptyText}
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-border/60 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle text-white/90 ${c.className ?? ""}`}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-mist">
        <span>{data ? `${data.total} item${data.total === 1 ? "" : "s"}` : " "}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            Rows
            <Select value={state.pageSize} onChange={(e) => onChange({ pageSize: Number(e.target.value), page: 1 })} className="w-auto py-1">
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
          <button type="button" aria-label="Previous page" disabled={state.page <= 1} onClick={() => onChange({ page: state.page - 1 })} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span>
            {state.page} / {pages}
          </span>
          <button type="button" aria-label="Next page" disabled={state.page >= pages} onClick={() => onChange({ page: state.page + 1 })} className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
