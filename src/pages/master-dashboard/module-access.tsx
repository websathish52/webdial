import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterShell, StatGrid } from "@/components/layout/MasterShell";
import api from "@/lib/api";

type ModuleDefinition = { key: string; label: string; pages: string[]; permission: string };
type RoleAccess = Record<string, boolean>;
type AccessResponse = { modules: ModuleDefinition[]; roles: Record<string, RoleAccess>; memberCount: number };

const roleOrder = ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"];

export default function ModuleAccessPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.getMasterCustomers().then((response) => {
      const items = Array.isArray(response?.customers) ? response.customers : [];
      setCustomers(items);
      const firstId = String(items[0]?.company?._id || items[0]?.company?.id || "");
      if (firstId) setCompanyId(firstId);
    }).catch((error: any) => toast.error(error?.message || "Could not load companies")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    setAccess(null);
    void api.getMasterModuleAccess(companyId).then((response) => {
      if (!Array.isArray(response?.modules) || !response?.roles) {
        throw new Error("Master module access response is invalid");
      }
      setAccess(response);
      setAccessError("");
    }).catch((error: any) => {
      setAccess(null);
      setAccessError(error?.message || "Could not load module access");
      toast.error(error?.message || "Could not load module access");
    });
  }, [companyId]);

  const selectedCompany = useMemo(() => customers.find((item) => String(item.company?._id || item.company?.id) === companyId), [companyId, customers]);
  const updateRole = (role: string, moduleKey: string, enabled: boolean) => {
    setAccess((current) => current ? { ...current, roles: { ...current.roles, [role]: { ...current.roles[role], [moduleKey]: enabled } } } : current);
  };

  const save = async () => {
    if (!access || !companyId) return;
    try {
      setSaving(true);
      const result = await api.updateMasterModuleAccess(companyId, access.roles);
      toast.success(`${result?.updatedUsers || 0} users updated for ${selectedCompany?.company?.companyName || "company"}`);
    } catch (error: any) {
      toast.error(error?.message || "Could not save module access");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterShell active="Module Access" title="Module Access" badge="ROLE CONTROL" search="Search company or module..." action={<Button size="sm" onClick={save} disabled={!access || saving}><Save className="size-4" /> {saving ? "Saving..." : "Save access"}</Button>}>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-xl bg-white/15"><KeyRound className="size-7" /></div><div><p className="text-sm text-blue-100">Master configuration</p><h1 className="text-2xl font-bold">Tenant module access</h1><p className="mt-1 text-sm text-blue-100">Control which portal modules each company role can open.</p></div></div>
            <Badge className="border-0 bg-white/15 text-white"><ShieldCheck className="mr-1 size-3.5" /> Permission policy</Badge>
          </div>
        </section>

        <Card className="border-border/70 bg-card/95"><CardContent className="flex flex-wrap items-center bg-white rounded-lg justify-between gap-4 p-5"><div><p className="text-sm font-medium">Company scope</p><p className="text-xs text-muted-foreground">Changes apply to every user in the selected company by role.</p></div><select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="h-10 min-w-[260px] rounded-md border border-input bg-background px-3 text-sm" disabled={loading}>{customers.map((item) => <option key={item.company?._id} value={item.company?._id}>{item.company?.companyName || "Unnamed company"}</option>)}</select></CardContent></Card>

        <StatGrid items={[{ label: "Modules", value: String(access?.modules.length || 0), hint: "Grouped portal features", tone: "text-primary-glow" }, { label: "Roles", value: String(roleOrder.length), hint: "Company access levels", tone: "text-success" }, { label: "Company users", value: String(access?.memberCount || 0), hint: "Users affected on save", tone: "text-primary-glow" }, { label: "Selected tenant", value: selectedCompany?.company?.companyCode || "-", hint: selectedCompany?.company?.companyName || "Choose a company", tone: "text-success" }]} />

        {!access ? <div className="rounded-2xl border border-border bg-white bg-card p-10 text-center text-sm text-muted-foreground">{loading ? "Loading companies..." : accessError || "No module policy is available for this company."}</div> : <>
          <Card className="border-border/70   bg-card/95"><CardContent className="p-5 bg-white rounded-lg"><div className="mb-4"><h2 className="font-semibold">Role access matrix</h2><p className="mt-1 text-sm text-muted-foreground">Toggle a module for a role, then save once to update all matching users.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-3">Role</th>{access.modules.map((module) => <th key={module.key} className="px-3 py-3 text-center">{module.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{roleOrder.map((role) => <tr key={role} className="hover:bg-muted/30"><td className="px-3 py-4 font-medium">{role}</td>{access.modules.map((module) => <td key={module.key} className="px-3 py-4 text-center"><input type="checkbox" checked={Boolean(access.roles[role]?.[module.key])} onChange={(event) => updateRole(role, module.key, event.target.checked)} className="size-4 accent-blue-600" aria-label={`${role} ${module.label}`} /></td>)}</tr>)}</tbody></table></div></CardContent></Card>
          <section className="grid gap-4 md:grid-cols-2  xl:grid-cols-3">{access.modules.map((module) => <Card key={module.key} className="border-border/70 bg-card/95 bg-white"><CardContent className="p-5 "><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{module.label}</h3><p className="mt-1 text-xs text-muted-foreground">Permission key: {module.permission}</p></div><Check className="size-4 text-success" /></div><div className="mt-4 flex flex-wrap gap-1.5">{module.pages.map((page) => <span key={page} className="rounded-full bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">{page}</span>)}</div></CardContent></Card>)}</section>
        </>}
      </div>
    </MasterShell>
  );
}