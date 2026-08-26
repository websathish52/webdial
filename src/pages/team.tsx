import { useEffect, useMemo, useState } from "react";
import { useCurrentMember, normalizeRole, defaultTelecallerPerms, fullPerms, defaultFlags, newTelecallerFlags, type Permissions, type MemberFlags } from "@/lib/mock-store";
import api, { getSelectedCompanyId, setSelectedCompanyId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Trash2, Search, X, Edit, ExternalLink, Plus, Download, Upload, Users2, ChevronDown, Settings, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const companyDeleteModules = ["Leads and CRM", "Lists and uploads", "Calls and recordings", "Campaigns and marketing", "Pipeline and tasks", "WhatsApp data", "Members and settings"];

type BackendMember = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  username?: string;
  companyId?: string;
  companyName?: string;
  companyCode?: string;
  lists?: string[];
  teams?: string[];
  permissions?: Permissions;
  flags?: MemberFlags;
};

// ---- Local persistence for "teams" (backend has no dedicated Team model,
// only a `teams: string[]` field on each member). We keep the list of
// known/created team names in localStorage, scoped STRICTLY per real
// company id — there is no shared/"default" bucket anymore, so a team
// created while no company is selected can no longer leak into every
// company's view. ----
function teamsStorageKey(companyId: string) {
  return `ifox_custom_teams_${companyId}`;
}
function loadCustomTeamsForCompany(companyId?: string | null): string[] {
  if (typeof window === "undefined" || !companyId) return [];
  try {
    const raw = localStorage.getItem(teamsStorageKey(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveCustomTeamsForCompany(companyId: string | null | undefined, teams: string[]) {
  if (typeof window === "undefined" || !companyId) return;
  localStorage.setItem(teamsStorageKey(companyId), JSON.stringify(teams));
}
function loadCustomTeamsAggregate(companyIds: string[]): string[] {
  const set = new Set<string>();
  companyIds.forEach((id) => loadCustomTeamsForCompany(id).forEach((t) => set.add(t)));
  return Array.from(set);
}

function TeamPage() {
  const me = useCurrentMember();
  const [members, setMembers] = useState<BackendMember[]>([]);
  const [companies, setCompanies] = useState<Array<{ _id: string; companyName: string; companyCode: string; status: string }>>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [allLists, setAllLists] = useState<string[]>([]); // ⭐ NEW: Unfiltered list of all list names across all companies
  const [lists, setLists] = useState<string[]>([]);
  const [customTeams, setCustomTeams] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [companyManageOpen, setCompanyManageOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [teamManageOpen, setTeamManageOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(getSelectedCompanyId());
  const [importing, setImporting] = useState(false);
  // When a company (SuperAdmin) or team (Admin) tag is clicked in the
  // bottom bar, we open the Add Member dialog with that value pre-filled.
  const [presetCompanyId, setPresetCompanyId] = useState<string | null>(null);
  const [presetTeam, setPresetTeam] = useState<string | null>(null);

  const isSuperAdmin = me?.role === "SuperAdmin";
  const canManageMembers = isSuperAdmin || me?.role === "Admin" || me?.flags?.modifyMember;

  // One-time cleanup: kill the old shared "default" bucket that caused a
  // team created while no company was selected to show up under every
  // company / "All companies" view.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ifox_custom_teams_default");
    }
  }, []);

  // Which real company id(s) are "in scope" right now:
  // - Non-SuperAdmin: always just their own company.
  // - SuperAdmin with a specific company selected: just that company.
  // - SuperAdmin on "All companies": aggregate across every company that
  //   actually exists (never a fake/shared bucket).
  const effectiveCompanyIds = useMemo(() => {
    if (isSuperAdmin) {
      if (selectedCompanyId) return [selectedCompanyId];
      return companies.map((c) => c._id);
    }
    return me?.companyId ? [me.companyId] : [];
  }, [isSuperAdmin, selectedCompanyId, companies, me]);

  const loadMembers = async () => {
    try {
      const res = await api.getMembers();
      const nextMembers = Array.isArray(res) ? res : [];
      setMembers(nextMembers);
    } catch (err: any) {
      toast.error(err?.message || "Could not load team members");
    }
  };

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;
    try {
      setCompaniesLoading(true);
      const res = await api.getCompanies();
      if (Array.isArray(res)) {
        setCompanies(
          res.map((company: any) => ({
            _id: company._id || company.id,
            companyName: company.companyName,
            companyCode: company.companyCode,
            status: company.status || "active",
          }))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not load companies");
    } finally {
      setCompaniesLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      const res = await api.getLists();
      const arr = Array.isArray(res) ? res : [];
      const names = arr.map((l: any) => (typeof l === "string" ? l : l.name || l.title || String(l._id || l.id)));
      if (isSuperAdmin) setAllLists(names.filter(Boolean)); // Store all for SuperAdmin
      setLists(names.filter(Boolean));
    } catch (err: any) {
      // Non-fatal: keep page usable even if lists endpoint fails
      toast.error(err?.message || "Could not load lists");
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      // Ensure companies are loaded first, especially for SuperAdmin,
      // so loadMembers can use the 'companies' state for enrichment.
      if (isSuperAdmin) {
        await loadCompanies();
      } else {
        setCompaniesLoading(false); // For non-SuperAdmins, loadCompanies does nothing.
      }
      await loadMembers();
      await loadLists();
    };
    void initialLoad();
  }, [me, isSuperAdmin]); // Re-run if 'me' or 'isSuperAdmin' changes

  // Whenever the in-scope company set changes (company switched, or the
  // companies list itself loads/changes for SuperAdmin), recompute the
  // custom-teams list purely from real company buckets.
  useEffect(() => {
    setCustomTeams(loadCustomTeamsAggregate(effectiveCompanyIds));
  }, [effectiveCompanyIds]);

  // When SuperAdmin switches company, reload company-scoped data
  // (members and lists are re-fetched so switching tenants never leaks
  // data across companies; customTeams recomputes automatically via the
  // effect above once selectedCompanyId changes).
  const handleCompanyChange = async (id: string) => {
    const val = id || null;
    setSelectedCompanyId(val);
    setSelectedCompanyIdState(val);
    setPage(0);
    await Promise.all([loadMembers(), loadLists()]);
  };

  if (!me) return null;

  const enrichedMembers = useMemo(() => {
    return members.map((member: any) => ({
      ...member,
      _id: member._id || member.id,
      id: member._id || member.id || member.email,
      name: member.name || member.email,
      email: member.email,
      role: normalizeRole(member.role),
      phone: member.phone || "",
      username: member.username || member.email?.split("@")[0] || "",
      companyId: member.companyId,
      companyName: member.companyName || companies.find(c => c._id === member.companyId)?.companyName,
      companyCode: member.companyCode || companies.find(c => c._id === member.companyId)?.companyCode,
      lists: Array.isArray(member.lists) ? member.lists : [],
      teams: Array.isArray(member.teams) ? member.teams : [],
    }));
  }, [members, companies]);

  const filtered = enrichedMembers.filter(
    (m) => (m.name || "").toLowerCase().includes(search.toLowerCase()) || (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = filtered.length;
  const pageStart = page * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, totalCount);
  const paged = filtered.slice(pageStart, pageStart + rowsPerPage);

  // Teams shown in the bottom bar: union of every member's assigned teams
  // (already company-scoped via loadMembers -> api.getMembers, which sends
  // the X-Company-Id header) + custom (empty) teams for the in-scope
  // company/companies only.
  const allTeams = useMemo(() => {
    const fromMembers = new Set<string>();
    enrichedMembers.forEach((m: BackendMember) => (m.teams || []).forEach((t: string) => fromMembers.add(t)));
    customTeams.forEach((t: string) => fromMembers.add(t));
    return Array.from(fromMembers);
  }, [enrichedMembers, customTeams]);

  // Resolve the team list for a *specific* company id (used inside the
  // Add/Edit Member dialog, since a SuperAdmin can pick a company inside
  // the dialog that differs from the page-level filter).
  const teamsForCompany = (companyId?: string | null): string[] => {
    const ids = companyId ? [companyId] : effectiveCompanyIds;
    const fromMembers = new Set<string>();
    enrichedMembers.filter((m: BackendMember) => !companyId || m.companyId === companyId).forEach((m: BackendMember) => (m.teams || []).forEach((t: string) => fromMembers.add(t)));
    loadCustomTeamsAggregate(ids).forEach((t: string) => fromMembers.add(t));
    return Array.from(fromMembers);
  };

  const memberToEdit = useMemo(() => {
    if (!editingId) return undefined;
    return enrichedMembers.find((m) => String(m._id || m.id) === editingId);
  }, [editingId, enrichedMembers]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandLists = (id: string) => {
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkRemove = async () => {
    if (!isSuperAdmin) {
      toast.error("Only SuperAdmin can delete members");
      return;
    }
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).filter((id) => id !== me?.id);
    if (ids.length === 0) {
      toast.error("You cannot remove your own account here");
      return;
    }
    if (!confirm(`Remove ${ids.length} selected member(s)?`)) return;
    try {
      await Promise.all(ids.map((id) => api.deleteMember(id)));
      toast.success(`Removed ${ids.length} member(s)`);
      setSelectedIds(new Set());
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message || "Could not remove some members");
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No members to export");
      return;
    }
    const headers = ["Name", "Email", "Username", "Phone", "Role", "Company", "Teams", "Lists"];
    const rows = filtered.map((m) => [
      m.name,
      m.email,
      m.username || "",
      m.phone || "",
      m.role || "",
      m.companyName || "",
      (m.teams || []).join("|"),
      (m.lists || []).join("|"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team-members.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export started");
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("CSV needs a header row and at least one data row");
        return;
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
      const nameIdx = header.indexOf("name");
      const emailIdx = header.indexOf("email");
      const phoneIdx = header.indexOf("phone");
      const roleIdx = header.indexOf("role");
      const usernameIdx = header.indexOf("username");
      const passwordIdx = header.indexOf("password");

      if (nameIdx === -1 || emailIdx === -1 || passwordIdx === -1) {
        toast.error("CSV must include at least name, email, password columns");
        return;
      }

      let successCount = 0;
      let failCount = 0;
      for (const line of lines.slice(1)) {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[nameIdx];
        const email = cols[emailIdx];
        const password = cols[passwordIdx];
        if (!name || !email || !password) {
          failCount++;
          continue;
        }
        const role = roleIdx !== -1 ? cols[roleIdx] || "telecaller" : "telecaller";
        const username = usernameIdx !== -1 ? cols[usernameIdx] : undefined;
        const phone = phoneIdx !== -1 ? cols[phoneIdx] : undefined;
        try {
          await api.registerUser(name, email, password, role, username, phone, selectedCompanyId || undefined);
          successCount++;
        } catch {
          failCount++;
        }
      }
      toast.success(`Imported ${successCount} member(s)${failCount ? `, ${failCount} failed` : ""}`);
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleAddTeam = () => {
    const targetCompanyId = isSuperAdmin ? selectedCompanyId : me?.companyId;
    if (isSuperAdmin && !targetCompanyId) {
      toast.error("Select a specific company first to add a team");
      return;
    }
    if (!targetCompanyId) {
      toast.error("No company associated with your account");
      return;
    }
    const name = window.prompt("New team name:");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (allTeams.includes(trimmed)) {
      toast.error("Team already exists");
      return;
    }
    const existing = loadCustomTeamsForCompany(targetCompanyId);
    saveCustomTeamsForCompany(targetCompanyId, [...existing, trimmed]);
    setCustomTeams(loadCustomTeamsAggregate(effectiveCompanyIds));
    toast.success(`Team "${trimmed}" created`);
  };

  // For SuperAdmin, the "Teams" bar actually manages Companies now — this
  // creates a company directly from that button instead of opening the
  // full Company Management dialog.
  const handleAddCompanyQuick = async () => {
    setAddCompanyOpen(true);
  };

  const handleDeleteCompanyFromManage = async (id: string, name: string) => {
    if (!confirm(`Delete company "${name}"? This will remove tenant access and unassign users.`)) return;
    try {
      await api.deleteCompany(id);
      toast.success(`Company "${name}" deleted`);
      await Promise.all([loadCompanies(), loadMembers()]);
    } catch (err: any) {
      toast.error(err?.message || "Could not delete company");
    }
  };

  const handleRenameCompany = async (id: string, newName: string) => {
    try {
      await (api as any).updateCompany(id, { companyName: newName });
      toast.success("Company renamed");
      await loadCompanies();
    } catch (err: any) {
      toast.error(err?.message || "Renaming a company isn't supported yet");
    }
  };

  const handleDeleteTeam = async (teamName: string) => {
    if (!confirm(`Delete team "${teamName}"? Members will be unassigned from it.`)) return;
    try {
      const affected = enrichedMembers.filter((m: BackendMember) => (m.teams || []).includes(teamName));
      await Promise.all(
        affected.map((m) =>
          api.updateMember(String(m._id || m.id), {
            teams: (m.teams || []).filter((t: string) => t !== teamName),
          } as any)
        )
      );
      const idsToClean = isSuperAdmin ? companies.map((c) => c._id) : me?.companyId ? [me.companyId] : [];
      idsToClean.forEach((id) => {
        const existing = loadCustomTeamsForCompany(id);
        if (existing.includes(teamName)) {
          saveCustomTeamsForCompany(id, existing.filter((t: string) => t !== teamName));
        }
      });
      setCustomTeams(loadCustomTeamsAggregate(effectiveCompanyIds));
      toast.success(`Team "${teamName}" deleted`);
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete team");
    }
  };

  const handleRemoveMemberFromTeam = async (memberId: string, team: string) => {
    const member = enrichedMembers.find((m: BackendMember) => String(m._id || m.id) === memberId);
    if (!member) return;
    try {
      await api.updateMember(memberId, { teams: (member.teams || []).filter((t:string) => t !== team) } as any);
      toast.success(`Removed from ${team}`);
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message || "Could not update team assignment");
    }
  };

  const handleRenameTeam = async (oldName: string, newName: string) => {
    if (allTeams.includes(newName)) {
      toast.error("Team already exists");
      return;
    }
    try {
      const affected = enrichedMembers.filter((m: BackendMember) => (m.teams || []).includes(oldName));
      await Promise.all(
        affected.map((m) =>
          api.updateMember(String(m._id || m.id), {
            teams: (m.teams || []).map((t: string) => (t === oldName ? newName : t)),
          } as any)
        )
      );
      const idsToClean = isSuperAdmin ? companies.map((c) => c._id) : me?.companyId ? [me.companyId] : [];
      idsToClean.forEach((id) => {
        const existing = loadCustomTeamsForCompany(id);
        if (existing.includes(oldName)) {
          saveCustomTeamsForCompany(id, existing.map((t: string) => (t === oldName ? newName : t)));
        }
      });
      setCustomTeams(loadCustomTeamsAggregate(effectiveCompanyIds));
      toast.success("Team renamed");
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message || "Could not rename team");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8f9fa] min-h-screen text-[#333]">
      {/* Top Section: Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Members</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-100 text-gray-700 gap-1.5 rounded border border-gray-300"
            onClick={() => toast("Team App is coming soon")}
          >
            <Upload className="size-3.5" /> Team App
          </Button>
          {canManageMembers && (
            <>
              <Button size="sm" variant="outline" className="bg-gray-100 text-gray-700 gap-1.5 rounded border border-gray-300" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" /> Add
              </Button>

              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportFile(file);
                    e.target.value = "";
                  }}
                />
                <span className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-200">
                  <Upload className="size-3.5" /> {importing ? "Importing..." : "Import"}
                </span>
              </label>

              <Button size="sm" variant="outline" className="bg-gray-100 text-gray-700 gap-1.5 rounded border border-gray-300" onClick={handleExport}>
                <Download className="size-3.5" /> Export
              </Button>
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 gap-1.5 rounded"
                  onClick={handleBulkRemove}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="size-3.5" /> Remove {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search + Company filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            className="pl-10 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search Members"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500 whitespace-nowrap">Company</Label>
            <select
              value={selectedCompanyId ?? ""}
              onChange={(e) => void handleCompanyChange(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.companyName} ({c.companyCode})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Members Grid Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paged.map((m) => {
          const mId = String(m._id || m.id);
          const isMeSuperAdminCard = isSuperAdmin && mId === me.id;

          // A member's assigned lists should only be displayed if they still exist in the main `lists` collection.
          // This prevents deleted lists from appearing on member cards.
          // For the SuperAdmin's own card, show all available lists.
          // Per request, if a member has `allowAllListAccess` enabled, also show all available lists.
          // Per request, if the member is a Telecaller, also show all available lists.
          const assignedAndExistingLists = (m.lists || []).filter((listName: string) => lists.includes(listName));
          const visibleLists =
            isMeSuperAdminCard || m.flags?.allowAllListAccess
              ? lists
              : assignedAndExistingLists;
          
          let companiesToDisplay: Array<{ _id: string; companyName: string }> = [];

          if (isMeSuperAdminCard && !m.companyName) {
            // This is the SuperAdmin's own card, and they don't have an explicit companyName
            if (selectedCompanyId) {
              // If a specific company is selected in the dropdown, show only that company's name
              const found = companies.find((c) => c._id === selectedCompanyId);
              if (found) companiesToDisplay = [found];
            } else if (companies.length > 0) {
              // If "All companies" is selected, show a tag for every company
              companiesToDisplay = companies;
            }
          } else if (m.companyName) {
            // For any other member (or a SuperAdmin assigned to a specific company), show their single company
            companiesToDisplay = [{ _id: m.companyId || m.companyName, companyName: m.companyName }];
          }

          return (
            <div key={mId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {canManageMembers && m.role !== "SuperAdmin" && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(mId)}
                          onChange={() => toggleSelect(mId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 size-4 mt-0.5"
                        />
                      )}
                      <div className="font-semibold text-lg text-gray-900 border-b border-dotted border-gray-400 pb-0.5">{m.name}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      <div>
                        Role : <span className="font-medium text-gray-700">{m.role}</span>
                      </div>
                      <div>
                        Username : <span className="font-medium text-gray-700">{m.username}</span>
                      </div>
                      <div>
                        Email : <span className="font-medium text-gray-700">{m.email}</span>
                      </div>
                      <div>
                        Phone : <span className="font-medium text-gray-700">{m.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="size-10 rounded-full bg-blue-500 text-white grid place-items-center font-bold text-lg shrink-0">
                    {m.name.charAt(0)}
                  </div>
                </div>

                {/* Teams tags - driven by real member.teams data, already
                    company-scoped since `members` only ever contains the currently
                    selected company's staff. For SuperAdmin, show this section always. */}
                {(isSuperAdmin || companiesToDisplay.length > 0) && (
                  <div className="space-y-1.5">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Company</div>
                    <div className="flex flex-wrap gap-1.5">
                      {companiesToDisplay.length === 0 ? (
                        <span className="text-xs italic text-gray-500">Unassigned</span>
                      ) : (
                        companiesToDisplay.map((c) => <span key={c._id} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 font-medium">{c.companyName}</span>)
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Lists Tags Section */}
              <div className="border-t border-gray-100 p-5 bg-white space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Lists</div>
                    {canManageMembers && (
                      <button
                        className="size-5 rounded-full bg-blue-500 text-white grid place-items-center hover:bg-blue-600" // This button opens the MemberDialog for editing.
                        onClick={() => setEditingId(mId)}
                        title="Manage lists for this member"
                      >
                        <Plus className="size-3" />
                      </button>
                    )}
                  </div>


                  <div className="flex flex-wrap gap-1.5">
                    {visibleLists.length === 0 && <span className="text-xs text-gray-400 italic">No lists assigned</span>}
                    {visibleLists.map((l: string) => (
                      <span key={l} className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-blue-500 inline-block"></span>{l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                  <button
                    className="text-blue-600 hover:underline tracking-wide uppercase"
                    onClick={async () => {
                      const newPass = window.prompt(`New password for ${m.name}:`);
                      if (!newPass) return;
                      try {
                        await api.updateMemberPassword(mId, newPass);
                        toast.success("Password updated");
                      } catch (err: any) {
                        toast.error(err?.message || "Could not update password");
                      }
                    }}
                  >
                    Change Password
                  </button>
                  <div className="flex items-center gap-3.5 text-gray-500">
                    {isSuperAdmin && m.role !== "SuperAdmin" && (
                      <button
                        className="hover:text-red-600"
                        onClick={async () => {
                          if (confirm(`Remove ${m.name}?`)) {
                            try {
                              await api.deleteMember(mId);
                              await loadMembers();
                              toast.success("Removed");
                            } catch (err: any) {
                              toast.error(err?.message || "Could not remove member");
                            }
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                    {canManageMembers && (
                      <button className="hover:text-blue-600" onClick={() => setEditingId(mId)}>
                        <Edit className="size-4" />
                      </button>
                    )}
                    <button className="hover:text-blue-600">
                      <ExternalLink className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Create Member Virtual Dotted Box */}
        {canManageMembers && (
          <div
            onClick={() => setAddOpen(true)}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 bg-white flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-all min-h-[280px]"
          >
            <div className="flex items-center gap-1.5 text-blue-600 font-medium text-sm">
              <Users2 className="size-5" /> ADD MEMBER <Plus className="size-4" />
            </div>
          </div>
        )}
      </div>

      {/* Rows Per Page + Pagination */}
      <div className="flex items-center justify-end text-xs text-gray-500 gap-4 pt-4 border-t">
        <div className="flex items-center gap-1">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            className="border-b bg-transparent cursor-pointer outline-none"
          >
            {[6, 12, 24, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>{totalCount === 0 ? "0-0 of 0" : `${pageStart + 1}-${pageEnd} of ${totalCount}`}</div>
        <div className="flex items-center gap-2 text-gray-500 font-bold">
          <button disabled={page === 0} className="disabled:text-gray-300 hover:text-gray-800" onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ‹
          </button>
          <button
            disabled={pageEnd >= totalCount}
            className="disabled:text-gray-300 hover:text-gray-800"
            onClick={() => setPage((p) => (pageEnd < totalCount ? p + 1 : p))}
          >
            ›
          </button>
        </div>
      </div>

      {/* Bottom Teams List Bar.
          For SuperAdmin this bar shows Companies (Add Company and Add
          Team are the same action now) — clicking a company tag opens
          Add Member preset to that company. For Admin it stays as real
          teams — clicking a team tag opens Add Member preset to that team. */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mt-6">
        <div className="space-y-2">
          <div className="text-lg font-semibold text-gray-800">Teams</div>
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin ? (
              <>
                {companies.length === 0 && <span className="text-xs text-gray-400 italic">No companies yet</span>}
                {companies.map((c: { _id: string; companyName: string; }) => {
                  const count = enrichedMembers.filter((m: BackendMember) => m.companyId === c._id).length;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      disabled={!canManageMembers}
                      onClick={() => {
                        setPresetCompanyId(c._id);
                        setPresetTeam(null);
                        setAddOpen(true);
                      }}
                      className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 hover:bg-blue-100 disabled:cursor-default disabled:hover:bg-blue-50"
                      title={canManageMembers ? `Add a member to ${c.companyName}` : c.companyName}
                    >
                      <span className="size-2 rounded-full bg-blue-500 inline-block"></span>
                      {c.companyName}
                      <span className="text-blue-500">({count})</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {allTeams.length === 0 && <span className="text-xs text-gray-400 italic">No teams yet</span>}
                {allTeams.map((t) => {
                  const count = enrichedMembers.filter((m: BackendMember) => (m.teams || []).includes(t)).length;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={!canManageMembers}
                      onClick={() => {
                        setPresetTeam(t);
                        setPresetCompanyId(null);
                        setAddOpen(true);
                      }}
                      className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 hover:bg-blue-100 disabled:cursor-default disabled:hover:bg-blue-50"
                      title={canManageMembers ? `Add a member to ${t}` : t}
                    >
                      <span className="size-2 rounded-full bg-blue-500 inline-block"></span>
                      {t}
                      <span className="text-blue-500">({count})</span>
                    </button>
                  );
                })}
              </>
            )}
            {canManageMembers && (
              <button
                className="text-blue-600 text-xs font-semibold flex items-center gap-1 hover:underline ml-1"
                onClick={isSuperAdmin ? handleAddCompanyQuick : handleAddTeam}
              >
                <Plus className="size-3.5" /> ADD TEAM
              </button>
            )}
          </div>
        </div>
      
{canManageMembers && (
  <Button
    className="bg-blue-600 hover:bg-blue-700 text-white rounded font-medium gap-1.5 self-end sm:self-center uppercase text-xs tracking-wider px-4 py-2"
    onClick={() => (isSuperAdmin ? setAddCompanyOpen(true) : setTeamManageOpen(true))}
  >
    <Settings className="size-3.5" /> Manage
  </Button>
)}
      </div>

   {/* Bottom Lists Bar - lists belonging to the currently selected
          company (api.getLists() is company-scoped via the X-Company-Id
          header, same mechanism as members). Shows every list name so
          SuperAdmin/Admin can see what's been imported for this company. */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Lists</div>
        <div className="flex flex-wrap gap-1.5">
          {lists.length === 0 && <span className="text-xs text-gray-400 italic">No lists assigned</span>}
          {lists.map((l) => (
            <span key={l} className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500 inline-block"></span>{l}
            </span>
          ))}
        </div>
      </div>

      {canManageMembers && (
        <MemberDialog
          open={addOpen}
          onClose={() => {
            setAddOpen(false);
            setPresetCompanyId(null);
            setPresetTeam(null);
          }}
          onSaved={loadMembers}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          lists={lists}
          teamsForCompany={teamsForCompany}
          presetCompanyId={presetCompanyId}
          presetTeam={presetTeam}
        />
      )}
      {canManageMembers && editingId && (
        <MemberDialog
          open={!!editingId}
          onClose={() => setEditingId(null)}
          member={memberToEdit}
          onSaved={loadMembers}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          lists={lists}
          teamsForCompany={teamsForCompany}
        />
      )}
      {isSuperAdmin && (
        <CompanyManageDialog
          open={companyManageOpen}
          onClose={() => setCompanyManageOpen(false)}
          companies={companies}
          members={enrichedMembers as BackendMember[]}
          onAddCompany={handleAddCompanyQuick}
          onDeleteCompany={handleDeleteCompanyFromManage}
          onRenameCompany={handleRenameCompany}
        />
      )}
      {canManageMembers && (
        <TeamManageDialog
          open={teamManageOpen}
          onClose={() => setTeamManageOpen(false)}
          teams={allTeams}
          members={enrichedMembers as BackendMember[]}
          onDeleteTeam={handleDeleteTeam}
          onAddTeam={handleAddTeam}
          onRenameTeam={handleRenameTeam}
          onRemoveMemberFromTeam={handleRemoveMemberFromTeam}
        />
      )}
      {isSuperAdmin && (
        <AddCompanyDialog
          open={addCompanyOpen}
          onClose={() => setAddCompanyOpen(false)}
          companies={companies}
          onCompanyCreated={loadCompanies}
          onCompanyDeleted={loadCompanies}
        />
      )}
    </div>
  );
}

const PERM_LABELS: Array<[keyof Permissions, string]> = [
  ["crm", "CRM"],
  ["team", "Team & Members"],
  ["whatsapp", "WhatsApp"],
  ["reports", "Reports"],
  ["tools", "Tools"],
  ["marketing", "Marketing"],
  ["pbx", "PBX"],
  ["subscribe", "Subscribe"],
  ["payment", "Payment"],
  ["integration", "Integration"],
  ["recording", "Recording"],
  ["settings", "Settings"],
];

function MemberDialog({
  open,
  onClose,
  member,
  onSaved,
  companies, // This is all companies
  selectedCompanyId,
  lists: availableLists,
  teamsForCompany,
  presetCompanyId,
  presetTeam,
}: {
  open: boolean;
  onClose: () => void;
  member?: BackendMember;
  onSaved?: () => Promise<void> | void;
  companies: Array<{ _id: string; companyName: string; companyCode: string }>;
  selectedCompanyId?: string | null; // Page-level selection
  lists: string[];
  teamsForCompany: (companyId?: string | null) => string[];
  presetCompanyId?: string | null;
  presetTeam?: string | null;
}) {
  const me = useCurrentMember();
  const isSuperAdmin = me?.role === "SuperAdmin";

  const isEditingSuperAdmin = normalizeRole(member?.role) === 'SuperAdmin';

  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [username, setUsername] = useState(member?.username ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [companyId, setCompanyId] = useState<string | null>(member?.companyId ?? selectedCompanyId ?? null);
  const [role, setRole] = useState<string>(normalizeRole(member?.role));
  const [selectedTeams, setSelectedTeams] = useState<string[]>(member?.teams ?? []);
  const [lists, setLists] = useState<string[]>(member?.lists ?? []);
  const [dialogLists, setDialogLists] = useState<string[]>(availableLists);
  const [perms, setPerms] = useState<Permissions>(member?.permissions ?? defaultTelecallerPerms());
  const [flags, setFlags] = useState<MemberFlags>(member?.flags ?? defaultFlags());
  const memberLists = member ? (member.lists ?? []) : [];
  const memberAllowsAllLists = member ? Boolean(member.flags?.allowAllListAccess) : false;

  // Team options always reflect the company currently selected *inside
  // this dialog* — important for SuperAdmin, who can pick a company here
  // that differs from the page's outer filter.
  const availableTeams = useMemo(() => teamsForCompany(companyId), [companyId, teamsForCompany]);

  // ⭐ FIX: The lists available for assignment must come from the company
  // selected *inside* this dialog, not the page-level filter.
  // For non-SuperAdmins, this is always their own company's lists.
  // For SuperAdmins, this dynamically changes when they pick a company.
  const dialogScopedLists = useMemo(() => (isSuperAdmin ? dialogLists : availableLists), [isSuperAdmin, dialogLists, availableLists]);
  // "SuperAdmin" is never an assignable role from this dialog. It only
  // appears in the list when we're editing a member who is already a
  // SuperAdmin, so the Select still has a valid value to show.
  const roleOptions = useMemo(() => {
    const base = ["Admin", "Manager", "Submanager", "Telecaller"];
    return normalizeRole(member?.role) === "SuperAdmin" ? ["SuperAdmin", ...base] : base;
  }, [member]);

  const toggleList = (l: string) => setLists((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  const toggleTeam = (t: string) => setSelectedTeams((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const togglePerm = (k: keyof Permissions) => setPerms((p) => ({ ...p, [k]: !p[k] }));
  const toggleFlag = (k: keyof MemberFlags) => setFlags((f) => {
    const nextValue = !f[k];
    if (k === "allowAllListAccess") setLists(nextValue ? dialogScopedLists : []);
    return { ...f, [k]: nextValue };
  });
  const applyRoleDefaults = (r: string) => {
    setRole(r);
    if (r === "SuperAdmin" || r === "Admin") setPerms(fullPerms());
    else setPerms(defaultTelecallerPerms());
  };

  useEffect(() => {
    if (!open) return;
    const currentRole = normalizeRole(member?.role);
    const isEditingAnySuperAdmin = currentRole === 'SuperAdmin';
    const isTelecaller = currentRole === 'Telecaller';

    setName(member?.name ?? "");
    setEmail(member?.email ?? "");
    setUsername(member?.username ?? "");
    setPhone(member?.phone ?? "");
    setRole(currentRole);

    // When opening a new member dialog (not editing), pre-fill from whichever tag was
    // clicked to open this dialog.
    setSelectedTeams(member?.teams ?? (presetTeam ? [presetTeam] : []));
    setFlags(isEditingAnySuperAdmin ? { ...defaultFlags(), ...fullPerms() } : (!member && currentRole === "Telecaller" ? newTelecallerFlags() : (member?.flags ?? defaultFlags())));
    setPerms(isEditingAnySuperAdmin ? fullPerms() : (member?.permissions ?? defaultTelecallerPerms()));
    setCompanyId(member?.companyId ?? presetCompanyId ?? selectedCompanyId ?? null);

    // For Telecallers, SuperAdmins, or new members, default to all lists.
    // For other existing members, show their currently assigned lists.
    if (isEditingAnySuperAdmin || (!member && currentRole !== "Telecaller")) {
      setLists(dialogScopedLists);
    } else {
      setLists(memberLists);
    }
  }, [member, open, presetCompanyId, presetTeam, selectedCompanyId]);

  useEffect(() => {
    let active = true;
    if (!open || !isSuperAdmin || !companyId) {
      setDialogLists(availableLists);
      return () => { active = false; };
    }
    api.getLists(companyId).then((response: any) => {
      if (!active) return;
      const items = Array.isArray(response) ? response : (response?.lists || []);
      setDialogLists(items.map((item: any) => typeof item === "string" ? item : item.name).filter(Boolean));
    }).catch(() => {
      if (active) setDialogLists([]);
    });
    return () => { active = false; };
  }, [open, isSuperAdmin, companyId, availableLists]);

  useEffect(() => {
    if (!open) return;
    const currentRole = normalizeRole(member?.role);
    if (currentRole === "SuperAdmin" || (!member && currentRole !== "Telecaller")) {
      setLists(dialogScopedLists);
    } else if (memberAllowsAllLists) {
      setLists(dialogScopedLists);
    } else {
      setLists(memberLists.filter((list) => dialogScopedLists.includes(list)));
    }
  }, [open, member, dialogScopedLists]);

  const submit = async () => {
    if (!name || !email || (!password && !member)) return toast.error("Name, email & password required");
    const backendRole = role === "SuperAdmin" ? "superadmin" : role === "Admin" ? "admin" : role === "Manager" ? "manager" : role === "Submanager" ? "submanager" : role === "Telecaller" ? "telecaller" : "admin";
    const userId = (username || email.split("@")[0]).trim();
    try { 
      if (member) {
        const memberId = member._id || member.id || "";
        await api.updateMember(memberId, {
          name,
          email,
          phone,
          role: backendRole,
          username: userId, // Ensure `lists` is included in the update payload.
          lists,
          teams: selectedTeams,
          permissions: perms,
          flags,
          companyId: isSuperAdmin ? companyId || undefined : undefined,
        } as any);
        if (password) await api.updateMemberPassword(memberId, password);
        toast.success("Member updated");
      } else {
        const created: any = await api.registerUser(name, email, password, backendRole, userId, phone, companyId || undefined);
        let newId = created?._id || created?.id || created?.user?._id || created?.user?.id;
        if (!newId) {
          // registerUser's response shape didn't give us an id — look the
          // member up by the email we just used so Teams/Lists/Permissions
          // aren't silently dropped.
          try {
            const list = await api.getMembers();
            const found = Array.isArray(list)
              ? list.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase())
              : null;
            newId = found?._id || found?.id;
          } catch {
            // ignore — handled by the warning below
          }
        }
        if (newId) {
          // Ensure companyId is also passed in the follow-up update
          await api.updateMember(newId, {
            teams: selectedTeams,
            lists, // Ensure `lists` is included in the update payload for new members.
            permissions: perms,
            flags,
            companyId: isSuperAdmin ? companyId || undefined : undefined,
          } as any);
        } else if (selectedTeams.length > 0 || lists.length > 0) {
          toast.error("Member created, but Teams/Lists couldn't be applied automatically — open Edit on this member to set them.");
        }
        toast.success("Member added");
      }
      await onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Could not save member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
        <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] text-white p-4 flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-white">{member ? "Edit Member" : "Add Member"}</DialogTitle>
          </DialogHeader>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-sm text-gray-700">
          <div className="grid place-items-center">
            <div className="size-20 rounded-full bg-gray-100 grid place-items-center text-3xl">👤</div>
          </div>
          <div>
            <Label className="text-gray-700">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"  />
          </div>
          <div>
            <Label className="text-gray-700">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" readOnly={!!member} />
          </div>
          <div>
            <Label className="text-gray-700">User Id *</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="User Id" readOnly={!!member} />
          </div>
          <div>
            <Label className="text-gray-700">Password {member ? "" : "*"}</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder={member ? "Leave blank to keep unchanged" : ""} />
          </div>
          <div>
            <Label className="text-gray-700">Role *</Label>
            <Select value={role} onValueChange={(v) => applyRoleDefaults(v)}  disabled={!!member} > {/* Select components use 'disabled' for non-interactivity */}
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">Sub Managers can access Web Dashboard, and can make any change within their own team.</p>
          </div>

          {isSuperAdmin && role !== 'SuperAdmin' && (
            <div>
              <Label className="text-gray-700">Company *</Label>
              <select value={companyId ?? ""} onChange={(e) => setCompanyId(e.target.value || null)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.companyName} ({company.companyCode})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">Pick the company first — the Teams list below updates to match it.</p>
            </div>
          )}

          <div>
            <Label className="text-gray-700">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone No" />
          </div>
          <p className="text-[11px] text-muted-foreground">* Web only uses this phone number for message template generation. The username is used as the unique identifier for each member.</p>

          <div>
            <div className="text-blue-600 font-semibold mb-2 border-b pb-1">Permissions</div>
            <FlagRow label="Access CRM on App" v={isEditingSuperAdmin || flags.accessCrmOnApp} onChange={() => toggleFlag("accessCrmOnApp")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Modify Member" v={isEditingSuperAdmin || flags.modifyMember} onChange={() => toggleFlag("modifyMember")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Skip Call" v={isEditingSuperAdmin || flags.skipCall} onChange={() => toggleFlag("skipCall")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Delete List" v={isEditingSuperAdmin || flags.deleteList} onChange={() => toggleFlag("deleteList")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Mobile Call Recording" v={isEditingSuperAdmin || flags.mobileRecording} onChange={() => toggleFlag("mobileRecording")} badge="BETA" disabled={isEditingSuperAdmin} />
            <FlagRow label="Enable Whatsapp" v={isEditingSuperAdmin || flags.enableWhatsapp} onChange={() => toggleFlag("enableWhatsapp")} disabled={isEditingSuperAdmin} />
          </div>

          <div>
            <div className="text-blue-600 font-semibold mb-2 border-b pb-1">Security</div>
            <FlagRow label="Allow All List Access" v={isEditingSuperAdmin || flags.allowAllListAccess} onChange={() => toggleFlag("allowAllListAccess")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Call Log access" v={isEditingSuperAdmin || flags.callLogAccess} onChange={() => toggleFlag("callLogAccess")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Disable Export List" v={isEditingSuperAdmin || flags.disableExportList} onChange={() => toggleFlag("disableExportList")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Disable Contact Delete" v={isEditingSuperAdmin || flags.disableContactDelete} onChange={() => toggleFlag("disableContactDelete")} disabled={isEditingSuperAdmin} />
          </div>

          <div>
            <div className="text-blue-600 font-semibold mb-2 border-b pb-1">Attendance</div>
            <FlagRow label="Mark Attendance" v={isEditingSuperAdmin || flags.markAttendance} onChange={() => toggleFlag("markAttendance")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Capture Location" v={isEditingSuperAdmin || flags.captureLocation} onChange={() => toggleFlag("captureLocation")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Capture Photo" v={isEditingSuperAdmin || flags.capturePhoto} onChange={() => toggleFlag("capturePhoto")} disabled={isEditingSuperAdmin} />
            <FlagRow label="Enable Session Lock" v={isEditingSuperAdmin || flags.enableSessionLock} onChange={() => toggleFlag("enableSessionLock")} disabled={isEditingSuperAdmin} />
          </div>

          <div>
            <div className="text-blue-600 font-semibold mb-2 border-b pb-1">Sidebar modules</div>
            <div className="grid grid-cols-2 gap-1">
              {PERM_LABELS.map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1.5 rounded cursor-pointer">
                  <input type="checkbox" checked={isEditingSuperAdmin || perms[k]} onChange={() => togglePerm(k)} disabled={isEditingSuperAdmin} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> {label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Integration & Recording are OFF by default for Telecallers.</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-gray-700">Assigned Lists (company lists)</Label>
              <div className="flex gap-2">
                {!flags.allowAllListAccess && (
                  <>
                    <button
                      onClick={() => setLists(dialogScopedLists)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setLists([])}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Deselect All
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1 border rounded-lg p-2 max-h-32 overflow-y-auto bg-gray-50">
              {dialogScopedLists.map((l) => (
                <label key={l} className="flex items-center gap-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer">
                  <input type="checkbox" checked={flags.allowAllListAccess || lists.includes(l)} onChange={() => toggleList(l)} disabled={flags.allowAllListAccess} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> {l}
                </label>
              ))}
              {dialogScopedLists.length === 0 && <div className="text-xs text-muted-foreground p-2">No lists available.</div>}
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t bg-gray-50">
          <Button variant="ghost" onClick={onClose} className="text-red-600 hover:bg-red-50">
            CANCEL
          </Button>
          <Button onClick={submit} className="bg-blue-600 hover:bg-blue-700 text-white">
            {" "}
            {member ? "SAVE" : "ADD"}{" "}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagRow({ label, v, onChange, badge, disabled }: { label: string; v: boolean; onChange: () => void; badge?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50">
      <div className="flex items-center gap-2 text-gray-600">
        {label} {badge && <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 rounded">{badge}</span>}
      </div>
      <Switch checked={v} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// Company Management for SuperAdmin — same card layout as Team Management
// (one card per company, its assigned staff with role badges, a rename
// pencil, and an ADD TEAM tile that creates a new company).
function CompanyManageDialog({
  open,
  onClose,
  companies,
  members,
  onAddCompany,
  onDeleteCompany,
  onRenameCompany,
}: {
  open: boolean;
  onClose: () => void;
  companies: Array<{ _id: string; companyName: string; companyCode: string; status: string }>;
  members: BackendMember[];
  onAddCompany: () => void;
  onDeleteCompany: (id: string, name: string) => void;
  onRenameCompany: (id: string, newName: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white">
        <div className="border-b p-4 flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft className="size-5" />
          </button>
          <DialogHeader>
            <DialogTitle className="text-gray-800">Team Management</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
          <div className="flex flex-wrap gap-5 items-start">
            {companies.map((c) => {
              const staff = members.filter((m: BackendMember) => {
                if (m.role === "SuperAdmin") return true;
                return m.companyId === c._id;
              });
              return (
                <div key={c._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 w-72">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-gray-800 uppercase text-sm tracking-wide">{c.companyName}</div>
                    <button
                      className="size-7 rounded-full bg-blue-500 text-white grid place-items-center hover:bg-blue-600"
                      title="Rename company"
                      onClick={() => {
                        const newName = window.prompt("Rename company:", c.companyName);
                        if (newName && newName.trim() && newName.trim() !== c.companyName) onRenameCompany(c._id, newName.trim());
                      }}
                    >
                      <Edit className="size-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Assignments</div>
                  <div className="flex flex-wrap gap-2">
                    {staff.length === 0 && <div className="text-xs text-gray-400 italic">No members assigned</div>}
                    {staff.map((m) => {
                      const mId = String(m._id || m.id);
                      return (
                        <div key={mId} className="flex flex-col">
                          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full pl-1 pr-2 py-1 text-xs text-gray-700">
                            <span className="size-5 rounded-full bg-gray-400 text-white grid place-items-center text-[10px] font-bold shrink-0">
                              {m.name.charAt(0)}
                            </span>
                            <span className="truncate max-w-[110px]">{m.name}</span>
                          </div>
                          <div className="mt-1 bg-blue-500 text-white text-[9px] font-bold uppercase text-center rounded py-0.5 tracking-wider">
                            {m.role}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                    <button className="text-xs text-red-500 hover:underline" onClick={() => onDeleteCompany(c._id, c.companyName)}>
                      Delete company
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={onAddCompany}
              className="w-72 min-h-[170px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-1.5 text-blue-600 font-medium text-sm hover:bg-white hover:border-blue-500"
            >
              <Plus className="size-4" /> ADD TEAM
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Redesigned to match the "Team Management" full-page card layout:
// one card per team, showing every assigned member with their role
// badge, a remove-from-team button per member, an "ADD TEAM" tile,
// and a rename action per team card.
function TeamManageDialog({
  open,
  onClose,
  teams,
  members,
  onDeleteTeam,
  onAddTeam,
  onRenameTeam,
  onRemoveMemberFromTeam,
}: {
  open: boolean;
  onClose: () => void;
  teams: string[];
  members: BackendMember[];
  onDeleteTeam: (name: string) => void;
  onAddTeam: () => void;
  onRenameTeam: (oldName: string, newName: string) => void;
  onRemoveMemberFromTeam: (memberId: string, team: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white">
        <div className="border-b p-4 flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft className="size-5" />
          </button>
          <DialogHeader>
            <DialogTitle className="text-gray-800">Team Management</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
          <div className="flex flex-wrap gap-5 items-start">
            {teams.map((t) => {
              const teamMembers = members.filter((m) => (m.teams || []).includes(t));
              return (
                <div key={t} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 w-72">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-gray-800 uppercase text-sm tracking-wide">{t}</div>
                    <button
                      className="size-7 rounded-full bg-blue-500 text-white grid place-items-center hover:bg-blue-600"
                      title="Rename team"
                      onClick={() => {
                        const newName = window.prompt("Rename team:", t);
                        if (newName && newName.trim() && newName.trim() !== t) onRenameTeam(t, newName.trim());
                      }}
                    >
                      <Edit className="size-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Assignments</div>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.length === 0 && <div className="text-xs text-gray-400 italic">No members assigned</div>}
                    {teamMembers.map((m) => {
                      const mId = String(m._id || m.id);
                      return (
                        <div key={mId} className="flex flex-col">
                          <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full pl-1 pr-2 py-1 text-xs text-gray-700">
                            <span className="size-5 rounded-full bg-gray-400 text-white grid place-items-center text-[10px] font-bold shrink-0">
                              {m.name.charAt(0)}
                            </span>
                            <span className="truncate max-w-[110px]">{m.name}</span>
                            <button className="text-gray-400 hover:text-red-500" onClick={() => onRemoveMemberFromTeam(mId, t)} title="Remove from team">
                              <X className="size-3" />
                            </button>
                          </div>
                          <div className="mt-1 bg-blue-500 text-white text-[9px] font-bold uppercase text-center rounded py-0.5 tracking-wider">
                            {m.role}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                    <button className="text-xs text-red-500 hover:underline" onClick={() => onDeleteTeam(t)}>
                      Delete team
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={onAddTeam}
              className="w-72 min-h-[170px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-1.5 text-blue-600 font-medium text-sm hover:bg-white hover:border-blue-500"
            >
              <Plus className="size-4" /> ADD TEAM
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyDialog({
  open,
  onClose,
  companies,
  onCompanyCreated,
  onCompanyDeleted,
}: {
  open: boolean;
  onClose: () => void;
  companies: Array<{ _id: string; companyName: string; companyCode: string; status: string }>;
  onCompanyCreated: () => void;
  onCompanyDeleted: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ _id: string; companyName: string } | null>(null);
  const [selectedDeleteModules, setSelectedDeleteModules] = useState(companyDeleteModules);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const createCompany = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Company Name and Code are required.");
      return;
    }
    setIsSaving(true);
    try {
      await api.createCompany(name.trim(), code.trim(), status);
      toast.success(`Company "${name.trim()}" created`);
      setName("");
      setCode("");
      onCompanyCreated();
    } catch (err: any) {
      toast.error(err?.message || "Could not create company");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCompany = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteCompany(id);
      toast.success("Company deleted");
      onCompanyDeleted();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete company");
    } finally {
      setDeletingId(null);
    }
  };

  const openDeleteCompany = (company: { _id: string; companyName: string }) => {
    setDeleteTarget(company);
    setSelectedDeleteModules(companyDeleteModules);
    setDeleteConfirmation("");
  };

  const confirmDeleteCompany = async () => {
    if (!deleteTarget || selectedDeleteModules.length !== companyDeleteModules.length || deleteConfirmation !== deleteTarget.companyName) return;
    await deleteCompany(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
        <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] text-white p-4 flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-white">Company Management</DialogTitle>
          </DialogHeader>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/20">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 grid gap-4 text-sm text-gray-700">
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label className="text-gray-700">Company Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ABC Ventures" /></div>
            <div><Label className="text-gray-700">Company Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC123" /></div>
            <div><Label className="text-gray-700">Status</Label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={createCompany} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">{isSaving ? "Saving..." : "Create Company"}</Button>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3"><div className="text-sm font-semibold text-gray-900">Existing Companies</div><div className="text-xs text-gray-500">Super admin can create or delete tenant companies here.</div></div>
            <div className="space-y-2">
              {companies.length === 0 && <div className="text-xs text-muted-foreground">No companies available yet.</div>}
              {companies.map((company) => (
                <div key={company._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 p-3">
                  <div><div className="font-medium text-gray-800">{company.companyName}</div><div className="text-xs text-gray-500">Code: {company.companyCode} • Status: {company.status}</div></div>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openDeleteCompany(company)} disabled={deletingId === company._id}>{deletingId === company._id ? "Deleting..." : "Delete"}</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Company and All Data</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-red-600 font-medium">This is permanent. All company data will be deleted from MongoDB and storage.</p>
            <div className="space-y-2 border rounded-lg p-3">
              <div className="font-medium">Select all data to delete</div>
              {companyDeleteModules.map((item) => <label key={item} className="flex items-center gap-2"><input type="checkbox" checked={selectedDeleteModules.includes(item)} onChange={(event) => setSelectedDeleteModules((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />{item}</label>)}
            </div>
            <div><Label>Type {deleteTarget?.companyName} to confirm</Label><Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={deleteTarget?.companyName} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteCompany} disabled={!!deletingId || selectedDeleteModules.length !== companyDeleteModules.length || deleteConfirmation !== deleteTarget?.companyName}>Permanently Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TeamPage;