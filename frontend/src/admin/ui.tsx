import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { ApiError, api, errorMessage } from "../lib/api";

// ----------------------------------------------------------------------------- primitives

type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-violet to-cyan text-white shadow shadow-violet/20 hover:brightness-110",
  secondary: "border border-border bg-white/[0.04] text-white hover:bg-white/[0.08]",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
  ghost: "text-mist hover:bg-white/[0.06] hover:text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: "sm" | "md" }>(
  function Button({ variant = "secondary", loading, size = "md", className = "", children, disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan ${size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"} ${VARIANTS[variant]} ${className}`}
        {...rest}
      >
        {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

const control =
  "w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-mist/60 outline-none transition focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15 aria-[invalid=true]:border-red-400/70 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...p }, ref) {
  return <input ref={ref} className={`${control} ${className}`} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", ...p }, ref) {
  return <textarea ref={ref} className={`${control} ${className}`} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = "", ...p }, ref) {
  return <select ref={ref} className={`${control} bg-ink ${className}`} {...p} />;
});

export function Field({ label, htmlFor, error, hint, required, children, className = "" }: { label: string; htmlFor?: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-white/80">
        {label}
        {required && <span className="text-red-300"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-mist">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const BADGE = {
  green: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-200",
  red: "bg-red-500/15 text-red-300",
  blue: "bg-cyan/15 text-cyan",
  violet: "bg-violet/20 text-violet-200",
  gray: "bg-white/10 text-mist",
};
export function Badge({ tone = "gray", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[tone]}`}>{children}</span>;
}

export function Card({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface/70 p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-sm font-semibold text-white">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-white">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-mist">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ----------------------------------------------------------------------------- dialog

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const items = node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl ${wide ? "max-w-4xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-lg font-semibold text-white">
            {title}
          </h2>
          <button type="button" data-close onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-mist hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ----------------------------------------------------------------------------- toasts + confirm + reauth

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
type Confirm = { title: string; message: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void };

type UiValue = {
  toast: (kind: Toast["kind"], message: string) => void;
  confirm: (opts: Omit<Confirm, "resolve">) => Promise<boolean>;
  /** Runs fn; if the API asks for re-authentication, prompts for the password and retries once. */
  withReauth: <T>(fn: () => Promise<T>) => Promise<T>;
};

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<Confirm | null>(null);
  const [reauth, setReauth] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  const [password, setPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [busy, setBusy] = useState(false);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 4000);
  }, []);

  const confirm = useCallback((opts: Omit<Confirm, "resolve">) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })), []);

  const withReauth = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "reauth_required")) throw err;
      const ok = await new Promise<boolean>((resolve) => {
        setPassword("");
        setReauthError("");
        setReauth({ resolve });
      });
      if (!ok) throw new ApiError(403, "reauth_cancelled", "Action cancelled.");
      return fn();
    }
  }, []);

  const submitReauth = async () => {
    setBusy(true);
    setReauthError("");
    try {
      await api("/api/v1/auth/reauth", { method: "POST", body: { password } });
      reauth?.resolve(true);
      setReauth(null);
    } catch (err) {
      setReauthError(errorMessage(err));
    } finally {
      setBusy(false);
      setPassword("");
    }
  };

  const icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <UiContext.Provider value={{ toast, confirm, withReauth }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[400] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-xl ${t.kind === "error" ? "border-red-400/30 bg-[#2a1215] text-red-100" : t.kind === "success" ? "border-emerald-400/30 bg-[#0f2219] text-emerald-100" : "border-border bg-surface text-white"}`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span className="flex-1">{t.message}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-70 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <Dialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        onClose={() => {
          confirmState?.resolve(false);
          setConfirmState(null);
        }}
      >
        <p className="text-sm text-mist">{confirmState?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            onClick={() => {
              confirmState?.resolve(false);
              setConfirmState(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant={confirmState?.danger ? "danger" : "primary"}
            onClick={() => {
              confirmState?.resolve(true);
              setConfirmState(null);
            }}
          >
            {confirmState?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!reauth}
        title="Confirm your password"
        onClose={() => {
          reauth?.resolve(false);
          setReauth(null);
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitReauth();
          }}
        >
          <p className="text-sm text-mist">This is a sensitive action. Enter your password to continue (valid for 5 minutes).</p>
          <Field label="Password" htmlFor="reauth-password" error={reauthError} className="mt-4">
            <Input id="reauth-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => {
                reauth?.resolve(false);
                setReauth(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!password}>
              Confirm
            </Button>
          </div>
        </form>
      </Dialog>
    </UiContext.Provider>
  );
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside UiProvider");
  return ctx;
}
