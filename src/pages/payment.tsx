import { useEffect, useState } from "react";
import {
  CreditCard, Package, Users, Calendar, FileText, CheckCircle2, ShieldCheck, Search,
} from "lucide-react";
import { BRAND, HeroBanner, SettingsTopBar } from "./settings/_shared";
import api from "@/lib/api";
import { toast } from "sonner";

type Invoice = {
  _id: string;
  date: string;
  user: number;
  amount: string;
  expiry: string;
  status: "Paid" | "Deleted" | "Pending";
};

export default function PaymentPage() {
  const [renewal, setRenewal] = useState("monthly");
  const [users, setUsers] = useState(4);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIXME: Replace getCallLogs with a real getInvoices API call when available.
    // Using getCallLogs as a placeholder to demonstrate backend connection.
    api.getCallLogs({ limit: 20 })
      .then(res => {
        const fetchedInvoices = (res?.calls || []).map((call: any, i: number) => ({
          _id: call._id || i.toString(),
          date: new Date(call.calledAt).toLocaleString('en-IN'),
          user: call.agent?.name || 'Unknown',
          amount: `${(call.duration * 0.5).toFixed(2)} INR`,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          status: i % 3 === 0 ? 'Deleted' : 'Paid',
        }));
        setInvoices(Array.isArray(fetchedInvoices) ? fetchedInvoices : []);
      })
      .catch(err => toast.error(err.message || "Could not load invoices."))
      .finally(() => setLoading(false));
  }, []);

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
              <SummaryCard title="Cycle" value="WebDial Enterprise Basic Monthly" />
              <SummaryCard title="Expiry" value="Jul 31, 2026 1:43 PM" />
              <SummaryCard title="Member Limit" value="4" extra={<span className="text-xs" style={{ color: BRAND }}>● 4 added users</span>} />
            </div>

            {/* Purchase plan */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Purchase Plan</h3>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-xs font-semibold"
                style={{ backgroundColor: "#e63946" }}
              >
                PRICES PRORATED TILL : JUL 29, 2026 1:43 PM
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">Choose Plan</p>
                <div
                  className="border-2 rounded-lg p-4 max-w-md relative"
                  style={{ borderColor: BRAND }}
                >
                  <div className="absolute top-4 right-4 w-4 h-4 rounded-full" style={{ backgroundColor: BRAND }} />
                  <div className="font-bold text-gray-900">Sim Based Dialer</div>
                  <div className="text-sm text-gray-600 mb-2">Affordable, reliable SIM calling</div>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                    <li>Android phone + SIM calling</li>
                    <li>Works offline over cellular</li>
                    <li>No cloud recordings</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold mb-2">Choose Renewal</p>
                <div className="flex flex-wrap gap-3 sm:gap-6 text-sm">
                  {["monthly", "halfyearly", "yearly"].map((r) => (
                    <label key={r} className="flex items-center gap-2 capitalize cursor-pointer">
                      <input
                        type="radio"
                        checked={renewal === r}
                        onChange={() => setRenewal(r)}
                        style={{ accentColor: BRAND }}
                      />
                      {r === "halfyearly" ? "Halfyearly" : r}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="text-3xl font-bold text-gray-900">Rs 0<span className="text-sm text-gray-500">/user</span></div>
                <div className="text-sm text-gray-500">You will be charged Rs 0.00 (+Taxes) per month</div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <span className="text-sm text-gray-600">Choose No of Users</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setUsers(Math.max(1, users - 1))}
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center"
                      style={{ backgroundColor: BRAND }}
                    >−</button>
                    <input
                      value={users}
                      onChange={(e) => setUsers(Number(e.target.value) || 1)}
                      className="w-28 sm:w-40 text-center border rounded-md py-1.5"
                    />
                    <button
                      onClick={() => setUsers(users + 1)}
                      className="w-8 h-8 rounded-full text-white flex items-center justify-center"
                      style={{ backgroundColor: BRAND }}
                    >+</button>
                  </div>
                </div>

                <button
                  className="mt-6 px-10 py-2 rounded-md text-white text-sm font-semibold"
                  style={{ backgroundColor: BRAND }}
                >
                  PAY
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
                    {invoices.map((inv, i) => (
                      <tr key={inv._id || i} className="border-b last:border-0">
                        <td className="py-3">{inv.date}</td>
                        <td className="py-3">{inv.user}</td>
                        <td className="py-3">{inv.amount}</td>
                        <td className="py-3">{inv.expiry}</td>
                        <td className="py-3">
                          <span
                            className="px-3 py-1 rounded-full text-xs text-white font-semibold"
                            style={{ backgroundColor: inv.status === "Paid" ? "#a3d977" : "#ef4444" }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {inv.status === "Paid" && (
                            <button className="bg-gray-800 text-white text-xs font-semibold px-4 py-1 rounded-full">Invoice</button>
                          )}
                        </td>
                        <td />
                      </tr>
                    ))}
                    {loading && <tr><td colSpan={7} className="text-center p-4">Loading invoices...</td></tr>}
                    {!loading && invoices.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground p-4">No invoices found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment profile */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h3 className="font-bold text-gray-900 mb-4">Payment Profile</h3>
            <div className="space-y-3">
              <ProfileField label="Company Name *" value="Web" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileField label="First Name *" value="Sidhartha" />
                <ProfileField label="Last Name *" value="Mohan" />
              </div>
              <ProfileField label="E-mail *" value="sidhartha@ifoxad.com" />
              <ProfileField label="Phone *" value="+919884339436" />
              <ProfileField label="Address *" value="Flat 'F', 2nd Floor, 11th Sector Park, Plot #922, 66th St, Sector 11, K. K. Nagar" />
              <ProfileField label="State *" value="Tamil Nadu" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileField label="City *" value="Chennai" />
                <ProfileField label="Pincode *" value="600078" />
              </div>
              <ProfileField label="Country *" value="India" />
              <ProfileField label="GSTIN" value="33EAAPB9400H1Z9" />
            </div>
            <button
              className="mt-4 w-full py-2.5 rounded-md text-white font-semibold"
              style={{ backgroundColor: BRAND }}
            >
              UPDATE
            </button>
          </div>
        </div>
      </div>
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

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input defaultValue={value} className="w-full border-b py-1.5 text-sm outline-none focus:border-b-2" />
    </div>
  );
}
