import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ApiError, api, onSessionExpired } from "../lib/api";
import type { Me } from "../lib/types";

type AuthValue = {
  me: Me | null;
  loading: boolean;
  can: (perm: string) => boolean;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<Me>("/api/v1/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  // When a refresh fails mid-session, clear cached admin data and go to the login page.
  useEffect(
    () =>
      onSessionExpired(() => {
        qc.setQueryData(["me"], null);
        if (location.pathname.startsWith("/admin") && !location.pathname.startsWith("/admin/login")) {
          navigate(`/admin/login?expired=1&next=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }),
    [qc, navigate, location.pathname],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/v1/auth/logout", { method: "POST", retry: false });
    } catch {
      /* already signed out */
    }
    qc.clear();
    qc.setQueryData(["me"], null);
    navigate("/admin/login", { replace: true });
  }, [qc, navigate]);

  const value = useMemo<AuthValue>(
    () => ({
      me: data ?? null,
      loading: isLoading,
      can: (perm) => Boolean(data?.permissions.includes(perm)),
      refresh: refetch,
      logout,
    }),
    [data, isLoading, refetch, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function RequireAuth({ children, perm }: { children: ReactNode; perm?: string }) {
  const { me, loading, can } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-mist" role="status">
        Checking your session…
      </div>
    );
  }
  if (!me) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (perm && !can(perm)) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-8 text-center text-sm text-amber-100" role="alert">
        Your role does not include access to this section.
      </div>
    );
  }
  return <>{children}</>;
}
