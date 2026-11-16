import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, MonitorSmartphone, ShieldCheck, UserPlus } from "lucide-react";
import { ErrorState, Skeleton } from "../../components/States";
import { api, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { Me, Page } from "../../lib/types";
import { useAuth } from "../auth";
import DataTable, { useTableState } from "../DataTable";
import { Badge, Button, Card, Dialog, Field, Input, PageTitle, Select, useUi } from "../ui";

// ----------------------------------------------------------------------------- users

type User = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  mfa_enabled: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  locked_until: string | null;
};
const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

export function UsersPage() {
  const qc = useQueryClient();
  const { me, can } = useAuth();
  const { toast, withReauth, confirm } = useUi();
  const [state, update] = useTableState("email");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", full_name: "", role: "editor" });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "users", state],
    queryFn: () => api<Page<User>>("/api/v1/admin/users", { query: { page: state.page, page_size: state.pageSize, q: state.q, sort: state.sort } }),
    placeholderData: keepPreviousData,
  });
  const manage = can("users:manage");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await withReauth(fn);
      toast("success", ok);
      await refresh();
    } catch (err) {
      toast("error", errorMessage(err));
    }
  };

  return (
    <div>
      <PageTitle
        title="User management"
        description="Invite people and choose their role. There is no public sign-up; roles are enforced by the API."
        actions={
          manage && (
            <Button variant="primary" onClick={() => { setInviteOpen(true); setInviteLink(null); }}>
              <UserPlus size={15} aria-hidden /> Invite user
            </Button>
          )
        }
      />
      <DataTable<User>
        columns={[
          { key: "email", label: "User", sortable: true, render: (u) => (<span><span className="block font-medium text-white">{u.full_name || "—"}</span><span className="text-xs text-mist">{u.email}</span></span>) },
          {
            key: "roles",
            label: "Role",
            render: (u) =>
              manage && u.id !== me?.id ? (
                <Select
                  aria-label={`Role for ${u.email}`}
                  value={u.roles[0] ?? ""}
                  onChange={(e) => act(() => api(`/api/v1/admin/users/${u.id}`, { method: "PATCH", body: { roles: [e.target.value] } }), "Role updated. The user must sign in again.")}
                  className="w-auto py-1"
                >
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              ) : (
                <Badge tone="violet">{u.roles.join(", ")}</Badge>
              ),
          },
          { key: "status", label: "Status", render: (u) => (!u.is_active ? <Badge tone="red">Deactivated</Badge> : !u.email_verified_at ? <Badge tone="amber">Invited</Badge> : u.locked_until && new Date(u.locked_until) > new Date() ? <Badge tone="red">Locked</Badge> : <Badge tone="green">Active</Badge>) },
          { key: "mfa", label: "2FA", render: (u) => (u.mfa_enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>) },
          { key: "last_login_at", label: "Last sign-in", sortable: true, render: (u) => formatDateTime(u.last_login_at) || "—" },
        ]}
        data={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onChange={update}
        rowKey={(u) => u.id}
        actions={(u) =>
          manage && u.id !== me?.id ? (
            <>
              {u.locked_until && new Date(u.locked_until) > new Date() && (
                <Button size="sm" onClick={() => act(() => api(`/api/v1/admin/users/${u.id}/unlock`, { method: "POST" }), "Account unlocked.")}>Unlock</Button>
              )}
              {u.mfa_enabled && (
                <Button size="sm" onClick={async () => (await confirm({ title: "Reset two-factor?", message: `${u.email} will have to set up 2FA again.`, confirmLabel: "Reset" })) && act(() => api(`/api/v1/admin/users/${u.id}/reset-mfa`, { method: "POST" }), "Two-factor reset.")}>
                  Reset 2FA
                </Button>
              )}
              <Button
                size="sm"
                variant={u.is_active ? "danger" : "secondary"}
                onClick={async () =>
                  (await confirm({ title: u.is_active ? "Deactivate user?" : "Reactivate user?", message: u.is_active ? `${u.email} will be signed out everywhere and cannot sign in.` : `${u.email} will be able to sign in again.`, danger: u.is_active, confirmLabel: u.is_active ? "Deactivate" : "Reactivate" })) &&
                  act(() => api(`/api/v1/admin/users/${u.id}`, { method: "PATCH", body: { is_active: !u.is_active } }), u.is_active ? "User deactivated." : "User reactivated.")
                }
              >
                {u.is_active ? "Deactivate" : "Reactivate"}
              </Button>
            </>
          ) : null
        }
      />
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a user">
        {inviteLink ? (
          <div className="space-y-3 text-sm">
            <p className="text-mist">Invitation created. If email is not configured, send this one-time link to the person yourself (valid 72 hours):</p>
            <Input readOnly value={inviteLink} aria-label="Invitation link" onFocus={(e) => e.target.select()} />
            <div className="flex justify-end"><Button onClick={() => setInviteOpen(false)}>Done</Button></div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await withReauth(() => api<{ invite_url: string; email_sent: boolean }>("/api/v1/admin/users/invite", { method: "POST", body: { email: invite.email, full_name: invite.full_name, roles: [invite.role] } }));
                setInviteLink(r.invite_url);
                toast("success", r.email_sent ? "Invitation emailed." : "Invitation created.");
                await refresh();
              } catch (err) {
                toast("error", errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email" htmlFor="inv-email" required><Input id="inv-email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
            <Field label="Name" htmlFor="inv-fullname"><Input id="inv-fullname" value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} /></Field>
            <Field label="Role" htmlFor="inv-role">
              <Select id="inv-role" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={busy} disabled={!invite.email}>Send invitation</Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------------- audit log

type AuditEntry = { id: string; created_at: string; actor_email: string | null; action: string; entity_type: string | null; entity_id: string | null; ip: string | null; details: Record<string, unknown> };

export function AuditLogPage() {
  const [state, update] = useTableState("-created_at", 50);
  const query = useQuery({
    queryKey: ["admin", "audit", state],
    queryFn: () => api<Page<AuditEntry>>("/api/v1/admin/audit-logs", { query: { page: state.page, page_size: state.pageSize, q: state.q, ...state.filters } }),
    placeholderData: keepPreviousData,
  });
  return (
    <div>
      <PageTitle title="Audit log" description="Every sign-in, content change, export and security action. Read-only." />
      <DataTable<AuditEntry>
        columns={[
          { key: "created_at", label: "When", render: (a) => <span className="whitespace-nowrap text-xs">{formatDateTime(a.created_at)}</span> },
          { key: "actor_email", label: "Who", render: (a) => a.actor_email ?? <span className="text-mist">anonymous</span> },
          { key: "action", label: "Action", render: (a) => <code className="text-xs text-cyan">{a.action}</code> },
          { key: "entity", label: "Item", render: (a) => (a.entity_type ? <span className="text-xs text-mist">{a.entity_type}{a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}</span> : "—") },
          { key: "details", label: "Details", render: (a) => <code className="block max-w-xs truncate text-[11px] text-mist">{Object.keys(a.details).length ? JSON.stringify(a.details) : ""}</code> },
          { key: "ip", label: "IP", render: (a) => <span className="text-xs text-mist">{a.ip ?? ""}</span> },
        ]}
        data={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        state={state}
        onChange={update}
        filters={[
          {
            key: "action",
            label: "Area",
            options: [
              { value: "auth", label: "Sign-in & security" },
              { value: "user", label: "Users" },
              { value: "lead", label: "Leads" },
              { value: "project", label: "Projects" },
              { value: "service", label: "Services" },
              { value: "testimonial", label: "Testimonials" },
              { value: "blog_post", label: "Blog" },
              { value: "media", label: "Media" },
              { value: "settings", label: "Settings" },
            ],
          },
        ]}
        rowKey={(a) => a.id}
        searchPlaceholder="Search email, action, item id…"
      />
    </div>
  );
}

// ----------------------------------------------------------------------------- security

type SessionRow = { id: string; created_at: string; last_seen_at: string | null; ip: string | null; user_agent: string | null; current: boolean };

export function SecurityPage() {
  const { me, refresh, logout } = useAuth();
  const qc = useQueryClient();
  const { toast, withReauth, confirm } = useUi();
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const sessions = useQuery({ queryKey: ["admin", "sessions"], queryFn: () => api<SessionRow[]>("/api/v1/auth/sessions") });

  if (!me) return <Skeleton className="h-64 w-full" />;
  return (
    <div>
      <PageTitle title="Security settings" description="Your password, two-factor authentication and signed-in devices." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Change password">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pw.next !== pw.repeat) return toast("error", "The new passwords do not match.");
              setPwBusy(true);
              try {
                await api("/api/v1/auth/change-password", { method: "POST", body: { current_password: pw.current, new_password: pw.next } });
                setPw({ current: "", next: "", repeat: "" });
                toast("success", "Password changed. Other devices were signed out.");
                await sessions.refetch();
              } catch (err) {
                toast("error", errorMessage(err));
              } finally {
                setPwBusy(false);
              }
            }}
          >
            <Field label="Current password" htmlFor="pw-current"><Input id="pw-current" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password" htmlFor="pw-new" hint="At least 12 characters; avoid reusing passwords."><Input id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Repeat new password" htmlFor="pw-repeat"><Input id="pw-repeat" type="password" autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} /></Field>
            <Button type="submit" variant="primary" loading={pwBusy} disabled={!pw.current || !pw.next}>
              <KeyRound size={14} aria-hidden /> Update password
            </Button>
          </form>
        </Card>
        <Card title="Two-factor authentication">
          {me.mfa_enabled ? (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-emerald-300"><ShieldCheck size={16} aria-hidden /> Two-factor authentication is on.</p>
              <Field label="Code from your app (to turn it off)" htmlFor="mfa-off"><Input id="mfa-off" inputMode="numeric" maxLength={6} value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))} /></Field>
              <Button
                variant="danger"
                disabled={disableCode.length !== 6}
                onClick={async () => {
                  if (!(await confirm({ title: "Turn off two-factor?", message: "Your account will be protected by the password only.", danger: true, confirmLabel: "Turn off" }))) return;
                  try {
                    await withReauth(() => api<Me>("/api/v1/auth/mfa/disable", { method: "POST", body: { code: disableCode } }));
                    setDisableCode("");
                    await refresh();
                    toast("success", "Two-factor authentication turned off.");
                  } catch (err) {
                    toast("error", errorMessage(err));
                  }
                }}
              >
                Turn off
              </Button>
            </div>
          ) : setup ? (
            <div className="space-y-3 text-sm">
              <p className="text-mist">Add this key to an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code.</p>
              <Field label="Setup key" htmlFor="mfa-secret"><Input id="mfa-secret" readOnly value={setup.secret} className="font-mono tracking-wider" onFocus={(e) => e.target.select()} /></Field>
              <a href={setup.otpauth_uri} className="inline-block text-xs text-cyan">Open in authenticator app (mobile)</a>
              <Field label="6-digit code" htmlFor="mfa-code"><Input id="mfa-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
              <Button
                variant="primary"
                disabled={code.length !== 6}
                onClick={async () => {
                  try {
                    await api("/api/v1/auth/mfa/enable", { method: "POST", body: { code } });
                    setSetup(null);
                    setCode("");
                    await refresh();
                    toast("success", "Two-factor authentication is on.");
                  } catch (err) {
                    toast("error", errorMessage(err));
                  }
                }}
              >
                Verify and turn on
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-mist">Protect your account with a code from an authenticator app in addition to your password.</p>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    setSetup(await withReauth(() => api<{ secret: string; otpauth_uri: string }>("/api/v1/auth/mfa/setup", { method: "POST" })));
                  } catch (err) {
                    toast("error", errorMessage(err));
                  }
                }}
              >
                <ShieldCheck size={14} aria-hidden /> Set up two-factor
              </Button>
            </div>
          )}
        </Card>
        <Card
          title="Signed-in devices"
          className="lg:col-span-2"
          actions={
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                if (!(await confirm({ title: "Sign out everywhere?", message: "Every device, including this one, will be signed out.", danger: true, confirmLabel: "Sign out everywhere" }))) return;
                try {
                  await api("/api/v1/auth/logout-all", { method: "POST" });
                } finally {
                  qc.clear();
                  await logout();
                }
              }}
            >
              <LogOut size={13} aria-hidden /> Sign out everywhere
            </Button>
          }
        >
          {sessions.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : sessions.error ? (
            <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
          ) : (
            <ul className="divide-y divide-border">
              {sessions.data?.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <MonitorSmartphone size={18} className="shrink-0 text-mist" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-white">{s.user_agent?.slice(0, 80) || "Unknown device"}</span>
                      <span className="text-xs text-mist">
                        {s.ip ?? "unknown IP"} · last active {formatDateTime(s.last_seen_at ?? s.created_at)}
                      </span>
                    </span>
                  </span>
                  {s.current ? (
                    <Badge tone="green">This device</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await api(`/api/v1/auth/sessions/${s.id}`, { method: "DELETE" });
                          toast("success", "Device signed out.");
                          await sessions.refetch();
                        } catch (err) {
                          toast("error", errorMessage(err));
                        }
                      }}
                    >
                      Sign out
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
