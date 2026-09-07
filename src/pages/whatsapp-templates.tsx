import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api, { getSelectedCompanyId, resolveFileUrl } from "@/lib/api";
import { useCurrentMember } from "@/lib/mock-store";
import { toast } from "sonner";
import { Edit, FileText, Link2, MessageSquareText, Paperclip, Plus, Trash2, X } from "lucide-react";

type WhatsappTemplate = {
  _id?: string;
  id?: string;
  name: string;
  desc?: string;
  body: string;
  tag?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

const emptyForm = { name: "", desc: "", body: "", tag: "" };

export default function WhatsappTemplatesPage() {
  const member = useCurrentMember();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => getSelectedCompanyId());
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState<Partial<WhatsappTemplate>>({});

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.getMessageTemplates();
      setTemplates(Array.isArray(response) ? response : []);
    } catch (error: any) {
      toast.error(error?.message || "Could not load WhatsApp templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTemplates(); }, []);

  useEffect(() => {
    const handleCompanyChange = () => {
      setSelectedCompanyId(getSelectedCompanyId());
      void loadTemplates();
    };
    window.addEventListener("ifox-company-changed", handleCompanyChange);
    return () => window.removeEventListener("ifox-company-changed", handleCompanyChange);
  }, []);

  const openDialog = (template?: WhatsappTemplate) => {
    setEditingTemplate(template || null);
    setForm({ name: template?.name || "", desc: template?.desc || "", body: template?.body || "", tag: template?.tag || "" });
    setAttachment(template ? template : {});
    setDialogOpen(true);
  };

  const updateForm = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const saveTemplate = async () => {
    if (member?.role === "SuperAdmin" && !selectedCompanyId) {
      toast.error("Select a specific company first");
      return;
    }
    if (!form.name.trim() || !form.body.trim()) {
      toast.error("Template name and message body are required");
      return;
    }
    const payload = {
      name: form.name.trim(), desc: form.desc.trim(), body: form.body.trim(), tag: form.tag.trim() || undefined,
      attachmentUrl: attachment.attachmentUrl || null, attachmentName: attachment.attachmentName || null,
      attachmentType: attachment.attachmentType || null, attachmentSize: attachment.attachmentSize || null,
    };
    try {
      setSaving(true);
      const id = editingTemplate?._id || editingTemplate?.id;
      if (id) { await api.updateMessageTemplate(id, payload); toast.success("WhatsApp template updated"); }
      else { await api.createMessageTemplate(payload); toast.success("WhatsApp template created"); }
      setDialogOpen(false);
      await loadTemplates();
    } catch (error: any) {
      toast.error(error?.message || "Could not save WhatsApp template");
    } finally { setSaving(false); }
  };

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const data = new FormData(); data.append("file", file);
      setAttachment(await api.uploadMessageTemplateAttachment(data));
      toast.success("Attachment uploaded");
    } catch (error: any) { toast.error(error?.message || "Could not upload attachment"); }
    finally { setUploading(false); }
  };

  const deleteTemplate = async (template: WhatsappTemplate) => {
    const id = template._id || template.id;
    if (!id || !window.confirm(`Delete the template "${template.name}"?`)) return;
    try {
      await api.deleteMessageTemplate(id);
      setTemplates((current) => current.filter((item) => (item._id || item.id) !== id));
      toast.success("WhatsApp template deleted");
    } catch (error: any) { toast.error(error?.message || "Could not delete WhatsApp template"); }
  };

  const formatSize = (size?: number) => size ? `${Math.max(1, Math.round(size / 1024))} KB` : "";

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg flex items-center gap-3">
          <div><p className="text-sm font-medium text-emerald-600">WhatsApp</p><h1 className="text-3xl font-bold tracking-tight ">Message templates</h1><p className="mt-1 text-sm ">Create reusable messages for faster customer conversations.</p></div>
          <Button onClick={() => openDialog()} className="gap-2 bg-white  " style={{ color: "#1e51db" }}><Plus className="size-4 "  /> Create template</Button>
        </div>
        {member?.role === "SuperAdmin" && !selectedCompanyId && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Select a specific company from the sidebar before creating or viewing WhatsApp templates.</div>}
        <section className="rounded-xl border border-slate-200 text-white shadow-sm bg-card text-card-foreground shadow">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><MessageSquareText className="size-5 text-emerald-600" /><h2 className="font-semibold text-slate-900">Template library</h2><span className="text-sm text-slate-400">{templates.length} {templates.length === 1 ? "template" : "templates"}</span></div>
          <div className="p-5">
            {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading templates...</p> : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center"><FileText className="mx-auto mb-3 size-9 text-slate-300" /><h3 className="font-medium text-slate-900">No templates yet</h3><p className="mt-1 text-sm ">Create your first WhatsApp template to use it while messaging leads.</p><Button variant="outline" onClick={() => openDialog()} className="mt-4 gap-2 " style={{ color: "#1e51db" }}><Plus className="size-4" /> Create template</Button></div>
            ) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => <article key={template._id || template.id} className="flex min-h-52 flex-col rounded-lg border border-slate-200 bg-slate-50/60 p-4 bg-white">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900">{template.name}</h3>{template.tag && <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"><Link2 className="size-3" />{template.tag}</span>}</div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => openDialog(template)} title="Edit template" className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-emerald-600"><Edit className="size-4" /></button><button type="button" onClick={() => void deleteTemplate(template)} title="Delete template" className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600"><Trash2 className="size-4" /></button></div></div>
                {template.desc && <p className="mt-3 text-xs text-slate-500">{template.desc}</p>}<p className="mt-3 flex-1 whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">{template.body}</p>{template.attachmentUrl && <a href={resolveFileUrl(template.attachmentUrl)} target="_blank" rel="noreferrer" className="mt-3 flex min-w-0 items-center gap-2 text-xs text-emerald-700 hover:underline"><Paperclip className="size-3.5 shrink-0" /><span className="truncate">{template.attachmentName || "View attachment"}</span>{formatSize(template.attachmentSize) && <span className="shrink-0 text-slate-400">({formatSize(template.attachmentSize)})</span>}</a>}
              </article>)}
            </div>}
          </div>
        </section>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editingTemplate ? "Edit WhatsApp template" : "Create WhatsApp template"}</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label htmlFor="template-name">Template name</Label><Input id="template-name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="e.g. Welcome message" /></div>
        <div><Label htmlFor="template-desc">Description</Label><Input id="template-desc" value={form.desc} onChange={(event) => updateForm("desc", event.target.value)} placeholder="Short description (optional)" /></div>
        <div><Label htmlFor="template-body">Message body</Label><Textarea id="template-body" value={form.body} onChange={(event) => updateForm("body", event.target.value)} placeholder="Hi {{name}}, welcome to our service!" rows={6} /></div>
        <div><Label htmlFor="template-tag">Tag</Label><Input id="template-tag" value={form.tag} onChange={(event) => updateForm("tag", event.target.value)} placeholder="e.g. Welcome, Follow-up" /></div>
        <div><Label htmlFor="template-attachment">Attachment (optional)</Label><Input id="template-attachment" type="file" onChange={(event) => void uploadAttachment(event.target.files?.[0])} disabled={uploading} />{uploading && <p className="mt-1 text-xs text-slate-500">Uploading attachment...</p>}{attachment.attachmentUrl && <div className="mt-2 flex items-center gap-2 rounded-md border bg-slate-50 p-2 text-xs"><Paperclip className="size-4 text-emerald-600" /><a className="min-w-0 flex-1 truncate text-emerald-700 hover:underline" href={resolveFileUrl(attachment.attachmentUrl)} target="_blank" rel="noreferrer">{attachment.attachmentName}</a><button type="button" title="Remove attachment" onClick={() => setAttachment({})} className="text-slate-400 hover:text-red-600"><X className="size-4" /></button></div>}</div>
      </div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => void saveTemplate()} disabled={saving || uploading} className=" hover:bg-emerald-700">{saving ? "Saving..." : "Save template"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
