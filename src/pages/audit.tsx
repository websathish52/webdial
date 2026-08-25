import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentMember } from "@/lib/mock-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileClock, Download, Search } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

type AuditItem = { _id?: string; id?: string; action: string; module: string; actor?: any; companyId?: any; at?: string; ip?: string; details?: any };
type MemberItem = { _id?: string; id?: string; name: string };

function toDateInputValue(date?: string | Date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function AuditPage() {
  const me = useCurrentMember();
  const isAdmin = me?.role === "SuperAdmin" || me?.role === "Admin" || me?.role === "Master";
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [user, setUser] = useState("all");
  const [action, setAction] = useState("all");
  const [module, setModule] = useState("all");
  const [startDate, setStartDate] = useState(toDateInputValue(new Date(Date.now() - 7 * 86400_000)));
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
  const [loading, setLoading] = useState(false);

  const loadData = async (filters?: { actor?: string; action?: string; module?: string; startDate?: string; endDate?: string }) => {
    try {
      setLoading(true);
      const actorId = filters?.actor && filters.actor !== "all" ? filters.actor : undefined;

      const [auditRes, membersRes] = await Promise.all([
        api.getAudit({
          actor: isAdmin ? actorId : me?.id,
          action: filters?.action && filters.action !== "all" ? filters.action : undefined,
          module: filters?.module && filters.module !== "all" ? filters.module : undefined,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
          limit: 250,
        }),
        api.getMembers(),
      ]);

      const nextAudit = Array.isArray(auditRes) ? auditRes : (auditRes?.entries || []);
      const nextMembers = Array.isArray(membersRes) ? membersRes : [];

      setAudit(nextAudit.map((entry: any) => ({
        _id: entry._id || entry.id,
        id: entry._id || entry.id,
        action: entry.action || "Activity",
        module: entry.module || "System",
        actor: entry.actor || entry.actorName || entry.user || "System",
        at: entry.at || entry.createdAt || entry.timestamp,
        ip: entry.ip,
        companyId: entry.companyId,
        details: entry.details,
      })));
      setMembers(nextMembers.map((member: any) => ({ _id: member._id || member.id, id: member._id || member.id, name: member.name || member.email || "Unknown" })));
    } catch (err: any) {
      toast.error(err?.message || "Could not load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData({ actor: user, action, module, startDate, endDate });
  }, [user, action, module, startDate, endDate, isAdmin, me?.id]);

  const applyFilters = () => {
    void loadData({ actor: user, action, module, startDate, endDate });
  };

  const exportCsv = () => {
    if (!audit.length) {
      toast.info("No audit entries to export");
      return;
    }

    const rows = audit.map((entry) => ({
      Time: new Date(entry.at || Date.now()).toLocaleString(),
      Actor: typeof entry.actor === "string" ? entry.actor : entry.actor?.name || "System",
      Action: entry.action,
      Module: entry.module,
      IP: entry.ip || "—",
      Details: entry.details ? JSON.stringify(entry.details) : "",
    }));

    const csv = [
      "Time,Actor,Action,Module,IP,Details",
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><FileClock className="size-7"/> Audit Logs</h1>
            <p className="opacity-90 mt-1 text-sm">Track all system activities and changes</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <Button size="sm" variant="secondary" className="gap-1">Activity Log</Button>
            <Button size="sm" variant="secondary" className="gap-1" onClick={exportCsv}><Download className="size-3.5"/> Export</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["User Filter","Action Filter","Module Filter","Date Range"].map((x) => (
            <span key={x} className="bg-white/15 px-3 py-1.5 rounded-full">{x}</span>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold uppercase text-muted-foreground">Filters</div>
        <div className="grid sm:grid-cols-4 gap-3">
          {isAdmin && (
            <div>
              <div className="text-xs mb-1">Members</div>
              <Select value={user} onValueChange={setUser}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {members.map((m) => <SelectItem key={m._id || m.id} value={m._id || m.id || m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <div className="text-xs mb-1">Actions</div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['login','created','updated','deleted','moved','assigned','removed','rechurned'].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Module</div>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['Auth','CRM','Team','Settings','Pipeline','Tasks','Marketing'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Date Range</div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <Button className="bg-primary gap-1" onClick={applyFilters} disabled={loading}>
          <Search className="size-4"/> {loading ? "Loading..." : "Search"}
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-4 sm:p-6 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-4"><FileClock className="size-5 text-blue-600"/> <h3 className="font-semibold">Activity Timeline</h3></div>
        <div className="relative max-w-full overflow-x-auto pl-6 border-l-2 border-blue-200 space-y-6">
          {audit.map((a) => (
            <div key={a.id} className="relative min-w-0 break-words">
              <div className="absolute -left-[29px] top-0 size-4 rounded-full bg-blue-500 ring-4 ring-blue-100"/>
              <div className="text-sm">{a.action} by <b>{typeof a.actor === "string" ? a.actor : a.actor?.name || "Unknown"}</b>{a.ip ? ` from IP: ${a.ip}` : ""}</div>
              {a.companyId && <div className="text-xs font-medium text-blue-700">Company: {a.companyId.companyName || a.companyId}</div>}
              <div className="text-xs text-muted-foreground">On {new Date(a.at || Date.now()).toLocaleString(undefined, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              {a.details && <div className="mt-1 max-w-full break-words text-xs text-muted-foreground">{typeof a.details === "string" ? a.details : JSON.stringify(a.details)}</div>}
            </div>
          ))}
          {audit.length === 0 && <div className="text-sm text-muted-foreground">No activity in range.</div>}
        </div>
      </div>
    </div>
  );
}

export default AuditPage;
