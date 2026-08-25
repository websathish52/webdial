import { useState, useEffect } from "react";
import { useCurrentMember, dispoMeta } from "@/lib/mock-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Download, BarChart3, PhoneCall } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useDispositionColors } from "@/lib/use-disposition-colors";

type CallRecord = { id: string; leadId?: string; name: string; phone: string; calledAt: string; duration: number; agent: string; disposition: any; notes?: string; };
type MemberRecord = { id: string; name: string; };

const normalizeCall = (call: any): CallRecord => ({
  id: call?._id || call?.id || `${call?.phone || "call"}-${Date.now()}`,
  leadId: call?.leadId?._id || call?.leadId?.id || call?.leadId || undefined,
  name: call?.name || call?.leadName || "Unknown",
  phone: call?.phone || "",
  calledAt: call?.calledAt || call?.createdAt || new Date().toISOString(),
  duration: Number(call?.duration || 0),
  agent: typeof call?.agent === "string" ? call.agent : call?.agent?.name || call?.agent?.email || "Unknown",
  disposition: call?.disposition || "new",
  notes: call?.notes || "",
});

const normalizeMember = (member: any): MemberRecord => ({
  id: member?._id || member?.id || "",
  name: member?.name || member?.email || "Unknown",
});

function PerformancePage() {
  useDispositionColors();
  const me = useCurrentMember();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<string>(me?.name ?? "");
  const [modern, setModern] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [callsRes, membersRes] = await Promise.all([
          api.getCallLogs({ limit: 10000 }),
          api.getMembers(),
        ]);
        setCalls((callsRes?.calls || []).map(normalizeCall));
        setMembers((Array.isArray(membersRes) ? membersRes : []).map(normalizeMember));
      } catch (err: any) {
        toast.error("Failed to load performance data: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  useEffect(() => {
    if (!agent && members.length > 0) {
      setAgent(members[0].name);
    }
  }, [agent, members]);

  const now = new Date();
  const monthCalls = calls.filter(c => c.agent === agent && new Date(c.calledAt).getMonth() === now.getMonth());
  const totalCalls = monthCalls.length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const dailyAvg = Math.round(totalCalls / daysInMonth);
  const avgDuration = Math.round(monthCalls.reduce((a,c)=>a+c.duration,0) / (monthCalls.length || 1));
  const daysPresent = new Set(monthCalls.map(c => c.calledAt.slice(0,10))).size;

  const daily = Array.from({length: daysInMonth}, (_,i) => {
    const day = i+1;
    const dc = monthCalls.filter(c => new Date(c.calledAt).getDate() === day);
    return { day, calls: dc.length, active: dc.reduce((s,c)=>s+c.duration,0) };
  });

  const dispoData = ["interested","not_interested","callback","converted","no_answer","busy","wrong_number"].map(d => {
    const meta = dispoMeta(d as any);
    return { name: meta.label, value: monthCalls.filter(c => c.disposition === d).length, color: meta.color };
  }).filter(d => d.value > 0);

  const totalTalk = monthCalls.reduce((s,c)=>s+c.duration,0);
  const activePct = Math.min(100, Math.round((totalTalk / (daysInMonth * 8 * 3600)) * 100));

  if (loading) return <div className="p-6">Loading performance data...</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] text-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><TrendingUp className="size-7"/> Productivity & Performance</h1>
            <p className="opacity-90 mt-1 text-sm">Analyze individual call activity, dispositions, dialer presence, and time quality by month.</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold" style={{placeContent:"center"}}>Analytics</span>
            <Button size="sm" variant="secondary" className="gap-1"><Download className="size-3.5"/> Export</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="size-14 rounded-full bg-blue-500/20 text-blue-600 grid place-items-center text-xl font-bold">{agent?.charAt(0) || "?"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg">{agent}</div>
          <div className="text-xs text-muted-foreground">{now.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        </div>
        <div className="bg-card border rounded-full p-1 flex gap-1 text-xs">
          <button onClick={()=>setModern(false)} className={`px-3 py-1 rounded-full ${!modern?"bg-primary text-primary-foreground":""}`}>Classic</button>
          <button onClick={()=>setModern(true)} className={`px-3 py-1 rounded-full ${modern?"bg-primary text-primary-foreground":""}`}>Modern</button>
        </div>
        <Select value={agent} onValueChange={setAgent}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue/></SelectTrigger>
          <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPI label="Total Calls" value={totalCalls} sub="This month"/>
        <KPI label="Daily Average" value={dailyAvg} sub="Calls per active day"/>
        <KPI label="Avg Call Duration" value={`${avgDuration}s`} sub=""/>
        <KPI label="Days Present" value={daysPresent} sub={`of ${daysInMonth} days`}/>
        <KPI label="Idle Time" value={`${100-activePct}%`} sub="Est."/>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold flex items-center gap-2"><PhoneCall className="size-4 text-blue-600"/> Daily Call Activity</h3>
          <p className="text-xs text-muted-foreground mb-2">Calls and active time per day</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day"/><YAxis/><Tooltip/>
              <Line type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2} name="Calls"/>
              <Line type="monotone" dataKey="active" stroke="#f59e0b" strokeWidth={2} name="Active time (s)"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="size-4 text-blue-600"/> Disposition Breakdown — {totalCalls} calls</h3>
          <p className="text-xs text-muted-foreground mb-2">Top outcomes, sorted by volume</p>
          {dispoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={dispoData} dataKey="value" outerRadius={80} label>{dispoData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Tooltip/></PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] grid place-items-center bg-muted/30 rounded text-sm text-muted-foreground">No dispositions in this month</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold">Dialer Activity Presence — {now.toLocaleString(undefined, { month: "long", year: "numeric" })}</h3>
          <div className="text-xs text-muted-foreground mb-3">{daysPresent} of {daysInMonth} days present</div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["M","T","W","T","F","S","S"].map((d,i) => <div key={i} className="text-muted-foreground py-1">{d}</div>)}
            {daily.map(d => (
              <div key={d.day} className={`p-2 rounded ${d.calls>0 ? "bg-blue-100 text-blue-700 font-bold" : new Date(now.getFullYear(), now.getMonth(), d.day) < new Date() ? "bg-red-50 text-red-500" : "bg-muted/30"} ${d.day === now.getDate() ? "ring-2 ring-primary" : ""}`}>{d.day}</div>
            ))}
          </div>
          <div className="mt-3 flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="size-3 bg-blue-100 rounded"/> Present</span>
            <span className="flex items-center gap-1"><span className="size-3 bg-red-50 rounded"/> Absent</span>
            <span className="flex items-center gap-1"><span className="size-3 bg-primary/30 rounded"/> Today</span>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold">Time Quality</h3>
          <p className="text-xs text-muted-foreground mb-4">How {agent?.split(" ")[0] || "agent"}'s on-duty hours are spent</p>
          <div className="h-3 bg-red-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-500" style={{ width: `${activePct}%` }}/>
          </div>
          <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="size-3 bg-blue-500 rounded"/> Active call time</span><span className="font-bold">{Math.floor(totalTalk/3600)}h <span className="text-muted-foreground text-xs">{activePct}%</span></span></div>
          <div className="flex justify-between text-sm mt-1"><span className="flex items-center gap-2"><span className="size-3 bg-red-300 rounded"/> Idle time</span><span className="font-bold">{Math.max(0, daysInMonth * 8 - Math.floor(totalTalk/3600))}h <span className="text-muted-foreground text-xs">{100-activePct}%</span></span></div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

export default PerformancePage;
