import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { toast } from "sonner";
import { BarChart3, CalendarDays, CheckCircle2, Coins, Download, FileText, MessageCircleMore, Radio, RefreshCw, Send, Users } from "lucide-react";

type Summary = { broadcasts: number; recipients: number; queued: number; scheduled: number; completed: number; drafts: number };
type DailyPoint = { date: string; broadcasts: number; recipients: number };
type ReportBroadcast = { _id: string; name: string; status: string; recipients?: unknown[]; scheduledAt?: string; createdAt: string };
type Report = { summary: Summary; daily: DailyPoint[]; broadcasts: ReportBroadcast[] };
type CreditTransaction = { _id: string; credits: number; amount: number; status: string; createdAt: string };

const initialSummary: Summary = { broadcasts: 0, recipients: 0, queued: 0, scheduled: 0, completed: 0, drafts: 0 };
const statusStyles: Record<string, string> = { draft: "bg-slate-100 text-slate-700", scheduled: "bg-blue-100 text-blue-700", queued: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700" };
const dateValue = (date: Date) => date.toISOString().slice(0, 10);

export default function WhatsappReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(dateValue(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(dateValue(today));
  const [report, setReport] = useState<Report>({ summary: initialSummary, daily: [], broadcasts: [] });
  const [creditBalance, setCreditBalance] = useState(100);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    try {
      setLoading(true);
      const [response, creditsResponse] = await Promise.all([api.getWhatsappReport(from, to), api.getWhatsappCredits()]);
      setReport({ summary: { ...initialSummary, ...(response?.summary || {}) }, daily: response?.daily || [], broadcasts: response?.broadcasts || [] });
      setCreditBalance(Number(creditsResponse?.balance ?? 100));
      setCreditTransactions(Array.isArray(creditsResponse?.transactions) ? creditsResponse.transactions : []);
    } catch (error: any) { toast.error(error?.message || "Could not load WhatsApp report"); }
    finally { setLoading(false); }
  };

  const requestCredits = async (credits: number, amount: number) => {
    try {
      setBuyingCredits(true);
      const transaction = await api.requestWhatsappCredits({ credits, amount });
      setCreditTransactions((current) => [transaction, ...current]);
      toast.success("Credit recharge request submitted for approval");
    } catch (error: any) { toast.error(error?.message || "Could not submit credit request"); }
    finally { setBuyingCredits(false); }
  };

  useEffect(() => { void loadReport(); }, []);

  const exportData = () => {
    const rows = [["Broadcast", "Status", "Recipients", "Scheduled at", "Created at"], ...report.broadcasts.map((item) => [item.name, item.status, String(item.recipients?.length || 0), item.scheduledAt || "", item.createdAt])];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `whatsapp-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const cards = [
    { label: "Total broadcasts", value: report.summary.broadcasts, icon: Radio, color: "text-blue-600", helper: "Created in date range" },
    { label: "Total recipients", value: report.summary.recipients, icon: Users, color: "text-cyan-600", helper: "Across all broadcasts" },
    { label: "Queued messages", value: report.summary.queued, icon: Send, color: "text-amber-600", helper: "Ready to send" },
    { label: "Completed", value: report.summary.completed, icon: CheckCircle2, color: "text-emerald-600", helper: "Completed broadcasts" },
  ];
  const maxRecipients = Math.max(...report.daily.map((item) => item.recipients), 1);

  return <div className="min-h-full bg-slate-50 p-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg"><div className="absolute -right-16 -top-20 size-64 rounded-full border-[28px] border-white/10" /><div className="relative flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-blue-100">WhatsApp</p><h1 className="text-2xl font-bold">Reports</h1><p className="mt-1 text-sm text-blue-100">Track and analyze your WhatsApp campaign performance.</p></div><Badge className="gap-1.5 border-0 bg-white/15 text-white hover:bg-white/15"><MessageCircleMore className="size-3.5" /> WhatsApp</Badge></div><div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><BarChart3 className="size-4" /> Analytics</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><FileText className="size-4" /> Message stats</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><CalendarDays className="size-4" /> Date range</span></div></div>
    <Card className="border-slate-200 shadow-sm"><CardContent className="flex flex-wrap items-end gap-3 p-5"><div><label htmlFor="report-from" className="mb-1 block text-xs font-medium text-slate-500">From</label><input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" /></div><div><label htmlFor="report-to" className="mb-1 block text-xs font-medium text-slate-500">To</label><input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" /></div><Button onClick={() => void loadReport()} disabled={loading} className="gap-2 bg-blue-600 hover:bg-blue-700"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Apply range</Button><Button onClick={exportData} disabled={!report.broadcasts.length} variant="outline" className="gap-2"><Download className="size-4" /> Export data</Button></CardContent></Card>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Coins className="size-5 text-blue-600" /> Billing</CardTitle></CardHeader><CardContent><div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center"><p className="text-sm font-medium text-blue-700">Current balance</p><p className="mt-1 text-3xl font-bold text-slate-900">{creditBalance.toLocaleString()} Credits</p><p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">1 credit is charged for every WhatsApp message sent or received. Meta account recharge and Meta charges are billed separately.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[1000, 300], [5000, 1250], [10000, 2000], [50000, 5000]].map(([credits, amount]) => <div key={credits} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><p className="font-medium text-slate-900">{credits.toLocaleString()} credits</p><p className="text-xs text-slate-500">Rs.{amount} + GST</p></div><Button size="sm" onClick={() => void requestCredits(credits, amount)} disabled={buyingCredits} className="bg-blue-600 hover:bg-blue-700">Buy</Button></div>)}</div>{creditTransactions.length > 0 && <p className="mt-4 text-xs text-slate-500">Latest recharge request: {creditTransactions[0].credits.toLocaleString()} credits · {creditTransactions[0].status}</p>}</CardContent></Card>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, color, helper }) => <Card key={label} className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className={`size-5 ${color}`} /></div><p className="mt-3 text-3xl font-bold text-slate-900">{loading ? "-" : value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{helper}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-5"><Card className="border-slate-200 shadow-sm lg:col-span-3"><CardHeader><CardTitle className="text-base">Message activity</CardTitle></CardHeader><CardContent>{report.daily.length ? <div className="flex h-56 items-end gap-2 overflow-x-auto border-b border-slate-100">{report.daily.map((item) => <div key={item.date} className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-400">{item.recipients}</span><div className="w-full min-w-6 rounded-t-md bg-blue-500" style={{ height: `${Math.max(8, (item.recipients / maxRecipients) * 170)}px` }} title={`${item.recipients} recipients`} /><span className="mb-2 -rotate-45 whitespace-nowrap text-[10px] text-slate-400">{item.date.slice(5)}</span></div>)}</div> : <p className="py-20 text-center text-sm text-slate-500">No activity in this date range.</p>}</CardContent></Card><Card className="border-slate-200 shadow-sm lg:col-span-2"><CardHeader><CardTitle className="text-base">Message stats</CardTitle></CardHeader><CardContent className="space-y-4">{[["Scheduled", report.summary.scheduled, "bg-blue-500"], ["Queued", report.summary.queued, "bg-amber-500"], ["Completed", report.summary.completed, "bg-emerald-500"], ["Drafts", report.summary.drafts, "bg-slate-400"]].map(([label, value, color]) => <div key={label as string}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{label as string}</span><strong className="text-slate-900">{value as number}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color as string}`} style={{ width: `${report.summary.broadcasts ? Math.min(100, ((value as number) / report.summary.broadcasts) * 100) : 0}%` }} /></div></div>)}</CardContent></Card></div>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Broadcast performance</CardTitle></CardHeader><CardContent>{report.broadcasts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-400"><tr><th className="pb-3 font-medium">Broadcast</th><th className="pb-3 font-medium">Recipients</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{report.broadcasts.map((item) => <tr key={item._id}><td className="py-3 font-medium text-slate-900">{item.name}</td><td className="py-3 text-slate-600">{item.recipients?.length || 0}</td><td className="py-3 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td><td className="py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[item.status] || statusStyles.draft}`}>{item.status}</span></td></tr>)}</tbody></table></div> : <p className="py-10 text-center text-sm text-slate-500">No broadcasts found for this date range.</p>}</CardContent></Card>
  </div></div>;
}
