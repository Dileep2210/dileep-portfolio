import { useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, Trash2, Upload } from "lucide-react";
import { ErrorState, Skeleton } from "../../components/States";
import { api, errorMessage } from "../../lib/api";
import { formatBytes, formatDate } from "../../lib/format";
import type { Page } from "../../lib/types";
import { useAuth } from "../auth";
import { ACCEPT, uploadMedia, type MediaAsset } from "../MediaPicker";
import { Button, Dialog, Field, Input, PageTitle, Select, useUi } from "../ui";

export default function MediaPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { toast, confirm } = useUi();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey: ["admin", "media", q, kind, page],
    queryFn: () => api<Page<MediaAsset>>("/api/v1/admin/media", { query: { q, kind, page, page_size: 24 } }),
    placeholderData: keepPreviousData,
  });
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / 24)) : 1;

  const upload = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        await uploadMedia(file);
        ok += 1;
      } catch (err) {
        toast("error", `${file.name}: ${errorMessage(err)}`);
      }
    }
    if (ok) toast("success", `Uploaded ${ok} file${ok === 1 ? "" : "s"}.`);
    await qc.invalidateQueries({ queryKey: ["admin", "media"] });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <PageTitle
        title="Media library"
        description="Images (JPEG, PNG, WebP, GIF up to 5 MB) and PDFs (up to 10 MB). Files are checked, re-encoded and stored under random names."
        actions={
          can("media:write") && (
            <>
              <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} aria-label="Upload files" />
              <Button variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}>
                <Upload size={15} aria-hidden /> Upload
              </Button>
            </>
          )
        }
      />
      {can("media:write") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void upload(e.dataTransfer.files);
          }}
          className={`mb-4 rounded-2xl border-2 border-dashed p-6 text-center text-sm transition ${dragOver ? "border-cyan bg-cyan/5 text-white" : "border-border text-mist"}`}
        >
          Drag and drop files here to upload
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input type="search" aria-label="Search media" placeholder="Search file name or alt text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-sm" />
        <Select aria-label="File type" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className="w-auto">
          <option value="">All files</option>
          <option value="image">Images</option>
          <option value="document">PDFs</option>
        </Select>
      </div>
      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data?.items.length ? (
        <p className="rounded-2xl border border-border p-10 text-center text-sm text-mist">{q || kind ? "No files match." : "No files uploaded yet."}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {query.data.items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => { setSelected(m); setAlt(m.alt_text); }} className="w-full overflow-hidden rounded-xl border border-border text-left hover:border-cyan/50">
                {m.kind === "image" ? (
                  <img src={m.url} alt={m.alt_text} loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-white/5 text-mist">
                    <FileText size={32} aria-hidden />
                  </div>
                )}
                <p className="truncate px-2 py-1.5 text-[11px] text-mist">{m.original_filename}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-mist">
          <Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>{page} / {pages}</span>
          <Button size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected?.original_filename ?? "File"} wide>
        {selected && (
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-white/5">
              {selected.kind === "image" ? <img src={selected.url} alt={selected.alt_text} className="max-h-[60vh] w-full object-contain" /> : <iframe title="PDF preview" src={selected.url} className="h-[60vh] w-full" sandbox="" />}
            </div>
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-mist">Type</dt><dd className="text-white">{selected.mime_type}</dd>
                <dt className="text-mist">Size</dt><dd className="text-white">{formatBytes(selected.size_bytes)}</dd>
                {selected.width && (<><dt className="text-mist">Dimensions</dt><dd className="text-white">{selected.width} × {selected.height}</dd></>)}
                <dt className="text-mist">Uploaded</dt><dd className="text-white">{formatDate(selected.created_at)}</dd>
              </dl>
              <Field label="URL" htmlFor="media-url">
                <div className="flex gap-2">
                  <Input id="media-url" readOnly value={selected.url} />
                  <Button aria-label="Copy URL" onClick={() => navigator.clipboard?.writeText(selected.url).then(() => toast("info", "URL copied."))}>
                    <Copy size={14} />
                  </Button>
                </div>
              </Field>
              {selected.kind === "image" && (
                <Field label="Alt text" htmlFor="media-alt" hint="Describe the image for screen readers and SEO.">
                  <Input id="media-alt" value={alt} maxLength={300} disabled={!can("media:write")} onChange={(e) => setAlt(e.target.value)} />
                </Field>
              )}
              <div className="flex flex-wrap gap-2">
                {can("media:write") && selected.kind === "image" && (
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        const updated = await api<MediaAsset>(`/api/v1/admin/media/${selected.id}`, { method: "PATCH", body: { alt_text: alt } });
                        setSelected(updated);
                        toast("success", "Alt text saved.");
                        await qc.invalidateQueries({ queryKey: ["admin", "media"] });
                      } catch (err) {
                        toast("error", errorMessage(err));
                      }
                    }}
                  >
                    Save
                  </Button>
                )}
                {can("media:delete") && (
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!(await confirm({ title: "Delete file?", message: "Files still used on the site cannot be deleted.", danger: true, confirmLabel: "Delete" }))) return;
                      try {
                        await api(`/api/v1/admin/media/${selected.id}`, { method: "DELETE" });
                        toast("success", "File deleted.");
                        setSelected(null);
                        await qc.invalidateQueries({ queryKey: ["admin", "media"] });
                      } catch (err) {
                        toast("error", errorMessage(err));
                      }
                    }}
                  >
                    <Trash2 size={14} aria-hidden /> Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
