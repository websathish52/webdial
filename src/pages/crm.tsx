import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentMember, DISPOSITIONS, dispoMeta, normalizeRole, type Disposition } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Search, Phone, UserPlus, Upload, FilePlus, PlayCircle, Edit3, RefreshCw, Download, UserCheck, Trash2, MessageCircle, UploadCloud, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { useDispositionColors } from "@/lib/use-disposition-colors";

const ALL_LEADS = "All Leads";

type ListItem = { _id?: string; id?: string; name: string; description?: string; assignedTo?: any[]; leadsCount?: number };

type LeadRecord = { _id?: string; id?: string; name: string; phone: string; email?: string; disposition: Disposition; list: string; totalDuration: number; createdAt?: string; lastCalledAt?: string; companyId?: string | { _id?: string; id?: string }; };

function normalizePhoneDigits(value: string) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  const trimmed = digits.replace(/^00/, '');
  if (/^91\d{10,15}$/.test(trimmed)) return trimmed.slice(2);
  if (/^\d{7,15}$/.test(trimmed)) return trimmed;
  return '';
}

function extractImportPhones(value: unknown): string[] {
  const text = String(value ?? '');
  const rawMatches = text.match(/\d{7,15}/g) || [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const match of rawMatches) {
    const clean = normalizePhoneDigits(match);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    normalized.push(clean);
  }

  return normalized.length > 0 ? normalized : (text.match(/\d+/g) || []).map((chunk) => normalizePhoneDigits(chunk)).filter(Boolean);
}

function normalizeImportPhone(value: unknown) {
  const [first] = extractImportPhones(value);
  return first || '';
}
type MemberRecord = { _id?: string; id?: string; name: string; role?: string; email?: string; username?: string; lists?: string[] };
type TeamCall = { _id?: string; id?: string; name: string; phone: string; agent?: string | { _id?: string; id?: string; name?: string }; duration?: number; disposition?: string; calledAt: string; leadId?: string | { _id?: string; id?: string } };

function getCallLeadId(call: TeamCall) {
  return typeof call.leadId === 'string' ? call.leadId : call.leadId?._id || call.leadId?.id || '';
}

function getAgentKey(agent: TeamCall['agent']) {
  if (!agent) return '';
  if (typeof agent === 'string') return agent;
  return agent._id || agent.id || agent.name || '';
}

function sameAgent(agent: TeamCall['agent'], user: MemberRecord) {
  const agentKey = getAgentKey(agent);
  const userKey = user._id || user.id || '';
  if (agentKey && userKey) return agentKey === userKey;
  return false;
}

function getCompanyKey(companyId: LeadRecord['companyId']) {
  if (!companyId) return '';
  if (typeof companyId === 'string') return companyId;
  return companyId._id || companyId.id || '';
}

function CRM() {
  useDispositionColors();
  const member = useCurrentMember();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [calls, setCalls] = useState<TeamCall[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Disposition>("all");
  const [callLead, setCallLead] = useState<LeadRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [moveOpen, setMoveOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [removingSelected, setRemovingSelected] = useState(false);

  const isAdmin = member?.role === "SuperAdmin" || member?.role === "Admin" || member?.flags?.modifyMember;
  // "All Leads" is a virtual, always-present entry — not backed by a List document.
  // It's pinned first in the dropdown and represents the merged, deduped view
  // across every imported list.
  const accessibleListNames = useMemo(() => {
    const role = String(member?.role || "").toLowerCase();
    if (["master", "superadmin", "admin"].includes(role) || member?.flags?.allowAllListAccess) {
      return listItems.map((list) => list.name);
    }
    const assignedNames = new Set(member?.lists || []);
    return listItems.filter((list) => assignedNames.has(list.name)).map((list) => list.name);
  }, [listItems, member]);
  const listNames = useMemo(() => [ALL_LEADS, ...accessibleListNames], [accessibleListNames]);
  const listIdByName = useMemo(() => Object.fromEntries(listItems.map(l => [l.name, l._id || l.id || ""])), [listItems]);

  const loadData = async () => {
    if (!member) return;
    try {
      setLoading(true);
      // ⭐ FIX: scope: 'team' tells the backend to return company-wide calls
      // (all agents), not just the logged-in agent's own calls. Without this,
      // getCallLogs defaults to { agent: req.user._id } server-side, so every
      // agent only ever sees their own call history — which is why "My Progress"
      // and the pending/done table filter looked wrong for teammates.
      const callLogFilters: { agent?: string; limit: number; scope?: string } = { limit: 50000, scope: 'team' };

      const [leadsRes, listsRes, membersRes, uploadsRes, callsRes] = await Promise.all([
        api.getLeads({ limit: 50000 }),
        api.getLists(),
        api.getMembers(),
        api.getUploads(),
        api.getCallLogs(callLogFilters),
      ]);
      const nextLeads: LeadRecord[] = Array.isArray(leadsRes?.leads) ? leadsRes.leads as LeadRecord[] : [];
      const nextLists = Array.isArray(listsRes) ? listsRes : (listsRes?.lists || []);
      const nextMembers = Array.isArray(membersRes) ? membersRes : [];
      const nextUploads = Array.isArray(uploadsRes) ? uploadsRes : [];
      const loadedCalls = (callsRes?.calls || []) as TeamCall[];
      setCalls(loadedCalls);

      const latestCallByLead = new Map<string, TeamCall>();
      for (const call of loadedCalls) {
        const leadId = getCallLeadId(call);
        if (!leadId) continue;
        const previous = latestCallByLead.get(leadId);
        if (!previous || new Date(call.calledAt) > new Date(previous.calledAt)) latestCallByLead.set(leadId, call);
      }
      setLeads(nextLeads.map(lead => {
        const leadId = lead._id || lead.id || '';
        const latestCall = latestCallByLead.get(leadId);
        return {
          ...lead,
          disposition: (latestCall?.disposition || 'new') as Disposition,
          totalDuration: latestCall ? Number(lead.totalDuration || 0) : 0,
          lastCalledAt: latestCall ? latestCall.calledAt : undefined,
        };
      }));
      setListItems(nextLists);
      setMembers(nextMembers);
      setUploads(nextUploads);
      setSelectedList(current => {
        // "All Leads" is always valid since it's virtual; otherwise keep the
        // current selection if it still refers to a real list, else fall back
        // to "All Leads" (rather than an arbitrary first list).
        if (current === ALL_LEADS) return current;
        if (current && nextLists.some((l: ListItem) => l.name === current)) return current;
        return ALL_LEADS;
      });
    } catch (err) {
      console.error("Failed to fetch CRM data:", err);
      toast.error("Could not load CRM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (member) {
      void loadData();
    }
    const handleCallLogged = () => { void loadData(); };
    window.addEventListener('ifox-call-logged', handleCallLogged);
    return () => window.removeEventListener('ifox-call-logged', handleCallLogged);
  }, [member]);

  if (!member) return null;

  const activeList = selectedList || listNames[0] || ALL_LEADS;
  const isAllLeadsView = activeList === ALL_LEADS;

  // Leads belonging to the active selection. For a real list this is a simple
  // filter; for "All Leads" it's every lead across every list, deduped by
  // company+phone (first occurrence wins) so the same number imported into
  // multiple files WITHIN THE SAME COMPANY is only shown once. Two different
  // companies having the same phone number (e.g. same customer, or SuperAdmin
  // viewing "All Team") are NOT merged — that would silently undercount the
  // total when SuperAdmin selects All Team + All Leads together.
  const leadsInActiveList = useMemo(() => {
    if (!isAllLeadsView) return leads.filter(l => l.list === activeList);
    const seenKeys = new Set<string>();
    const merged: LeadRecord[] = [];
    for (const l of leads) {
      const phone = (l.phone || '').trim();
      if (!phone) continue;
      const key = `${getCompanyKey(l.companyId)}::${phone}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      merged.push(l);
    }
    return merged;
  }, [leads, activeList, isAllLeadsView]);

  // ⭐ FIX: when a phone number was imported into more than one list WITHIN
  // THE SAME COMPANY, each import creates a SEPARATE lead document with its
  // own _id. "All Leads" dedupes those down to one row per company+phone for
  // display, but a call made against any of the duplicate lead _ids is still
  // a real call against that phone number. So "called" lookups must match on
  // ALL duplicate ids sharing a company+phone (allLeadIdsInActiveList), not
  // just the single id that survived the dedupe — otherwise a call logged on
  // the "other" duplicate silently doesn't count, undercounting doneCount
  // and inflating pendingCount in My Progress.
  const leadIdsInActiveList = useMemo(
    () => new Set(leadsInActiveList.map(l => l._id || l.id).filter(Boolean) as string[]),
    [leadsInActiveList]
  );

  const allLeadIdsInActiveList = useMemo(() => {
    if (!isAllLeadsView) return leadIdsInActiveList;
    const keysInView = new Set(
      leadsInActiveList.map(l => `${getCompanyKey(l.companyId)}::${(l.phone || '').trim()}`)
    );
    return new Set(
      leads
        .filter(l => keysInView.has(`${getCompanyKey(l.companyId)}::${(l.phone || '').trim()}`))
        .map(l => l._id || l.id)
        .filter(Boolean) as string[]
    );
  }, [leads, leadsInActiveList, isAllLeadsView, leadIdsInActiveList]);

  // Personal calls — used ONLY for the "My Daily Calls" bar chart now, which is the
  // one thing still shown per-agent. Everything else (pie, badges, table, progress
  // ring) is team-wide — see callsInList / calledLeadIdsInList below.
  const callsForAnalytics = isAdmin ? calls : calls.filter((c) => sameAgent(c.agent, member as MemberRecord));

  // ⭐ FIX: team-wide called set — built from `calls` (ALL agents), not `callsForAnalytics`.
  // Shariya & Sathish are in the same company/list — if either one calls a lead, it must
  // count as "done" for BOTH of them. This is what drives "My Progress" and the table.
  // Uses leadIdsInActiveList so it works the same whether a real list or "All Leads" is active.
  const calledLeadIdsInList = new Set(
    calls
      .filter(c => {
        const leadId = typeof c.leadId === 'string' ? c.leadId : c.leadId?._id;
        return !!leadId && allLeadIdsInActiveList.has(leadId);
      })
      .map(c => typeof c.leadId === 'string' ? c.leadId : c.leadId?._id)
      .filter(Boolean) as string[]
  );
  // ⭐ FIX: doneCount must be unique PHONES called, not unique lead-doc-ids
  // called. In "All Leads" the same phone can exist as 2+ lead docs (one
  // per list it was imported into); if agents called both duplicates
  // separately, calledLeadIdsInList.size would double-count that phone.
  // Map called lead-ids back to phone and dedupe there instead.
  const leadIdToPhone = useMemo(
    () => new Map(leads.map(l => [l._id || l.id || '', (l.phone || '').trim()])),
    [leads]
  );

  const filtered = useMemo(() => leads.filter(l => {
    const inList = leadIdsInActiveList.has(l._id || l.id || '');
    const matchesFilter = filter === "all" ? true : l.disposition === filter;
    const matchesSearch = (l.phone || '').toLowerCase().includes(search.toLowerCase()) || (l.name || '').toLowerCase().includes(search.toLowerCase());
    return inList && matchesFilter && matchesSearch;
  }), [leads, leadIdsInActiveList, filter, search]);
  useEffect(() => { setPage(1); }, [search, filter, selectedList]);
  const uniquePhonesInActiveList = useMemo(() => {
    const keys = new Set<string>();
    for (const lead of leadsInActiveList) {
      const phone = (lead.phone || '').trim();
      if (!phone) continue;
      keys.add(`${getCompanyKey(lead.companyId)}::${phone}`);
    }
    return keys;
  }, [leadsInActiveList]);
  const totalInList = uniquePhonesInActiveList.size || (isAllLeadsView ? leads.length : leadsInActiveList.length);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const selectedLeads = leads.filter(l => selectedIds.includes(l._id || l.id || ''));
  const selectedCount = selectedLeads.length;
  const allVisibleSelected = filtered.length > 0 && filtered.every(l => selectedIds.includes(l._id || l.id || ''));
  const allVisibleSelectedCount = filtered.length > 0 ? filtered.length : 0;
  const selectedActiveListMembers = useMemo(() => {
    if (isAllLeadsView) return [];
    const listRecord = listItems.find((item) => item.name === activeList);
    if (!listRecord) return [];
    const assignedIds = (listRecord.assignedTo || []).map((member: any) => typeof member === 'string' ? member : (member?._id || member?.id || ''));
    return members.filter((member) => assignedIds.includes(member._id || member.id || ''));
  }, [listItems, members, activeList, isAllLeadsView]);

  const calledPhoneKeysInList = useMemo(() => {
    const keys = new Set<string>();
    for (const call of calls) {
      const leadId = typeof call.leadId === 'string' ? call.leadId : call.leadId?._id;
      if (!leadId) continue;
      const lead = leads.find((item) => (item._id || item.id) === leadId);
      if (!lead) continue;
      const key = `${getCompanyKey(lead.companyId)}::${(lead.phone || '').trim()}`;
      if (!uniquePhonesInActiveList.has(key)) continue;
      keys.add(key);
    }
    return keys;
  }, [calls, leads, uniquePhonesInActiveList]);

  const doneCount = calledPhoneKeysInList.size;
  const pendingCount = Math.max(0, totalInList - doneCount);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const callsToday = callsForAnalytics.filter(c => new Date(c.calledAt) >= todayStart);
  // ⭐ FIX: team-wide now — built from `calls` (all agents), not `callsForAnalytics`.
  // This drives the "Dispositions (This List)" pie AND the badges row (byDispo below),
  // so both are common across every agent in the company, not just "my" calls.
  const callsInList = calls.filter(c => {
    const leadId = typeof c.leadId === 'string' ? c.leadId : c.leadId?._id;
    return !!leadId && allLeadIdsInActiveList.has(leadId);
  });
  const myCallsTodayInList = callsInList.filter(c => new Date(c.calledAt) >= todayStart);

  const myDispoData = [
    ...DISPOSITIONS.map((d) => ({
      ...d,
      name: d.label,
      value: callsInList.filter(c => c.disposition === d.key).length,
    })),
    // Add pending leads to the disposition data
    { key: 'pending', name: 'Pending', value: pendingCount, color: '#4285F4', text: '#ffffff' }
  ].filter(d => d.value > 0);

  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      calls: callsForAnalytics.filter(c => c.calledAt.startsWith(dayStr)).length
    };
  });

  const exportList = (source: LeadRecord[] = leadsInActiveList, fileName = activeList) => {
    const rows = source.map(l => ({
      Name: l.name,
      Phone: l.phone,
      Email: l.email || "",
      List: l.list,
      Disposition: dispoMeta(l.disposition).label,
      Duration: l.totalDuration,
      LastCalled: l.lastCalledAt ? new Date(l.lastCalledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : (l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ""),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileName.slice(0, 30));
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success(fileName === activeList ? "Exported" : "Selected leads exported");
  };

  const bulkSetSelected = (ids: string[]) => setSelectedIds(prev => {
    const next = new Set(prev);
    ids.forEach((id) => next.add(id));
    return Array.from(next);
  });

  const bulkRemoveSelected = async () => {
    if (!selectedCount || removingSelected) return;
    if (!confirm(`Remove ${selectedCount} selected lead${selectedCount > 1 ? 's' : ''}?`)) return;
    setRemovingSelected(true);
    let removedCount = 0;
    const failedIds: string[] = [];
    try {
      // Delete one at a time so a large selection does not overwhelm the API;
      // keep successful deletes even when one lead is unavailable or forbidden.
      for (const lead of selectedLeads) {
        const id = lead._id || lead.id || '';
        if (!id) continue;
        try {
          await api.deleteLead(id);
          removedCount += 1;
        } catch {
          failedIds.push(id);
        }
      }
      setSelectedIds((current) => current.filter((id) => failedIds.includes(id)));
      await loadData();
      if (failedIds.length > 0) {
        toast.error(`${removedCount} removed, ${failedIds.length} could not be removed. Check delete permission and API connection.`);
      } else {
        toast.success(`${removedCount} lead${removedCount > 1 ? 's were' : ' was'} removed`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove selected leads');
    } finally {
      setRemovingSelected(false);
    }
  };

  const bulkMoveSelected = async (targetList: string) => {
    if (!selectedCount || !targetList) return;
    try {
      await Promise.all(selectedLeads.map((lead) => api.updateLead(lead._id || lead.id || '', { list: targetList })));
      setSelectedIds([]);
      await loadData();
      toast.success(`Moved ${selectedCount} lead${selectedCount > 1 ? 's' : ''} to ${targetList}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not move selected leads');
    }
  };

  const bulkAssignSelected = async (memberId: string) => {
    if (!selectedCount || !memberId) return;
    try {
      await Promise.all(selectedLeads.map((lead) => api.updateLead(lead._id || lead.id || '', { assignedTo: memberId })));
      setSelectedIds([]);
      await loadData();
      toast.success(`Assigned ${selectedCount} lead${selectedCount > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not assign selected leads');
    }
  };

  const byDispo = (d: Disposition) => {
    return callsInList.filter(c => c.disposition === d).length;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Label className="font-semibold whitespace-nowrap">Select List</Label>
        <Select value={activeList} onValueChange={setSelectedList}>
          <SelectTrigger className="flex-1 bg-card min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {listNames.map(l => (
              <SelectItem key={l} value={l}>
                {l === ALL_LEADS ? "📊" : "📋"} {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link to={`/dialer?list=${encodeURIComponent(String(activeList))}`}>
          <Button className="bg-primary gap-2 w-full sm:w-auto"><PlayCircle className="size-4" /> START AUTO-DIALER</Button>
        </Link>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-6">{isAdmin ? 'Team Analytics' : 'My Analytics'}</h3>

        <div className="grid lg:grid-cols-3 gap-8 items-center">

          {/* Disposition Pie */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={myDispoData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={75} innerRadius={40}
                >
                  {myDispoData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <p className="text-sm font-semibold mt-2">
              {isAllLeadsView ? 'Dispositions (All Leads)' : 'Dispositions (This List)'}
            </p>
          </div>

          {/* New / Called */}
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Called", value: doneCount },
                      {
                        name: "Remaining",
                        value: pendingCount,
                      },
                    ]}
                    innerRadius={55}
                    outerRadius={65}
                    dataKey="value"
                  >
                    <Cell fill="#4285F4" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {doneCount}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {totalInList}
                </span>
              </div>
            </div>

            <p className="text-sm font-semibold mt-2">
              {/* ⭐ FIX: label always "My Progress" now — it's still the same team-wide count,
                  just phrased from the agent's point of view. Change back to conditional if
                  you want admins to see a different label. */}
              My Progress
            </p>
          </div>

          {/* Daily Calls */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="calls"
                  fill="#4CAF50"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <p className="text-sm font-semibold mt-2">
              {isAdmin ? 'Daily Calls (Team)' : 'My Daily Calls'}
            </p>
          </div>

        </div>
      </div>

      <div className="bg-card border rounded-xl p-3 flex flex-wrap gap-2 text-xs">
        {DISPOSITIONS.filter(d => d.key !== "dnd").map(d => (
          <div key={d.key} className="flex items-center gap-2 px-2.5 py-1 rounded-full text-white font-semibold" style={{ background: d.color }}>
            <span className="opacity-90">{d.label}</span>
            <span className="bg-white/25 rounded-full px-1.5 min-w-5 text-center">{d.key === 'new' ? pendingCount : byDispo(d.key)}</span>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddOpen(true)}><UserPlus className="size-4" /> Add Contact</Button>
        <Button variant="outline" size="sm" className="gap-1" disabled={isAllLeadsView} onClick={() => setImportOpen(true)}><Upload className="size-4" /> Import Excel/CSV</Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setListOpen(true)}><FilePlus className="size-4" /> New List</Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={isAllLeadsView} onClick={() => setRenameOpen(true)}><Edit3 className="size-3.5" /> Edit list name</Button>
        <Button size="sm" variant="outline" className="gap-1" disabled={isAllLeadsView} onClick={async () => {
          if (!activeList || !listIdByName[activeList]) return;
          if (confirm(`Rechurn "${activeList}"? All leads become "New" again.`)) {
            const listId = listIdByName[activeList];
            if (listId) await api.rechurnList(listId);
            await loadData();
            toast.success("List rechurned");
          }
        }}><RefreshCw className="size-3.5" /> Rechurn</Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => exportList()} disabled={member?.flags?.disableExportList}><Download className="size-3.5" /> Export</Button>
        {(isAdmin || member?.flags?.modifyMember) && <Button size="sm" variant="outline" className="gap-1" disabled={isAllLeadsView} onClick={() => setAssignOpen(true)}><UserCheck className="size-3.5" /> Assign</Button>}
        {(isAdmin || member?.flags?.deleteList) && <Button size="sm" variant="outline" className="gap-1 text-red-600" disabled={isAllLeadsView} onClick={async () => {
          if (!activeList || !listIdByName[activeList]) return;
          if (confirm(`Delete list "${activeList}" and all its leads?`)) {
            const listIdToDelete = listIdByName[activeList];
            if (listIdToDelete) await api.deleteList(listIdToDelete);
            const remainingLists = listItems.filter(l => (l._id || l.id) !== listIdToDelete);
            setListItems(remainingLists);
            setSelectedList(remainingLists[0]?.name || ALL_LEADS);
            toast.success("List deleted");
          }
        }}><Trash2 className="size-3.5" /> Delete list</Button>}
        <div className="w-full sm:w-auto sm:ml-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-40 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dispositions</SelectItem>
              {DISPOSITIONS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Phone / Name" className="pl-10 bg-background w-full" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="bg-card rounded-xl border p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{selectedCount} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ids = leadsInActiveList.map((l) => l._id || l.id || '').filter(Boolean);
              if (!ids.length) return;
              const allSelected = ids.every((id) => selectedIds.includes(id));
              setSelectedIds((prev) => allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
            }}
          >
            {leadsInActiveList.length > 0 && leadsInActiveList.every((l) => selectedIds.includes(l._id || l.id || '')) ? 'Deselect all list' : 'Select all list'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>Move to list</Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAssignOpen(true)}>Set assign</Button>
          <Button size="sm" variant="outline" onClick={() => exportList(selectedLeads, 'selected-leads')}>Export</Button>
          <Button size="sm" variant="destructive" disabled={removingSelected || Boolean(member?.flags?.disableContactDelete)} onClick={() => void bulkRemoveSelected()}>
            {removingSelected ? 'Removing...' : 'Remove'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && allVisibleSelected}
                  onChange={() => {
                    const ids = filtered.map(l => l._id || l.id || '').filter(Boolean);
                    if (ids.length === 0) return;
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (ids.every(id => next.has(id))) {
                        for (const id of ids) next.delete(id);
                      } else {
                        ids.forEach(id => next.add(id));
                      }
                      return Array.from(next);
                    });
                  }}
                  aria-label="Select all rows in this list"
                />
              </th>
              <th className="p-3">Phone</th><th className="p-3">Name</th>
              {isAllLeadsView && <th className="p-3">List</th>}
              <th className="p-3">Email</th><th className="p-3">Disposition</th><th className="p-3">Duration</th>
              <th className="p-3">Last Called</th><th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(l => {
              const dm = dispoMeta(l.disposition);
              const leadId = l._id || l.id || '';
              const checked = selectedIds.includes(leadId);
              return (
                <tr key={leadId} className="border-b hover:bg-accent/30">
                  <td className="p-3"><input type="checkbox" checked={checked} onChange={() => setSelectedIds(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId])} aria-label={`Select ${l.name}`} /></td>
                  <td className="p-3 font-medium">{l.phone}</td>
                  <td className="p-3">{l.name}</td>
                  {isAllLeadsView && <td className="p-3 text-muted-foreground">{l.list}</td>}
                  <td className="p-3">{l.email}</td>
                  <td className="p-3"><span className="text-white text-[10px] font-bold px-2 py-1 rounded uppercase" style={{ background: dm.color }}>{dm.label}</span></td>
                  <td className="p-3">{l.totalDuration}s</td>
                  <td className="p-3">{l.lastCalledAt ? new Date(l.lastCalledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : (l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—')}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link to={`/whatsapp?phone=${encodeURIComponent(String(l.phone))}&name=${encodeURIComponent(String(l.name))}`}>
                      <Button size="sm" variant="outline" className="gap-1 mr-1"><MessageCircle className="size-3" /> WA</Button>
                    </Link>
                    <Button size="sm" className="bg-primary gap-1" onClick={() => { window.location.href = `tel:${l.phone}`; setCallLead(l); }}>
                      <Phone className="size-3" /> Call
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={isAllLeadsView ? 9 : 8} className="p-8 text-center text-muted-foreground">{loading ? "Loading leads..." : "No leads. Import from Excel or add a contact."}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page:</span>
          <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      </div>

      {!isAllLeadsView && (
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold">Assignments</h4>
              <p className="text-xs text-muted-foreground">Choose members who can access this list</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>Assign</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedActiveListMembers.length > 0 ? selectedActiveListMembers.map((member) => (
              <span key={member._id || member.id || member.name} className="inline-flex items-center gap-2 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">
                {member.name}
                <button type="button" aria-label={`Remove ${member.name}`} className="text-muted-foreground hover:text-foreground" onClick={() => setAssignOpen(true)}>×</button>
              </span>
            )) : <span className="text-xs text-muted-foreground">No members assigned yet.</span>}
          </div>
        </div>
      )}

      <CallDialog lead={callLead} onClose={() => setCallLead(null)} agent={member.name} onLogged={() => void loadData()} />
      <AddDialog open={addOpen} onClose={() => setAddOpen(false)} list={isAllLeadsView ? "" : activeList} onSaved={() => void loadData()} />
      <NewListDialog open={listOpen} onClose={() => setListOpen(false)} onCreated={(n) => { setSelectedList(n); void loadData(); }} />
      <RenameDialog open={renameOpen} onClose={() => setRenameOpen(false)} name={activeList} listId={listIdByName[activeList] || ""} onDone={(n) => { setSelectedList(n); void loadData(); }} />
      <AssignDialog open={assignOpen} onClose={() => setAssignOpen(false)} name={activeList} listId={listIdByName[activeList] || ""} members={members} assignedTo={(listItems.find((item) => item.name === activeList)?.assignedTo || []).map((member: any) => typeof member === 'string' ? member : (member?._id || member?.id || ''))} onUpdated={() => void loadData()} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} list={isAllLeadsView ? "" : activeList} onImported={() => void loadData()} existingPhones={leads.map((lead) => lead.phone || '').filter(Boolean)} />
      <MoveSelectedDialog open={moveOpen} onClose={() => setMoveOpen(false)} listNames={listNames.filter(l => l !== ALL_LEADS)} currentList={activeList} onMove={bulkMoveSelected} />
      <BulkAssignDialog open={bulkAssignOpen} onClose={() => setBulkAssignOpen(false)} members={members} onAssign={bulkAssignSelected} />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className={`text-3xl font-bold ${color ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function CallDialog({ lead, onClose, agent, onLogged }: { lead: LeadRecord | null; onClose: () => void; agent: string; onLogged?: () => void }) {
  const [disposition, setDisposition] = useState<Disposition>("interested");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  if (!lead) return null;
  const submit = async () => {
    try {
      await api.logCall({ leadId: lead._id || lead.id || "", phone: lead.phone, name: lead.name, agent, duration, disposition, notes });
      toast.success("Call logged");
      onClose();
      setNotes("");
      setDuration(60);
      setDisposition("interested");
      await onLogged?.();
    } catch (err: any) {
      toast.error(err?.message || "Call could not be logged");
    }
  };
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log call — {lead.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Disposition</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {DISPOSITIONS.map(d => (
                <button key={d.key} onClick={() => setDisposition(d.key)}
                  className={`text-xs font-bold p-2 rounded text-white transition-transform ${disposition === d.key ? "ring-2 ring-offset-2 ring-primary scale-105" : "opacity-80 hover:opacity-100"}`}
                  style={{ background: d.color }}>{d.label}</button>
              ))}
            </div>
          </div>
          <div><Label>Duration (seconds)</Label><Input type="number" value={duration} onChange={e => setDuration(+e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => void submit()} className="bg-primary">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDialog({ open, onClose, list, onSaved }: { open: boolean; onClose: () => void; list: string; onSaved?: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const submit = async () => {
    if (!name || !phone) return toast.error("Name & phone required");
    if (!list) return toast.error("Pick a specific list first (not All Leads)");
    try {
      await api.createLead({ name, phone, email, list });
      toast.success("Lead added");
      setName("");
      setPhone("");
      setEmail("");
      onClose();
      await onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Lead could not be added");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{list ? `Add Contact to "${list}"` : "Add Contact"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => void submit()} className="bg-primary">Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewListDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (n: string) => void }) {
  const [name, setName] = useState("");
  const submit = async () => {
    if (!name) return;
    try {
      await api.createList(name);
      toast.success("List created");
      onCreated(name);
      setName("");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "List could not be created");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New List</DialogTitle></DialogHeader>
        <div><Label>List name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
        <DialogFooter>
          <Button onClick={() => void submit()} className="bg-primary">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ open, onClose, name, listId, onDone }: { open: boolean; onClose: () => void; name: string; listId: string; onDone: (n: string) => void }) {
  const [v, setV] = useState(name);
  useEffect(() => setV(name), [name]);
  const submit = async () => {
    if (!v || v === name) return onClose();
    if (!listId) return toast.error("List not found");
    try {
      await api.updateList(listId, { name: v });
      toast.success("List renamed");
      onDone(v);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "List could not be renamed");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit list name</DialogTitle></DialogHeader>
        <div><Label>New name</Label><Input value={v} onChange={e => setV(e.target.value)} autoFocus /></div>
        <DialogFooter>
          <Button onClick={() => void submit()} className="bg-primary">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ open, onClose, name, listId, members, assignedTo, onUpdated }: { open: boolean; onClose: () => void; name: string; listId: string; members: MemberRecord[]; assignedTo?: string[]; onUpdated?: () => void }) {
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => {
    setSel((assignedTo || []).filter(Boolean));
  }, [assignedTo, open]);
  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const submit = async () => {
    if (!listId) return toast.error("List not found");
    try {
      await api.updateList(listId, { assignedTo: sel });
      toast.success("List assigned");
      onClose();
      await onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Assignment could not be saved");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Assign "{name}" to members</DialogTitle></DialogHeader>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {members.map(m => {
            const memberId = m._id || m.id || "";
            return (
              <label key={memberId} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={sel.includes(memberId)} onChange={() => toggle(memberId)} />
                <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{m.name.charAt(0)}</div>
                <div><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{normalizeRole(m.role)}</div></div>
              </label>
            );
          })}
        </div>
        <DialogFooter><Button onClick={() => void submit()} className="bg-primary">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Import Dialog — 3 steps: Select File → Configure Import (column mapping) → Result
// ---------------------------------------------------------------------------

const MAX_IMPORT_ROWS = 25000;
const NONE_COLUMN = "__none__";

const IMPORT_FIELD_DEFS = [
  { key: "name", label: "Name", required: true, aliases: ["name", "fullname", "customername", "contactname", "leadname", "firstname"] },
  { key: "phone", label: "Primary Phone", required: true, aliases: ["phone", "mobile", "number", "phonenumber", "mobilenumber", "contact", "contactnumber", "primaryphone", "cell", "tel", "phone1"] },
  { key: "phone2", label: "Second Phone", required: false, aliases: ["phone2", "secondphone", "altphone", "alternatephone", "secondarynumber", "whatsapp"] },
  { key: "email", label: "Email", required: false, aliases: ["email", "emailaddress", "mail", "emailid", "e-mail"] },
  { key: "company", label: "Company", required: false, aliases: ["company", "companyname", "organization", "org"] },
  { key: "address", label: "Address", required: false, aliases: ["address", "location", "city"] },
  { key: "remarks", label: "Remarks", required: false, aliases: ["remarks", "remark", "comment", "comments"] },
  { key: "note", label: "Note", required: false, aliases: ["note", "notes"] },
] as const;

type ImportFieldKey = typeof IMPORT_FIELD_DEFS[number]["key"];
type ImportMapping = Partial<Record<ImportFieldKey, string>>;

function cleanImportKey(s: string) {
  return String(s || "").toLowerCase().replace(/[\s_\-.]/g, "");
}

function guessImportColumn(headers: string[], aliases: readonly string[]) {
  for (const alias of aliases) {
    const target = cleanImportKey(alias);
    const match = headers.find((h) => cleanImportKey(h) === target || cleanImportKey(h).includes(target));
    if (match) return match;
  }
  return NONE_COLUMN;
}

function extractImportPhoneValues(raw: unknown): string[] {
  const text = String(raw ?? "");
  const chunks = text.match(/\d{7,15}/g) || [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const clean = normalizePhoneDigits(chunk);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    normalized.push(clean);
  }

  return normalized;
}

function looksLikeImportPhone(raw: unknown) {
  return extractImportPhoneValues(raw).length > 0;
}

async function readImportHeadersAndRows(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const ext = file.name.toLowerCase();
  if (ext.endsWith(".txt")) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { headers: [], rows: [] };
    const first = lines[0].split(/[\t,;]/).map((h) => h.trim());
    const looksLikeHeader = first.some((h) => /[a-zA-Z]/.test(h)) && !looksLikeImportPhone(first[1] ?? first[0]);
    const headers = looksLikeHeader ? first : ["Name", "Phone", "Email"];
    const dataLines = looksLikeHeader ? lines.slice(1) : lines;
    const rows = dataLines.map((line) => {
      const cells = line.split(/[\t,;]/).map((c) => c.trim());
      const row: Record<string, any> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      return row;
    });
    return { headers, rows };
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }) as Record<string, any>[];
  const headerRow = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][])[0] || [];
  const headers = rows.length ? Object.keys(rows[0]) : headerRow.map(String);
  return { headers, rows };
}

function ImportDialog({
  open,
  onClose,
  list,
  onImported,
  existingPhones,
}: {
  open: boolean;
  onClose: () => void;
  list: string;
  onImported: () => void | Promise<void>;
  existingPhones: string[];
}) {
  const [step, setStep] = useState<"select" | "configure" | "result">("select");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ total: number; imported: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [duplicatePhones, setDuplicatePhones] = useState<string[]>([]);
  const [removedDuplicatePhones, setRemovedDuplicatePhones] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const reset = () => {
    setStep("select"); setFile(null); setHeaders([]); setRows([]); setMapping({});
    setProgress(0); setElapsed(0); setResult(null); setBusy(false); setDuplicatePhones([]); setRemovedDuplicatePhones([]);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const close = () => {
    if (busy) {
      toast.info("Please wait until the import finishes before closing this dialog.");
      return;
    }
    reset();
    onClose();
  };

  const handleFile = async (f: File) => {
    if (!list) { toast.error("Select a specific list first (not All Leads)"); return; }
    if (!/\.(xlsx|xls|csv|txt)$/i.test(f.name)) {
      toast.error("Unsupported format. Use Excel, CSV or TXT files.");
      return;
    }
    try {
      const { headers: h, rows: r } = await readImportHeadersAndRows(f);
      if (!r.length) { toast.error("No data rows found in this file"); return; }
      setFile(f);
      setHeaders(h);
      setRows(r);
      const auto: ImportMapping = {};
      IMPORT_FIELD_DEFS.forEach((fd) => { auto[fd.key] = guessImportColumn(h, fd.aliases); });
      setMapping(auto);
      const duplicateSet = new Set(existingPhones.map((phone) => normalizePhoneDigits(phone)));
      const duplicates = Array.from(new Set(
        r.flatMap((row) => {
          const col = auto.phone || NONE_COLUMN;
          if (!col || col === NONE_COLUMN) return [];
          return extractImportPhoneValues(row[col]).map((phone) => normalizePhoneDigits(phone)).filter((phone) => phone && duplicateSet.has(phone));
        })
      ));
      setDuplicatePhones(duplicates);
      setRemovedDuplicatePhones([]);
      setStep("configure");
    } catch (err: any) {
      toast.error("Could not read file: " + (err?.message || "unknown"));
    }
  };

  const startImport = async () => {
    if (!file) return;
    if (!mapping.name || mapping.name === NONE_COLUMN || !mapping.phone || mapping.phone === NONE_COLUMN) {
      toast.error("Map at least Name and Primary Phone before importing");
      return;
    }
    const phoneCol = mapping.phone!;
    const visibleDuplicateSet = new Set(removedDuplicatePhones);
    const normalizedRows = rows.flatMap((r) => extractImportPhoneValues(r[phoneCol]).map((phone) => normalizePhoneDigits(phone)).filter((phone) => phone && !visibleDuplicateSet.has(phone)));
    const importableCount = normalizedRows.length;
    if (importableCount > MAX_IMPORT_ROWS) {
      toast.error(`⚠️ This file has ${importableCount.toLocaleString()} numbers. Upload limit is ${MAX_IMPORT_ROWS.toLocaleString()} numbers per file. Please split the file into smaller uploads.`);
      return;
    }
    const remainingDuplicates = duplicatePhones.filter((phone) => !removedDuplicatePhones.includes(phone));
    if (remainingDuplicates.length > 0) {
      const confirmed = window.confirm(`These numbers already exist in this company and will be skipped:\n${remainingDuplicates.slice(0, 15).join(', ')}${remainingDuplicates.length > 15 ? ` ... (+${remainingDuplicates.length - 15} more)` : ''}\n\nDo you want to continue with the remaining numbers?`);
      if (!confirmed) return;
    }

    setStep("result");
    setBusy(true);
    setProgress(0);
    setElapsed(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
      setProgress((p) => (p < 90 ? p + Math.max(1, Math.round((90 - p) * 0.08)) : p));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("list", list);
      formData.append("mapping", JSON.stringify(mapping));
      const res = await api.uploadFile(formData);
      setProgress(100);
      setResult({ total: importableCount, imported: res?.file?.importedCount ?? 0 });
      await onImported();
    } catch (err: any) {
      toast.error("Import failed: " + (err?.message || "unknown"));
      setResult({ total: importableCount, imported: 0 });
      setProgress(100);
    } finally {
      setBusy(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const remainingDuplicatePhones = duplicatePhones.filter((phone) => !removedDuplicatePhones.includes(phone));
  const removeAllDuplicates = () => setRemovedDuplicatePhones((prev) => Array.from(new Set([...prev, ...duplicatePhones])));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) close(); }}>
      <DialogContent className="p-0 overflow-hidden max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="bg-primary px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Import</h3>
          <button
            type="button"
            aria-label="Close import dialog"
            disabled={busy}
            onClick={close}
            className="text-white/90 hover:text-white size-5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "white" }}
          >
            ×
          </button>
        </div>

        <div className="bg-neutral-900 text-white text-xs px-5 py-3 flex items-center gap-2">
          <ImportStepPill n={1} label="Select File" active={step === "select"} done={step !== "select"} />
          <div className="flex-1 h-px bg-white/20" />
          <ImportStepPill n={2} label="Configure Import" active={step === "configure"} done={step === "result"} />
          <div className="flex-1 h-px bg-white/20" />
          <ImportStepPill n={3} label="Result" active={step === "result"} done={!!result} />
        </div>

        <div className="p-5">
          {step === "select" && (
            <>
              <h4 className="font-semibold mb-2">Data Source</h4>
              <div
                className="border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
              >
                <UploadCloud className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center px-6">
                  Click here to choose a .xls or .csv file with contact data or drop your file here
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
              />
              <p className="text-xs text-muted-foreground mt-3">
                Importing to list: <span className="font-medium">{list || "—"}</span>
              </p>
            </>
          )}

          {step === "configure" && (
            <>
              <h4 className="font-semibold text-center mb-1">Configure Import</h4>
              <p className="text-xs text-muted-foreground text-center mb-4">
                Map each column from your spreadsheet to the CRM's fields. Detected columns are pre-selected — change any that look wrong.
              </p>
              <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                {IMPORT_FIELD_DEFS.map((fd) => (
                  <div key={fd.key} className="grid grid-cols-[120px_1fr_180px] items-center gap-2">
                    <Label className="text-sm">
                      {fd.label}{fd.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                    <span className="text-xs text-muted-foreground italic">maps to Column</span>
                    <Select value={mapping[fd.key] || NONE_COLUMN} onValueChange={(v) => setMapping((m) => ({ ...m, [fd.key]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_COLUMN}>None</SelectItem>
                        {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {rows.length.toLocaleString()} rows found in file — every row with a phone number in the mapped column will be imported.
              </p>
              {duplicatePhones.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-medium">Duplicate numbers detected in this company:</p>
                    {remainingDuplicatePhones.length > 0 && (
                      <button type="button" className="rounded border border-amber-400 bg-white/70 px-2 py-1 font-semibold text-[11px]" onClick={removeAllDuplicates}>Remove all</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {remainingDuplicatePhones.map((phone) => (
                      <span key={phone} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/60 px-2 py-1">
                        {phone}
                        <button type="button" className="ml-1 text-[11px] font-bold" onClick={() => setRemovedDuplicatePhones((prev) => prev.includes(phone) ? prev : [...prev, phone])}>Remove</button>
                      </span>
                    ))}
                    {remainingDuplicatePhones.length === 0 && (
                      <span className="text-[11px]">All duplicates removed from this import.</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-5">
                <Button variant="outline" size="sm" onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" className="bg-primary" onClick={() => void startImport()}>Import</Button>
              </div>
            </>
          )}

          {step === "result" && (
            <div className="flex flex-col items-center py-4">
              {result ? <CheckCircle2 className="size-12 text-green-500 mb-3" /> : <UploadCloud className="size-12 text-muted-foreground mb-3 animate-pulse" />}
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden mb-2">
                <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm font-medium mb-1">{progress}%</p>
              <p className="text-sm text-muted-foreground">
                {result ? `Imported ${result.imported.toLocaleString()} of ${result.total.toLocaleString()} contacts` : "Contacts waiting to be added to queue"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Elapsed Time: {elapsed} seconds</p>
              <Button className="mt-5 bg-neutral-900 hover:bg-neutral-800" size="sm" disabled={busy} onClick={close}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportStepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`size-5 rounded-full grid place-items-center text-[10px] font-bold ${done ? "bg-green-500" : active ? "bg-white text-black" : "bg-white/20"}`}>
        {done ? "✓" : n}
      </span>
      <span className={active || done ? "text-white" : "text-white/50"}>{label}</span>
    </div>
  );
}

function MoveSelectedDialog({
  open,
  onClose,
  listNames,
  currentList,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  listNames: string[];
  currentList: string;
  onMove: (target: string) => void;
}) {
  const [target, setTarget] = useState(currentList);
  useEffect(() => setTarget(currentList), [currentList, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Move selected leads</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>Target list</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {listNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-primary" onClick={() => { onMove(target); onClose(); }}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkAssignDialog({
  open,
  onClose,
  members,
  onAssign,
}: {
  open: boolean;
  onClose: () => void;
  members: MemberRecord[];
  onAssign: (memberId: string) => void;
}) {
  const [memberId, setMemberId] = useState<string>("");
  useEffect(() => { if (!open) setMemberId(""); }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Set assignee for selected leads</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Label>Assign to</Label>
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member._id || member.id || member.name} value={member._id || member.id || member.name}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-primary" disabled={!memberId} onClick={() => { onAssign(memberId); onClose(); }}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CRM;