import { useEffect, useState } from "react";
import { useCurrentMember, DISPOSITIONS } from "@/lib/mock-store";
import api from "@/lib/api";
import { useDispositionColors } from "@/lib/use-disposition-colors";
import { PhoneCall, Users, CheckCircle2, Clock3, TrendingUp, Search, UserRound, TimerReset, BarChart3, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TeamMember = { _id?: string; id?: string; name: string; role?: string; email?: string; username?: string; lists?: string[] };
type TeamCall = { _id?: string; id?: string; name: string; phone: string; agent?: string | { _id?: string; id?: string; name?: string }; companyId?: string | { _id?: string; id?: string; companyName?: string; companyCode?: string }; duration?: number; disposition?: string; calledAt: string; leadId?: string | { _id?: string; id?: string }; };
type ListItem = { _id?: string; id?: string; name: string; description?: string; assignedTo?: Array<{ _id?: string; id?: string; name?: string } | string> };
type CompanyRecord = { _id?: string; id?: string; companyName: string; companyCode?: string };

function getCompanyId(companyId: TeamCall['companyId']) {
  if (!companyId) return '';
  return typeof companyId === 'string' ? companyId : companyId._id || companyId.id || '';
}

function getCompanyName(companyId: TeamCall['companyId'], companies: CompanyRecord[]) {
  if (companyId && typeof companyId !== 'string' && companyId.companyName) return companyId.companyName;
  const id = getCompanyId(companyId);
  return companies.find(company => String(company._id || company.id) === String(id))?.companyName || 'Company';
}

function getAgentKey(agent: TeamCall['agent']) {
  if (!agent) return '';
  if (typeof agent === 'string') return agent;
  return agent._id || agent.id || agent.name || '';
}

function normalizeMemberKey(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return String((value as any)._id || (value as any).id || '');
  }
  return String(value);
}

function getLeadCompanyKey(lead: any) {
  const companyId = lead?.companyId;
  if (!companyId) return '';
  if (typeof companyId === 'string') return companyId;
  return companyId._id || companyId.id || '';
}

function getUniqueLeadCount(leadList: any[], allowedListNames?: string[]) {
  const uniqueKeys = new Set<string>();

  for (const lead of leadList) {
    const listName = lead?.list;
    if (allowedListNames && !allowedListNames.includes(listName)) continue;

    const phone = String(lead?.phone || '').trim();
    if (!phone) continue;

    const key = `${getLeadCompanyKey(lead)}::${phone}`;
    if (!key || key === '::') continue;
    uniqueKeys.add(key);
  }

  return uniqueKeys.size;
}

function Dashboard() {
  useDispositionColors();
  const member = useCurrentMember();
  const [leads, setLeads] = useState<any[]>([]);
  const [calls, setCalls] = useState<TeamCall[]>([]); // personal calls -> stat cards & charts (for non-admin agents)
  const [teamCalls, setTeamCalls] = useState<TeamCall[]>([]); // company-wide calls -> Team Activity table AND admin stat cards
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, leadsRes, callsRes, teamCallsRes, membersRes, listsRes, companiesRes] = await Promise.all([
          api.getDashboardStats(), // This is kept for now but its direct usage will be replaced
          api.getLeads({ limit: 50000 }),
          api.getCallLogs({ limit: 1000 }), // personal (scoped to logged-in agent unless admin)
          api.getCallLogs({ limit: 50000, scope: 'team' }), // all company calls for SuperAdmin All Team analytics
          api.getMembers(),
          api.getLists(),
          api.getCompanies(),
        ]);
        setLeads(leadsRes?.leads || []);
        setCalls((callsRes?.calls || []) as TeamCall[]);
        setTeamCalls((teamCallsRes?.calls || []) as TeamCall[]);
        setMembers((membersRes || []) as TeamMember[]);
        setLists(Array.isArray(listsRes) ? listsRes : (listsRes?.lists || []));
        setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (member) void fetchData();
    const handleCompanyChanged = () => { void fetchData(); };
    const handleCrmUpdated = () => { void fetchData(); };
    window.addEventListener('ifox-company-changed', handleCompanyChanged);
    window.addEventListener('ifox-crm-updated', handleCrmUpdated);
    return () => {
      window.removeEventListener('ifox-company-changed', handleCompanyChanged);
      window.removeEventListener('ifox-crm-updated', handleCrmUpdated);
    };
  }, [member]);

  if (!member || loading) return <div className="p-6">Loading dashboard...</div>;

  // ⭐ FIX: needed to scope "Total Leads" to only the lists this agent can see.
  const isAdmin = ["superadmin", "admin"].includes(String(member?.role || "").toLowerCase());
  const memberKey = normalizeMemberKey((member as any)?._id || member?.id || member?.username || member?.email || "");

  // ⭐ FIX: same "which lists can this agent see" logic used on the Dialer page —
  // admins see every list; agents see only lists assigned to them (or unassigned/open lists).
  const myListNames = isAdmin
    ? lists.map((l) => l.name)
    : lists
        .filter((l) => {
          if (!memberKey) return false;
          if (!l.assignedTo?.length) return true;
          const assignedToMatch = l.assignedTo.some((assignee) => {
            const assigneeKey = normalizeMemberKey(assignee);
            return assigneeKey === memberKey || member?.lists?.includes(l.name);
          });
          return assignedToMatch || member?.lists?.includes(l.name);
        })
        .map((l) => l.name);

  // ⭐ FIX: match the CRM's "All Leads" logic exactly: count unique company+phone
  // leads only, not raw imported rows. This avoids double-counting the same phone
  // imported into multiple lists within the same company.
  const myTotalLeadsCount = isAdmin
    ? getUniqueLeadCount(leads)
    : getUniqueLeadCount(leads, myListNames);

  // ⭐ FIX: SuperAdmin/Admin usually don't make personal calls themselves, so
  // `calls` (personal-scope fetch) is empty/near-empty for them. That made
  // "Calls Today", the Dispositions pie, the Daily Calls chart, callbacks and
  // conversions all show wrong/zero data whenever an admin viewed the
  // dashboard — including when "All Team" was selected in the sidebar.
  // Admins now build every stat card off `teamCalls` (company-wide / all-team
  // scope) instead, matching what the Team Activity table already used.
  const statsSourceCalls = isAdmin ? teamCalls : calls;

  const filteredCalls = statsSourceCalls.filter(call => {
    if (selectedMemberId === 'all') return true;
    const agent = call.agent;
    const agentId = typeof agent === 'object' && agent !== null ? (agent._id || agent.id) : agent;
    return String(agentId) === selectedMemberId;
  });

  const callsTodayCount = filteredCalls.filter(c => {
    const callDate = new Date(c.calledAt);
    const today = new Date();
    return callDate.getDate() === today.getDate() &&
           callDate.getMonth() === today.getMonth() &&
           callDate.getFullYear() === today.getFullYear();
  }).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dispositionMeta = DISPOSITIONS.map(({ key, label: name, color }) => ({ key, name, color }));

  const relevantLeads = leads.filter(lead => {
    if (selectedMemberId === 'all') return true;
    // This is a simplification. A robust solution might need to check who the lead is assigned to.
    // For now, we filter dispositions based on filtered calls' leads.
    const leadId = lead._id || lead.id;
    return filteredCalls.some(c => (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id) === leadId);
  });

  const callbacksCount = filteredCalls.filter(c => c.disposition === 'callback').length;
  const conversionsCount = filteredCalls.filter(c => c.disposition === 'converted').length;

  const fetchedTeamMembers = (Array.isArray(members) ? members : []) as TeamMember[];
  const currentMemberId = String((member as any)?._id || member?.id || "");
  const hasCurrentMember = fetchedTeamMembers.some((user) => String(user._id || user.id || "") === currentMemberId);
  const teamMembers = hasCurrentMember
    ? fetchedTeamMembers
    : [{
        id: member.id,
        name: member.name,
        username: member.username,
        email: member.email,
        role: member.role,
        lists: member.lists,
      }, ...fetchedTeamMembers];

  const teamActivity = teamMembers
    .map((user) => {
      const userCalls = teamCalls.filter((c) => {
        const agent = c.agent;
        const agentId = typeof agent === 'object' && agent !== null ? (agent._id || agent.id) : agent;
        const userId = user._id || user.id;
        if (agentId && userId) return String(agentId) === String(userId);
        // Fallback to name matching if IDs are not available
        const agentName = typeof agent === 'object' && agent !== null ? agent.name : agent;
        return agentName === user.name;
      });
      const talkTime = userCalls.reduce((acc, call) => acc + (call.duration || 0), 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const callsTodayCount = userCalls.filter((c) => new Date(c.calledAt) >= today).length;
      const lastCall = userCalls.reduce<TeamCall | null>((latest, call) => {
        if (!latest) return call;
        return new Date(call.calledAt) > new Date(latest.calledAt) ? call : latest;
      }, null);

      return {
        ...user,
        userCalls,
        talkTime,
        callsTodayCount,
        lastCall,
      };
    })
    .filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const companyEntries = Array.from(new Map(
    filteredCalls
      .map(call => [getCompanyId(call.companyId), getCompanyName(call.companyId, companies)] as const)
      .filter(([id]) => Boolean(id))
  ).entries());
  const companyColors = ["#16a34a", "#2563eb", "#ea580c", "#9333ea", "#0891b2", "#dc2626"];
  const dailyCallsData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const dayCalls = filteredCalls.filter(c => (c.calledAt || '').startsWith(day));
    const byCompany = Object.fromEntries(companyEntries.map(([companyId]) => [companyId, dayCalls.filter(call => getCompanyId(call.companyId) === companyId).length]));
    return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), ...byCompany };
  }).reverse();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filteredCallsToday = filteredCalls.filter(c => new Date(c.calledAt) >= today);

  const dispositionCountsToday = dispositionMeta.reduce((acc, d) => {
    acc[d.key] = filteredCallsToday.filter(c => c.disposition === d.key).length;
    return acc;
  }, {} as Record<string, number>);

  const myDispositionsToday = dispositionMeta.map((d) => ({
    ...d,
    value: dispositionCountsToday[d.key] || 0,
  })).filter(d => d.value > 0 && d.key !== 'new');

  // ✅ NEW: Present/Active team count (agents who made at least one call today, out of total team members)
  const presentCount = teamActivity.filter(u => u.callsTodayCount > 0).length;
  const totalTeamCount = teamActivity.length;

  // ✅ NEW: Interested calls made today
  const interestedTodayCount = filteredCallsToday.filter(c => c.disposition === 'interested').length;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Members</SelectItem>{members.map(m => <SelectItem key={m._id || m.id} value={m._id || m.id || ""}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
      </div> */}
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {[
  { label: "Calls Today", value: callsTodayCount, icon: PhoneCall, color: "bg-primary/10 text-primary" },
  { label: "Total Leads", value: myTotalLeadsCount ?? 0, icon: Users, color: "bg-success/15 text-success" },
  { label: "Present / Agents", value: `${presentCount}/${totalTeamCount}`, icon: Users, color: "bg-chart-2/15 text-chart-2" },
  { label: "Interested Today", value: interestedTodayCount ?? 0, icon: TrendingUp, color: "bg-success/15 text-success" },
  ].map((s) => (
    <div key={s.label} className="p-5 rounded-xl bg-card border shadow">
      <div className={`size-10 rounded-md bg-[#e7effe] grid place-items-center mb-4 ${s.color}`}><s.icon className="size-5 text-primary" /></div>
      <div className="text-3xl font-bold text-primary">{s.value}</div>
      <div className="text-sm  mt-1 font-[500] " style={{color:"#2f3430"}}>{s.label}</div>
    </div>
  ))}
</div>
      <div className="grid min-w-0 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4 sm:p-6 shadow min-w-0 overflow-hidden">
          <h3 className="font-semibold mb-2">Dispositions</h3>
          <div className="h-[360px] w-full min-w-0 sm:h-[390px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={myDispositionsToday} dataKey="value" cx="50%" cy="40%" outerRadius={105} innerRadius={52}>
                {myDispositionsToday.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 sm:p-6 shadow min-w-0 overflow-hidden">
          <h3 className="font-semibold mb-2">Daily Calls (Last 7 Days Performance)</h3>
          <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyCallsData} barCategoryGap="18%" barGap={3}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {companyEntries.length > 0 ? companyEntries.map(([companyId, companyName], index) => (
                <Bar key={companyId} dataKey={companyId} name={companyName} fill={companyColors[index % companyColors.length]} radius={[6, 6, 0, 0]} />
              )) : <Bar dataKey="calls" name="Calls" fill="oklch(0.68 0.18 150)" radius={[6, 6, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>


  <div className="bg-card rounded-xl border p-4 sm:p-6 shadow">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Users className="size-5" /></div>
          <div>
            <h3 className="font-semibold">Team Activity</h3>
            <p className="text-xs text-muted-foreground">Live member performance and call history</p>
          </div>
        </div>
        <hr className="my-4" />
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            placeholder="Search member activity..."
            className="w-full bg-background border rounded-lg pl-10 pr-4 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 text-xs text-muted-foreground font-semibold p-3 bg-muted/40 rounded-lg pipeline-header">
          <div className="flex items-center gap-1.5"><UserRound className="size-3.5" /> Team / Member</div>
          <div className="text-center flex items-center justify-center gap-1.5"><CheckCircle2 className="size-3.5" /> Status</div>
          <div className="text-center flex items-center justify-center gap-1.5"><TimerReset className="size-3.5" /> Talk Time</div>
          <div className="text-center flex items-center justify-center gap-1.5"><BarChart3 className="size-3.5" /> Productivity</div>
          <div className="text-center flex items-center justify-center gap-1.5"><CalendarDays className="size-3.5" /> Attendance</div>
          <div className="text-center flex items-center justify-center gap-1.5"><Clock3 className="size-3.5" /> Last Active</div>
        </div>
        <div className="space-y-2 mt-2">
          {teamActivity.map((user) => {
            const status = user.callsTodayCount > 0 ? "Present" : "Offline";
            return (
              <div key={user.id || user._id} className="rounded-lg border p-3 hover:bg-muted/50 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4 md:border-none md:p-3 md:rounded-none md:hover:bg-transparent">
                <div className="flex items-center gap-3 md:col-span-1">
                  <div className="size-10 rounded-full bg-muted grid place-items-center font-bold">{user.name.split(" ").map((n) => n[0]).join("")}</div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.role || "Team Member"}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:mt-0 md:contents">
                  <div className="md:text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Status</div>
                    <span className={`inline-flex text-xs px-2 py-1 rounded-full font-semibold ${status === "Present" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{status}</span>
                  </div>
                  <div className="md:text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Talk Time</div>
                    <span className="text-sm">{(user.talkTime / 60).toFixed(1)} mins</span>
                  </div>
                  <div className="md:text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Productivity</div>
                    <span className="text-sm">{user.userCalls.length} calls</span>
                  </div>
                  <div className="md:text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Attendance</div>
                    <span className="text-sm">{user.callsTodayCount > 0 ? <span className="text-success font-semibold">Present</span> : '—'}</span>
                  </div>
                  <div className="col-span-2 md:col-auto md:text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Last Active</div>
                    <span className="text-sm text-muted-foreground">{user.lastCall ? new Date(user.lastCall.calledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "No history"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold mb-4">My Recent Calls</h3>
        <div className="divide-y">
          {myCalls.slice(0, 10).map((c) => (
            <div key={c._id || c.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/15 grid place-items-center shrink-0"><Phone className="size-4 text-primary" /></div>
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone} · {new Date(c.calledAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs px-2 py-1 rounded bg-accent text-accent-foreground capitalize">{(c.disposition || "new").replace("_", " ")}</span>
                <div className="text-xs text-muted-foreground mt-1">{c.duration || 0}s</div>
              </div>
            </div>
          ))}
          {myCalls.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No calls yet. Start dialing from CRM!</div>}
        </div>
      </div> */}
    </div>
  );
}

export default Dashboard;