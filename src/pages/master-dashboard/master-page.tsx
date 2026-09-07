import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { updateMasterCustomer } from "@/lib/api";
import { Plus, Pencil, Trash2, Search, X, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

type CustomerPaymentRow = {
  _id?: string;
  createdAt?: string;
  status: string;
  plan?: string;
  users?: number;
  finalAmount?: number;
  amount?: number;
};

type CustomerRow = {
  company: { _id: string; companyName: string; organisation?: string; accountStatus?: string };
  account?: { _id: string; name: string; email: string; phone?: string };
  subscription?: { plan: string; type: string; status: string; numberOfUsers: number; startDate: string; expiryDate?: string; finalAmount?: number; paymentStatus: string; billingPeriod?: string } | null;
  trial?: { status: string; startDate: string; expiryDate: string } | null;
  payments: CustomerPaymentRow[];
};

const deleteModules = ["Leads and CRM", "Lists and uploads", "Calls and recordings", "Campaigns and marketing", "Pipeline and tasks", "WhatsApp data", "Members and settings"];

const emptyForm = {
  name: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  accessType: "MANUAL",
  plan: "STARTED",
};

const emptyCustomerForm = { name: "", email: "", password: "", phone: "", companyName: "", organisation: "", accessType: "MANUAL", plan: "STARTED", numberOfUsers: "1", billingPeriod: "monthly", startDate: "" };

function MasterPage() {
  const [rows, setRows] = useState<SuperAdminRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [companyDeleteTarget, setCompanyDeleteTarget] = useState<CompanyRow | null>(null);
  const [selectedDeleteModules, setSelectedDeleteModules] = useState(deleteModules);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [customerEditTarget, setCustomerEditTarget] = useState<CustomerRow | null>(null);
  const [customerEditForm, setCustomerEditForm] = useState({ name: "", email: "", phone: "", companyName: "", organisation: "", password: "", plan: "STARTED", numberOfUsers: "1", billingPeriod: "monthly", startDate: "", expiryDate: "" });
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [paymentApprovalPage, setPaymentApprovalPage] = useState(1);
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [superAdminsData, companiesData, customerData] = await Promise.all([
        api.getSuperAdmins(),
        api.getCompanies(),
        api.getMasterCustomers(),
      ]);
      setRows(Array.isArray(superAdminsData) ? superAdminsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setCustomers(Array.isArray(customerData?.customers) ? customerData.customers : []);
      setMetrics(customerData?.metrics || {});
    } catch (err: any) {
      setError(err.message || "Failed to load SuperAdmins");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      setSaving(true);
      await api.createMasterCustomer({ ...customerForm, numberOfUsers: Number(customerForm.numberOfUsers) });
      setCustomerOpen(false);
      setCustomerForm(emptyCustomerForm);
      await loadData();
    } catch (err: any) { setError(err.message || "Failed to create customer"); } finally { setSaving(false); }
  };

  const toggleCustomerStatus = async (customer: CustomerRow) => {
    const status = customer.company.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try { setSaving(true); await api.updateMasterCustomerStatus(customer.company._id, status); await loadData(); }
    catch (err: any) { setError(err.message || "Failed to update customer status"); }
    finally { setSaving(false); }
  };

  const deleteCustomerAccount = async (customer: CustomerRow) => {
    const companyName = customer.company.companyName;
    if (!window.confirm(`Delete ${companyName} and all of its login accounts and data? This cannot be undone.`)) return;
    try {
      setSaving(true);
      setError("");
      await api.deleteMasterCustomerAccount(customer.company._id);
      await loadData();
    } catch (err: any) { setError(err.message || "Failed to delete customer account"); }
    finally { setSaving(false); }
  };

  const openCustomerEdit = (customer: CustomerRow) => {
    setCustomerEditTarget(customer);
    setCustomerEditForm({
      name: customer.account?.name || "",
      email: customer.account?.email || "",
      phone: customer.account?.phone || "",
      companyName: customer.company.companyName || "",
      organisation: customer.company.organisation || "",
      password: "",
      plan: customer.subscription?.plan || "STARTED",
      numberOfUsers: String(customer.subscription?.numberOfUsers || 1),
      billingPeriod: customer.subscription?.billingPeriod || "monthly",
      startDate: customer.subscription?.startDate?.slice(0, 10) || customer.trial?.startDate?.slice(0, 10) || "",
      expiryDate: customer.subscription?.expiryDate?.slice(0, 10) || customer.trial?.expiryDate?.slice(0, 10) || "",
    });
  };

  const handleUpdateCustomer = async () => {
    if (!customerEditTarget) return;
    try {
      setSaving(true);
      setError("");
      await updateMasterCustomer(customerEditTarget.company._id, { ...customerEditForm, numberOfUsers: Number(customerEditForm.numberOfUsers) });
      setCustomerEditTarget(null);
      await loadData();
    } catch (err: any) { setError(err.message || "Failed to update customer"); }
    finally { setSaving(false); }
  };

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN") : "Never";

  const customerTableRows = customers.map((customer) => {
    const companyLogin = customer.account?.email || "-";
    const superAdminLogin = rows.find((superAdmin) => superAdmin.companyId?._id === customer.company._id)?.email || companyLogin;
    return {
      ...customer,
      companyLogin,
      superAdminLogin,
    };
  });

  const filteredCustomers = customerTableRows.filter((customer) => {
    const term = customerSearchTerm.trim().toLowerCase();
    if (!term) return true;
    const searchable = [
      customer.account?.name,
      customer.account?.email,
      customer.company.companyName,
      customer.company.organisation,
      customer.companyLogin,
      customer.superAdminLogin,
      customer.subscription?.plan,
      customer.subscription?.type,
      customer.subscription?.status,
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(term);
  });

  const paymentApprovalRows = customers.flatMap((customer) => (customer.payments || []).map((payment) => {
    const isPaidSubscription = String(customer.subscription?.type || '').toUpperCase() === 'PAID';
    const paidUsers = isPaidSubscription ? Number(customer.subscription?.numberOfUsers || 0) : 0;

    return {
      payment,
      customer,
      paidUsers,
      newUsers: Number(payment.users || 0),
      amount: Number(payment.finalAmount ?? payment.amount ?? 0),
    };
  })).filter((row) => ['Pending', 'Processing', 'Rejected', 'Failed', 'Paid'].includes(row.payment.status));

  const paymentApprovalPageSize = 6;
  const normalizedSearch = paymentSearchTerm.trim().toLowerCase();

  const filteredPaymentApprovalRows = paymentApprovalRows.filter(({ payment, customer }) => {
    const createdAt = payment.createdAt ? new Date(payment.createdAt) : null;
    const matchesSearch = !normalizedSearch || [
      customer.account?.name,
      customer.account?.email,
      customer.account?.phone,
      customer.company.companyName,
      customer.company.organisation,
      payment.plan,
      payment.status,
      customer.subscription?.plan,
      customer.subscription?.type,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);

    const matchesStartDate = !startDate || !createdAt || createdAt >= new Date(`${startDate}T00:00:00`);
    const matchesEndDate = !endDate || !createdAt || createdAt <= new Date(`${endDate}T23:59:59.999`);

    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const selectablePaymentApprovalIds = filteredPaymentApprovalRows
    .map(({ payment }) => String(payment._id || ''))
    .filter(Boolean);
  const deletablePaymentApprovalIds = selectablePaymentApprovalIds;
  const selectedVisiblePaymentIds = selectedPaymentIds.filter((id) => selectablePaymentApprovalIds.includes(id));
  const allVisiblePaymentsSelected = selectablePaymentApprovalIds.length > 0 && selectablePaymentApprovalIds.every((id) => selectedPaymentIds.includes(id));
  const paymentApprovalTotalPages = Math.max(1, Math.ceil(filteredPaymentApprovalRows.length / paymentApprovalPageSize));
  const paginatedPaymentApprovalRows = filteredPaymentApprovalRows.slice((paymentApprovalPage - 1) * paymentApprovalPageSize, paymentApprovalPage * paymentApprovalPageSize);

  const totalCustomerPages = Math.max(1, Math.ceil(filteredCustomers.length / 10));
  const paginatedCustomers = filteredCustomers.slice((customerPage - 1) * 10, customerPage * 10);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setCustomerPage((current) => Math.min(current, totalCustomerPages));
  }, [totalCustomerPages]);

  useEffect(() => {
    setPaymentApprovalPage((current) => Math.min(current, paymentApprovalTotalPages));
  }, [paymentApprovalTotalPages]);

  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearchTerm]);

  useEffect(() => {
    setPaymentApprovalPage(1);
  }, [paymentSearchTerm, startDate, endDate]);

  const exportPaymentApprovalsXlsx = (onlySelected = false) => {
    const exportCandidates = onlySelected
      ? filteredPaymentApprovalRows.filter(({ payment }) => selectedPaymentIds.includes(String(payment._id || '')))
      : filteredPaymentApprovalRows;

    if (!exportCandidates.length) return;

    const exportRows = exportCandidates.map(({ payment, customer, paidUsers, newUsers, amount }) => ({
      'Date & Time': payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-',
      Customer: customer.account?.name || '-',
      Phone: customer.account?.phone || '-',
      Company: customer.company.companyName || '-',
      Plan: payment.status === 'Paid' ? customer.subscription?.plan || payment.plan || '-' : 'Awaiting approval',
      'Paid Users': paidUsers,
      'New Users': newUsers,
      Amount: Number(amount || 0),
      Status: ['Failed', 'Rejected'].includes(payment.status) ? 'Payment Failed' : payment.status === 'Paid' ? 'Paid' : payment.status || 'Pending',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Approvals');
    XLSX.writeFile(workbook, onlySelected ? 'webdial-selected-payment-approvals.xlsx' : 'webdial-payment-approvals.xlsx');
  };

  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      setSaving(true);
      if (action === 'approve') {
        await api.approvePayment(paymentId);
      } else {
        await api.rejectPayment(paymentId);
      }
      setSelectedPaymentIds((current) => current.filter((id) => id !== paymentId));
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} payment`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      setSaving(true);
      await api.deletePayment(paymentId);
      setSelectedPaymentIds((current) => current.filter((id) => id !== paymentId));
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeletePayment = async () => {
    const idsToDelete = selectedPaymentIds.filter((id) => deletablePaymentApprovalIds.includes(id));
    if (idsToDelete.length === 0) return;
    try {
      setSaving(true);
      await api.deletePayments(idsToDelete);
      setSelectedPaymentIds([]);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete selected payments');
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPaymentIds((current) => current.includes(paymentId)
      ? current.filter((id) => id !== paymentId)
      : [...current, paymentId]);
  };

  const toggleSelectAllPayments = () => {
    setSelectedPaymentIds((current) => {
      const nextSet = new Set(current);

      if (allVisiblePaymentsSelected) {
        selectablePaymentApprovalIds.forEach((id) => nextSet.delete(id));
        return Array.from(nextSet);
      }

      selectablePaymentApprovalIds.forEach((id) => nextSet.add(id));
      return Array.from(nextSet);
    });
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
      <section className="space-y-4">
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-xl font-semibold">Subscription payment approvals</h1>
                <p className="text-sm text-muted-foreground">Review and manage customer subscription payments by date, customer, and plan.</p>
              </div>
              <br />

            </div>
            
              <div className="flex flex-col mt-5 gap-2 sm:flex-row sm:flex-wrap xl:justify-end" style={{ justifyContent: "space-between" }}>
                <div className="relative min-w-[210px]" >
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={paymentSearchTerm}
                    onChange={(event) => setPaymentSearchTerm(event.target.value)}
                    placeholder="Search customer / company / plan"
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-[150px]" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-[150px]" />
               
               
                  <Button variant="outline" onClick={() => { setPaymentSearchTerm(''); setStartDate(''); setEndDate(''); }}>
                  Clear
                </Button>
                <Button variant="outline" onClick={() => void loadData()}>
                  <RefreshCw className="mr-2 size-4" />Refresh
                </Button>
                <Button onClick={() => exportPaymentApprovalsXlsx(false)} disabled={!filteredPaymentApprovalRows.length}>
                  <Download className="mr-2 size-4" />Export Excel
                </Button>
                {selectedVisiblePaymentIds.length > 0 && (
                  <Button variant="secondary" onClick={() => exportPaymentApprovalsXlsx(true)}>
                    <Download className="mr-2 size-4" />Export Selected ({selectedVisiblePaymentIds.length})
                  </Button>
                )}
               
                </div>

             
              </div>
          </div>

          {filteredPaymentApprovalRows.length > 0 ? (
            <>
              <div className="max-h-[68vh] overflow-y-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur-sm">
                    <tr>
                      <th className="p-3">
                        <input
                          type="checkbox"
                          checked={allVisiblePaymentsSelected}
                          onChange={toggleSelectAllPayments}
                          aria-label="Select all visible payments"
                        />
                      </th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Paid Users</th>
                      <th className="p-3">New Users</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPaymentApprovalRows.map(({ payment, customer, paidUsers, newUsers, amount }) => {
                      const paymentId = String(payment._id || '');
                      const isSelected = selectedPaymentIds.includes(paymentId);

                      return (
                        <tr key={payment._id || payment.createdAt} className="border-t align-top">
                          <td className="p-3"><input type="checkbox" checked={isSelected} onChange={() => togglePaymentSelection(paymentId)} aria-label={`Select payment ${paymentId}`} /></td>
                          <td className="p-3">{payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</td>
                          <td className="p-3">{customer.account?.name || '-'}</td>
                          <td className="p-3">{customer.account?.phone || '-'}</td>
                          <td className="p-3">{customer.company.companyName || '-'}</td>
                          <td className="p-3">{payment.status === 'Paid' ? customer.subscription?.plan || payment.plan || '-' : 'Awaiting approval'}</td>
                          <td className="p-3">{paidUsers}</td>
                          <td className="p-3">{newUsers}</td>
                          <td className="p-3">₹{Number(amount || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${['Failed', 'Rejected'].includes(payment.status) ? 'bg-red-100 text-red-700' : payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {['Failed', 'Rejected'].includes(payment.status) ? 'Payment Failed' : payment.status === 'Paid' ? 'Paid' : payment.status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-3">
                            {['Pending', 'Processing'].includes(payment.status) ? (
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => void handlePaymentAction(paymentId, 'approve')} disabled={!paymentId || saving}>Paid</Button>
                                <Button size="sm" variant="outline" onClick={() => void handlePaymentAction(paymentId, 'reject')} disabled={!paymentId || saving}>Rejected</Button>
                                <Button size="sm" variant="ghost" onClick={() => void handleDeletePayment(paymentId)} disabled={!paymentId || saving}>Delete</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => void handleDeletePayment(paymentId)} disabled={!paymentId || saving}>Delete</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {filteredPaymentApprovalRows.length === 0 ? 0 : (paymentApprovalPage - 1) * paymentApprovalPageSize + 1} - {Math.min(paymentApprovalPage * paymentApprovalPageSize, filteredPaymentApprovalRows.length)} of {filteredPaymentApprovalRows.length}
                </span>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPaymentApprovalPage((page) => Math.max(1, page - 1))} disabled={paymentApprovalPage === 1}>Previous</Button>
                  <span className="rounded border px-2 py-1 text-xs font-medium">Page {paymentApprovalPage} / {paymentApprovalTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPaymentApprovalPage((page) => Math.min(paymentApprovalTotalPages, page + 1))} disabled={paymentApprovalPage >= paymentApprovalTotalPages}>Next</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              No payment approvals found for the selected search and date range.
            </div>
          )}

          {selectedVisiblePaymentIds.length > 0 && (
            <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                  {selectedVisiblePaymentIds.length}
                </span>
                <span className="text-muted-foreground">rows selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => exportPaymentApprovalsXlsx(true)}>
                  <Download className="mr-1 size-3.5" />Export Selected
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void handleBulkDeletePayment()} disabled={saving}>Delete Selected</Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create customer access</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {([['name','Name'],['email','Email'],['password','Password'],['phone','Phone'],['companyName','Company name'],['organisation','Organisation']] as const).map(([key,label]) => <div key={key} className={key === 'companyName' || key === 'organisation' ? 'col-span-2' : ''}><Label>{label}</Label><Input type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={customerForm[key]} onChange={(e) => setCustomerForm({ ...customerForm, [key]: e.target.value })} /></div>)}
            <div><Label>Access type</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={customerForm.accessType} onChange={(e) => setCustomerForm({ ...customerForm, accessType: e.target.value })}><option value="MANUAL">Manual / Permanent</option><option value="FREE_TRIAL">7-Day Free Trial</option><option value="STARTED">Started Plan</option><option value="PRO">Pro Plan</option></select></div>
            <div><Label>Plan</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={customerForm.plan} onChange={(e) => setCustomerForm({ ...customerForm, plan: e.target.value })}><option value="STARTED">Started · ₹199</option><option value="PRO">Pro · ₹499</option></select></div>
            <div><Label>Users</Label><Input type="number" min={1} value={customerForm.numberOfUsers} onChange={(e) => setCustomerForm({ ...customerForm, numberOfUsers: e.target.value })} /></div>
            <div><Label>Billing</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={customerForm.billingPeriod} onChange={(e) => setCustomerForm({ ...customerForm, billingPeriod: e.target.value })}><option value="monthly">Monthly</option><option value="halfyearly">6 Months · 10% off</option><option value="annual">Annual · 15% off</option></select></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setCustomerOpen(false)}>Cancel</Button><Button onClick={() => void handleCreateCustomer()} disabled={saving}>{saving ? "Creating..." : "Create customer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!customerEditTarget} onOpenChange={(open) => !open && setCustomerEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit customer account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {([['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['companyName', 'Company name'], ['organisation', 'Organisation'], ['password', 'New password'], ['startDate', 'Start date'], ['expiryDate', 'Expiry date']] as const).map(([key, label]) => (
              <div key={key} className={key === 'companyName' || key === 'organisation' ? 'col-span-2' : ''}>
                <Label>{label}</Label>
                <Input type={key === 'email' ? 'email' : key === 'password' ? 'password' : key === 'startDate' || key === 'expiryDate' ? 'date' : 'text'} value={customerEditForm[key]} onChange={(event) => setCustomerEditForm({ ...customerEditForm, [key]: event.target.value })} />
              </div>
            ))}
            <div><Label>Plan</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={customerEditForm.plan} onChange={(event) => setCustomerEditForm({ ...customerEditForm, plan: event.target.value })}><option value="STARTED">Started</option><option value="PRO">Pro</option></select></div>
            <div><Label>Users</Label><Input type="number" min={1} value={customerEditForm.numberOfUsers} onChange={(event) => setCustomerEditForm({ ...customerEditForm, numberOfUsers: event.target.value })} /></div>
            <div><Label>Billing</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={customerEditForm.billingPeriod} onChange={(event) => setCustomerEditForm({ ...customerEditForm, billingPeriod: event.target.value })}><option value="monthly">Monthly</option><option value="halfyearly">6 Months · 10% off</option><option value="annual">Annual · 15% off</option></select></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setCustomerEditTarget(null)}>Cancel</Button><Button onClick={() => void handleUpdateCustomer()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">{error}</div>
      )}
    </div>
  );
}

export default MasterPage;