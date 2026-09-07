import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MasterShell, StatGrid } from "@/components/layout/MasterShell";
import api from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Search, ShieldCheck, Users } from "lucide-react";

type PortalPage = { name: string; route: string; module: string; roles: string[]; status: "Active" | "Ready" };

const fallbackPortalPages: PortalPage[] = [
  { name: "Dashboard", route: "/dashboard", module: "Core", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "CRM", route: "/crm", module: "Core", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Auto Dialer", route: "/dialer", module: "Core", roles: ["Telecaller"], status: "Active" },
  { name: "WhatsApp Inbox", route: "/whatsapp", module: "WhatsApp", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Reports Summary", route: "/summary", module: "Reports & Analytics", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Disposition Report", route: "/disposition-report", module: "Reports & Analytics", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Productivity", route: "/productivity", module: "Reports & Analytics", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Leaderboard", route: "/game", module: "Reports & Analytics", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Automation", route: "/automation", module: "Tools", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Pipeline", route: "/pipeline", module: "Tools", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Forms", route: "/form", module: "Tools", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Web Dialer", route: "/webdialer", module: "Tools", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Go Pages", route: "/gopages", module: "Marketing", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Web Forms", route: "/web_form", module: "Marketing", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Voice Broadcast", route: "/voice-broadcast", module: "Marketing", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
  { name: "Settings", route: "/settings", module: "Platform", roles: ["SuperAdmin", "Telecaller"], status: "Active" },
];

export default function PortalAccessPage() {
  const [portalPages, setPortalPages] = useState<PortalPage[]>(fallbackPortalPages);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("All");
  useEffect(() => {
    void api.getMasterPortalAccess().then((response) => {
      if (Array.isArray(response?.pages)) setPortalPages(response.pages.map((page: PortalPage) => ({ ...page, status: "Active" })));
    }).catch((error: any) => toast.error(error?.message || "Could not load portal access registry")).finally(() => setLoading(false));
  }, []);
  const modules = ["All", ...Array.from(new Set(portalPages.map((page) => page.module)))];
  const filteredPages = useMemo(() => portalPages.filter((page) => {
    const term = search.trim().toLowerCase();
    return (module === "All" || page.module === module) && (!term || `${page.name} ${page.route} ${page.module} ${page.roles.join(" ")}`.toLowerCase().includes(term));
  }), [module, search]);

  return (
    <MasterShell active="Portal Access" title="Portal Access" badge={`${portalPages.length} pages`} search="Search portal page, route, role...">
      <div className="space-y-6 glass-card rounded-lg border border-border/70 bg-card/95 p-5">
        <section className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-xl bg-white/15"><KeyRound className="size-7" /></div><div><p className="text-sm text-blue-100">Master configuration</p><h1 className="text-2xl font-bold">Portal Access</h1><p className="mt-1 text-sm text-blue-100">Review the pages available to SuperAdmin and Telecaller company users.</p></div></div>
            <Badge className="border-0 bg-white/15 text-white"><ShieldCheck className="mr-1 size-3.5" /> Access registry</Badge>
          </div>
        </section>

        <StatGrid items={[{ label: "Registered pages", value: String(portalPages.length), hint: "Portal routes", tone: "text-primary-glow" }, { label: "Modules", value: String(modules.length - 1), hint: "Navigation groups", tone: "text-success" }, { label: "SuperAdmin access", value: String(portalPages.filter((page) => page.roles.includes("SuperAdmin")).length), hint: "Available pages", tone: "text-primary-glow" }, { label: "Telecaller access", value: String(portalPages.filter((page) => page.roles.includes("Telecaller")).length), hint: "Available pages", tone: "text-success" }]} />

        <Card className="border-border/70 bg-card/95 shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search page, route or role" className="pl-9" /></div><select value={module} onChange={(event) => setModule(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{modules.map((item) => <option key={item}>{item}</option>)}</select></div>{loading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading portal access registry...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Page</th><th className="px-3 py-3">Route</th><th className="px-3 py-3">Module</th><th className="px-3 py-3">Allowed roles</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-border">{filteredPages.map((page) => <tr key={page.route} className="hover:bg-muted/30"><td className="px-3 py-3 font-medium text-foreground"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" />{page.name}</div></td><td className="px-3 py-3 font-mono text-xs text-muted-foreground">{page.route}</td><td className="px-3 py-3"><Badge variant="outline">{page.module}</Badge></td><td className="px-3 py-3"><div className="flex flex-wrap gap-1">{page.roles.map((role) => <span key={role} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{role}</span>)}</div></td><td className="px-3 py-3"><span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Users className="size-3.5" /> {page.status}</span></td></tr>)}</tbody></table>{!filteredPages.length && <div className="py-12 text-center text-sm text-muted-foreground">No portal pages match this filter.</div>}</div>}</CardContent></Card>
      </div>
    </MasterShell>
  );
}
