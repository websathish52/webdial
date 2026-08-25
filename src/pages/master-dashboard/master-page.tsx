import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Building2, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type SuperAdminRow = {
  _id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  companyId?: { _id: string; companyName: string; companyCode: string; status: string } | null;
};

type CompanyRow = {
  _id: string;
  companyName: string;
  companyCode: string;
  createdBy: string;
}

const deleteModules = ["Leads and CRM", "Lists and uploads", "Calls and recordings", "Campaigns and marketing", "Pipeline and tasks", "WhatsApp data", "Members and settings"];

const emptyForm = {
  name: "",
  email: "",
  username: "",
  phone: "",
  password: "",
};

function MasterPage() {
  const [rows, setRows] = useState<SuperAdminRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SuperAdminRow | null>(null);
  const [companyDeleteTarget, setCompanyDeleteTarget] = useState<CompanyRow | null>(null);
  const [selectedDeleteModules, setSelectedDeleteModules] = useState(deleteModules);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [editTarget, setEditTarget] = useState<SuperAdminRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [superAdminsData, companiesData] = await Promise.all([
        api.getSuperAdmins(),
        api.getCompanies(),
      ]);
      setRows(Array.isArray(superAdminsData) ? superAdminsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (err: any) {
      setError(err.message || "Failed to load SuperAdmins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredRows = rows.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      (r.companyId?.companyName || "").toLowerCase().includes(term)
    );
  });

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setCreateOpen(true);
  };

  const openEdit = (row: SuperAdminRow) => {
    setEditTarget(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      username: row.username || "",
      phone: row.phone || "",
      password: "",
    });
    setError("");
    setEditOpen(true);
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      setError("");
      await api.createSuperAdmin({
        name: form.name,
        email: form.email,
        username: form.username,
        phone: form.phone,
        password: form.password,
      } as any);
      setCreateOpen(false);
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create SuperAdmin");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      setError("");
      const patch: any = {
        name: form.name,
        email: form.email,
        username: form.username,
        phone: form.phone,
      };
      if (form.password) patch.password = form.password;
      await api.updateSuperAdmin(editTarget._id, patch);
      setEditOpen(false);
      setEditTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update SuperAdmin");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await api.deleteSuperAdmin(deleteTarget._id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete SuperAdmin");
    } finally {
      setSaving(false);
    }
  };

  const openCompanyDelete = (company: CompanyRow) => {
    setCompanyDeleteTarget(company);
    setSelectedDeleteModules(deleteModules);
    setDeleteConfirmation("");
    setError("");
  };

  const handleCompanyDelete = async () => {
    if (!companyDeleteTarget || selectedDeleteModules.length !== deleteModules.length || deleteConfirmation !== companyDeleteTarget.companyName) return;
    try {
      setSaving(true);
      await api.deleteCompany(companyDeleteTarget._id);
      setCompanyDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete company");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading master page...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Master — SuperAdmins</h2>
            <p className="text-xs text-muted-foreground">
              Create SuperAdmin accounts. Each SuperAdmin creates and manages their own company
              from their Team &amp; Members page after logging in.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-1" /> New SuperAdmin
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">{error}</div>
      )}

      <div className="bg-card rounded-xl border p-4 sm:p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            placeholder="Search superadmin..."
            className="w-full bg-background border rounded-lg pl-10 pr-4 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="hidden md:grid md:grid-cols-[1.5fr_1.5fr_1fr_0.7fr] gap-4 text-xs text-muted-foreground font-semibold p-3 bg-muted/40 rounded-lg">
          <div>SuperAdmin</div>
          <div>Email</div>
          <div>Company</div>
          <div className="text-center">Actions</div>
        </div>

        <div className="space-y-2 mt-2">
          {filteredRows.map((row) => (
            <div
              key={row._id}
              className="grid md:grid-cols-[1.5fr_1.5fr_1fr_0.7fr] gap-4 items-center p-3 rounded-lg hover:bg-muted/50 border-b md:border-none"
            >
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.username || ""}</div>
              </div>
              <div className="text-sm">{row.email}</div>
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {companies.filter((c) => c.createdBy === row._id).length > 0
                    ? companies
                        .filter((c) => c.createdBy === row._id)
                        .map((company) => (
                          <span
                            key={company._id}
                            className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 font-medium"
                          >
                            {company.companyName}
                            <button type="button" title={`Delete ${company.companyName}`} onClick={() => openCompanyDelete(company)} className="text-destructive hover:text-red-800"><Trash2 className="size-3" /></button>
                          </span>
                        ))
                    : <span className="text-xs px-2 py-1 rounded-full font-semibold bg-muted text-muted-foreground">No company yet</span>}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {filteredRows.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No SuperAdmins found. Create one to get started.
            </div>
          )}
        </div>
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create SuperAdmin</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>SuperAdmin Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            No company is created here. This SuperAdmin will create their own company from the Team &amp; Members page after logging in.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!companyDeleteTarget} onOpenChange={(open) => !open && setCompanyDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company and All Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-destructive font-medium">This is permanent. The company, members, files, and all module data will be deleted from MongoDB and storage.</p>
            <div className="space-y-2 border rounded-lg p-3">
              <div className="font-medium">Select all data to delete</div>
              {deleteModules.map((item) => (
                <label key={item} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedDeleteModules.includes(item)} onChange={(event) => setSelectedDeleteModules((current) => event.target.checked ? [...current, item] : current.filter((value) => value !== item))} />
                  {item}
                </label>
              ))}
            </div>
            <div>
              <Label>Type {companyDeleteTarget?.companyName} to confirm</Label>
              <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={companyDeleteTarget?.companyName} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompanyDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCompanyDelete} disabled={saving || selectedDeleteModules.length !== deleteModules.length || deleteConfirmation !== companyDeleteTarget?.companyName}>
              {saving ? "Deleting..." : "Permanently Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SuperAdmin</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>SuperAdmin Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>New Password (optional)</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep unchanged" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SuperAdmin</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MasterPage;