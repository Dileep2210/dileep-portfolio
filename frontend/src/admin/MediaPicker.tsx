import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ImagePlus, Upload } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import type { Page } from "../lib/types";
import { Button, Dialog, Input, useUi } from "./ui";

export type MediaAsset = {
  id: string;
  url: string;
  kind: "image" | "document";
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  original_filename: string;
  alt_text: string;
  created_at: string;
  provider: string;
};

export async function uploadMedia(file: File, alt = ""): Promise<MediaAsset> {
  const form = new FormData();
  form.append("file", file);
  form.append("alt_text", alt);
  return api<MediaAsset>("/api/v1/admin/media", { method: "POST", form });
}

export const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

export default function MediaPicker({ open, onClose, onPick, kind = "image" }: { open: boolean; onClose: () => void; onPick: (m: MediaAsset) => void; kind?: "image" | "document" }) {
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useUi();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "media", "picker", kind, q],
    queryFn: () => api<Page<MediaAsset>>("/api/v1/admin/media", { query: { kind, q, page_size: 48 } }),
    enabled: open,
  });

  const onFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadMedia(file);
      await qc.invalidateQueries({ queryKey: ["admin", "media"] });
      toast("success", "Uploaded.");
      if (asset.kind === kind) onPick(asset);
    } catch (err) {
      toast("error", errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={kind === "image" ? "Choose an image" : "Choose a PDF"} wide>
      <div className="flex flex-wrap items-center gap-3">
        <Input type="search" placeholder="Search by file name or alt text" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" aria-label="Search media" />
        <input ref={fileRef} type="file" accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "application/pdf"} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload file" />
        <Button variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}>
          <Upload size={14} aria-hidden /> Upload new
        </Button>
      </div>
      <div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
        {isLoading && <p className="col-span-full text-sm text-mist">Loading…</p>}
        {!isLoading && !data?.items.length && (
          <p className="col-span-full flex items-center gap-2 py-10 text-sm text-mist">
            <ImagePlus size={16} aria-hidden /> Nothing uploaded yet — use “Upload new”.
          </p>
        )}
        {data?.items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m)}
            className="group overflow-hidden rounded-xl border border-border text-left hover:border-cyan/60 focus-visible:border-cyan"
          >
            {m.kind === "image" ? (
              <img src={m.url} alt={m.alt_text} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-white/5 text-mist">
                <FileText size={28} aria-hidden />
              </div>
            )}
            <p className="truncate px-2 py-1.5 text-[11px] text-mist group-hover:text-white">{m.original_filename}</p>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
