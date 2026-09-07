import { useEffect, useMemo, useState } from "react";
import { Building2, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { MasterShell, StatGrid } from "@/components/layout/MasterShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import api from "@/lib/api";

type CompanyLite = {
  _id?: string;
  companyName?: string;
  createdBy?: string;
};

type MemberRecord = {
  _id?: string;
  name?: string;
  email?: string;
  username?: string;
  phone?: string;
  role?: string;
  companyId?: string | CompanyLite | null;
  createdAt?: string;
};

type SuperAdminRow = {
  _id?: string;
  name?: string;
  email?: string;
  username?: string;
  phone?: string;
  companyId?: { _id?: string; companyName?: string } | null;
};

const normalizeRoleLabel = (role?: string) => {
  const value = String(role || "").toLowerCase();
  if (value === "master") return "Master";
  if (value === "superadmin") return "Super Admin";
  if (value === "admin") return "Admin";
  if (value === "manager") return "Manager";
  if (value === "submanager") return "Submanager";
  if (value === "telecaller") return "Telecaller";
  return "Member";
};

const roleBadge = (role?: string) => {
  const normalized = normalizeRoleLabel(role);
  if (normalized === "Super Admin") return <Badge variant="destructive">Super Admin</Badge>;
  if (normalized === "Admin" || normalized === "Manager") return <Badge variant="secondary" className="bg-primary/15 text-primary-glow">{normalized}</Badge>;
  if (normalized === "Telecaller") return <Badge variant="outline">Telecaller</Badge>;
  return <Badge variant="outline">{normalized}</Badge>;
};

const statusBadge = () => (
  <span className="flex items-center gap-1.5 text-xs text-success"><span className="size-1.5 rounded-full bg-success" /> Active</span>
);

const emptySuperAdminForm: {
  name: string;
  companyName: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  billingPeriod: "monthly" | "halfyearly" | "annual";
  accessType: "MANUAL" | "FREE_TRIAL" | "FREE" | "STARTED" | "PRO";
  plan: "FREE" | "STARTED" | "PRO";
} = {
  name: "",
  companyName: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  billingPeriod: "monthly",
  accessType: "MANUAL",
  plan: "FREE",
};

const deleteModules = [
  "Leads and CRM",
  "Lists and uploads",
  "Calls and recordings",
  "Campaigns and marketing",
  "Pipeline and tasks",
  "WhatsApp data",
  "Members and settings",
];

function UsersPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [superAdminSearchTerm, setSuperAdminSearchTerm] = useState("");
  const [superAdminError, setSuperAdminError] = useState("");
  const [createSuperAdminOpen, setCreateSuperAdminOpen] = useState(false);
  const [editSuperAdminOpen, setEditSuperAdminOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<SuperAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SuperAdminRow | null>(null);
  const [companyDeleteTarget, setCompanyDeleteTarget] = useState<CompanyLite | null>(null);
  const [selectedDeleteModules, setSelectedDeleteModules] = useState<string[]>(deleteModules);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [form, setForm] = useState(emptySuperAdminForm);

  useEffect(() => {
    const load = async () => {
      try {
        const [membersRes, companiesRes, superAdminsRes] = await Promise.all([
          api.getMembers(),
          api.getCompanies(),
          api.getSuperAdmins(),
        ]);

        setMembers(Array.isArray(membersRes) ? membersRes : []);
        setCompanies(
          Array.isArray(companiesRes)
            ? companiesRes
            : Array.isArray((companiesRes as any)?.companies)
              ? (companiesRes as any).companies
              : [],
        );
        setSuperAdmins(Array.isArray(superAdminsRes) ? superAdminsRes : []);
      } catch (error) {
        console.error("Failed to load users data", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const companyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companies) {
      if (company?._id) map.set(String(company._id), company.companyName || "Unknown company");
    }
    return map;
  }, [companies]);

  const stats = useMemo(() => {
    const totalUsers = members.length;
    const superAdminCount = members.filter((member) => String(member.role || "").toLowerCase() === "superadmin").length;
    const adminCount = members.filter((member) => ["admin", "manager", "submanager"].includes(String(member.role || "").toLowerCase())).length;
    const telecallerCount = members.filter((member) => String(member.role || "").toLowerCase() === "telecaller").length;

    return [
      { label: "Total users", value: String(totalUsers), hint: "Live member records" },
      { label: "Super admins", value: String(superAdminCount), hint: "Platform owners" },
      { label: "Team admins", value: String(adminCount), hint: "Across clients" },
      { label: "Telecallers", value: String(telecallerCount), hint: "Live agents" },
    ];
  }, [members]);

  const rows = members.map((member) => {
    const resolvedCompanyId = typeof member.companyId === "string" ? member.companyId : member.companyId?._id;
    const companyName =
      typeof member.companyId === "object" && member.companyId?.companyName
        ? member.companyId.companyName
        : companyMap.get(String(resolvedCompanyId || "")) || "No company";
    const joinedAt = member.createdAt
      ? new Date(member.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      : "Recently";

    return {
      ...member,
      companyName,
      joinedAt,
    };
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowDate = row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : "";
      const searchableText = [
        row.name,
        row.email,
        row.username,
        row.companyName,
        row.phone,
        normalizeRoleLabel(row.role),
        "Active",
        row.joinedAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesStartDate = !startDate || !rowDate || rowDate >= startDate;
      const matchesEndDate = !endDate || !rowDate || rowDate <= endDate;

      return matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [rows, normalizedSearch, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedUserIds.includes(String(row._id || row.email || row.username)));

  const toggleUserSelection = (rowId: string) => {
    setSelectedUserIds((current) =>
      current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId],
    );
  };

  const toggleSelectAllVisibleUsers = () => {
    setSelectedUserIds((current) => {
      const nextVisibleIds = visibleRows.map((row) => String(row._id || row.email || row.username));
      if (allVisibleSelected) {
        return current.filter((id) => !nextVisibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...nextVisibleIds]));
    });
  };

  const exportUsersCsv = (selectedOnly = false) => {
    const exportRows = (selectedOnly ? filteredRows.filter((row) => selectedUserIds.includes(String(row._id || row.email || row.username))) : filteredRows);
    if (!exportRows.length) return;

    const headers = ["User", "Email", "Username", "Role", "Company", "Phone", "Status", "Joined"];
    const rowsForExport = exportRows.map((row) => ({
      user: row.name || "Unknown user",
      email: row.email || "No email",
      username: row.username || "-",
      role: normalizeRoleLabel(row.role),
      company: row.companyName || "No company",
      phone: row.phone || "-",
      status: "Active",
      joined: row.joinedAt || "Recently",
    }));

    const rowsHtml = rowsForExport
      .map(
        (row) => `
          <tr>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.user}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.email}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.username}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.role}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.company}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.phone}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.status}</td>
            <td style="padding:8px;border:1px solid #d1d5db;">${row.joined}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th { background: #0f172a; color: #ffffff; padding: 10px; border: 1px solid #d1d5db; font-weight: bold; }
          td { padding: 8px; border: 1px solid #d1d5db; color: #111827; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-users-export.xls";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const filteredSuperAdmins = useMemo(() => {
    const term = superAdminSearchTerm.trim().toLowerCase();
    if (!term) return superAdmins;

    return superAdmins.filter((row) => {
      const searchable = [row.name, row.email, row.username, row.phone, row.companyId?.companyName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [superAdmins, superAdminSearchTerm]);

  const exportSuperAdminsCsv = () => {
    if (!filteredSuperAdmins.length) return;

    const rows = filteredSuperAdmins.map((row) => ({
      name: row.name || "-",
      email: row.email || "-",
      username: row.username || "-",
      phone: row.phone || "-",
      company: row.companyId?.companyName || "No company yet",
    }));

    const headers = Object.keys(rows[0]);
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /><style>table{border-collapse:collapse;font-family:Arial,sans-serif}th{background:#0f172a;color:#fff;padding:10px;border:1px solid #d1d5db}td{padding:8px;border:1px solid #d1d5db;color:#111827}</style></head>
      <body>
        <table>
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${headers.map((key) => `<td>${String((row as any)[key] ?? "-")}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "webdial-superadmins-export.xls";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const openCreateSuperAdmin = () => {
    setForm(emptySuperAdminForm);
    setSuperAdminError("");
    setCreateSuperAdminOpen(true);
  };

  const openEditSuperAdmin = (row: SuperAdminRow) => {
    setEditTarget(row);
    setForm({
      name: row.name || "",
      companyName: row.companyId?.companyName || "",
      email: row.email || "",
      username: row.username || "",
      phone: row.phone || "",
      password: "",
      billingPeriod: "monthly",
      accessType: "MANUAL",
      plan: "FREE",
    });
    setEditSuperAdminOpen(true);
  };

  const handleCreateSuperAdmin = async () => {
    if (!form.name || !form.companyName || !form.email || !form.username || !form.password) {
      setSuperAdminError("Please fill all required SuperAdmin and company fields.");
      return;
    }

    try {
      setSaving(true);
      setSuperAdminError("");
      await api.createSuperAdmin({
        name: form.name,
        companyName: form.companyName,
        email: form.email,
        username: form.username,
        phone: form.phone,
        password: form.password,
        billingPeriod: form.billingPeriod,
        accessType: form.accessType,
        plan: form.plan,
      });
      setCreateSuperAdminOpen(false);
      setForm(emptySuperAdminForm);
      const result = await api.getSuperAdmins();
      setSuperAdmins(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setSuperAdminError(err?.message || "Failed to create SuperAdmin");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSuperAdmin = async () => {
    if (!editTarget || !editTarget._id) return;

    try {
      setSaving(true);
      setSuperAdminError("");
      await api.updateSuperAdmin(editTarget._id, {
        name: form.name,
        email: form.email,
        username: form.username,
        phone: form.phone,
        password: form.password || undefined,
      });
      setEditSuperAdminOpen(false);
      const result = await api.getSuperAdmins();
      setSuperAdmins(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setSuperAdminError(err?.message || "Failed to update SuperAdmin");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSuperAdmin = async () => {
    if (!deleteTarget || !deleteTarget._id) return;

    try {
      setSaving(true);
      setSuperAdminError("");
      await api.deleteSuperAdmin(deleteTarget._id);
      setDeleteTarget(null);
      const result = await api.getSuperAdmins();
      setSuperAdmins(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setSuperAdminError(err?.message || "Failed to delete SuperAdmin");
    } finally {
      setSaving(false);
    }
  };

  const openCompanyDelete = (company: CompanyLite) => {
    setCompanyDeleteTarget(company);
    setSelectedDeleteModules(deleteModules);
    setDeleteConfirmation("");
    setSuperAdminError("");
  };

  const handleCompanyDelete = async () => {
    if (!companyDeleteTarget || !companyDeleteTarget._id) return;
    if (selectedDeleteModules.length !== deleteModules.length || deleteConfirmation !== companyDeleteTarget.companyName) return;

    try {
      setSaving(true);
      setSuperAdminError("");
      await api.deleteCompany(companyDeleteTarget._id);
      setCompanyDeleteTarget(null);
      const companiesData = await api.getCompanies();
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (err: any) {
      setSuperAdminError(err?.message || "Failed to delete company");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading users & roles...</div>;
  }

  return (
    <MasterShell
      active="Users & Roles"
      title="Users & Roles"
      badge={`${members.length} users`}
      search="Search name, email, company..."
      action={
        <Button variant="hero" size="sm">
          <Plus className="size-4" /> Invite user
        </Button>
      }
    >
      <StatGrid items={stats} />

        <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Master — SuperAdmins</h2>
              <p className="text-xs text-muted-foreground">
                Create SuperAdmin accounts. Each SuperAdmin creates and manages their own company from their Team &amp; Members page after logging in.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSuperAdminsCsv}>
              <Download className="size-4 mr-1" />Export SuperAdmins
            </Button>
            <Button onClick={openCreateSuperAdmin}>
              <Plus className="size-4 mr-1" /> New SuperAdmin
            </Button>
          </div>
        </div>

        {superAdminError && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">{superAdminError}</div>
        )}

        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search superadmin..."
              className="w-full bg-background border rounded-lg pl-10 pr-4 py-2 text-sm"
              value={superAdminSearchTerm}
              onChange={(e) => setSuperAdminSearchTerm(e.target.value)}
            />
          </div>

          <div className="hidden md:grid md:grid-cols-[1.5fr_1.5fr_1fr_0.7fr] gap-4 text-xs text-muted-foreground font-semibold p-3 bg-muted/40 rounded-lg">
            <div>SuperAdmin</div>
            <div>Email</div>
            <div>Company</div>
            <div className="text-center">Actions</div>
          </div>

          <div className="space-y-2 mt-2">
            {filteredSuperAdmins.map((row) => (
              <div key={row._id || row.email} className="grid md:grid-cols-[1.5fr_1.5fr_1fr_0.7fr] gap-4 items-center p-3 rounded-lg hover:bg-muted/50 border-b md:border-none">
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
                  <Button size="icon" variant="ghost" onClick={() => openEditSuperAdmin(row)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredSuperAdmins.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No SuperAdmins found. Create one to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">All Platform Users</h2>
            <p className="text-sm text-muted-foreground">SuperAdmins, team admins, and telecaller agents across all companies.</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder="Search by name, email, company..."
                className="w-full bg-background border rounded-lg pl-10 pr-4 py-2 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Start date</div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                    aria-label="Start date"
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">End date</div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                    aria-label="End date"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }} className="gap-1 mt-5">Clear dates</Button>
              <Button variant="default" size="sm" className="gap-1 mt-5 border border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white" onClick={() => exportUsersCsv(false)} disabled={!filteredRows.length}>
                <Download className="size-4" /> Export Excel
              </Button>
              {selectedUserIds.length > 0 && (
                <Button variant="secondary" size="sm" className="gap-1 mt-5 border border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white" onClick={() => exportUsersCsv(true)}>
                  <Download className="size-4" /> Export Selected ({selectedUserIds.length})
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="w-12 px-3 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisibleUsers}
                      aria-label="Select all visible users"
                      className="h-4 w-4 rounded border-border"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((user) => {
                  const rowId = String(user._id || user.email || user.username);
                  const isSelected = selectedUserIds.includes(rowId);
                  return (
                    <tr key={rowId} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                      <td className="w-12 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(rowId)}
                          aria-label={`Select user ${user.name || user.email || rowId}`}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">{user.name || "Unknown user"}</div>
                        <div className="text-xs text-muted-foreground">{user.username || "—"}</div>
                      </td>
                    <td className="px-5 py-3 text-muted-foreground">{user.email || "No email"}</td>
                    <td className="px-5 py-3">{roleBadge(user.role)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{user.companyName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{user.phone || "—"}</td>
                    <td className="px-5 py-3">{statusBadge()}</td>
                    <td className="px-5 py-3 text-muted-foreground">{user.joinedAt}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedUserIds.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">{selectedUserIds.length}</span>
                users selected
              </span>
              <button type="button" onClick={() => setSelectedUserIds([])} className="text-xs font-medium text-muted-foreground transition hover:text-foreground">
                Clear selection
              </button>
            </div>
          )}

          {visibleRows.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchTerm ? "No users match your search." : "No users found."}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>Previous</Button>
                <span className="rounded border px-2 py-1 text-xs font-medium">Page {safePage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

    

      <Dialog open={createSuperAdminOpen} onOpenChange={setCreateSuperAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create SuperAdmin</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label>SuperAdmin Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
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
              <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Billing period</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.billingPeriod}
                onChange={(e) => setForm({ ...form, billingPeriod: e.target.value as "monthly" | "halfyearly" | "annual" })}
              >
                <option value="monthly">Monthly</option>
                <option value="halfyearly">Half-yearly (6 months)</option>
                <option value="annual">Yearly (12 months)</option>
              </select>
            </div>
            <div>
              <Label>Access type</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.accessType}
                onChange={(e) => {
                  const next = e.target.value as "MANUAL" | "FREE_TRIAL" | "FREE" | "STARTED" | "PRO";
                  setForm({ ...form, accessType: next });
                }}
              >
                <option value="MANUAL">Manual / Permanent</option>
                <option value="FREE_TRIAL">7-Day Free Trial</option>
                <option value="STARTED">Started Plan</option>
                <option value="PRO">Pro Plan</option>
              </select>
            </div>
            <div>
              <Label>Plan</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={form.plan}
                onChange={(e) => {
                  const next = e.target.value as "FREE" | "STARTED" | "PRO";
                  setForm({ ...form, plan: next });
                }}
              >
                <option value="FREE">Free Plan</option>
                <option value="STARTED">Started</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
          </div>
              <p className="text-xs text-muted-foreground px-1">
              This company name will be shown in the SuperAdmin's All Team dropdown.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateSuperAdminOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSuperAdmin} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editSuperAdminOpen} onOpenChange={setEditSuperAdminOpen}>
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
              <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep unchanged" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditSuperAdminOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateSuperAdmin} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="destructive" onClick={handleDeleteSuperAdmin} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!companyDeleteTarget} onOpenChange={(open) => !open && setCompanyDeleteTarget(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Company and All Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-destructive font-medium">
              This is permanent. The company, members, files, and all module data will be deleted from MongoDB and storage.
            </p>
            <div className="space-y-2 border rounded-lg p-3">
              <div className="font-medium">Select all data to delete</div>
              {deleteModules.map((item) => (
                <label key={item} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedDeleteModules.includes(item)}
                    onChange={(event) =>
                      setSelectedDeleteModules((current) =>
                        event.target.checked ? [...current, item] : current.filter((value) => value !== item),
                      )
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
            <div>
              <Label>Type {companyDeleteTarget?.companyName} to confirm</Label>
              <Input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={companyDeleteTarget?.companyName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompanyDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleCompanyDelete}
              disabled={saving || selectedDeleteModules.length !== deleteModules.length || deleteConfirmation !== companyDeleteTarget?.companyName}
            >
              {saving ? "Deleting..." : "Permanently Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterShell>
  );
}

export default UsersPage;
