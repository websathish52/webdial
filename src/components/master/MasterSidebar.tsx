import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  PhoneCall,
  CreditCard,
  Server,
  ShieldCheck,
  BarChart3,
  Bell,
  Settings,
  KeyRound,
  SlidersHorizontal,
  LifeBuoy,
  Lock,
  type LucideIcon,
} from "lucide-react";

export type MasterNavItem = {
  icon: LucideIcon;
  label: string;
  badge?: string;
  to: string;
};

export const masterNav: MasterNavItem[] = [
  { icon: LayoutDashboard, label: "Overview", to: "/master/dashboard" },
  { icon: Lock, label: "Master", to: "/master/master" },
  { icon: Building2, label: "Tenants / Companies", badge: "128", to: "/master/tenants" },
  { icon: Users, label: "Users & Roles", to: "/master/users" },
  { icon: PhoneCall, label: "Call Monitor", badge: "LIVE", to: "/master/calls" },
  { icon: BarChart3, label: "Global Analytics", to: "/master/analytics" },
  { icon: CreditCard, label: "Billing & Plans", to: "/master/billing" },
  { icon: Server, label: "Telephony / Trunks", to: "/master/telephony" },
  { icon: ShieldCheck, label: "Compliance & Audit", to: "/master/compliance" },
  { icon: Bell, label: "Alerts", badge: "3", to: "/master/alerts" },
  { icon: LifeBuoy, label: "Support Tickets", badge: "12", to: "/master/support" },
  { icon: Settings, label: "Platform Settings", to: "/master/settings" },
  { icon: KeyRound, label: "Portal Access", badge: "NEW", to: "/master/portal-access" },
  { icon: SlidersHorizontal, label: "Module Access", to: "/master/module-access" },
];

export function MasterSidebar({ active }: { active?: string }) {
  const location = useLocation();

  return (
    <aside className="dashboard-light hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] text-sm font-bold text-white shadow-md shadow-blue-500/20">
            M
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Platform</p>
            <h2 className="text-base font-semibold text-foreground">Master Console</h2>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {masterNav.map((item) => {
          const isActive =
            active === item.label ||
            (item.to === "/master/dashboard" && (location.pathname === "/master/dashboard" || location.pathname === "/master" || !location.pathname.startsWith("/master/"))) ||
            location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors " +
                (isActive
                  ? "bg-[image:var(--gradient-primary)] font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")
              }
            >
              <item.icon className="size-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary-glow">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
