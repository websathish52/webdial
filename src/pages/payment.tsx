import { useEffect, useState } from "react";
import {
  CreditCard, Package, Users, Calendar, FileText, CheckCircle2, ShieldCheck, Search,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND, HeroBanner, SettingsTopBar } from "./settings/_shared";
import api from "@/lib/api";
import { toast } from "sonner";

const PLAN_PRICES: Record<string, number> = { Starter: 199, Pro: 499 };
const PAYMENT_UPI_ID = "hduke1439@okaxis";

type Invoice = {
  _id: string;
  date: string;
  user: number;
  amount: string;
  expiry: string;
  status: "Paid" | "Deleted" | "Pending" | "Processing" | "Payment Failed" | "Rejected";
};

type PaymentProfile = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  country: string;
  gstin: string;
};

const emptyProfile: PaymentProfile = {
  company: "", firstName: "", lastName: "", email: "", phone: "", address: "",
  state: "", city: "", pincode: "", country: "India", gstin: "",
};

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan") || "Starter";
  const [plan, setPlan] = useState(PLAN_PRICES[requestedPlan] ? requestedPlan : "Starter");
  const pricePerUser = PLAN_PRICES[plan];
  const [renewal, setRenewal] = useState("monthly");
  const [users, setUsers] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState<PaymentProfile>(emptyProfile);
  const [invoicePage, setInvoicePage] = useState(1);
  const hasPaidSubscription = Boolean(
    subscription
      && String(subscription.type || '').toUpperCase() === 'PAID'
      && String(subscription.status || '').toUpperCase() === 'ACTIVE'
      && String(subscription.paymentStatus || '').toUpperCase() === 'SUCCESS',
  );
  const isTrialActive = Boolean(subscription && String(subscription.type || '').toUpperCase() === 'FREE_TRIAL' && subscription.status === 'ACTIVE');
  const currentPaidSeatCount = hasPaidSubscription ? Number(subscription?.numberOfUsers || 0) : 0;
  const paidUsers = hasPaidSubscription ? currentPaidSeatCount : 0;
  const additionalUsers = Math.max(0, memberCount - paidUsers);
  const renewalOptions = ["monthly", "halfyearly", "yearly"] as const;
  const showTrialOption = !isTrialActive && !(hasPaidSubscription);
  const cycleLabel = hasPaidSubscription
    ? subscription.billingPeriod === 'halfyearly'
      ? 'Half Yearly'
      : subscription.billingPeriod === 'annual' || subscription.billingPeriod === 'yearly'
        ? 'Annual'
        : 'Monthly'
    : isTrialActive ? '7-Day Trial Active' : 'Awaiting payment approval';
  const activePlanLabel = hasPaidSubscription ? subscription.plan : isTrialActive ? 'FREE TRIAL' : 'Awaiting approval';
  const proratedUntilLabel = hasPaidSubscription && subscription?.expiryDate
    ? new Date(subscription.expiryDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'current billing expiry';

  useEffect(() => {
    Promise.all([
      api.getCurrentSubscription(),
      api.getMembers().catch(() => []),
      api.getPaymentProfile().catch(() => emptyProfile),
      api.getPayments().catch(() => [])
    ])
      .then(([subscriptionData, members, savedProfile, payments]) => {
        setSubscription(subscriptionData);
        const count = Array.isArray(members) ? members.length : 0;
        setMemberCount(count);
        if (String(subscriptionData?.type || '').toUpperCase() === 'PAID') {
          setRenewal('monthly');
        } else if (!subscriptionData || String(subscriptionData.type || '').toUpperCase() !== 'FREE_TRIAL') {
          setRenewal('monthly');
        }
        const defaultUsers = Math.max(1, count, Number(subscriptionData?.numberOfUsers || 0));
        setUsers(defaultUsers);
        setProfile({ ...emptyProfile, ...savedProfile });
        setInvoices((Array.isArray(payments) ? payments : []).map((payment) => ({
          _id: payment._id,
          date: new Date(payment.createdAt).toLocaleString('en-IN'),
          user: payment.users,
          amount: `₹${Number(payment.finalAmount ?? payment.amount ?? 0).toLocaleString('en-IN')}`,
          expiry: payment.expiry ? new Date(payment.expiry).toLocaleDateString('en-IN') : '-',
          status: payment.status === 'Failed' ? 'Payment Failed' : payment.status === 'Processing' ? 'Processing' : payment.status === 'Paid' ? 'Paid' : 'Pending',
        })));
      })
      .catch((err) => toast.error(err.message || "Could not load subscription."))
      .finally(() => setLoading(false));
  }, []);

  const cycleMultiplier = renewal === "yearly" ? 12 : renewal === "halfyearly" ? 6 : 1;
  const minimumUserCount = Math.max(1, memberCount || 1);
  const selectedUserCount = Math.max(minimumUserCount, Number(users) || minimumUserCount);
  const purchaseUserCount = isTrialActive
    ? selectedUserCount
    : hasPaidSubscription
      ? Math.max(0, selectedUserCount - currentPaidSeatCount)
      : selectedUserCount;
  const originalAmount = pricePerUser * purchaseUserCount * cycleMultiplier;
  const discountRate = renewal === "halfyearly" ? 0.1 : renewal === "yearly" ? 0.15 : 0;
  const discountAmount = originalAmount * discountRate;
  const totalAmount = Math.max(0, originalAmount - discountAmount);
  const invoicePageSize = 5;
  const filteredInvoices = invoices.filter((inv) => {
    const term = `${inv.date} ${inv.user} ${inv.amount} ${inv.expiry} ${inv.status}`.toLowerCase();
    return term.includes('');
  });
  const totalInvoicePages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePageSize));
  const paginatedInvoices = filteredInvoices.slice((invoicePage - 1) * invoicePageSize, invoicePage * invoicePageSize);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoices.length]);

  useEffect(() => {
    setUsers((current) => Math.max(minimumUserCount, Number(current) || minimumUserCount));
  }, [minimumUserCount]);

  const startPayment = async () => {
    if (renewal === "trial") {
      toast.info("Your 7-day free trial is already active. Choose a paid billing cycle to subscribe.");
      return;
    }
    if (purchaseUserCount <= 0) {
      toast.info("No additional user seats are due for this purchase. Your current paid seats already cover the selected users.");
      return;
    }
    const requiredFields: Array<keyof PaymentProfile> = ["company", "firstName", "lastName", "email", "phone", "address", "state", "city", "pincode", "country"];
    if (requiredFields.some((field) => !profile[field].trim())) {
      toast.error("Please fill all required payment profile fields before paying");
      return;
    }
    setPaying(true);
    try {
      const payment = await api.createPayment({
        plan,
        pricePerUser,
        users: selectedUserCount,
        cycle: renewal,
        profile: { ...profile, name: `${profile.firstName} ${profile.lastName}`.trim() },
      });
      setPendingPaymentId(payment?._id || null);
      setPaymentOpen(true);
    } catch (err: any) { toast.error(err?.message || "Could not create payment"); }
    finally { setPaying(false); }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* <SettingsTopBar title="Subscribe" /> */}

      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
        <HeroBanner
          icon={<CreditCard className="w-6 h-6 text-white" />}
          title="Subscribe"
          subtitle="Manage your plan, billing, and subscription details"
          badges={[
            { label: "Active", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { label: "Secure", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          ]}
          tabs={[
            { icon: <Package className="w-4 h-4" />, label: "Plan Details" },
            { icon: <CreditCard className="w-4 h-4" />, label: "Payment Method" },
            { icon: <Users className="w-4 h-4" />, label: "Members" },
            { icon: <Calendar className="w-4 h-4" />, label: "Billing Cycle" },
            { icon: <FileText className="w-4 h-4" />, label: "Invoices" },
          ]}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <SummaryCard title="Paid Users" value={String(paidUsers)} extra={<span className="text-xs" style={{ color: BRAND }}>● {memberCount} active members</span>} />
              <SummaryCard title="Cycle" value={cycleLabel} />
              <SummaryCard title="Add Seats" value={String(purchaseUserCount)} extra={<span className="text-xs" style={{ color: BRAND }}>● {selectedUserCount} selected</span>} />
            </div>

            {/* Purchase plan */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Purchase Plan</h3>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-xs font-semibold"
                style={{ backgroundColor: "#e63946" }}
              >
                PRICES PRORATED TILL : {proratedUntilLabel}
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">Choose Plan</p>
                <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                  {Object.entries(PLAN_PRICES).map(([planName, price]) => {
                    const isSelected = plan === planName;
                    return (
                      <div
                        key={planName}
                        onClick={() => setPlan(planName)}
                        className="border-2 rounded-lg p-4 relative cursor-pointer transition-colors"
                        style={{ borderColor: isSelected ? BRAND : "#e5e7eb" }}
                      >
                        <div
                          className="absolute top-4 right-4 w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor: isSelected ? BRAND : "transparent",
                            borderColor: isSelected ? BRAND : "#d1d5db",
                          }}
                        />
                        <div className="font-bold text-gray-900">{planName}</div>
                        <div className="text-sm text-gray-600 mb-2">₹{price} per user / month</div>
                        <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                          {planName === "Starter" ? (
                            <>
                              <li>Up to 5 agents</li>
                              <li>Auto dialer</li>
                              <li>Lead CRM</li>
                              <li>Basic reports</li>
                              <li>Email support</li>
                            </>
                          ) : (
                            <>
                              <li>Unlimited agents</li>
                              <li>WhatsApp suite</li>
                              <li>Pipeline & tasks</li>
                              <li>Call recording</li>
                              <li>Performance & attendance</li>
                              <li>Priority support</li>
                            </>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                {hasPaidSubscription && (
                  <p className="text-xs text-gray-500 mt-2">
                    Currently active: <span className="font-semibold">{activePlanLabel}</span>
                  </p>
                )}
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">Choose Renewal</p>
                <div className="flex flex-wrap gap-3 sm:gap-6 text-sm">
                  {(showTrialOption ? ["trial", ...renewalOptions] : renewalOptions).map((r) => (
                    <label key={r} className="flex items-center gap-2 capitalize cursor-pointer">
                      <input
                        type="radio"
                        checked={renewal === r}
                        onChange={() => setRenewal(r)}
                        style={{ accentColor: BRAND }}
                        disabled={r === "trial" && !showTrialOption}
                      />
                      {r === "trial" ? "7-Day Trial · Active" : r === "halfyearly" ? "6 Months · 10% off" : r === "yearly" ? "Annual · 15% off" : "Monthly"}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="text-3xl font-bold text-gray-900">{renewal === "trial" ? "FREE" : `₹${totalAmount.toLocaleString('en-IN')}`}<span className="text-sm text-gray-500"> {renewal === "trial" ? "for 7 days" : "total"}</span></div>
                {discountAmount > 0 && <div className="mt-1 text-sm font-semibold text-emerald-600">Discount ({discountRate * 100}%)</div>}
                <div className="text-sm text-gray-500">{renewal === "trial" ? "Up to 200 trial calls · 30 calls per telecaller per day" : `₹${pricePerUser} × ${purchaseUserCount} new user(s) × ${cycleMultiplier} month(s)`}</div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <span className="text-sm text-gray-600">Choose No of Users</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setUsers((current) => Math.max(minimumUserCount, (Number(current) || minimumUserCount) - 1))}
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center disabled:opacity-50"
                      style={{ backgroundColor: BRAND }}
                      disabled={selectedUserCount <= minimumUserCount}
                    >−</button>
                    <input
                      value={selectedUserCount}
                      onChange={(e) => setUsers(Math.max(minimumUserCount, Number(e.target.value) || minimumUserCount))}
                      className="w-28 sm:w-40 text-center border rounded-md py-1.5"
                    />
                    <button
                      onClick={() => setUsers((current) => (Number(current) || minimumUserCount) + 1)}
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center"
                      style={{ backgroundColor: BRAND }}
                    >+</button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  {plan === "Starter" ? `Starter seats: ${purchaseUserCount} additional seat(s) currently due` : `Additional paid users: ${purchaseUserCount} currently pending`}
                </div>

                <button
                  className="mt-6 px-10 py-2 rounded-md text-white text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: BRAND }}
                  onClick={() => void startPayment()}
                  disabled={paying || purchaseUserCount <= 0}
                >
                  {paying ? "Preparing..." : purchaseUserCount <= 0 ? "No Payment Needed" : "PAY"}
                </button>
              </div>
            </div>

            {/* Invoice table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Search" className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 border-b">
                    <tr>
                      <th className="text-left py-2 font-semibold">Billing Date</th>
                      <th className="text-left py-2 font-semibold">User</th>
                      <th className="text-left py-2 font-semibold">Amount</th>
                      <th className="text-left py-2 font-semibold">Expiry Date</th>
                      <th className="text-left py-2 font-semibold">Status</th>
                      <th className="text-left py-2 font-semibold">Invoice</th>
                      <th className="text-left py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.map((inv, i) => (
                      <tr key={inv._id || i} className="border-b last:border-0">
                        <td className="py-3">{inv.date}</td>
                        <td className="py-3">{inv.user}</td>
                        <td className="py-3">{inv.amount}</td>
                        <td className="py-3">{inv.expiry}</td>
                        <td className="py-3">
                          <span
                            className="px-3 py-1 rounded-full text-xs text-white font-semibold"
                            style={{ backgroundColor: inv.status === "Paid" ? "#a3d977" : inv.status === "Payment Failed" ? "#ef4444" : inv.status === "Processing" ? "#f59e0b" : "#64748b" }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {inv.status === "Paid" && (
                            <button
                              type="button"
                              className="bg-gray-800 text-white text-xs font-semibold px-4 py-1 rounded-full"
                              onClick={() => window.open("https://zohosecurepay.in/books/", "_blank", "noopener,noreferrer")}
                            >
                              Invoice
                            </button>
                          )}
                        </td>
                        <td className="py-3">{inv.status === 'Paid' ? 'Approved' : inv.status === 'Payment Failed' ? 'Retry' : 'Pending'}</td>
                      </tr>
                    ))}
                    {loading && <tr><td colSpan={7} className="text-center p-4">Loading invoices...</td></tr>}
                    {!loading && invoices.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground p-4">No invoices found.</td></tr>}
                  </tbody>
                </table>
              </div>

              {!loading && invoices.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <button type="button" className="px-3 py-1 border rounded disabled:opacity-50" disabled={invoicePage === 1} onClick={() => setInvoicePage((page) => Math.max(1, page - 1))}>Previous</button>
                  {Array.from({ length: totalInvoicePages }, (_, index) => index + 1).map((pageNumber) => (
                    <button key={pageNumber} type="button" className={`px-2.5 py-1 border rounded ${pageNumber === invoicePage ? 'bg-gray-900 text-white' : ''}`} onClick={() => setInvoicePage(pageNumber)}>{pageNumber}</button>
                  ))}
                  <button type="button" className="px-3 py-1 border rounded disabled:opacity-50" disabled={invoicePage >= totalInvoicePages} onClick={() => setInvoicePage((page) => Math.min(totalInvoicePages, page + 1))}>Next</button>
                </div>
              )}
            </div>
          </div>

          {/* Payment profile */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h3 className="font-bold text-gray-900 mb-4">Payment Profile</h3>
            <div className="space-y-3">
              <ProfileField label="Company Name *" value={profile.company} onChange={(value) => setProfile({ ...profile, company: value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileField label="First Name *" value={profile.firstName} onChange={(value) => setProfile({ ...profile, firstName: value })} />
                <ProfileField label="Last Name *" value={profile.lastName} onChange={(value) => setProfile({ ...profile, lastName: value })} />
              </div>
              <ProfileField label="E-mail *" value={profile.email} onChange={(value) => setProfile({ ...profile, email: value })} />
              <ProfileField label="Phone *" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
              <ProfileField label="Address *" value={profile.address} onChange={(value) => setProfile({ ...profile, address: value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileField label="State *" value={profile.state} onChange={(value) => setProfile({ ...profile, state: value })} />
                <ProfileField label="City *" value={profile.city} onChange={(value) => setProfile({ ...profile, city: value })} />
                <ProfileField label="Pincode *" value={profile.pincode} onChange={(value) => setProfile({ ...profile, pincode: value })} />
                <ProfileField label="Country *" value={profile.country} onChange={(value) => setProfile({ ...profile, country: value })} />
              </div>
              <ProfileField label="GSTIN" value={profile.gstin} onChange={(value) => setProfile({ ...profile, gstin: value })} />
            </div>
            <button
              className="mt-4 w-full py-2.5 rounded-md text-white font-semibold"
              style={{ backgroundColor: BRAND }}
              onClick={async () => {
                try {
                  const savedProfile = await api.updatePaymentProfile(profile);
                  setProfile({ ...emptyProfile, ...savedProfile });
                  setProfileSaved(true);
                  toast.success("Payment profile updated");
                } catch (err: any) {
                  toast.error(err?.message || "Could not update payment profile");
                }
              }}
            >
              {profileSaved ? "UPDATED" : "UPDATE"}
            </button>
          </div>
        </div>
      </div>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>Pay with GPay / UPI</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Scan this dummy QR or pay to the UPI ID below.</p>
          <img className="mx-auto size-56 rounded-lg border p-2" alt="UPI payment QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`upi://pay?pa=${PAYMENT_UPI_ID}&pn=WebDial&am=${totalAmount}&cu=INR`)}`} />
          <div className="rounded-lg bg-muted p-3 font-mono text-sm">{PAYMENT_UPI_ID}</div>
          <div className="text-lg font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
          <DialogFooter><Button onClick={async () => { if (pendingPaymentId) await api.markPaymentProcessing(pendingPaymentId); setPaymentOpen(false); toast.success("Payment sent for approval"); window.location.reload(); }}>I completed payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, extra }: { title: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="text-sm font-bold text-gray-900 mb-2">{title}</div>
      <div className="text-sm text-gray-600">{value}</div>
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  );
}

function ProfileField({ label, value, onChange }: { label: string; value: string; onChange?: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full border-b py-1.5 text-sm outline-none focus:border-b-2" />
    </div>
  );
}