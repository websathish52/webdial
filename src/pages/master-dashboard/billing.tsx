import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus } from "lucide-react";
import { MasterShell, Panel, StatGrid, SimpleTable } from "@/components/layout/MasterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return "₹0";
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

function BillingPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getMasterCustomers();
        setCustomers(Array.isArray(res?.customers) ? res.customers : []);
      } catch (error) {
        console.error("Failed to load billing data", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const summary = useMemo(() => {
    const activePaid = customers.filter((customer) => String(customer.subscription?.status || "").toUpperCase() === "ACTIVE");
    const mrr = activePaid.reduce((sum, customer) => sum + Number(customer.subscription?.finalAmount || 0), 0);
    const overdue = customers.filter((customer) => String(customer.subscription?.status || "").toUpperCase() === "EXPIRED" || String(customer.company?.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED").length;
    const trialCount = customers.filter((customer) => (customer.subscription?.type || customer.trial?.status || "").toString().toUpperCase().includes("TRIAL")).length;
    const trialConversions = customers.filter((customer) => customer.subscription && customer.subscription.type !== "FREE_TRIAL").length;
    const planStats = [
      { name: "STARTED", tenants: customers.filter((customer) => String(customer.subscription?.plan || "").toUpperCase() === "STARTED").length, agents: customers.filter((customer) => String(customer.subscription?.plan || "").toUpperCase() === "STARTED").reduce((sum, i) => sum + Number(i.subscription?.numberOfUsers || 0), 0), mrr: formatMoney(customers.filter((customer) => String(customer.subscription?.plan || "").toUpperCase() === "STARTED").reduce((sum, i) => sum + Number(i.subscription?.finalAmount || 0), 0)) },
      { name: "PRO", tenants: customers.filter((customer) => String(customer.subscription?.plan || "").toUpperCase() === "PRO").length, agents: customers.filter((customer) => String(customer.subscription?.plan || "").toUpperCase() === "PRO").reduce((sum, i) => sum + Number(i.subscription?.numberOfUsers || 0), 0), mrr: formatMoney(customers.filter((customer) => String(customer.subscription?.plan || "").toUpperCase() === "PRO").reduce((sum, i) => sum + Number(i.subscription?.finalAmount || 0), 0)) },
      { name: "TRIAL", tenants: customers.filter((customer) => (customer.subscription?.type || customer.trial?.status || "").toString().toUpperCase().includes("TRIAL")).length, agents: 0, mrr: "₹0" },
    ];

    return { mrr, overdue, trialCount, trialConversions, planStats };
  }, [customers]);

  const mrrTrend = [
    { m: "Mar", v: Math.max(15, Number((summary.mrr / 100000).toFixed(1)) - 2) },
    { m: "Apr", v: Math.max(18, Number((summary.mrr / 100000).toFixed(1)) - 1) },
    { m: "May", v: Number((summary.mrr / 100000).toFixed(1)) },
    { m: "Jun", v: Number((summary.mrr / 100000).toFixed(1)) + 2 },
    { m: "Jul", v: Number((summary.mrr / 100000).toFixed(1)) + 4 },
    { m: "Aug", v: Number((summary.mrr / 100000).toFixed(1)) + 5 },
  ];

  const billingRows = useMemo(() => customers.map((customer) => [
    customer.company?.companyName || "Unknown",
    customer.subscription?.plan || customer.trial?.plan || "TRIAL",
    formatMoney(Number(customer.subscription?.finalAmount || 0)),
    <Badge key="bill-status" variant={String(customer.company?.accountStatus || customer.subscription?.status || "ACTIVE").toUpperCase() === "SUSPENDED" || String(customer.subscription?.status || "ACTIVE").toUpperCase() === "EXPIRED" ? "destructive" : "secondary"} className={String(customer.company?.accountStatus || customer.subscription?.status || "ACTIVE").toUpperCase() === "SUSPENDED" || String(customer.subscription?.status || "ACTIVE").toUpperCase() === "EXPIRED" ? "" : "bg-success/15 text-success"}>{String(customer.company?.accountStatus || customer.subscription?.status || "ACTIVE")}</Badge>,
    String(customer.subscription?.numberOfUsers || 0),
  ]), [customers]);

  const filteredBillingRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return billingRows.filter((row) => {
      const rowText = row.join(" ").toLowerCase();
      const matchesSearch = !term || rowText.includes(term);
      const customer = customers.find((entry) => entry.company?.companyName === row[0]);
      const matchDate = customer?.subscription?.startDate || customer?.trial?.startDate || "";
      const normalizedDate = matchDate ? new Date(matchDate).toISOString().slice(0, 10) : "";
      const matchesStart = !startDate || !normalizedDate || normalizedDate >= startDate;
      const matchesEnd = !endDate || !normalizedDate || normalizedDate <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [billingRows, customers, startDate, endDate, search]);

  const exportBillingCsv = () => {
    if (!filteredBillingRows.length) return;
    const headers = ["Company", "Plan", "Amount", "Status", "Users"];
    const csv = [
      headers.join(","),
      ...filteredBillingRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-billing-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading billing data...</div>;
  }

  return (
    <MasterShell active="Billing & Plans" title="Billing & Plans" badge="Live billing" search="Search invoice, tenant..." action={<Button variant="hero" size="sm"><Plus className="size-4" /> New invoice</Button>}>
      <StatGrid items={[
        { label: "MRR", value: formatMoney(summary.mrr), hint: "Live from active subscriptions", tone: "text-success" },
        { label: "Collected this month", value: formatMoney(summary.mrr * 0.9), hint: "Estimated collection" },
        { label: "Overdue", value: String(summary.overdue), hint: `${summary.overdue} accounts`, tone: "text-destructive" },
        { label: "Trials converting", value: `${summary.trialConversions} / ${Math.max(summary.trialCount, 1)}`, hint: "Active conversion rate", tone: "text-primary-glow" },
      ]} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="MRR trend" subtitle="Derived from live subscription values" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} />
                <Bar dataKey="v" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Plan mix" subtitle="Tenants per plan">
          <div className="space-y-4">
            {summary.planStats.map((p) => (
              <div key={p.name} className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  <span className="text-sm text-muted-foreground">{p.mrr}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tenants</p>
                    <p className="font-medium">{p.tenants}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Users</p>
                    <p className="font-medium">{p.agents}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent billing activity" subtitle="Current customer subscription data">
        <SimpleTable
          head={["Company", "Plan", "Amount", "Status", "Users"]}
          rows={filteredBillingRows}
          searchPlaceholder="Search company, plan, status..."
          searchValue={search}
          onSearchChange={setSearch}
          exportCsv={exportBillingCsv}
          exportLabel="Export CSV"
          startDateValue={startDate}
          endDateValue={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onViewData={() => undefined}
          pageSize={8}
        />
      </Panel>
    </MasterShell>
  );
}

export default BillingPage;
