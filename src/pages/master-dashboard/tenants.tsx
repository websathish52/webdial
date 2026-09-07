import { useEffect, useMemo, useState } from "react";
import { Plus, AlertTriangle, Search, Download, RefreshCw } from "lucide-react";
import { MasterShell, Panel, StatGrid } from "@/components/layout/MasterShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import api, { updateMasterCustomer } from "@/lib/api";

type SuperAdminRow = {
  _id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  companyId?: { _id: string; companyName: string; companyCode: string; status: string } | null;
};

type CustomerRow = {
  company: { _id: string; companyName: string; organisation?: string; accountStatus?: string };
  account?: { _id: string; name: string; email: string; phone?: string };
  subscription?: {
    plan: string;
    type: string;
    status: string;
    numberOfUsers: number;
    startDate: string;
    expiryDate?: string;
    finalAmount?: number;
    paymentStatus: string;
    billingPeriod?: string;
  } | null;
  trial?: { plan?: string; status: string; startDate: string; expiryDate: string } | null;
  payments?: any[];
};

const formatMoney = (value: number) => {
  if (!Number.isFinite(value)) return "₹0";
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

const emptyCustomerForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  companyName: "",
  organisation: "",
  accessType: "MANUAL",
  plan: "STARTED",
  numberOfUsers: "1",
  billingPeriod: "monthly",
  startDate: "",
};

function TenantsPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRow[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [customerEditTarget, setCustomerEditTarget] = useState<CustomerRow | null>(null);
  const [customerEditForm, setCustomerEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    organisation: "",
    password: "",
    plan: "STARTED",
    numberOfUsers: "1",
    billingPeriod: "monthly",
    startDate: "",
    expiryDate: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [customerRes, memberRes, superAdminRes] = await Promise.all([
        api.getMasterCustomers(),
        api.getMembers(),
        api.getSuperAdmins(),
      ]);
      setCustomers(Array.isArray(customerRes?.customers) ? customerRes.customers : []);
      setMembers(Array.isArray(memberRes) ? memberRes : []);
      setSuperAdmins(Array.isArray(superAdminRes) ? superAdminRes : []);
    } catch (err: any) {
      console.error("Failed to load tenant data", err);
      setError(err.message || "Failed to load tenant data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(() => {
    const totalCompanies = customers.length;
    const activeLicences = members.filter((member) => Boolean(member.companyId)).length;
    const monthlyRevenue = customers.reduce((sum, customer) => sum + Number(customer.subscription?.finalAmount || 0), 0);
    const trialCount = customers.filter((customer) =>
      (customer.subscription?.type || customer.trial?.status || "").toUpperCase().includes("TRIAL")
    ).length;
    return [
      { label: "Total companies", value: String(totalCompanies), hint: "Across all regions" },
      { label: "Active licences", value: String(activeLicences), hint: "Current activated users" },
      { label: "Monthly revenue", value: formatMoney(monthlyRevenue), hint: "Live from tenant subscriptions" },
      { label: "In trial", value: String(trialCount), hint: "Current trial accounts" },
    ];
  }, [customers, members]);

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = { STARTED: 0, PRO: 0, TRIAL: 0 };
    for (const customer of customers) {
      const key = String(customer.subscription?.plan || customer.trial?.plan || "TRIAL").toUpperCase();
      if (counts[key] !== undefined) counts[key] += 1;
    }
    const total = Math.max(customers.length, 1);
    return [
      { plan: "STARTED", count: counts.STARTED, color: "bg-primary" },
      { plan: "PRO", count: counts.PRO, color: "bg-chart-2" },
      { plan: "TRIAL", count: counts.TRIAL, color: "bg-chart-3" },
    ].map((item) => ({ ...item, width: (item.count / total) * 100 }));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const companyLogin = customer.account?.email || "-";
      const superAdminLogin =
        superAdmins.find((superAdmin) => superAdmin.companyId?._id === customer.company._id)?.email || "-";
      const searchable = [
        customer.account?.name,
        customer.account?.email,
        customer.account?.phone,
        customer.company.companyName,
        customer.company.organisation,
        companyLogin,
        superAdminLogin,
        customer.subscription?.plan,
        customer.subscription?.type,
        customer.subscription?.status,
        customer.company.accountStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const rowDate = customer.subscription?.startDate || customer.trial?.startDate || "";
      const normalizedRowDate = rowDate ? new Date(rowDate) : null;
      const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

      const matchesDate =
        (!start || !normalizedRowDate || normalizedRowDate >= start) &&
        (!end || !normalizedRowDate || normalizedRowDate <= end);

      return matchesSearch && matchesDate;
    });
  }, [customers, superAdmins, search, startDate, endDate]);

  const exportTenantsCsv = () => {
    if (!filteredCustomers.length) return;
    const headers = ["Customer", "Company", "Company Login", "Plan", "Type", "Users", "Start", "Expiry", "Amount", "Status"];
    const dataRows = filteredCustomers.map((customer) => {
      const status = customer.company.accountStatus || customer.subscription?.status || "ACTIVE";
      return [
        customer.account?.name || "-",
        customer.company.companyName || "-",
        customer.account?.email || "-",
        customer.subscription?.plan || "-",
        customer.subscription?.type || "-",
        String(customer.subscription?.numberOfUsers || 0),
        customer.subscription?.startDate || customer.trial?.startDate || "-",
        customer.subscription?.expiryDate || customer.trial?.expiryDate || "-",
        String(customer.subscription?.finalAmount || 0),
        status,
      ];
    });
    const csv = [
      headers.join(","),
      ...dataRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-tenants-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleCreateCustomer = async () => {
    try {
      setSaving(true);
      setError("");
      await api.createMasterCustomer({ ...customerForm, numberOfUsers: Number(customerForm.numberOfUsers) });
      setCustomerOpen(false);
      setCustomerForm(emptyCustomerForm);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  const openCustomerEdit = (customer: CustomerRow) => {
    setCustomerEditTarget(customer);
    setCustomerEditForm({
      name: customer.account?.name || "",
      email: customer.account?.email || "",
      phone: customer.account?.phone || "",
      companyName: customer.company.companyName || "",
      organisation: customer.company.organisation || "",
      password: "",
      plan: customer.subscription?.plan || "STARTED",
      numberOfUsers: String(customer.subscription?.numberOfUsers || 1),
      billingPeriod: customer.subscription?.billingPeriod || "monthly",
      startDate: customer.subscription?.startDate?.slice(0, 10) || customer.trial?.startDate?.slice(0, 10) || "",
      expiryDate: customer.subscription?.expiryDate?.slice(0, 10) || customer.trial?.expiryDate?.slice(0, 10) || "",
    });
  };

  const handleUpdateCustomer = async () => {
    if (!customerEditTarget) return;
    try {
      setSaving(true);
      setError("");
      await updateMasterCustomer(customerEditTarget.company._id, {
        ...customerEditForm,
        numberOfUsers: Number(customerEditForm.numberOfUsers),
      });
      setCustomerEditTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomerStatus = async (customer: CustomerRow) => {
    const status = customer.company.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      setSaving(true);
      setError("");
      await api.updateMasterCustomerStatus(customer.company._id, status);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update customer status");
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomerAccount = async (customer: CustomerRow) => {
    const companyName = customer.company.companyName;
    if (!window.confirm(`Delete ${companyName} and all of its login accounts and data? This cannot be undone.`)) return;
    try {
      setSaving(true);
      setError("");
      await api.deleteMasterCustomerAccount(customer.company._id);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete customer account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading tenants...</div>;
  }

  return (
    <MasterShell
      active="Tenants"
      title="Tenants & Companies"
      badge={`${customers.length} companies`}
      search="Search tenant, plan, status..."
      action={
        <Button variant="hero" size="sm" onClick={() => { setCustomerForm(emptyCustomerForm); setCustomerOpen(true); }}>
          <Plus className="size-4" /> Add company
        </Button>
      }
    >
      <StatGrid items={stats} />

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Panel title="All companies" subtitle="Manage plans, licences and billing status">
        <div className=" flex flex-wrap mb-4 items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1 min-w-[220px] mt-5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, company, login, plan, status..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none ring-0 placeholder:text-muted-foreground"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div>
               <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Start date</span>
                <br />
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
               
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                  aria-label="Start date"
                />
              </div>
</div>
<div>

                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">End date</span>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                  aria-label="End date"
                />
              </div>
              </div>



                <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="gap-1 mt-5"
            >
              Clear dates
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadData()} className="gap-1 mt-5">
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={exportTenantsCsv}
              className="gap-1 bg-blue-600 text-white hover:bg-blue-700 mt-5"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            </div>
          
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Company</th>
                <th className="p-3">Company Login</th>
                <th className="p-3">Plan / Type</th>
                <th className="p-3">Users</th>
                <th className="p-3">Start</th>
                <th className="p-3">Expiry</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const subscription = customer.subscription;
                const hasTrial = Boolean(customer.trial);
                const isTrialOnly = hasTrial && !(subscription?.type || "").toUpperCase().includes("PAID");
                const isPaidConverted = Boolean(subscription?.type && subscription.type.toUpperCase() === "PAID") || (!hasTrial && Boolean(subscription?.plan));
                const status = customer.company.accountStatus || subscription?.status || "ACTIVE";
                const companyLogin = customer.account?.email || "-";
                const rowStatusClass = isTrialOnly
                  ? "bg-red-50/80 border-red-200"
                  : isPaidConverted
                    ? "bg-emerald-50/80 border-emerald-200"
                    : "bg-amber-50/70 border-amber-200";
                const statusBadgeClass = isTrialOnly
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : isPaidConverted
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200";

                return (
                  <tr
                    key={customer.company._id}
                    className={`border-t align-top transition-colors hover:bg-secondary/40 ${rowStatusClass}`}
                  >
                    <td className="p-3">
                      <div className="font-medium">{customer.account?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{customer.account?.phone || "-"}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{customer.company.companyName || "-"}</div>
                      <div className="text-xs text-muted-foreground">{customer.company.organisation || "-"}</div>
                    </td>
                    <td className="p-3 break-all">{companyLogin}</td>
                    <td className="p-3">
                      <span className="font-medium">{subscription?.plan || customer.trial?.plan || "-"}</span>
                      <div className="text-xs text-muted-foreground">
                        {customer.trial && subscription?.type?.toUpperCase() === "PAID"
                          ? "Paid · Trial converted"
                          : subscription?.type || customer.trial?.status || "-"}
                        {customer.trial && subscription?.type?.toUpperCase() !== "PAID" ? ` · Trial ${customer.trial.status}` : ""}
                      </div>
                    </td>
                    <td className="p-3">{subscription?.numberOfUsers || 0}</td>
                    <td className="p-3">{formatDate(subscription?.startDate || customer.trial?.startDate)}</td>
                    <td className="p-3">{formatDate(subscription?.expiryDate || customer.trial?.expiryDate)}</td>
                    <td className="p-3">₹{Number(subscription?.finalAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3">
                      <Badge variant={isTrialOnly ? "destructive" : "secondary"} className={statusBadgeClass}>
                        {isTrialOnly
                          ? "Free Trial"
                          : isPaidConverted
                            ? status === "ACTIVE"
                              ? "Active"
                              : status
                            : status === "ACTIVE"
                              ? "Active"
                              : status === "SUSPENDED"
                                ? "Suspended"
                                : status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openCustomerEdit(customer)} disabled={saving}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void toggleCustomerStatus(customer)} disabled={saving}>
                          {status === "SUSPENDED" ? "Activate" : "Suspend"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteCustomerAccount(customer)} disabled={saving}>
                          Delete account
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Revenue trend by plan" subtitle="Auto-derived from live tenant billing data" className="lg:col-span-2">
          <div className="mt-4 flex h-56 items-end justify-around gap-2">
            {[
              { m: "STARTED", h: Math.max(20, (planDistribution[0]?.count || 0) * 8) },
              { m: "PRO", h: Math.max(20, (planDistribution[1]?.count || 0) * 8) },
              { m: "TRIAL", h: Math.max(20, (planDistribution[2]?.count || 0) * 8) },
            ].map((item) => (
              <div key={item.m} className="flex w-full flex-col items-center gap-2">
                <div className="w-full max-w-[48px] rounded-t-lg bg-primary/80" style={{ height: `${item.h}px` }} />
                <span className="text-xs text-muted-foreground">{item.m}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Plan distribution" subtitle="Tenant split by plan">
          <div className="space-y-4">
            {planDistribution.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-sm">
                  <span>{p.plan}</span>
                  <span className="text-muted-foreground">{p.count}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div className={`h-2 rounded-full ${p.color}`} style={{ width: `${p.width}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="size-4" />
              <span className="text-sm font-medium">
                {
                  customers.filter(
                    (customer) => String(customer.company?.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED"
                  ).length
                }{" "}
                companies need attention
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Current total outstanding:{" "}
              {formatMoney(customers.reduce((sum, customer) => sum + Number(customer.subscription?.finalAmount || 0), 0))}
            </p>
          </div>
        </Panel>
      </div>

      {/* Create customer dialog */}
      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create customer access</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["name", "Name"],
                ["email", "Email"],
                ["password", "Password"],
                ["phone", "Phone"],
                ["companyName", "Company name"],
                ["organisation", "Organisation"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className={key === "companyName" || key === "organisation" ? "col-span-2" : ""}>
                <Label>{label}</Label>
                <Input
                  type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                  value={(customerForm as any)[key]}
                  onChange={(e) => setCustomerForm({ ...customerForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <Label>Access type</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={customerForm.accessType}
                onChange={(e) => setCustomerForm({ ...customerForm, accessType: e.target.value })}
              >
                <option value="MANUAL">Manual / Permanent</option>
                <option value="FREE_TRIAL">7-Day Free Trial</option>
                <option value="STARTED">Started Plan</option>
                <option value="PRO">Pro Plan</option>
              </select>
            </div>
            <div>
              <Label>Plan</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={customerForm.plan}
                onChange={(e) => setCustomerForm({ ...customerForm, plan: e.target.value })}
              >
                <option value="STARTED">Started · ₹199</option>
                <option value="PRO">Pro · ₹499</option>
              </select>
            </div>
            <div>
              <Label>Users</Label>
              <Input
                type="number"
                min={1}
                value={customerForm.numberOfUsers}
                onChange={(e) => setCustomerForm({ ...customerForm, numberOfUsers: e.target.value })}
              />
            </div>
            <div>
              <Label>Billing</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={customerForm.billingPeriod}
                onChange={(e) => setCustomerForm({ ...customerForm, billingPeriod: e.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="halfyearly">6 Months · 10% off</option>
                <option value="annual">Annual · 15% off</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateCustomer()} disabled={saving}>
              {saving ? "Creating..." : "Create customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit customer dialog */}
      <Dialog open={!!customerEditTarget} onOpenChange={(open) => !open && setCustomerEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit customer account</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["name", "Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["companyName", "Company name"],
                ["organisation", "Organisation"],
                ["password", "New password"],
                ["startDate", "Start date"],
                ["expiryDate", "Expiry date"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className={key === "companyName" || key === "organisation" ? "col-span-2" : ""}>
                <Label>{label}</Label>
                <Input
                  type={
                    key === "email"
                      ? "email"
                      : key === "password"
                      ? "password"
                      : key === "startDate" || key === "expiryDate"
                      ? "date"
                      : "text"
                  }
                  value={(customerEditForm as any)[key]}
                  onChange={(event) => setCustomerEditForm({ ...customerEditForm, [key]: event.target.value })}
                />
              </div>
            ))}
            <div>
              <Label>Plan</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={customerEditForm.plan}
                onChange={(event) => setCustomerEditForm({ ...customerEditForm, plan: event.target.value })}
              >
                <option value="STARTED">Started</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
            <div>
              <Label>Users</Label>
              <Input
                type="number"
                min={1}
                value={customerEditForm.numberOfUsers}
                onChange={(event) => setCustomerEditForm({ ...customerEditForm, numberOfUsers: event.target.value })}
              />
            </div>
            <div>
              <Label>Billing</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={customerEditForm.billingPeriod}
                onChange={(event) => setCustomerEditForm({ ...customerEditForm, billingPeriod: event.target.value })}
              >
                <option value="monthly">Monthly</option>
                <option value="halfyearly">6 Months · 10% off</option>
                <option value="annual">Annual · 15% off</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomerEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateCustomer()} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterShell>
  );
}

export default TenantsPage;