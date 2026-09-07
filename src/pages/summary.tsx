import { useEffect, useMemo, useState } from "react";
import { useCurrentMember } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { readSelection, writeSelection } from "@/lib/persistent-selection";
import { toast } from "sonner";
import { BarChart3, CalendarDays, Clock3, Download, Filter, LayoutDashboard, Phone, PhoneCall, PhoneOff, RefreshCw, Search, Users } from "lucide-react";

type Member = { _id?: string; id?: string; name?: string; email?: string };
type Call = { agent?: string | { _id?: string; id?: string; name?: string }; duration?: number; calledAt?: string };
type DayRow = { date: string; calls: number; mins: number; connected: number; notConnected: number };
type MemberRow = { id: string; name: string; email?: string; days: DayRow[] };

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
const getMemberId = (member: Member) => String(member._id || member.id || member.email || member.name || "unknown");
const getAgentId = (agent: Call["agent"]) => typeof agent === "string" ? agent : String(agent?._id || agent?.id || "");

export default function SummaryPage() {
  const currentMember = useCurrentMember();
  const canViewTeam = Boolean(currentMember);
  const today = new Date();
  const [calls, setCalls] = useState<Call[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberFilter, setMemberFilter] = useState(() => readSelection(currentMember, "summary-member") || "all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [endDate, setEndDate] = useState(toDateInput(today));
  const [tablePage, setTablePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 5;

  useEffect(() => {
    writeSelection(currentMember, "summary-member", memberFilter);
  }, [currentMember, memberFilter]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const [callsResponse, membersResponse] = await Promise.all([
        api.getCallLogs({ limit: 50000, ...(canViewTeam ? { scope: "team" } : {}) }),
        api.getMembers(),
      ]);
      const availableMembers = Array.isArray(membersResponse) ? membersResponse : [];
      setMembers(availableMembers);
      setCalls(Array.isArray(callsResponse?.calls) ? callsResponse.calls : []);
    } catch (error: any) {
      toast.error(error?.message || "Could not load team summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSummary(); }, [currentMember]);

  const days = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
    const result: Date[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) result.push(new Date(cursor));
    return result;
  }, [startDate, endDate]);

  const memberMap = useMemo(() => new Map(members.map((item) => [getMemberId(item), item])), [members]);
  const callAgentName = (call: Call) => {
    const agentId = getAgentId(call.agent);
    const member = memberMap.get(agentId);
    return typeof call.agent === "object" && call.agent?.name ? call.agent.name : member?.name || member?.email || "Unknown";
  };

  const filteredCalls = useMemo(() => calls.filter((call) => {
    const timestamp = new Date(call.calledAt || 0).getTime();
    const from = new Date(`${startDate}T00:00:00`).getTime();
    const to = new Date(`${endDate}T23:59:59.999`).getTime();
    const id = getAgentId(call.agent);
    return timestamp >= from && timestamp <= to && (memberFilter === "all" || id === memberFilter || callAgentName(call) === memberFilter);
  }), [calls, startDate, endDate, memberFilter, memberMap]);

  const rows = useMemo<MemberRow[]>(() => {
    const grouped = new Map<string, MemberRow>();
    members.forEach((member) => {
      const id = getMemberId(member);
      grouped.set(id, { id, name: member.name || member.email || "Member", email: member.email, days: days.map((date) => ({ date: date.toISOString(), calls: 0, mins: 0, connected: 0, notConnected: 0 })) });
    });
    filteredCalls.forEach((call) => {
      const id = getAgentId(call.agent) || callAgentName(call);
      if (!grouped.has(id)) grouped.set(id, { id, name: callAgentName(call), days: days.map((date) => ({ date: date.toISOString(), calls: 0, mins: 0, connected: 0, notConnected: 0 })) });
      const row = grouped.get(id)!;
      const day = row.days.find((item) => item.date.slice(0, 10) === String(call.calledAt || "").slice(0, 10));
      if (day) {
        day.calls += 1;
        day.mins += Math.round(Number(call.duration || 0) / 60);
        if (Number(call.duration || 0) > 0) day.connected += 1;
        else day.notConnected += 1;
      }
    });
    const term = search.trim().toLowerCase();
    return Array.from(grouped.values()).filter((row) => (memberFilter === "all" || row.id === memberFilter || row.name === memberFilter) && (!term || `${row.name} ${row.email || ""}`.toLowerCase().includes(term))).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, days, filteredCalls, memberFilter, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(tablePage, totalPages);
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalMinutes = Math.round(filteredCalls.reduce((sum, call) => sum + Number(call.duration || 0), 0) / 60);

  const exportCsv = () => {
    const lines = ["Member,Date,Calls,Minutes,Connected,Not Connected", ...rows.flatMap((row) => row.days.map((day) => `${row.name},${day.date.slice(0, 10)},${day.calls},${day.mins},${day.connected},${day.notConnected}`))];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    link.download = "team-summary.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading team summary...</div>;

  return (
    <div className="min-h-full bg-slate-50 p-6"><div className="mx-auto max-w-7xl space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg"><div className="relative flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-xl bg-white/15"><LayoutDashboard className="size-7" /></div><div><p className="text-sm font-medium text-blue-100">Reports and analytics</p><h1 className="text-2xl font-bold">Summary</h1><p className="mt-1 text-sm text-blue-100">Team performance summary and call analytics.</p></div></div><Button variant="secondary" onClick={() => void loadSummary()} className="gap-2"><RefreshCw className="size-4" /> Refresh</Button></div><div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Users className="size-4" /> Team analytics</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><CalendarDays className="size-4" /> Date range</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Phone className="size-4" /> Call stats</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Clock3 className="size-4" /> Duration tracking</span></div></div>
      <Card className="border-slate-200 shadow-sm"><CardContent className="flex flex-wrap items-end justify-between gap-4 p-5"><div className="flex items-center gap-2 font-medium text-slate-900"><Filter className="size-4 text-blue-600" /> Filter summary</div><div className="flex flex-wrap items-end gap-3"><div><label className="mb-1 block text-xs text-slate-500">Member</label><Select value={memberFilter} onValueChange={(value) => { setMemberFilter(value); setTablePage(1); }}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All members</SelectItem>{members.map((item) => <SelectItem key={getMemberId(item)} value={getMemberId(item)}>{item.name || item.email || "Member"}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1 block text-xs text-slate-500">Search member</label><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setTablePage(1); }} placeholder="Name or email" className="w-48 pl-9" /></div></div><div><label className="mb-1 block text-xs text-slate-500">Start date</label><Input type="date" value={startDate} max={endDate} onChange={(event) => { setStartDate(event.target.value); setTablePage(1); }} className="w-36" /></div><div><label className="mb-1 block text-xs text-slate-500">End date</label><Input type="date" value={endDate} min={startDate} onChange={(event) => { setEndDate(event.target.value); setTablePage(1); }} className="w-36" /></div><Button onClick={exportCsv} variant="outline" className="gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"><Download className="size-4" /> Export</Button></div></CardContent></Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[{ label: "Total calls", value: filteredCalls.length, icon: Phone }, { label: "Connected", value: filteredCalls.filter((call) => Number(call.duration || 0) > 0).length, icon: PhoneCall }, { label: "Not connected", value: filteredCalls.filter((call) => Number(call.duration || 0) === 0).length, icon: PhoneOff }, { label: "Talk time", value: `${totalMinutes} mins`, icon: Clock3 }].map(({ label, value, icon: Icon }) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon className="size-5 text-blue-600" /></div><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p></CardContent></Card>)}</div>
      <Card className="overflow-hidden border-slate-200 shadow-sm"><div className="h-1 bg-blue-600" /><div className="flex items-center justify-between p-5"><div><h2 className="font-semibold text-slate-900">Team daily activity</h2><p className="text-sm text-slate-500">Live data from team call logs.</p></div><BarChart3 className="size-5 text-blue-600" /></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-y bg-slate-50 text-xs uppercase text-slate-500"><th className="px-4 py-3 text-left">Member</th>{days.map((day) => <th key={day.toISOString()} className="px-2 py-3 text-center">{day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</th>)}</tr></thead><tbody>{days.length && visibleRows.length ? visibleRows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="px-4 py-4"><div className="flex items-center gap-2"><div className="flex size-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{row.name.charAt(0).toUpperCase()}</div><div><span className="font-medium text-slate-900">{row.name}</span><p className="text-xs text-slate-400">{row.email || "Team member"}</p></div></div></td>{row.days.map((day) => <td key={day.date} className="px-2 py-3"><div className="w-32 space-y-1.5"><div className="flex items-center gap-1 rounded border bg-slate-50 px-2 py-1 text-xs text-slate-600"><Phone className="size-3" /> {day.calls} Calls</div><div className="flex items-center gap-1 rounded border bg-slate-50 px-2 py-1 text-xs text-slate-600"><Clock3 className="size-3" /> {day.mins} mins</div><div className="flex items-center gap-1 rounded border bg-blue-50 px-2 py-1 text-xs text-blue-700"><PhoneCall className="size-3" /> {day.connected} Connected</div><div className="flex items-center gap-1 rounded border bg-slate-50 px-2 py-1 text-xs text-slate-500"><PhoneOff className="size-3" /> {day.notConnected} Not connected</div></div></td>)}</tr>) : <tr><td colSpan={days.length + 1} className="py-14 text-center text-slate-500">{days.length ? "No matching team members." : "Choose a valid date range."}</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t bg-white px-5 py-4 text-sm text-slate-500"><span>{rows.length ? `Showing ${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, rows.length)} of ${rows.length} members` : "No members"}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setTablePage((value) => Math.max(1, value - 1))} disabled={safePage === 1}>Previous</Button><span className="rounded border px-2 py-1 text-xs font-medium">{safePage}/{totalPages}</span><Button variant="outline" size="sm" onClick={() => setTablePage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages}>Next</Button></div></div></Card>
    </div></div>
  );
}
