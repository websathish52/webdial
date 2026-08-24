import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, MessageCircle, BarChart3, Wrench, Megaphone, Lock, CreditCard, Plug, Mic, Settings as SettingsIcon, LogOut, PhoneCall, TrendingUp, FileClock, Kanban, ClipboardCheck, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { store, useCurrentMember, type Permissions } from "@/lib/mock-store";
import api, { getSelectedCompanyId, setSelectedCompanyId, resolveFileUrl } from "@/lib/api";
import webdialLogo from "@/assets/webdial-jpg.png";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; beta?: boolean; perm?: keyof Permissions };
const telecallerNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/crm", label: "CRM", icon: Users, perm: "crm" },
  { to: "/dialer", label: "Auto Dialer", icon: PhoneCall, perm: "crm" },
  { to: "/whatsapp", label: "Whatsapp", icon: MessageCircle, beta: true, perm: "whatsapp" },
  { to: "/reports", label: "Reports and Analytics", icon: BarChart3, perm: "reports" },
  { to: "/performance", label: "Performance", icon: TrendingUp, perm: "reports" },
  { to: "/audit", label: "Audit Logs", icon: FileClock, perm: "reports" },
  { to: "/tools", label: "Tools", icon: Wrench, perm: "tools" },
  { to: "/pipeline", label: "Pipeline", icon: Kanban, perm: "tools" },
  { to: "/tasks", label: "Tasks", icon: ClipboardCheck, perm: "tools" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, perm: "settings" },
  { to: "/payment", label: "Subscribes", icon: CreditCard, perm: "payment" },
];
const superAdminNav: NavItem[] = [
  ...telecallerNav.filter(item => item.to !== '/dialer' && item.to !== '/payment'),
  { to: "/team", label: "Team & Members", icon: Users, perm: "team" },
  { to: "/marketing", label: "Marketing", icon: Megaphone, perm: "marketing" },
  { to: "/pbx", label: "Web PBX", icon: Lock, beta: true, perm: "pbx" },
  { to: "/subscribe", label: "Subscribe", icon: CreditCard, perm: "subscribe" },
  { to: "/integration", label: "Integration", icon: Plug, perm: "integration" },
  { to: "/recording", label: "Recording", icon: Mic, beta: true, perm: "recording" },
];

const masterNav: NavItem[] = [
  { to: "/master", label: "Master", icon: Lock },
];

// Clears everything tied to auth AND to the currently-selected tenant/company.
// Used on logout so no stale company selection can leak into the next
// person who logs in on this browser (superadmin or master).
function clearAuthAndTenantStorage() {
  localStorage.removeItem('ifox_token');
  localStorage.removeItem('ifox_user');
  localStorage.removeItem('ifox_selected_company');
  sessionStorage.removeItem('ifox_token');
  sessionStorage.removeItem('ifox_user');
  sessionStorage.removeItem('ifox_selected_company');
  document.cookie = 'ifox_token=; Max-Age=0; path=/';
  document.cookie = 'ifox_user=; Max-Age=0; path=/';
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const member = useCurrentMember();
  const [companyInfo, setCompanyInfo] = useState<{ logoUrl?: string }>({});
  const [selectedCompany, setSelectedCompany] = useState<string>(() => getSelectedCompanyId() || "all");
  const [companies, setCompanies] = useState<Array<{ _id: string; companyName: string; companyCode?: string }>>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  // FIX: resolveFileUrl("") on an empty/unset logoUrl still returns a
  // truthy string (just API_BASE), so the old `logoUrl ? <img> : <fallback>`
  // check rendered a broken <img> pointing at a non-existent file and the
  // browser showed a crashed/broken-image icon. We now only build a URL
  // when there's an actual logoUrl, AND track load errors so a 404'd image
  // (e.g. stale/removed file) also falls back to the initials avatar
  // instead of showing a broken icon.
  const [logoLoadError, setLogoLoadError] = useState(false);
  const isSuperAdmin = member?.role === "SuperAdmin";
  const logoUrl = companyInfo.logoUrl ? resolveFileUrl(companyInfo.logoUrl) : "";

  useEffect(() => {
    // Reset the error flag whenever the underlying logo path changes
    // (company switch, new upload, removal) so a previous 404 doesn't
    // permanently hide a valid new logo.
    setLogoLoadError(false);
  }, [companyInfo.logoUrl]);

  useEffect(() => {
    if (!member || !isSuperAdmin) return;
    let active = true;
    setCompanyLoading(true);
    api.getCompanies()
      .then((list) => {
        if (!active) return;
        const next = Array.isArray(list)
          ? list.map((company: any) => ({ _id: company._id || company.id, companyName: company.companyName, companyCode: company.companyCode }))
          : [];
        setCompanies(next);

        const stored = getSelectedCompanyId();
        const validStored = stored && next.some((company) => String(company._id) === String(stored));

        // If the saved company is still present but the company list is still
        // loading or temporarily empty, do NOT wipe the selection. That is the
        // exact case that causes a full browser refresh to snap back to "All
        // Team" even though the user had chosen a specific company.
        if (stored && !next.length) {
          setSelectedCompany(String(stored));
          return;
        }

        // Keep the dropdown value in sync with the persisted tenant selection.
        if (stored && validStored) {
          setSelectedCompany(String(stored));
          setSelectedCompanyId(stored);
          return;
        }

        // If the stored selection is missing or no longer valid, reset to the
        // global "All Team" view instead of leaving a stale company id behind.
        setSelectedCompany("all");
        if (stored && !validStored) {
          setSelectedCompanyId(null);
        }
      })
      .catch(() => {
        if (!active) setCompanies([]);
      })
      .finally(() => active && setCompanyLoading(false));
    return () => { active = false; };
  }, [member, isSuperAdmin]);

  useEffect(() => {
    let active = true;
    const fetchCompanyInfo = () => {
      api.getCompanyInfo().then(info => {
        if (active && info) {
          setCompanyInfo(info);
        }
      }).catch(() => { /* ignore */ });
    };

    fetchCompanyInfo(); // Initial fetch

    // Listen for storage changes to know when to refetch
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ifox_logo_updated') {
        fetchCompanyInfo();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => { active = false; window.removeEventListener('storage', handleStorageChange); };
  }, [selectedCompany]);

  useEffect(() => {
    if (!member?.id) {
      setNotificationCount(0);
      return;
    }
    let active = true;
    const loadNotifications = async () => {
      try {
        const data = await api.getNotifications();
        if (!active) return;
        setNotificationCount(Array.isArray(data) ? data.filter((notification: any) => !notification.read).length : 0);
      } catch {
        if (active) setNotificationCount(0);
      }
    };
    void loadNotifications();
    const timer = window.setInterval(() => { void loadNotifications(); }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [member?.id]);

if (!member) return null;
  const nav = member.role === "Master" ? masterNav : member.role === "SuperAdmin" ? superAdminNav : telecallerNav;
  const visibleNav = member.role === "Master" ? nav : nav.filter(n => !n.perm || member.permissions[n.perm] || member.role === "SuperAdmin");

  return (
    <div className="h-full w-full flex flex-col bg-sidebar text-sidebar-foreground select-none">
      <div className="px-5 py-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Hello!</div>
            <div className="text-2xl font-semibold tracking-tight capitalize text-foreground">{member.name.split(" ")[0]}</div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-16 rounded-full grid place-items-center font-bold text-sm shadow-md relative transition-all overflow-hidden",
                selectedCompany === "all"
                  ? "bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] text-white shadow-blue-500/20"
                  : "bg-[#1f2937] text-white shadow-black/20"
              )}
              title={selectedCompany === "all" ? "All Team" : companies.find(c => c._id === selectedCompany)?.companyName || "Selected company"}
            >
              {logoUrl && !logoLoadError ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <img src={webdialLogo} alt="Web Dial Logo" className="size-14 w-full h-full object-cover" />
              )}
            </div>
            {onClose && <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-sidebar-accent/40"><X className="size-5"/></button>}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="relative">
            <select
              value={selectedCompany}
              onChange={(e) => {
                const next = e.target.value;
                if (next === selectedCompany) return;

                setSelectedCompany(next);
                if (next === "all") {
                  setSelectedCompanyId(null);
                } else {
                  setSelectedCompanyId(next);
                }

                // IMPORTANT: some pages fetch data only on initial mount or on a
                // route refresh. If we do not reload here, the user can stay on a
                // page while the selected company changes but the page keeps using
                // stale data from the previous tenant. This guarantees all pages
                // remount with the new company context immediately.
                window.location.reload();
              }}
              className="w-full bg-[#3e3d3a] text-white rounded-lg px-4 py-3 text-sm font-medium appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 border-none shadow-sm pr-10"
            >
              <option value="all">All Team</option>
              {companyLoading ? (
                <option value="" disabled>Loading companies...</option>
              ) : (
                companies.map((company) => (
                  <option key={company._id} value={company._id}>{company.companyName}</option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-white/70 pointer-events-none" />
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
          <Link key={item.to} to={item.to} onClick={onClose}
  className={cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
    active
      ? "bg-[rgb(231,239,254)] text-[#2563EB] font-medium"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
  )}
>
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.to === "/tasks" && notificationCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white shrink-0">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
              {item.beta && <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0", active ? "bg-white/20" : "bg-primary/15 ")} style={{color:"#16a34a",backgroundColor: "#16a34a29"}}>BETA</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button onClick={() => {
          store.logout();
          clearAuthAndTenantStorage();
          navigate('/auth');
        }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/40">
          <LogOut className="size-4" /> LOGOUT
        </button>
      </div>
    </div>
  );
}