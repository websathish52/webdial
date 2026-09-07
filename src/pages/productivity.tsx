import { useEffect, useMemo, useState } from "react";
import { useCurrentMember } from "@/lib/mock-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Clock,
  CalendarDays,
  UserRound,
  PhoneCall,
  PhoneOff,
  AlarmClock,
  Users,
  Download,
  Filter,
  Search,
  Settings,
  CalendarClock,
  LayoutGrid,
} from "lucide-react";
import api from "@/lib/api";
import { readSelection, writeSelection } from "@/lib/persistent-selection";
import { toast } from "sonner";

type DayStat = {
  label: string;
  sub: string;
  offDuty?: boolean;
  calls?: number;
  duration?: string;
  connects?: string;
  avgCall?: string;
  callsPerHr?: string;
  productive?: string;
  idlePct?: number;
  onDutyPct?: number;
};

type AgentRow = {
  id: string;
  name: string;
  role: string;
  initial: string;
  weeklySummary?: string;
  noActivity?: boolean;
  days: DayStat[];
};

function DayCard({ day }: { day: DayStat }) {
  if (day.offDuty) {
    return (
      <div className="flex min-h-[190px] w-[150px] flex-col items-center justify-center rounded-lg bg-muted/40 px-3 text-center">
        <CalendarDays className="mb-1 h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-blue-700">{day.label}</p>
        <p className="text-[11px] text-muted-foreground">{day.sub}</p>
      </div>
    );
  }

  return (
    <div className="flex w-[150px] flex-col rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-blue-700">{day.label}</p>
          <p className="text-xl font-bold leading-tight">{day.calls}</p>
          <p className="text-[10px] text-muted-foreground">calls</p>
        </div>
      </div>

      <div className="mt-2 space-y-1 text-[10px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Duration</span>
          <span className="font-medium text-foreground">{day.duration}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Connects</span>
          <span className="font-medium text-foreground">{day.connects}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Avg call</span>
          <span className="font-medium text-foreground">{day.avgCall}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Calls/hr</span>
          <span className="font-medium text-foreground">{day.callsPerHr}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Productive</span>
          <span className="font-medium text-blue-700">{day.productive}</span>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-red-400" style={{ width: `${day.idlePct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>Idle {day.idlePct}%</span>
        <span>On duty {day.onDutyPct}%</span>
      </div>
    </div>
  );
}

// Classic view: one boxed cell per day, matching the reference table layout.
function DayCell({ day }: { day: DayStat }) {
  return (
    <div className="flex w-[150px] flex-col gap-1.5 rounded-lg border bg-muted/30 p-2 text-[11px]">
      {day.offDuty ? (
        <div className="flex items-center gap-1.5 font-medium text-red-600">
          <PhoneOff className="h-3 w-3" /> Off Duty
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-medium text-green-700">
          <PhoneCall className="h-3 w-3" /> {day.calls} Calls
        </div>
      )}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <PhoneCall className="h-3 w-3" /> {day.connects ?? "0%"} Connected
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-3 w-3" /> {day.duration ?? "0 sec"}
      </div>
      <div className="flex items-center gap-1.5 text-blue-700">
        <AlarmClock className="h-3 w-3" /> On duty {day.onDutyPct ?? 0}%
      </div>
    </div>
  );
}

type Member = { _id?: string; id?: string; name?: string; email?: string; role?: string };
type Call = { agent?: string | { _id?: string; id?: string; name?: string }; duration?: number; calledAt?: string };
const agentId = (agent: Call["agent"]) => (typeof agent === "string" ? agent : agent?._id || agent?.id || "");
const agentName = (agent: Call["agent"], members: Member[]) =>
  typeof agent === "object" && agent?.name
    ? agent.name
    : members.find((item) => String(item._id || item.id) === String(agentId(agent)))?.name || String(agent || "Unknown");
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

// Zero-padded, always-valid "yyyy-mm-dd" string for a Date — used as the single
// source of truth for both the day key and the display label, so the two can
// never drift apart or produce "Invalid Date".
const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function ProductivityV2Page() {
  const member = useCurrentMember();
  const [modernView, setModernView] = useState(true);
  const [calls, setCalls] = useState<Call[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberFilter, setMemberFilter] = useState(() => readSelection(member, "productivity-member") || "all");
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return toDateKey(date);
  });
  const [toDate, setToDate] = useState(() => toDateKey(new Date()));
  const [sort, setSort] = useState("name");
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    writeSelection(member, "productivity-member", memberFilter);
  }, [member, memberFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const canViewTeam = Boolean(member);
      const results = await Promise.allSettled([
        api.getCallLogs({ limit: 50000, ...(canViewTeam ? { scope: "team" } : {}) }),
        api.getMembers(),
      ]);
      const callsResult = results[0];
      const membersResult = results[1];
      setCalls(callsResult.status === "fulfilled" && Array.isArray(callsResult.value?.calls) ? callsResult.value.calls : []);
      const available = membersResult.status === "fulfilled" && Array.isArray(membersResult.value) ? membersResult.value : [];
      const scoped = canViewTeam ? available : available.filter((item: Member) => String(item._id || item.id) === String(member?.id));
      const current = member ? [{ id: member.id, name: member.name, email: member.email, role: member.role }] : [];
      setMembers(
        [...current, ...scoped].filter((item, index, list) => {
          const id = String(item._id || item.id || "");
          return Boolean(id) && list.findIndex((candidate) => String(candidate._id || candidate.id || "") === id) === index;
        })
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") setLoadError(failed.reason?.message || "Some productivity data could not be loaded");
    } catch (error: any) {
      setLoadError(error?.message || "Could not load productivity data");
      toast.error(error?.message || "Could not load productivity data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  // Builds the list of calendar days between fromDate and toDate (inclusive).
  // Guards against an empty/invalid range so the table can never render
  // "Invalid Date" headers or run away past 31 columns.
  const dateDays = useMemo(() => {
    if (!fromDate || !toDate) return [];
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
    const dates: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end && dates.length < 31) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [fromDate, toDate]);

  const from = dateDays[0]?.getTime() || 0;
  const to = dateDays.length ? new Date(`${toDate}T23:59:59.999`).getTime() : 0;

  const filteredCalls = dateDays.length
    ? calls.filter((call) => {
        const calledAt = new Date(call.calledAt || 0).getTime();
        return (
          calledAt >= from &&
          calledAt <= to &&
          (memberFilter === "all" || agentId(call.agent) === memberFilter || agentName(call.agent, members) === memberFilter)
        );
      })
    : [];

  const rows = useMemo<AgentRow[]>(
    () =>
      members
        .map((item) => {
          const id = item._id || item.id || "";
          const name = item.name || item.email || "Member";
          const agentCalls = filteredCalls.filter((call) => agentId(call.agent) === id || agentName(call.agent, members) === name);
          const seconds = agentCalls.reduce((sum, call) => sum + Number(call.duration || 0), 0);
          const connected = agentCalls.filter((call) => Number(call.duration || 0) > 0).length;

          const daily = dateDays.map((date) => {
            const dateKey = toDateKey(date);
            const label = date
              .toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })
              .toUpperCase();
            const dayCalls = agentCalls.filter((call) => String(call.calledAt || "").slice(0, 10) === dateKey);
            if (!dayCalls.length) {
              return { label, sub: "No calls", offDuty: true };
            }
            const daySeconds = dayCalls.reduce((sum, call) => sum + Number(call.duration || 0), 0);
            const dayConnected = dayCalls.filter((call) => Number(call.duration || 0) > 0).length;
            const connectPct = Math.round((dayConnected / dayCalls.length) * 100);
            return {
              label,
              sub: "",
              calls: dayCalls.length,
              duration: formatDuration(daySeconds),
              connects: `${connectPct}%`,
              avgCall: formatDuration(Math.round(daySeconds / dayCalls.length)),
              callsPerHr: `${(dayCalls.length / 8).toFixed(1)}`,
              productive: `${connectPct}%`,
              idlePct: Math.max(0, 100 - connectPct),
              onDutyPct: connectPct,
            };
          });

          return {
            id,
            name,
            role: item.role || "Team member",
            initial: name.slice(0, 2).toUpperCase(),
            weeklySummary: `${agentCalls.length} calls · ${formatDuration(seconds)} · ${
              agentCalls.length ? Math.round((connected / agentCalls.length) * 100) : 0
            }% connected`,
            noActivity: agentCalls.length === 0,
            days: daily,
            _calls: agentCalls.length,
            _productive: agentCalls.length ? Math.round((connected / agentCalls.length) * 100) : 0,
          };
        })
        .filter((row) => !activeOnly || row._calls > 0)
        .sort((a, b) => {
          if (sort === "calls") return b._calls - a._calls;
          if (sort === "connection" || sort === "productive") return b._productive - a._productive;
          return a.name.localeCompare(b.name);
        })
        .map(({ _calls, _productive, ...row }) => row),
    [activeOnly, dateDays, filteredCalls, members, sort]
  );

  const exportData = () => {
    const csv = [
      "Agent,Date,Calls,Duration,Connected,Productive",
      ...rows.flatMap((row) =>
        row.days.map((day) => `${row.name},${day.label},${day.calls || 0},${day.duration || "0m 0s"},${day.connects || "0%"},${day.productive || "0%"}`)
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "productivity-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const dateRangeLabel = dateDays.length
    ? `${dateDays[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${dateDays[dateDays.length - 1].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
    : "Select a valid date range";

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading productivity...</div>;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Productivity</h1>
              <p className="text-sm text-white/85">Track team attendance and productivity metrics</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
              <Users className="h-3.5 w-3.5" /> Team Tracking
            </button>
            <button onClick={exportData} className="flex items-center gap-1.5 rounded-md border border-blue-600 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <Clock className="h-3.5 w-3.5" /> Active Time
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <CalendarDays className="h-3.5 w-3.5" /> Date Range
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <UserRound className="h-3.5 w-3.5" /> Member Filter
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <PhoneCall className="h-3.5 w-3.5" /> Call Tracking
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="overflow-hidden rounded-2xl border-t-4 border-t-blue-600">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-blue-600" /> Filters
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className={!modernView ? "font-semibold text-blue-700" : "text-muted-foreground"}>Classic View</span>
              <Switch checked={modernView} onCheckedChange={setModernView} />
              <span className={modernView ? "font-semibold text-blue-700" : "text-muted-foreground"}>Modern View</span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 border-blue-600 text-blue-700 hover:bg-blue-50">
              <Settings className="h-3.5 w-3.5" /> Set Office Timing
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 p-4 pt-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Members</span>
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {members
                  .filter((item) => item._id || item.id)
                  .map((item) => (
                    <SelectItem key={item._id || item.id} value={item._id || item.id || ""}>
                      {item.name || item.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Date Range</span>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <input
                aria-label="Start date"
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-[118px] bg-transparent text-sm outline-none"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                aria-label="End date"
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-[118px] bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Sort</span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="By name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">By name</SelectItem>
                <SelectItem value="calls">By total calls</SelectItem>
                <SelectItem value="connection">By connection rate %</SelectItem>
                <SelectItem value="productive">By productive time %</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            Active agents only
          </div>

          <div className="ml-auto flex gap-2">
            <Button onClick={() => void loadData()} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Button onClick={exportData} variant="outline" className="gap-1.5 border-blue-600 text-blue-700 hover:bg-blue-50">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </Card>

      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError}. <button type="button" onClick={() => void loadData()} className="font-semibold underline">Retry</button>
        </div>
      )}

      {!dateDays.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {dateRangeLabel} — pick a start date on or before the end date.
        </div>
      )}

      {/* Data */}
      <Card className="overflow-hidden rounded-2xl">
        <div className="h-1 w-full bg-blue-600" />
        <div className="flex items-center gap-2 border-b p-4 text-sm font-semibold">
          <LayoutGrid className="h-4 w-4 text-blue-600" /> Productivity Data
        </div>

        {modernView ? (
          <div className="space-y-4 p-4">
            {rows.map((agent) => (
              <Card key={agent.id} className="rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {agent.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase text-muted-foreground">Weekly summary</p>
                    {agent.noActivity ? (
                      <p className="text-xs font-medium text-muted-foreground">No activity this week</p>
                    ) : (
                      <p className="text-xs font-medium text-blue-700">{agent.weeklySummary}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto p-4">
                  {agent.days.map((day, i) => (
                    <DayCard key={i} day={day} />
                  ))}
                </div>
              </Card>
            ))}
            {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No members to show.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Members</th>
                  {dateDays.map((date) => (
                    <th key={toDateKey(date)} className="px-2 py-3 text-center font-medium">
                      {date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((agent) => (
                  <tr key={agent.id} className="border-b last:border-b-0">
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                          {agent.initial}
                        </div>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </td>
                    {agent.days.map((day, i) => (
                      <td key={i} className="px-2 py-4 align-top">
                        <DayCell day={day} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={dateDays.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                      No members to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>Rows per page: 5</span>
          <span>1/1 of {rows.length}</span>
        </div>
      </Card>
    </div>
  );
}