import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCurrentMember, DISPOSITIONS, dispoMeta } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import { Download, Filter, BarChart3, Table as TableIcon, Calendar, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { toast } from "sonner";
import { useDispositionColors } from "@/lib/use-disposition-colors";

type CallRecord = { id: string; leadId?: string; leadList?: string; name: string; phone: string; calledAt: string; duration: number; agent: string; disposition: any; notes?: string; };
type LeadRecord = { id: string; list: string; };
type MemberRecord = { id: string; name: string; };
type ListRecord = { name: string; };

const normalizeCall = (call: any): CallRecord => ({
  id: call?._id || call?.id || `${call?.phone || "call"}-${Date.now()}`,
  leadId: call?.leadId?._id || call?.leadId?.id || call?.leadId || undefined,
  leadList: call?.leadId?.list || undefined,
  name: call?.name || call?.leadName || "Unknown",
  phone: call?.phone || "",
  calledAt: call?.calledAt || call?.createdAt || new Date().toISOString(),
  duration: Number(call?.duration || 0),
  agent: typeof call?.agent === "string" ? call.agent : call?.agent?.name || call?.agent?.email || "Unknown",
  disposition: call?.disposition || "new",
  notes: call?.notes || "",
});

const normalizeLead = (lead: any): LeadRecord => ({
  id: lead?._id || lead?.id || "",
  list: lead?.list || "",
});

const normalizeMember = (member: any): MemberRecord => ({
  id: member?._id || member?.id || "",
  name: member?.name || member?.email || "Unknown",
});

function ReportsPage() {
  useDispositionColors();
  const me = useCurrentMember();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [lists, setLists] = useState<ListRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [callsRes, leadsRes, membersRes, listsRes] = await Promise.all([
          api.getCallLogs({ limit: 10000 }),
          api.getLeads({ limit: 50000 }),
          api.getMembers(),
          api.getLists(),
        ]);
        setCalls((callsRes?.calls || []).map(normalizeCall));
        setLeads((leadsRes?.leads || []).map(normalizeLead));
        setMembers((Array.isArray(membersRes) ? membersRes : []).map(normalizeMember));
        setLists(Array.isArray(listsRes) ? listsRes : (listsRes?.lists || []));
      } catch (err: any) {
        toast.error("Failed to load reports data: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
    const handleCrmUpdated = () => { void fetchData(); };
    window.addEventListener('ifox-crm-updated', handleCrmUpdated);
    return () => window.removeEventListener('ifox-crm-updated', handleCrmUpdated);
  }, []);

  const [list, setList] = useState("all");
  const [member, setMember] = useState<string>(me?.name ?? "all");
  const [dispo, setDispo] = useState<string>("all");
  const [modern, setModern] = useState(true);

  const from = new Date(); from.setDate(from.getDate() - 6);
  const filtered = calls.filter(c =>
    (list === "all" || c.leadList === list || leads.find(l => l.id === c.leadId)?.list === list) &&
    (member === "all" || c.agent === member) &&
    (dispo === "all" || c.disposition === dispo) &&
    new Date(c.calledAt) >= from
  );

  const dailyLabels = Array.from({length:7},(_,i)=>{const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().slice(5,10);});
  const daily = dailyLabels.map(label => ({
    day: label,
    calls: filtered.filter(c => c.calledAt.slice(5,10) === label).length,
    talkTime: filtered.filter(c => c.calledAt.slice(5,10) === label).reduce((s,c)=>s+c.duration,0),
  }));
  const agentData = members.map(m => ({ name: m.name.split(" ")[0], calls: filtered.filter(c=>c.agent===m.name).length }));
  const dispoData = DISPOSITIONS.filter(d => d.key !== "dnd").map(d => ({ name: d.label, value: filtered.filter(c => c.disposition === d.key).length, color: d.color })).filter(d => d.value > 0);

  const exportCsv = () => {
    const rows = filtered.map(c => ({
      Name: c.name, Phone: c.phone, Date: new Date(c.calledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      Duration: c.duration + "s", Dialer: "Web", "Called By": c.agent,
      Disposition: dispoMeta(c.disposition).label, Notes: c.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "reports.xlsx");
  };

  if (loading) return <div className="p-6">Loading reports...</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Green banner header */}
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><BarChart3 className="size-7"/> Reports and Analytics</h1>
            <p className="opacity-90 mt-1 text-sm sm:text-base">Master reports with advanced filtering and analytics</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Analytics</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Exportable</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: Filter, label: "Advanced Filters" },
            { icon: BarChart3, label: "Visual Charts" },
            { icon: TableIcon, label: "Data Tables" },
            { icon: Calendar, label: "Date Range" },
            { icon: Download, label: "Export Data" },
          ].map(x => (
            <span key={x.label} className="bg-white/10 backdrop-blur px-3 py-2 rounded-full text-xs font-medium flex items-center gap-1.5">
              <x.icon className="size-3.5"/> {x.label}
            </span>
          ))}
        </div>
      </div>

      {/* Sub reports links */}
      <div className="grid sm:grid-cols-2 gap-2">
        <Link to="/performance" className="bg-card border rounded-xl p-4 flex items-center justify-between hover:border-primary">
          <div>
            <div className="font-semibold">Performance Report</div>
            <div className="text-xs text-muted-foreground">Productivity & performance per agent</div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground"/>
        </Link>
        <Link to="/audit" className="bg-card border rounded-xl p-4 flex items-center justify-between hover:border-primary">
          <div>
            <div className="font-semibold">Audit Logs</div>
            <div className="text-xs text-muted-foreground">Track all system activities and changes</div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground"/>
        </Link>
      </div>

      <div className="flex items-center justify-center">
        <div className="bg-card border rounded-full p-1 flex gap-1 text-sm">
          <button onClick={()=>setModern(false)} className={`px-4 py-1.5 rounded-full ${!modern?"bg-primary text-primary-foreground":""}`}>Classic View</button>
          <button onClick={()=>setModern(true)} className={`px-4 py-1.5 rounded-full ${modern?"bg-primary text-primary-foreground":""}`}>Modern View</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="text-xs font-bold uppercase text-muted-foreground">Filters</div>
        <div className="grid sm:grid-cols-4 gap-3">
          <div><div className="text-xs mb-1">List</div>
            <Select value={list} onValueChange={setList}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="all">All Lists</SelectItem>{lists.map(l => <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><div className="text-xs mb-1">Member</div>
            <Select value={member} onValueChange={setMember}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="all">All Members</SelectItem>{members.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><div className="text-xs mb-1">Disposition</div>
            <Select value={dispo} onValueChange={setDispo}><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="all">All Dispos</SelectItem>{DISPOSITIONS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><div className="text-xs mb-1">Dialer type</div>
            <Select defaultValue="all"><SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="web">Web</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:"Total Calls", value: filtered.length},
          {label:"Connected", value: filtered.filter(c=>c.duration>0).length},
          {label:"Conversions", value: filtered.filter(c=>c.disposition==="converted").length},
          {label:"Avg Duration", value: Math.round(filtered.reduce((a,c)=>a+c.duration,0)/(filtered.length||1)) + "s"},
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-5">
            <div className="text-3xl font-bold text-primary">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {modern && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-semibold mb-3">Daily call volume</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day"/><YAxis/><Tooltip/><Legend/>
                <Line type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={2}/>
                <Line type="monotone" dataKey="talkTime" stroke="#f59e0b" strokeWidth={2}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-semibold mb-3">Disposition breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={dispoData} dataKey="value" outerRadius={90} label>{dispoData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Tooltip/><Legend/></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border p-4 sm:p-5 lg:col-span-2 min-w-0 overflow-hidden">
            <h3 className="font-semibold mb-3">Agent performance</h3>
            <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/>
                <Bar dataKey="calls" fill="#10b981" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <div className="p-3 border-b flex flex-wrap items-center gap-2">
          <Input placeholder="Search name, phone or disposition" className="max-w-md bg-background"/>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">Columns</Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={exportCsv} disabled={me?.flags?.disableExportList}><Download className="size-3.5"/> Export</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
              <tr>
                <th className="p-3 text-left">Name</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Duration</th><th className="p-3 text-left">Dialer</th><th className="p-3 text-left">Called by</th>
                <th className="p-3 text-left">Disposition</th><th className="p-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const dm = dispoMeta(c.disposition);
                return (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">{new Date(c.calledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="p-3">{c.duration}s</td>
                    <td className="p-3">Web</td>
                    <td className="p-3">{c.agent}</td>
                    <td className="p-3"><span className="text-white text-[10px] font-bold px-2 py-1 rounded" style={{background: dm.color}}>{dm.label}</span></td>
                    <td className="p-3 text-muted-foreground">{c.notes || "—"}</td>
                  </tr>
                );
              })}
              {filtered.length===0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No data available</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-xs text-muted-foreground text-right">Showing {filtered.length} records</div>
      </div>
    </div>
  );
}

export default ReportsPage;
