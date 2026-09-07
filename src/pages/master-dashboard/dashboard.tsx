import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Users, PhoneCall, IndianRupee, TrendingUp, AlertTriangle, Activity,
  Search, Bell, RefreshCw, ArrowUpRight, CheckCircle2, Circle, Home, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

const chartAxis = { stroke: "var(--muted-foreground)", fontSize: 12 };

const formatMoney = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return "₹0";
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value || 0);

function MasterDashboard() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [topTenantsPage, setTopTenantsPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const [topTenantsSearch, setTopTenantsSearch] = useState("");
  const [alertsSearch, setAlertsSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [customersRes, membersRes, callRes, ticketsRes] = await Promise.all([
          api.getMasterCustomers(),
          api.getMembers(),
          api.getCallLogs({ limit: 2000, scope: "team" }),
          api.getSupportTickets(),
        ]);

        const customerList = Array.isArray(customersRes?.customers) ? customersRes.customers : [];
        const memberList = Array.isArray(membersRes) ? membersRes : [];
        const callsList = Array.isArray(callRes?.calls) ? callRes.calls : Array.isArray(callRes) ? callRes : [];
        const ticketList = Array.isArray(ticketsRes) ? ticketsRes : ticketsRes?.tickets || [];

        setCustomers(customerList);
        setMembers(memberList);
        setCallLogs(callsList);
        setTickets(ticketList);
        setMetrics(customersRes?.metrics || {});
      } catch (error) {
        console.error("Failed to load master dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const totals = useMemo(() => {
    const activeCompanies = customers.filter((customer) => {
      const status = String(customer.company?.accountStatus || "ACTIVE").toUpperCase();
      return !["SUSPENDED", "EXPIRED"].includes(status);
    }).length;

    // Master users are not tenant agents; every user returned with a companyId
    // belongs to a company and should be included in the platform agent count.
    const activeAgents = members.filter((member) => Boolean(member.companyId)).length;

    const callsToday = callLogs.filter((call) => {
      const date = new Date(call.calledAt || call.createdAt || call.created_at || new Date());
      const now = new Date();
      return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const mrr = customers.reduce((sum, customer) => {
      const value = Number(customer.subscription?.finalAmount ?? customer.subscription?.amount ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const planCounts: Record<string, number> = {};
    for (const customer of customers) {
      const key = String(customer.subscription?.plan || customer.trial?.plan || "TRIAL");
      planCounts[key] = (planCounts[key] || 0) + 1;
    }

    const planMix = [
      { name: "STARTED", value: planCounts.STARTED || 0 },
      { name: "PRO", value: planCounts.PRO || 0 },
      { name: "TRIAL", value: planCounts.TRIAL || 0 },
    ].filter((item) => item.value > 0);

    const topTenants = customers
      .map((customer) => {
        const company = customer.company || {};
        const companyId = String(company._id || "");
        const companyMembers = members.filter((member) => String(member.companyId || "") === companyId).length;
        const callsForCompany = callLogs.filter((call) => {
          const callCompany = typeof call.companyId === "string" ? call.companyId : call.companyId?._id || "";
          return String(callCompany) === companyId;
        }).length;
        const overdue = customer.subscription?.status === "EXPIRED" || customer.company?.accountStatus === "SUSPENDED";
        return {
          name: company.companyName || "Unknown company",
          plan: customer.subscription?.plan || customer.trial?.plan || "Trial",
          agents: companyMembers,
          calls: formatNumber(callsForCompany),
          health: overdue ? "Overdue" : "Healthy",
          due: overdue ? formatMoney(Number(customer.subscription?.finalAmount ?? 0)) : formatMoney(Number(customer.subscription?.finalAmount ?? 0)),
        };
      })
      .sort((a, b) => Number.parseInt(b.calls.replace(/,/g, ""), 10) - Number.parseInt(a.calls.replace(/,/g, ""), 10));

    const alerts = [
      ...tickets
        .filter((ticket) => ticket.status !== "Resolved" && ticket.status !== "Closed")
        .map((ticket) => ({
          t: `${ticket.subject || "Support ticket"} (${ticket.ticketNumber || "#"})`,
          time: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Recently",
          sev: ticket.priority === "P1" ? "high" : "medium",
        })),
      ...customers
        .filter((customer) => customer.company?.accountStatus === "SUSPENDED" || customer.subscription?.status === "EXPIRED")
        .map((customer) => ({
          t: `${customer.company?.companyName || "Tenant"} needs billing or account attention`,
          time: "Needs review",
          sev: "high",
        })),
    ];

    const dailyVolume = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - idx));
      const label = date.toLocaleDateString("en-IN", { weekday: "short" });
      const total = callLogs.filter((call) => {
        const calledAt = new Date(call.calledAt || call.createdAt || new Date());
        return calledAt.toDateString() === date.toDateString();
      }).length;
      return { d: label, calls: total, connected: Math.max(0, Math.round(total * 0.58)) };
    });

    return {
      totalCompanies: customers.length,
      activeCompanies,
      activeAgents,
      callsToday,
      mrr,
      planMix,
      topTenants,
      alerts,
      dailyVolume,
    };
  }, [customers, members, callLogs, tickets]);

  const filteredTopTenants = useMemo(() => {
    const term = topTenantsSearch.trim().toLowerCase();
    if (!term) return totals.topTenants;
    return totals.topTenants.filter((tenant) => `${tenant.name} ${tenant.plan} ${tenant.agents} ${tenant.calls}`.toLowerCase().includes(term));
  }, [topTenantsSearch, totals.topTenants]);

  const filteredAlerts = useMemo(() => {
    const term = alertsSearch.trim().toLowerCase();
    if (!term) return totals.alerts;
    return totals.alerts.filter((alert) => `${alert.t} ${alert.time} ${alert.sev}`.toLowerCase().includes(term));
  }, [alertsSearch, totals.alerts]);

  const topTenantsPageCount = Math.max(1, Math.ceil(filteredTopTenants.length / 5));
  const alertsPageCount = Math.max(1, Math.ceil(filteredAlerts.length / 5));

  useEffect(() => {
    setTopTenantsPage((page) => Math.min(page, topTenantsPageCount));
  }, [topTenantsPageCount]);

  useEffect(() => {
    setAlertsPage((page) => Math.min(page, alertsPageCount));
  }, [alertsPageCount]);

  const exportTopTenantsCsv = () => {
    if (!filteredTopTenants.length) return;
    const headers = ["Company", "Plan", "Agents", "Calls today", "Outstanding"];
    const csv = [
      headers.join(","),
      ...filteredTopTenants.map((tenant) => [tenant.name, tenant.plan, tenant.agents, tenant.calls, tenant.due].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-top-tenants-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportAlertsCsv = () => {
    if (!filteredAlerts.length) return;
    const headers = ["Title", "Severity", "Time", "Scope"];
    const csv = [
      headers.join(","),
      ...filteredAlerts.map((alert) => [alert.t, alert.sev, alert.time, "Platform"].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-platform-alerts-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading master dashboard...</div>;
  }

  const planColors = ["var(--chart-3)", "var(--chart-1)", "var(--chart-2)"];
  const visibleTopTenants = filteredTopTenants.slice((topTenantsPage - 1) * 5, topTenantsPage * 5);
  const visibleAlerts = filteredAlerts.slice((alertsPage - 1) * 5, alertsPage * 5);
  const kpis = [
    { icon: Building2, label: "Active Companies", value: String(totals.activeCompanies), delta: `${totals.totalCompanies} total`, tone: "text-primary-glow" },
    { icon: Users, label: "Active Telecaller Agents", value: formatNumber(totals.activeAgents), delta: `Across ${totals.totalCompanies} companies`, tone: "text-success" },
    { icon: PhoneCall, label: "Calls Today", value: formatNumber(totals.callsToday), delta: "Live from connected tenants", tone: "text-primary-glow" },
    { icon: IndianRupee, label: "MRR", value: formatMoney(totals.mrr), delta: `From ${customers.length} companies`, tone: "text-success" },
  ];

  return (
    <div className="dashboard-light min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="space-y-6 p-3 sm:p-4 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Master dashboard</p>
              <h1 className="text-lg font-semibold">Platform overview</h1>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={masterSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  setMasterSearch(value);
                  setTopTenantsSearch(value);
                  setAlertsSearch(value);
                }}
                placeholder="Search tenant, alert or page..."
                className="h-10 w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Search master dashboard"
              />
            </div>
          </div>
        
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
                <div className="flex items-start justify-between">
                  <k.icon className={"size-5 " + k.tone} />
                  <ArrowUpRight className="size-4 text-success" />
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight">{k.value}</div>
                <div className="text-sm text-muted-foreground">{k.label}</div>
                <div className="mt-2 text-xs text-success">{k.delta}</div>
              </div>
            ))}
          </section>

            <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Customer subscriptions</h2>
                <p className="text-sm text-muted-foreground">Monitor free trials, paid plans, renewals and manual access.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {[ ['Free trials', 'activeTrials'], ['Active paid', 'activeSubscriptions'], ['Expired', 'expired'], ['Started', 'started'], ['Pro', 'pro'], ['Manual', 'manual'],].map(([label, key]) => (
                <div key={key} className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-bold">{key === 'revenue' ? `₹${Number(metrics[key] || 0).toLocaleString('en-IN')}` : Number(metrics[key] || 0)}</div></div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="glass-card rounded-2xl p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold">Platform call volume (last 7 days)</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={totals.dailyVolume}>
                    <defs>
                      <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gConn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="d" {...chartAxis} />
                    <YAxis {...chartAxis} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} />
                    <Legend />
                    <Area type="monotone" dataKey="calls" stroke="var(--chart-1)" fill="url(#gCalls)" name="Dialed" />
                    <Area type="monotone" dataKey="connected" stroke="var(--chart-2)" fill="url(#gConn)" name="Connected" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold">Subscription mix</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={totals.planMix.length ? totals.planMix : [{ name: "No data", value: 1 }]} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                      {(totals.planMix.length ? totals.planMix : [{ name: "No data", value: 1 }]).map((_, i) => (
                        <Cell key={i} fill={planColors[i % planColors.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-slate-200/50 dark:shadow-none lg:col-span-2">
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold">Top tenants</h2>
                    <p className="text-xs text-muted-foreground">Usage, health and outstanding dues</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input value={topTenantsSearch} onChange={(event) => setTopTenantsSearch(event.target.value)} placeholder="Search tenant" className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-xs" />
                    </div>
                    {/* <Button variant="outline" size="sm" onClick={exportTopTenantsCsv}>Export CSV</Button> */}
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/master/tenants">View all</Link>
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="px-5 py-3 text-left font-medium">Company</th>
                        <th className="px-5 py-3 text-left font-medium">Plan</th>
                        <th className="px-5 py-3 text-left font-medium">Agents</th>
                        <th className="px-5 py-3 text-left font-medium">Calls today</th>
                        {/* <th className="px-5 py-3 text-left font-medium">Health</th> */}
                        <th className="px-5 py-3 text-left font-medium">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTopTenants.length > 0 ? (
                        visibleTopTenants.map((t) => (
                          <tr key={t.name} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                            <td className="px-5 py-3 font-medium">{t.name}</td>
                            <td className="px-5 py-3 text-muted-foreground">{t.plan}</td>
                            <td className="px-5 py-3 text-muted-foreground">{t.agents}</td>
                            <td className="px-5 py-3 text-muted-foreground">{t.calls}</td>
                            {/* <td className="px-5 py-3">
                              <span className={"rounded-full px-2 py-0.5 text-xs " + (t.health === "Healthy" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                                {t.health}
                              </span>
                            </td> */}
                            <td className="px-5 py-3 text-muted-foreground">{t.due}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                            No tenants found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {topTenantsPageCount > 1 && (
                <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
                  <span>Page {topTenantsPage} of {topTenantsPageCount}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setTopTenantsPage((page) => Math.max(1, page - 1))} disabled={topTenantsPage === 1} aria-label="Previous page">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setTopTenantsPage((page) => Math.min(topTenantsPageCount, page + 1))} disabled={topTenantsPage === topTenantsPageCount} aria-label="Next page">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="size-4 text-warning" /> Platform alerts
                  </h2>
                  <div className="flex items-center gap-2">
                  
                    <span className="text-xs text-muted-foreground">{filteredAlerts.length} Total</span>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {visibleAlerts.length > 0 ? (
                    visibleAlerts.map((a, idx) => (
                      <li key={`${a.t}-${a.time}-${idx}`} className="rounded-xl border border-border/60 p-3">
                        <div className="flex items-start gap-2">
                          <span className={"mt-1 size-2 shrink-0 rounded-full " + (a.sev === "high" ? "bg-destructive" : a.sev === "medium" ? "bg-warning" : "bg-primary")} />
                          <div>
                            <p className="text-sm font-medium">{a.t}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{a.time}</p>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-6 text-center text-xs text-muted-foreground">No active platform alerts</li>
                  )}
                </ul>
              </div>
              {alertsPageCount > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>Page {alertsPage} of {alertsPageCount}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setAlertsPage((page) => Math.max(1, page - 1))} disabled={alertsPage === 1} aria-label="Previous page">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setAlertsPage((page) => Math.min(alertsPageCount, page + 1))} disabled={alertsPage === alertsPageCount} aria-label="Next page">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default MasterDashboard;
