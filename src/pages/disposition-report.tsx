import { useEffect, useMemo, useState } from "react";
import { useCurrentMember, DISPOSITIONS } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { readSelection, writeSelection } from "@/lib/persistent-selection";
import { toast } from "sonner";
import { BarChart3, CalendarDays, CheckCircle2, ClipboardList, Clock3, Download, FileDown, Filter, PhoneCall, PhoneOff, RefreshCw, Search, UserRound, Users } from "lucide-react";

type Call = { _id?: string; id?: string; agent?: string | { _id?: string; id?: string; name?: string }; duration?: number; disposition?: string; calledAt?: string };
type Member = { _id?: string; id?: string; name?: string; email?: string };
const agentId = (agent: Call["agent"]) => typeof agent === "string" ? agent : agent?._id || agent?.id || "";
const agentName = (agent: Call["agent"], members: Member[]) => typeof agent === "object" && agent?.name ? agent.name : members.find((member) => String(member._id || member.id) === String(agentId(agent)))?.name || String(agent || "Unknown");
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const dateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function DispositionReportPage() {
  const member = useCurrentMember();
  const [calls, setCalls] = useState<Call[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState(() => readSelection(member, "disposition-member") || "all");
  const [excluded, setExcluded] = useState("none");
  const [search, setSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [startDate, setStartDate] = useState(dateInput(new Date(Date.now() - 6 * 86400000)));
  const [endDate, setEndDate] = useState(dateInput(new Date()));

  useEffect(() => {
    writeSelection(member, "disposition-member", memberFilter);
  }, [member, memberFilter]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const [callsResponse, membersResponse] = await Promise.all([api.getCallLogs({ limit: 50000, scope: "team" }), api.getMembers()]);
      setCalls(Array.isArray(callsResponse?.calls) ? callsResponse.calls : []);
      const availableMembers = Array.isArray(membersResponse) ? membersResponse : [];
      setMembers(availableMembers);
    } catch (error: any) { toast.error(error?.message || "Could not load disposition report"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadReport(); }, [member]);
  const from = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);
  const until = useMemo(() => new Date(`${endDate}T23:59:59.999`), [endDate]);
  const filteredCalls = calls.filter((call) => {
    const disposition = call.disposition || "new";
    const name = agentName(call.agent, members);
    return new Date(call.calledAt || 0) >= from && new Date(call.calledAt || 0) <= until && (memberFilter === "all" || agentId(call.agent) === memberFilter || name === memberFilter) && (excluded === "none" || disposition !== excluded) && name.toLowerCase().includes(search.toLowerCase());
  });
  const dispositionRows = DISPOSITIONS.map((item) => {
    const matching = filteredCalls.filter((call) => (call.disposition || "new") === item.key);
    const totalSeconds = matching.reduce((sum, call) => sum + Number(call.duration || 0), 0);
    return { ...item, count: matching.length, totalSeconds, avgSeconds: matching.length ? Math.round(totalSeconds / matching.length) : 0 };
  }).filter((item) => item.count > 0 && item.label.toLowerCase().includes(search.toLowerCase()));
  const agentRows = members.map((item) => {
    const id = item._id || item.id || "";
    const matching = filteredCalls.filter((call) => agentId(call.agent) === id || agentName(call.agent, members) === item.name);
    const seconds = matching.reduce((sum, call) => sum + Number(call.duration || 0), 0);
    return { id, name: item.name || item.email || "Member", calls: matching.length, seconds, avg: matching.length ? Math.round(seconds / matching.length) : 0 };
  }).filter((item) => item.name.toLowerCase().includes(agentSearch.toLowerCase()) && item.calls > 0).sort((a, b) => b.calls - a.calls);
  const totalSeconds = filteredCalls.reduce((sum, call) => sum + Number(call.duration || 0), 0);
  const connected = filteredCalls.filter((call) => Number(call.duration || 0) > 0).length;
  const success = filteredCalls.filter((call) => ["interested", "converted"].includes(call.disposition || "")).length;
  const exportCsv = () => { const csv = ["Agent,Disposition,Duration,Date", ...filteredCalls.map((call) => `${agentName(call.agent, members)},${call.disposition || "new"},${call.duration || 0},${call.calledAt || ""}`)].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "disposition-report.csv"; link.click(); URL.revokeObjectURL(link.href); };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading disposition report...</div>;
  return <div className="min-h-full bg-slate-50 p-6"><div className="mx-auto max-w-7xl space-y-6">
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg"><div className="absolute -right-16 -top-20 size-64 rounded-full border-[28px] border-white/10" /><div className="relative flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-xl bg-white/15"><ClipboardList className="size-7" /></div><div><p className="text-sm font-medium text-blue-100">Reports and analytics</p><h1 className="text-2xl font-bold">Disposition report</h1><p className="mt-1 text-sm text-blue-100">Agent call volume and disposition analytics.</p></div></div><Button variant="secondary" onClick={() => void loadReport()} className="gap-2"><RefreshCw className="size-4" /> Refresh</Button></div><div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><BarChart3 className="size-4" /> Disposition breakdown</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Users className="size-4" /> Agent performance</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><CalendarDays className="size-4" /> Date range</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><FileDown className="size-4" /> Export data</span></div></div>
    <Card className="border-slate-200 shadow-sm"><CardContent className="flex flex-wrap items-end gap-3 p-5"><div><label className="mb-1 block text-xs text-slate-500">Member</label><Select value={memberFilter} onValueChange={setMemberFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All members</SelectItem>{members.map((item) => <SelectItem key={item._id || item.id} value={item._id || item.id || ""}>{item.name || item.email}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1 block text-xs text-slate-500">Start date</label><Input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="w-36" /></div><div><label className="mb-1 block text-xs text-slate-500">End date</label><Input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="w-36" /></div><div><label className="mb-1 block text-xs text-slate-500">Exclude disposition</label><Select value={excluded} onValueChange={setExcluded}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{DISPOSITIONS.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" onClick={() => void loadReport()} className="gap-2"><Search className="size-4" /> Apply</Button><Button variant="outline" onClick={exportCsv} className="gap-2 border-blue-600 text-blue-700 hover:bg-blue-50"><Download className="size-4" /> Export</Button><span className="ml-auto text-xs text-slate-500">{from.toLocaleDateString()} - {until.toLocaleDateString()}</span></CardContent></Card>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{[{ label: "Total calls", value: filteredCalls.length, icon: PhoneCall }, { label: "Connected", value: `${connected} (${filteredCalls.length ? Math.round(connected / filteredCalls.length * 100) : 0}%)`, icon: CheckCircle2 }, { label: "Avg time", value: formatDuration(filteredCalls.length ? Math.round(totalSeconds / filteredCalls.length) : 0), icon: Clock3 }, { label: "Agents", value: agentRows.length, icon: Users }, { label: "Successful", value: `${success} (${filteredCalls.length ? Math.round(success / filteredCalls.length * 100) : 0}%)`, icon: PhoneCall }].map(({ label, value, icon: Icon }) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-slate-500">{label}<Icon className="size-5 text-blue-600" /></div><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-2"><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-5 text-blue-600" /> Agent performance</CardTitle></CardHeader><CardContent className="space-y-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={agentSearch} onChange={(event) => setAgentSearch(event.target.value)} placeholder="Search agents..." className="pl-9" /></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-xs uppercase text-slate-400"><tr><th className="pb-3">Agent</th><th className="pb-3">Calls</th><th className="pb-3">Avg time</th><th className="pb-3">Total time</th></tr></thead><tbody className="divide-y divide-slate-100">{agentRows.map((row) => <tr key={row.id}><td className="py-3 font-medium text-slate-900">{row.name}</td><td className="py-3">{row.calls}</td><td className="py-3">{formatDuration(row.avg)}</td><td className="py-3">{formatDuration(row.seconds)}</td></tr>)}</tbody></table>{!agentRows.length && <p className="py-8 text-center text-sm text-slate-500">No agent calls in this range.</p>}</div></CardContent></Card><Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-5 text-blue-600" /> Disposition breakdown</CardTitle></CardHeader><CardContent className="space-y-3">{dispositionRows.length ? dispositionRows.map((row) => <div key={row.key}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{row.label}</span><span className="font-medium text-slate-900">{row.count} ({Math.round(row.count / filteredCalls.length * 100)}%)</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${row.count / Math.max(...dispositionRows.map((item) => item.count)) * 100}%`, backgroundColor: row.color }} /></div><p className="mt-1 text-xs text-slate-400">Total {formatDuration(row.totalSeconds)} · Avg {formatDuration(row.avgSeconds)}</p></div>) : <p className="py-10 text-center text-sm text-slate-500">No dispositions in this range.</p>}</CardContent></Card></div>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="size-5 text-blue-600" /> Call records</CardTitle></CardHeader><CardContent><div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agent..." className="pl-9" /></div><p className="text-sm text-slate-500">{filteredCalls.length} calls matched. Use Export to download the filtered report.</p></CardContent></Card>
  </div></div>;
}
