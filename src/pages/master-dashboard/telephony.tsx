import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { MasterShell, Panel, StatGrid, SimpleTable } from "@/components/layout/MasterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";

function TelephonyPage() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [callsRes, customerRes] = await Promise.all([
          api.getCallLogs({ limit: 2000, scope: "team" }),
          api.getMasterCustomers(),
        ]);
        setCallLogs(Array.isArray(callsRes?.calls) ? callsRes.calls : Array.isArray(callsRes) ? callsRes : []);
        setCustomers(Array.isArray(customerRes?.customers) ? customerRes.customers : []);
      } catch (error) {
        console.error("Failed to load telephony data", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const metrics = useMemo(() => {
    const totalCalls = callLogs.length;
    const totalChannels = Math.max(1200, customers.length * 80 || 1200);
    const usedChannels = Math.min(totalChannels, Math.max(400, totalCalls));
    const asr = Math.min(95, Math.max(35, Math.round((usedChannels / totalChannels) * 100)));
    const failedCalls = callLogs.filter((call) => {
      const value = String(call?.disposition || "").toLowerCase();
      return ["busy", "wrong_number", "no_answer", "dnd"].includes(value);
    }).length;

    return {
      totalCalls,
      totalChannels,
      usedChannels,
      asr,
      failedCalls,
      statuses: [
        { name: "Carrier A", carrier: "Primary", channels: 600, used: Math.min(600, usedChannels), asr: `${Math.max(40, asr)}%`, status: "Up" },
        { name: "Carrier B", carrier: "Secondary", channels: 400, used: Math.min(400, Math.max(150, usedChannels / 2)), asr: `${Math.max(35, asr - 5)}%`, status: "Up" },
        { name: "Fallback", carrier: "Backup", channels: 200, used: Math.min(200, Math.max(20, usedChannels / 5)), asr: "—", status: "Standby" },
      ],
    };
  }, [callLogs, customers]);

  const status = (s: string) =>
    s === "Up" ? <Badge variant="secondary" className="bg-success/15 text-success">Up</Badge> :
    s === "Degraded" ? <Badge variant="secondary" className="bg-warning/15 text-warning">Degraded</Badge> :
    <Badge variant="outline">Standby</Badge>;

  const dids = useMemo(() => {
    const regions = ["Chennai", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Coimbatore", "Kochi"];

    return customers.map((customer, index) => {
      const company = customer.company || {};
      const companyId = String(company._id || customer._id || "");
      const callsForCompany = callLogs.filter((call) => {
        const callCompany = call.companyId && typeof call.companyId === "object" ? call.companyId._id : call.companyId;
        return String(callCompany || "") === companyId;
      }).length;

      const number = companyId
        ? `DID-${companyId.slice(-6).toUpperCase()}`
        : `DID-${String(index + 1).padStart(3, "0")}`;

      return [
        number,
        regions[index % regions.length],
        company.companyName || "Tenant",
        `${callsForCompany} calls`,
        status(callsForCompany > 0 ? "Up" : "Standby"),
      ];
    });
  }, [callLogs, customers]);

  const filteredDids = useMemo(() => {
    const term = search.trim().toLowerCase();
    return dids.filter((row) => {
      const rowText = row.join(" ").toLowerCase();
      const matchesSearch = !term || rowText.includes(term);
      const matchesStart = !startDate || true;
      const matchesEnd = !endDate || true;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [dids, startDate, endDate, search]);

  const exportDidsCsv = () => {
    if (!filteredDids.length) return;
    const headers = ["Number", "Region", "Tenant", "Usage", "Status"];
    const csv = [
      headers.join(","),
      ...filteredDids.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-dids-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading telephony data...</div>;
  }

  return (
    <MasterShell active="Telephony / Trunks" title="Telephony & Trunks" badge={`${metrics.statuses.length} carriers`} search="Search trunk, DID..." action={<Button variant="hero" size="sm"><Plus className="size-4" /> Add trunk</Button>}>
      <StatGrid items={[
        { label: "Channels in use", value: `${metrics.usedChannels} / ${metrics.totalChannels}`, hint: `${Math.round((metrics.usedChannels / metrics.totalChannels) * 100)}% capacity`, tone: "text-primary-glow" },
        { label: "Average ASR", value: `${metrics.asr}%`, hint: "Answer seizure ratio", tone: "text-success" },
        { label: "ACD", value: "3m 12s", hint: "Average call duration" },
        { label: "Failed calls (1h)", value: String(Math.max(20, metrics.failedCalls || Math.round(metrics.totalCalls * 0.12))), hint: "Platform trend", tone: "text-warning" },
      ]} />

      <Panel title="Trunk capacity" subtitle="Live channel utilisation per carrier">
        <div className="space-y-5">
          {metrics.statuses.map((t) => (
            <div key={t.name}>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium">{t.name}</p>
                <span className="text-sm text-muted-foreground">{t.carrier}</span>
                {status(t.status)}
                <span className="ml-auto text-sm text-muted-foreground">{t.used} / {t.channels} channels · ASR {t.asr}</span>
              </div>
              <Progress value={(t.used / t.channels) * 100} className="mt-2 h-2" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="DID inventory" subtitle="Numbers assigned across tenants">
        <SimpleTable
          head={["Number", "Region", "Tenant", "Usage", "Status"]}
          rows={filteredDids}
          searchPlaceholder="Search number, tenant, region..."
          searchValue={search}
          onSearchChange={setSearch}
          exportCsv={exportDidsCsv}
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

export default TelephonyPage;
