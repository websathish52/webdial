import { useEffect, useMemo, useState } from "react";
import { useCurrentMember } from "@/lib/mock-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import { BarChart3, CalendarDays, CheckCircle2, Medal, PhoneCall, RefreshCw, Trophy, Users } from "lucide-react";

type Entry = { id: string; name: string; role: string; calls: number; connectedCalls: number; notConnectedCalls: number; activeMinutes: number; activityPresence: number };
const periods = [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }];
const dateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function GamePage() {
  const member = useCurrentMember();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [startDate, setStartDate] = useState(dateInput(new Date(Date.now() - 6 * 86400000)));
  const [endDate, setEndDate] = useState(dateInput(new Date()));
  const [tab, setTab] = useState<"top" | "active">("top");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = async () => {
    try {
      setLoading(true); setError("");
      const response = await api.getLeaderboard(period, { start: startDate, end: endDate });
      setEntries(Array.isArray(response?.entries) ? response.entries : []);
    } catch (err: any) { setError(err?.message || "Could not load leaderboard"); toast.error(err?.message || "Could not load leaderboard"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadLeaderboard(); }, [member, period, startDate, endDate]);
  const ranked = useMemo(() => [...entries].sort((a, b) => tab === "top" ? b.calls - a.calls : b.activeMinutes - a.activeMinutes), [entries, tab]);
  const podium = [ranked[1], ranked[0], ranked[2]];
  const totalCalls = entries.reduce((sum, item) => sum + item.calls, 0);
  const totalConnected = entries.reduce((sum, item) => sum + item.connectedCalls, 0);

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading leaderboard...</div>;
  return <div className="min-h-full bg-slate-50 p-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg"><div className="absolute -right-16 -top-20 size-64 rounded-full border-[28px] border-white/10" /><div className="relative flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-xl bg-white/15"><Trophy className="size-7" /></div><div><p className="text-sm font-medium text-blue-100">Reports and analytics</p><h1 className="text-2xl font-bold">Leaderboard</h1><p className="mt-1 text-sm text-blue-100">Team rankings from live backend call data.</p></div></div><Button variant="secondary" onClick={() => void loadLeaderboard()} className="gap-2"><RefreshCw className="size-4" /> Refresh</Button></div><div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><PhoneCall className="size-4" /> Top caller</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Users className="size-4" /> Most active</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><CalendarDays className="size-4" /> Date period</span></div></div>
    {error && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error} <button type="button" onClick={() => void loadLeaderboard()} className="font-semibold underline">Retry</button></div>}
    <Card className="border-slate-200 shadow-sm"><CardContent className="flex flex-wrap items-end justify-between gap-4 p-5"><div className="flex items-center gap-2 font-medium text-slate-900"><BarChart3 className="size-4 text-blue-600" /> Rankings</div><div className="flex flex-wrap items-end gap-2"><div><label className="mb-1 block text-xs text-slate-500">Start date</label><Input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></div><div><label className="mb-1 block text-xs text-slate-500">End date</label><Input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></div><Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{periods.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><Button variant={tab === "top" ? "default" : "outline"} onClick={() => setTab("top")} className="gap-1.5"><PhoneCall className="size-4" /> Top caller</Button><Button variant={tab === "active" ? "default" : "outline"} onClick={() => setTab("active")} className="gap-1.5"><Medal className="size-4" /> Most active</Button></div></CardContent></Card>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[["Total calls", totalCalls, PhoneCall], ["Connected calls", totalConnected, CheckCircle2], ["Not connected", totalCalls - totalConnected, Users], ["Members", entries.length, Users]].map(([label, value, Icon]) => <Card key={label as string} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-slate-500">{label as string}<Icon className="size-5 text-blue-600" /></div><p className="mt-3 text-2xl font-bold text-slate-900">{value as number}</p></CardContent></Card>)}</div>
    <div className="grid gap-4 md:grid-cols-3">{podium.map((entry, index) => entry ? <Card key={entry.id} className={`border-slate-200 shadow-sm ${index === 1 ? "border-blue-300 bg-blue-50" : ""}`}><CardContent className="p-5 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">{entry.name.charAt(0).toUpperCase()}</div><p className="mt-3 font-semibold text-slate-900">#{index + 1} {entry.name}</p><p className="text-sm text-slate-500">{entry.role}</p><p className="mt-2 text-xl font-bold text-blue-700">{tab === "top" ? entry.calls : entry.activeMinutes} {tab === "top" ? "calls" : "minutes"}</p></CardContent></Card> : <Card key={`empty-${index}`} className="border-dashed"><CardContent className="p-10 text-center text-sm text-slate-400">No ranking</CardContent></Card>)}</div>
    {tab === "top" ? <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Top caller rankings</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-400"><tr><th className="pb-3">Name</th><th className="pb-3">Role</th><th className="pb-3 text-center">Calls</th><th className="pb-3 text-center">Connected Calls</th><th className="pb-3 text-center">Not Connected Calls</th><th className="pb-3 text-center">Activity Presence</th></tr></thead><tbody className="divide-y divide-slate-100">{ranked.map((entry) => <tr key={entry.id}><td className="py-3 font-medium text-slate-900">{entry.name}</td><td className="py-3 text-slate-500">{entry.role}</td><td className="py-3 text-center">{entry.calls}</td><td className="py-3 text-center">{entry.connectedCalls}</td><td className="py-3 text-center">{entry.notConnectedCalls}</td><td className="py-3 text-center"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{entry.activityPresence}%</span></td></tr>)}</tbody></table>{!ranked.length && <p className="py-10 text-center text-sm text-slate-500">No call activity in this period.</p>}</div></CardContent></Card> : <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Most active rankings</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-400"><tr><th className="pb-3">Name</th><th className="pb-3">Role</th><th className="pb-3">Active (Minutes)</th><th className="pb-3 text-center">Activity Presence</th></tr></thead><tbody className="divide-y divide-slate-100">{ranked.map((entry) => <tr key={entry.id}><td className="py-3 font-medium text-slate-900">{entry.name}</td><td className="py-3 text-slate-500">{entry.role}</td><td className="py-3">{entry.activeMinutes}</td><td className="py-3 text-center"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{entry.activityPresence}%</span></td></tr>)}</tbody></table>{!ranked.length && <p className="py-10 text-center text-sm text-slate-500">No activity in this period.</p>}</div></CardContent></Card>}
  </div></div>;
}
