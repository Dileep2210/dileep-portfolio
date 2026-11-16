import { describe, expect, it } from "vitest";
import { ApiError, api, buildUrl, errorMessage } from "../lib/api";
import { mockFetch } from "./utils";

describe("api client", () => {
  it("sends the CSRF token on unsafe requests only and uses same-origin credentials", async () => {
    document.cookie = "pf_csrf=tok123; path=/";
    const calls = mockFetch({ "POST /api/v1/admin/services": { id: "1" }, "GET /api/v1/admin/services": { items: [] } });
    await api("/api/v1/admin/services", { method: "POST", body: { title: "x" } });
    await api("/api/v1/admin/services");
    expect(calls[0].headers["X-CSRF-Token"]).toBe("tok123");
    expect(calls[1].headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("refreshes an expired session once and retries the request", async () => {
    let first = true;
    const calls = mockFetch({
      "GET /api/v1/auth/me": () => {
        if (first) {
          first = false;
          return { status: 401, body: { error: { code: "token_expired", message: "expired" } } };
        }
        return { body: { email: "a@example.com" } };
      },
      "POST /api/v1/auth/refresh": { status: 204 },
    });
    const me = await api<{ email: string }>("/api/v1/auth/me");
    expect(me.email).toBe("a@example.com");
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["GET /api/v1/auth/me", "POST /api/v1/auth/refresh", "GET /api/v1/auth/me"]);
  });

  it("does not loop when refresh fails", async () => {
    const calls = mockFetch({
      "GET /api/v1/admin/dashboard": { status: 401, body: { error: { code: "token_expired", message: "expired" } } },
      "POST /api/v1/auth/refresh": { status: 401, body: { error: { code: "session_revoked", message: "ended" } } },
    });
    await expect(api("/api/v1/admin/dashboard")).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(2);
  });

  it("parses error envelopes, legacy errors and network failures", async () => {
    mockFetch({ "GET /api/v1/x": { status: 422, body: { error: { code: "validation_error", message: "Bad", details: [{ field: "title", message: "Required" }] } } } });
    const err = await api<never>("/api/v1/x").catch((e: ApiError) => e);
    expect(err.code).toBe("validation_error");
    expect(errorMessage(err)).toContain("title: Required");
    mockFetch({ "GET /api/v1/y": { status: 429, body: {} } });
    expect((await api<never>("/api/v1/y").catch((e: ApiError) => e)).code).toBe("rate_limited");
    globalThis.fetch = (() => Promise.reject(new TypeError("offline"))) as typeof fetch;
    expect((await api<never>("/api/v1/z").catch((e: ApiError) => e)).code).toBe("network_error");
  });

  it("builds query strings without empty values", () => {
    expect(buildUrl("/p", { q: "a b", page: 2, empty: "", none: undefined, f: false })).toBe("/p?q=a+b&page=2&f=false");
  });
});
