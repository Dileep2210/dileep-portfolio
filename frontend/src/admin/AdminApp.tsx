import { useEffect, useState } from "react";
import {
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  FolderKanban,
  History,
  Home,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Search,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Tags,
  UserCircle,
  Users,
  Wrench,
  X,
  Award,
} from "lucide-react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router";
import Seo from "../components/Seo";
import { AuthProvider, RequireAuth, useAuth } from "./auth";
import DashboardPage from "./pages/DashboardPage";
import { LeadDetailPage, LeadsPage } from "./pages/LeadsPages";
import MediaPage from "./pages/MediaPage";
import SettingsPage from "./pages/SettingsPage";
import { AuditLogPage, SecurityPage, UsersPage } from "./pages/SystemPages";
import { AcceptInvitePage, LoginPage, ResetPasswordPage } from "./pages/AuthPages";
import { CategoriesPage, ResourceEditPage, ResourceListPage } from "./ResourcePages";
import { CATEGORY_RESOURCES, RESOURCES, type ResourceConfig } from "./resources";
import { UiProvider } from "./ui";

type NavEntry = { to: string; label: string; icon: typeof Home; perm: string; anyOf?: string[] };

// Sidebar order follows the specification's module list.
const NAV: NavEntry[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard:read" },
  { to: "/admin/homepage-sections", label: "Homepage", icon: Home, perm: "homepage:read" },
  { to: "/admin/profile", label: "Profile", icon: UserCircle, perm: "settings:read" },
  { to: "/admin/services", label: "Services", icon: Wrench, perm: "services:read" },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban, perm: "projects:read" },
  { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote, perm: "testimonials:read" },
  { to: "/admin/skills", label: "Skills", icon: Sparkles, perm: "skills:read" },
  { to: "/admin/experiences", label: "Experience", icon: Award, perm: "experiences:read" },
  { to: "/admin/blog/posts", label: "Blog", icon: BookOpen, perm: "blog:read" },
  { to: "/admin/categories", label: "Categories", icon: Tags, perm: "", anyOf: ["projects:read", "skills:read", "blog:read"] },
  { to: "/admin/leads", label: "Contact leads", icon: Inbox, perm: "leads:read" },
  { to: "/admin/media", label: "Media library", icon: Image, perm: "media:read" },
  { to: "/admin/seo", label: "SEO", icon: Search, perm: "seo:read" },
  { to: "/admin/navigation", label: "Navigation", icon: Compass, perm: "navigation:read" },
  { to: "/admin/social-links", label: "Social links", icon: Share2, perm: "social:read" },
  { to: "/admin/resumes", label: "Resume", icon: FileText, perm: "resume:read" },
  { to: "/admin/users", label: "Users", icon: Users, perm: "users:read" },
  { to: "/admin/audit-logs", label: "Audit logs", icon: History, perm: "audit:read" },
  { to: "/admin/settings", label: "Website settings", icon: Settings, perm: "settings:read" },
  { to: "/admin/security", label: "Security", icon: Shield, perm: "" },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const visible = NAV.filter((n) => (n.anyOf ? n.anyOf.some(can) : !n.perm || can(n.perm)));
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
      {visible.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === "/admin"}
          onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-white/10 text-white" : "text-mist hover:bg-white/5 hover:text-white"}`}
        >
          <n.icon size={16} aria-hidden />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminLayout() {
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <div className="min-h-screen bg-ink text-white">
      <Seo title="Admin" path="/admin" noindex />
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[500] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface/95 lg:flex">
        <Link to="/admin" className="flex items-center gap-2 border-b border-border px-5 py-4 font-display text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan text-xs">DP</span>
          Portfolio CMS
        </Link>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-display text-sm font-semibold">Portfolio CMS</span>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-ink/90 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden">
            <Menu size={20} />
          </button>
          <span className="hidden text-xs text-mist sm:block">
            Signed in as <span className="text-white">{me?.email}</span> · {me?.roles.join(", ")}
          </span>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-mist hover:bg-white/5 hover:text-white">
              View site <ExternalLink size={13} aria-hidden />
            </a>
            <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-white hover:bg-white/5">
              <LogOut size={13} aria-hidden /> Log out
            </button>
          </div>
        </header>
        <main id="admin-main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function resourceRoutes(configs: ResourceConfig[]) {
  return configs.flatMap((c) => [
    <Route key={`${c.key}-list`} path={c.key} element={<RequireAuth perm={`${c.perm}:read`}><ResourceListPage config={c} /></RequireAuth>} />,
    <Route key={`${c.key}-edit`} path={`${c.key}/:id`} element={<RequireAuth perm={`${c.perm}:read`}><ResourceEditPage config={c} /></RequireAuth>} />,
  ]);
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <UiProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="accept-invite" element={<AcceptInvitePage />} />
          <Route
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<RequireAuth perm="dashboard:read"><DashboardPage /></RequireAuth>} />
            {resourceRoutes(RESOURCES)}
            {resourceRoutes(CATEGORY_RESOURCES)}
            <Route path="categories" element={<CategoriesPage configs={CATEGORY_RESOURCES} />} />
            <Route path="leads" element={<RequireAuth perm="leads:read"><LeadsPage /></RequireAuth>} />
            <Route path="leads/:id" element={<RequireAuth perm="leads:read"><LeadDetailPage /></RequireAuth>} />
            <Route path="media" element={<RequireAuth perm="media:read"><MediaPage /></RequireAuth>} />
            <Route path="profile" element={<RequireAuth perm="settings:read"><SettingsPage variant="profile" /></RequireAuth>} />
            <Route path="settings" element={<RequireAuth perm="settings:read"><SettingsPage variant="website" /></RequireAuth>} />
            <Route path="users" element={<RequireAuth perm="users:read"><UsersPage /></RequireAuth>} />
            <Route path="audit-logs" element={<RequireAuth perm="audit:read"><AuditLogPage /></RequireAuth>} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="*" element={<p className="text-sm text-mist">This admin page does not exist. <Link className="text-cyan" to="/admin">Go to the dashboard</Link>.</p>} />
          </Route>
        </Routes>
      </UiProvider>
    </AuthProvider>
  );
}

