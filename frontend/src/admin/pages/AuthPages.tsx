import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import Seo from "../../components/Seo";
import { ApiError, api, errorMessage } from "../../lib/api";
import type { Me } from "../../lib/types";
import { useAuth } from "../auth";
import { Button, Field, Input } from "../ui";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <Seo title={title} path="/admin" noindex />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-cyan text-white">
            <Lock size={18} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold text-white">{title}</h1>
            <p className="text-xs text-mist">Portfolio admin</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

function safeNext(next: string | null) {
  return next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export function LoginPage() {
  const { me } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState(params.get("expired") ? "Your session expired. Please sign in again." : "");
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to={safeNext(params.get("next"))} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await api<Me>("/api/v1/auth/login", { method: "POST", body: { email, password, totp_code: needsCode ? code : undefined }, retry: false });
      qc.setQueryData(["me"], user);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "mfa_required") {
        setNeedsCode(true);
        setError("");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Sign in">
      <form onSubmit={submit} noValidate className="space-y-4">
        {!needsCode ? (
          <>
            <Field label="Email" htmlFor="login-email">
              <Input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password" htmlFor="login-password">
              <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
          </>
        ) : (
          <Field label="Authenticator code" htmlFor="login-code" hint="Open your authenticator app and enter the 6-digit code.">
            <Input id="login-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          </Field>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy} className="w-full" disabled={!email || !password || (needsCode && code.length !== 6)}>
          {needsCode ? "Verify" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-mist">
          <Link to="/admin/reset-password" className="hover:text-white">
            Forgot your password?
          </Link>
        </p>
      </form>
    </Shell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ message: string }>("/api/v1/auth/password-reset/request", { method: "POST", body: { email } });
      setMessage(r.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPw) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/auth/password-reset/confirm", { method: "POST", body: { token, new_password: password } });
      navigate("/admin/login", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell title="Reset password">
        {message ? (
          <p role="status" className="text-sm text-mist">{message}</p>
        ) : (
          <form onSubmit={request} className="space-y-4">
            <Field label="Account email" htmlFor="reset-email">
              <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!email}>
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-mist">
          <Link to="/admin/login" className="hover:text-white">Back to sign in</Link>
        </p>
      </Shell>
    );
  }
  return (
    <Shell title="Choose a new password">
      <form onSubmit={confirm} className="space-y-4">
        <Field label="New password" htmlFor="new-pw" hint="At least 12 characters. A passphrase works well.">
          <Input id="new-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Repeat password" htmlFor="new-pw2">
          <Input id="new-pw2" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!password}>
          Set password
        </Button>
      </form>
    </Shell>
  );
}

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = params.get("token");
  return (
    <Shell title="Accept invitation">
      {!token ? (
        <p className="text-sm text-mist">This invitation link is incomplete.</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/v1/auth/invite/accept", { method: "POST", body: { token, full_name: name, password } });
              navigate("/admin/login", { replace: true });
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          <Field label="Your name" htmlFor="inv-name">
            <Input id="inv-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="inv-pw" hint="At least 12 characters.">
            <Input id="inv-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!name || !password}>
            Create account
          </Button>
        </form>
      )}
    </Shell>
  );
}
