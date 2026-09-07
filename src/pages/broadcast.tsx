import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { toast } from "sonner";
import { CalendarClock, FileText, MessageCircleMore, Radio, Send, Trash2, Users } from "lucide-react";

type Lead = { _id?: string; id?: string; name: string; phone: string };
type Template = { _id?: string; id?: string; name: string; body: string };
type Broadcast = { _id: string; name: string; message: string; recipients: Lead[]; scheduledAt?: string; status: string };

const statusStyles: Record<string, string> = { draft: "bg-slate-100 text-slate-700", scheduled: "bg-blue-100 text-blue-700", queued: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700" };

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", templateId: "", message: "", scheduledAt: "" });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [broadcastResponse, leadResponse, templateResponse] = await Promise.all([api.getWhatsappBroadcasts(), api.getLeads({ limit: 50000 }), api.getMessageTemplates()]);
      setBroadcasts(Array.isArray(broadcastResponse) ? broadcastResponse : []);
      setLeads(Array.isArray(leadResponse?.leads) ? leadResponse.leads : Array.isArray(leadResponse) ? leadResponse : []);
      setTemplates(Array.isArray(templateResponse) ? templateResponse : []);
    } catch (error: any) { toast.error(error?.message || "Could not load WhatsApp broadcast data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadData(); }, []);
  const updateForm = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const leadId = (lead: Lead) => lead._id || lead.id || lead.phone;
  const toggleRecipient = (id: string) => setSelectedRecipients((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectAll = () => setSelectedRecipients(selectedRecipients.length === leads.length ? [] : leads.map(leadId));
  const chooseTemplate = (templateId: string) => { updateForm("templateId", templateId); const template = templates.find((item) => (item._id || item.id) === templateId); if (template) updateForm("message", template.body); };

  const saveBroadcast = async (status: "draft" | "scheduled" | "queued") => {
    if (!form.name.trim() || !form.message.trim()) return toast.error("Broadcast name and message are required");
    if (!selectedRecipients.length) return toast.error("Select at least one recipient");
    if (status === "scheduled" && !form.scheduledAt) return toast.error("Choose a schedule time");
    try {
      setSaving(true);
      const recipients = leads.filter((lead) => selectedRecipients.includes(leadId(lead))).map((lead) => ({ leadId: lead._id || lead.id, name: lead.name, phone: lead.phone }));
      await api.createWhatsappBroadcast({ name: form.name.trim(), message: form.message.trim(), templateId: form.templateId, scheduledAt: form.scheduledAt || null, status, recipients });
      toast.success(status === "draft" ? "Broadcast draft saved" : status === "scheduled" ? "Broadcast scheduled" : "Broadcast queued");
      setOpen(false); setForm({ name: "", templateId: "", message: "", scheduledAt: "" }); setSelectedRecipients([]); await loadData();
    } catch (error: any) { toast.error(error?.message || "Could not save broadcast"); }
    finally { setSaving(false); }
  };

  const removeBroadcast = async (broadcast: Broadcast) => {
    if (!window.confirm(`Delete the broadcast "${broadcast.name}"?`)) return;
    try { await api.deleteWhatsappBroadcast(broadcast._id); setBroadcasts((current) => current.filter((item) => item._id !== broadcast._id)); toast.success("Broadcast deleted"); }
    catch (error: any) { toast.error(error?.message || "Could not delete broadcast"); }
  };

  return <div className="min-h-full bg-slate-50 p-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="relative overflow-hidden rounded-xl   p-6 text-white shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg flex items-center gap-3"><div className="absolute " /><div className="relative flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-blue-100">WhatsApp</p><h1 className="text-2xl font-bold">Broadcast</h1><p className="mt-1 text-sm text-blue-100">Send bulk messages to your contacts efficiently.</p></div></div><div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Users className="size-4" /> Bulk messaging</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><FileText className="size-4" /> Template based</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><CalendarClock className="size-4" /> Schedule messages</span></div></div>
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Broadcast history</h2><p className="text-sm text-slate-500">Saved drafts and scheduled WhatsApp campaigns.</p></div><Button onClick={() => setOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700"><Send className="size-4" /> New broadcast</Button></div>
    <Card className="border-slate-200 shadow-sm"><CardContent className="p-5">{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading broadcasts...</p> : broadcasts.length === 0 ? <div className="py-12 text-center"><Radio className="mx-auto mb-3 size-9 text-slate-300" /><p className="font-medium text-slate-900">No broadcasts yet</p><p className="mt-1 text-sm text-slate-500">Create a broadcast for your selected contacts.</p></div> : <div className="space-y-3">{broadcasts.map((broadcast) => <div key={broadcast._id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"><div><p className="font-medium text-slate-900">{broadcast.name}</p><p className="mt-1 text-sm text-slate-500">{broadcast.recipients?.length || 0} recipients {broadcast.scheduledAt ? `· ${new Date(broadcast.scheduledAt).toLocaleString()}` : ""}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[broadcast.status] || statusStyles.draft}`}>{broadcast.status}</span><button type="button" title="Delete broadcast" onClick={() => void removeBroadcast(broadcast)} className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600"><Trash2 className="size-4" /></button></div></div>)}</div>}</CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create WhatsApp broadcast</DialogTitle></DialogHeader><div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"><div><Label htmlFor="broadcast-name">Broadcast name</Label><Input id="broadcast-name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="e.g. September offer" /></div><div><Label htmlFor="broadcast-template">Message template (optional)</Label><select id="broadcast-template" value={form.templateId} onChange={(event) => chooseTemplate(event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Write a custom message</option>{templates.map((template) => <option key={template._id || template.id} value={template._id || template.id}>{template.name}</option>)}</select></div><div><Label htmlFor="broadcast-message">Message</Label><Textarea id="broadcast-message" value={form.message} onChange={(event) => updateForm("message", event.target.value)} placeholder="Hi {{name}}, we have an update for you..." rows={5} /></div><div><div className="flex items-center justify-between"><Label>Recipients ({selectedRecipients.length} selected)</Label><Button type="button" variant="outline" size="sm" onClick={selectAll}>{selectedRecipients.length === leads.length ? "Clear all" : "Select all"}</Button></div><div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-slate-200">{leads.length ? leads.map((lead) => { const id = leadId(lead); return <label key={id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50"><input type="checkbox" checked={selectedRecipients.includes(id)} onChange={() => toggleRecipient(id)} /><span className="min-w-0 flex-1 text-sm text-slate-700">{lead.name} <span className="text-slate-400">{lead.phone}</span></span></label>; }) : <p className="p-4 text-sm text-slate-500">No leads found.</p>}</div></div><div><Label htmlFor="broadcast-schedule">Schedule (optional)</Label><Input id="broadcast-schedule" type="datetime-local" value={form.scheduledAt} onChange={(event) => updateForm("scheduledAt", event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="outline" disabled={saving} onClick={() => void saveBroadcast("draft")}>Save draft</Button><Button disabled={saving} onClick={() => void saveBroadcast(form.scheduledAt ? "scheduled" : "queued")} className="gap-2 bg-blue-600 hover:bg-blue-700">{saving ? "Saving..." : form.scheduledAt ? <><CalendarClock className="size-4" /> Schedule</> : <><Send className="size-4" /> Queue broadcast</>}</Button></DialogFooter></DialogContent></Dialog>
  </div></div>;
}
