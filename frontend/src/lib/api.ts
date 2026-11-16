/**
 * Same-origin API client. In production Vercel rewrites /api/* to the FastAPI service, in
 * development Vite proxies it, so auth cookies are first-party and never readable by JS
 * (only the CSRF token cookie is, by design).
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: { field: string; message: string }[];

  constructor(status: number, code: string, message: string, details?: { field: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  query?: Query;
  /** Internal: whether a 401 may trigger one refresh + retry. */
  retry?: boolean;
  raw?: boolean;
};

const UNSAFE = new Set(["POST", "PATCH", "DELETE", "PUT"]);

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

export function buildUrl(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

let refreshing: Promise<boolean> | null = null;
const sessionListeners = new Set<() => void>();

/** Called when the session can no longer be refreshed (admin UI sends the user to login). */
export function onSessionExpired(fn: () => void): () => void {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": readCookie("pf_csrf") ?? "" },
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const data = await res.json();
    const err = data?.error;
    if (err && typeof err === "object") return new ApiError(res.status, err.code ?? "error", err.message ?? "Request failed.", err.details);
    if (typeof err === "string") return new ApiError(res.status, "error", err);
  } catch {
    /* not JSON */
  }
  const fallback =
    res.status === 429 ? "Too many requests. Please wait a moment." : res.status >= 500 ? "The server had a problem. Please try again." : "Request failed.";
  return new ApiError(res.status, res.status === 429 ? "rate_limited" : "http_error", fallback);
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (UNSAFE.has(method)) headers["X-CSRF-Token"] = readCookie("pf_csrf") ?? "";

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server. Check your connection and try again.");
  }

  const canRetry = opts.retry !== false && path.startsWith("/api/v1/") && !path.startsWith("/api/v1/auth/refresh") && !path.startsWith("/api/v1/auth/login");
  if (res.status === 401 && canRetry) {
    const err = await parseError(res.clone());
    if (err.code === "token_expired" || err.code === "unauthorized") {
      if (await refreshSession()) return api<T>(path, { ...opts, retry: false });
      sessionListeners.forEach((fn) => fn());
    }
    throw err;
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  if (opts.raw) return (await res.blob()) as T;
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("application/json") ? await res.json() : await res.text()) as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details?.length) {
      const first = err.details[0];
      return `${err.message} ${first.field ? `${first.field}: ` : ""}${first.message}`.trim();
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
