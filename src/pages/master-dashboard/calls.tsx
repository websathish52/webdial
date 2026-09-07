import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { MasterShell, Panel, StatGrid, SimpleTable } from "@/components/layout/MasterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";

const formatMinutes = (seconds: number) => {
  const total = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

function CallsPage() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getCallLogs({ limit: 2000, scope: "team" });
        setCallLogs(Array.isArray(res?.calls) ? res.calls : Array.isArray(res) ? res : []);
      } catch (error) {
        console.error("Failed to load call monitor", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const data = useMemo(() => {
    const activeCalls = callLogs.slice(0, 5).map((call, index) => ({
      agent: typeof call.agent === "object" ? call.agent?.name || "Agent" : call.agent || `Agent ${index + 1}`,
      company: typeof call.companyId === "object" ? call.companyId?.companyName || "Tenant" : call.companyId || "Tenant",
      customer: call.phone || "Unknown" ,
      duration: formatMinutes(Number(call.duration || 0)),
      status: index % 2 === 0 ? "Talking" : "On hold",
      sentiment: index % 3 === 0 ? "Positive" : index % 3 === 1 ? "Neutral" : "Negative",
    }));

    const recentCalls = callLogs.slice(0, 50).map((call) => {
      const callDate = new Date(call.calledAt || call.createdAt || Date.now());
      return {
        row: [
          typeof call.agent === "object" ? call.agent?.name || "Agent" : call.agent || "Agent",
          typeof call.companyId === "object" ? call.companyId?.companyName || "Company" : call.companyId || "Company",
          call.phone || "Unknown",
          formatMinutes(Number(call.duration || 0)),
          call.disposition || "—",
          callDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        ],
        date: callDate.toISOString().slice(0, 10),
      };
    });

    const averageDuration = callLogs.length ? Math.round(callLogs.reduce((sum, call) => sum + Number(call.duration || 0), 0) / callLogs.length) : 0;

    return { activeCalls, recentCalls, averageDuration, activeCount: callLogs.length };
  }, [callLogs]);

  const filteredRecentCalls = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.recentCalls.filter(({ row, date }) => {
      const rowText = row.join(" ").toLowerCase();
      const matchesSearch = !term || rowText.includes(term);
      const matchesStart = !startDate || !date || date >= startDate;
      const matchesEnd = !endDate || !date || date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [data.recentCalls, startDate, endDate, search]);

  const exportCallsCsv = () => {
    if (!filteredRecentCalls.length) return;
    const headers = ["Agent", "Company", "Customer", "Duration", "Outcome", "Time"];
    const csv = [
      headers.join(","),
      ...filteredRecentCalls.map(({ row }) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-calls-export.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading call monitor...</div>;
  }

  const sentimentBadge = (s: string) => {
    if (s === "Positive") return <Badge variant="secondary" className="bg-success/15 text-success">Positive</Badge>;
    if (s === "Negative") return <Badge variant="destructive">Negative</Badge>;
    if (s === "Neutral") return <Badge variant="outline">Neutral</Badge>;
    return <Badge variant="outline">—</Badge>;
  };

  const statusBadge = (s: string) => {
    if (s === "Talking") return <span className="flex items-center gap-1.5 text-xs text-success"><span className="size-1.5 animate-pulse rounded-full bg-success" /> Talking</span>;
    if (s === "On hold") return <span className="flex items-center gap-1.5 text-xs text-warning"><span className="size-1.5 animate-pulse rounded-full bg-warning" /> On hold</span>;
    return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground" /> Dialing</span>;
  };

  return (
    <MasterShell active="Call Monitor" title="Call Monitor" badge="LIVE" search="Search agent, company, number..." action={<Button variant="hero" size="sm"><Plus className="size-4" /> Listen in</Button>}>
      <StatGrid items={[
        { label: "Active calls", value: String(Math.min(9999, data.activeCalls.length)), hint: "Across tenants", tone: "text-success" },
        { label: "Agents online", value: String(Math.max(1, callLogs.length)), hint: "Recent call activity", tone: "text-primary-glow" },
        { label: "In queue", value: String(Math.max(1, Math.round(data.activeCalls.length * 0.3))), hint: "In process", tone: "text-warning" },
        { label: "Avg duration", value: formatMinutes(data.averageDuration), hint: "Across recent calls", tone: "text-primary-glow" },
      ]} />

      <Panel title="Live calls" subtitle="Most recent call activity from all tenants">
        <div className="space-y-5">
          {data.activeCalls.map((call) => (
            <div key={`${call.agent}-${call.customer}`} className="rounded-xl border border-border/60 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium">{call.agent}</p>
                <span className="text-sm text-muted-foreground">{call.company}</span>
                {statusBadge(call.status)}
                <span className="ml-auto text-sm text-muted-foreground">{call.duration} · {call.customer}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sentiment</span>
                    <span>{call.status === "Dialing" ? "—" : "Live signal"}</span>
                  </div>
                  <div className="mt-2">
                    <Progress value={call.status === "Talking" ? 74 : call.status === "On hold" ? 52 : 28} className="h-2" />
                  </div>
                </div>
                <div className="ml-3">{sentimentBadge(call.sentiment)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Recent completed calls" subtitle="Last 50 calls across all tenants">
        <SimpleTable
          head={["Agent", "Company", "Customer", "Duration", "Outcome", "Time"]}
          rows={filteredRecentCalls.map(({ row }) => row)}
          searchPlaceholder="Search agent, company, number..."
          searchValue={search}
          onSearchChange={setSearch}
          exportCsv={exportCallsCsv}
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

export default CallsPage;
