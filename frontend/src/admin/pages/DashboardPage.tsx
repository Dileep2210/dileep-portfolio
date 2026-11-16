import { useQuery } from "@tanstack/react-query";
import { BookOpen, FolderKanban, Inbox, MessageSquareQuote, Plus, Wrench } from "lucide-react";
import { Link } from "react-router";
import { ErrorState, Skeleton } from "../../components/States";
import { api } from "../../lib/api";
import { formatDate, formatDateTime } from "../../lib/format";
import { useAuth } from "../auth";
import { Badge, Card, PageTitle } from "../ui";

type Lead = { id: string; name: string; email: string; service_label: string; status: string; created_at: string };
type Audit = { id: string; created_at: string; actor_email: string | null; action: string; entity_type: string | null };
type Dashboard = {
  counts: Record<string, number>;
  content_status: Record<string, number>;
  recent_leads: Lead[] | null;
  leads_by_week: { week: string; count: number }[] | null;
  recent_activity: Audit[] | null;
};

const LEAD_TONE: Record<string, "amber" | "blue" | "violet" | "green" | "gray"> = { new: "amber", contacted: "blue", in_discussion: "violet", converted: "green", closed: "gray" };

function Stat({ label, value, sub, icon: Icon, to }: { label: string; value: number; sub?: string; icon: typeof Inbox; to: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-border bg-surface/70 p-5 transition hover:border-cyan/40">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-mist">{label}</p>
        <Icon size={16} className="text-cyan" aria-hidden />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </Link>
  );
}

function LeadsChart({ data }: { data: { week: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure>
      <div className="flex h-40 items-end gap-2" role="img" aria-label={`Enquiries per week for the last 8 weeks, ${total} in total`}>
        {data.map((d) => (
          <div key={d.week} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] text-white/80">{d.count || ""}</span>
            <div className="w-full rounded-t-md bg-gradient-to-t from-violet to-cyan" style={{ height: `${Math.max(3, (d.count / max) * 120)}px`, opacity: d.count ? 1 : 0.25 }} />
            <span className="text-[10px] text-mist">{formatDate(d.week, { month: "short", day: "numeric" })}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-xs text-mist">Enquiries per week (last 8 weeks)</figcaption>
    </figure>
  );
}

export default function DashboardPage() {
  const { me, can } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => api<Dashboard>("/api/v1/admin/dashboard") });
  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const c = data.counts;
  const cs = data.content_status;
  return (
    <div>
      <PageTitle
        title={`Welcome back${me?.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}`}
        description="An overview of your website content and enquiries."
        actions={
          can("projects:write") && (
            <Link to="/admin/projects/new" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet to-cyan px-3.5 py-2 text-sm font-medium text-white">
              <Plus size={15} aria-hidden /> New project
            </Link>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projects" value={c.projects} sub={`${c.projects_published} published`} icon={FolderKanban} to="/admin/projects" />
        <Stat label="Services" value={c.services} sub={`${c.services_published} active`} icon={Wrench} to="/admin/services" />
        <Stat label="Testimonials" value={c.testimonials_published} sub={`${c.testimonials_pending} awaiting review`} icon={MessageSquareQuote} to="/admin/testimonials" />
        <Stat label="Blog posts" value={c.blog_posts} sub={`${c.blog_published} published`} icon={BookOpen} to="/admin/blog/posts" />
        {c.leads_new !== undefined && <Stat label="New enquiries" value={c.leads_new} sub={`${c.leads_total} total`} icon={Inbox} to="/admin/leads" />}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data.leads_by_week && (
          <Card title="Enquiries">
            <LeadsChart data={data.leads_by_week} />
          </Card>
        )}
        <Card title="Content status">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-mist">Draft projects</span><span className="text-white">{cs.draft_projects}</span></li>
            <li className="flex justify-between"><span className="text-mist">Inactive services</span><span className="text-white">{cs.draft_services}</span></li>
            <li className="flex justify-between"><span className="text-mist">Draft articles</span><span className="text-white">{cs.draft_posts}</span></li>
            <li className="flex justify-between"><span className="text-mist">Scheduled articles</span><span className="text-white">{cs.scheduled_posts}</span></li>
            <li className="flex justify-between"><span className="text-mist">Testimonials to review</span><span className="text-white">{c.testimonials_pending}</span></li>
          </ul>
        </Card>
        {data.recent_leads && (
          <Card title="Recent enquiries" actions={<Link to="/admin/leads" className="text-xs text-cyan">View all</Link>}>
            {data.recent_leads.length === 0 ? (
              <p className="text-sm text-mist">No enquiries yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent_leads.map((l) => (
                  <li key={l.id}>
                    <Link to={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-white">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white">{l.name}</span>
                        <span className="block truncate text-xs text-mist">{l.service_label || l.email}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={LEAD_TONE[l.status]}>{l.status.replace("_", " ")}</Badge>
                        <span className="text-[11px] text-mist">{formatDate(l.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {data.recent_activity && (
          <Card title="Recent activity" actions={<Link to="/admin/audit-logs" className="text-xs text-cyan">Audit log</Link>}>
            <ul className="space-y-2 text-sm">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <code className="text-xs text-cyan">{a.action}</code> <span className="text-mist">{a.actor_email ?? "system"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-mist">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
