import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { errorMessage } from "../lib/api";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface/60 p-4">
          <Skeleton className="aspect-[16/10] w-full" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Could not load this content" }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="text-red-300" aria-hidden />
      <p className="font-medium text-white">{title}</p>
      <p className="max-w-md text-sm text-mist">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-white hover:border-white/30">
          <RefreshCw size={14} aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
      <Inbox className="text-mist" aria-hidden />
      <p className="font-medium text-white">{title}</p>
      {text && <p className="max-w-md text-sm text-mist">{text}</p>}
    </div>
  );
}
