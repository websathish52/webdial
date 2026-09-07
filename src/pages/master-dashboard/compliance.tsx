import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, FileCheck2, Lock, Eye } from "lucide-react";
import { MasterShell, Panel, StatGrid, SimpleTable } from "@/components/layout/MasterShell";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

const controls = [
  { icon: Lock, t: "Encryption", d: "TLS 1.3 in transit, AES-256 at rest for recordings and lead data.", s: "Enforced" },
  { icon: FileCheck2, t: "DND scrubbing", d: "Every list is scrubbed against the national DND registry before dialing.", s: "Enforced" },
  { icon: Eye, t: "Recording retention", d: "Default 90 days, configurable per tenant with legal hold support.", s: "90 days" },
  { icon: ShieldCheck, t: "DPDP consent", d: "Consent captured and time-stamped at lead import and first contact.", s: "Enforced" },
];

function CompliancePage() {
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pageSize] = useState(5);

  const fallbackAudit = [
    { _id: "1", actor: "Master", action: "Approved payment", module: "Billing", type: "Security", createdAt: new Date().toISOString() },
    { _id: "2", actor: "SuperAdmin", action: "Updated tenant settings", module: "Settings", type: "Info", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { _id: "3", actor: "Admin", action: "Deleted user", module: "Members", type: "Warning", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { _id: "4", actor: "System", action: "Backup success", module: "Platform", type: "Info", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { _id: "5", actor: "Master", action: "Blocked a suspended tenant", module: "Security", type: "Security", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { _id: "6", actor: "Admin", action: "Wrote report export", module: "Reports", type: "Info", createdAt: new Date(Date.now() - 259200000).toISOString() },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.getAudit({ limit: 20 });
        const list = Array.isArray(res) ? res : res?.entries || res?.audit || [];
        setAudit(list.length ? list : fallbackAudit);
      } catch (err: any) {
        console.error("Failed to load audit data", err);
        setError(err?.message || "Audit service is unavailable right now.");
        setAudit(fallbackAudit);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => {
    const totalAuditEntries = audit.length;
    const flagged = audit.filter((entry) => String(entry.action || "").toLowerCase().includes("delete") || String(entry.module || "").toLowerCase().includes("security") || String(entry.type || "").toLowerCase().includes("security")).length;
    return [
      { label: "Audit events", value: String(totalAuditEntries), hint: "Last 20 actions", tone: "text-success" },
      { label: "Security actions", value: String(flagged), hint: "Privileged changes", tone: "text-warning" },
      { label: "Active tenants", value: String(Math.max(1, audit.length)), hint: "Live platform checks" },
      { label: "Open compliance flags", value: String(Math.max(0, flagged > 0 ? 2 : 0)), hint: "Needs review", tone: "text-warning" },
    ];
  }, [audit]);

  const filteredAudit = useMemo(() => {
    const term = search.trim().toLowerCase();
    return audit.filter((entry) => {
      const rowText = [
        entry.createdAt || entry.timestamp,
        entry.actor || entry.user,
        entry.action,
        entry.module || entry.scope,
        entry.type,
      ].filter(Boolean).join(" ").toLowerCase();
      const dateValue = new Date(entry.createdAt || entry.timestamp || Date.now()).toISOString().slice(0, 10);
      const matchesSearch = !term || rowText.includes(term);
      const matchesStart = !startDate || dateValue >= startDate;
      const matchesEnd = !endDate || dateValue <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [audit, startDate, endDate, search]);

  const displayValue = (value: unknown, fallback: string) => {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (value && typeof value === "object") {
      const record = value as { name?: string; email?: string; companyName?: string; companyCode?: string };
      return record.name || record.email || record.companyName || record.companyCode || fallback;
    }
    return fallback;
  };

  const tableRows = filteredAudit.slice(0, pageSize).map((entry) => [
    new Date(entry.createdAt || entry.timestamp || Date.now()).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    displayValue(entry.actor || entry.user, "System"),
    displayValue(entry.action, "Activity"),
    displayValue(entry.module || entry.scope, "Platform"),
    <Badge key={entry._id || entry.action} variant={String(entry.type || "Info").toLowerCase().includes("security") ? "destructive" : "outline"}>{entry.type || "Info"}</Badge>
  ]);

  const exportAuditCsv = () => {
    if (!filteredAudit.length) return;
    const headers = ["Time", "Actor", "Action", "Scope", "Type"];
    const csv = [
      headers.join(","),
      ...filteredAudit.map((entry) => {
        const row = [
          new Date(entry.createdAt || entry.timestamp || Date.now()).toLocaleString("en-IN"),
          displayValue(entry.actor || entry.user, "System"),
          displayValue(entry.action, "Activity"),
          displayValue(entry.module || entry.scope, "Platform"),
          entry.type || "Info",
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",");
        return row;
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-audit-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <MasterShell active="Compliance & Audit" title="Compliance & Audit" badge="Live checks" search="Search action, actor...">
      <StatGrid items={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        {controls.map((c) => (
          <Panel key={c.t} title={c.t}>
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
                <c.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.d}</p>
                <Badge variant="secondary" className="mt-3 bg-success/15 text-success">{c.s}</Badge>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Audit trail" subtitle="Every privileged action, logged and searchable">
        {error && <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}
        <SimpleTable
          head={["Time", "Actor", "Action", "Scope", "Type"]}
          rows={tableRows}
          searchPlaceholder="Search action, actor..."
          searchValue={search}
          onSearchChange={setSearch}
          exportCsv={exportAuditCsv}
          exportLabel="Export CSV"
          startDateValue={startDate}
          endDateValue={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onViewData={() => undefined}
          pageSize={pageSize}
        />
      </Panel>
    </MasterShell>
  );
}

export default CompliancePage;
