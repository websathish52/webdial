import { useState, useEffect } from "react";
import { MessageSquare, Plus, ChevronRight, Link2, List, Edit, Trash2, Paperclip, X } from "lucide-react";
import { BRAND, HeroBanner, SettingsTopBar } from "./_shared";
import api, { resolveFileUrl } from "@/lib/api";
import { toast } from "sonner"; // Assuming sonner for toasts
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Assuming a type for message template
type MessageTemplate = {
  _id?: string;
  id?: string;
  name: string;
  desc: string;
  body: string; // The actual message content
  tag?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<MessageTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateTag, setTemplateTag] = useState("");
  const [attachment, setAttachment] = useState<MessageTemplate>({ name: "", desc: "", body: "" });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.getMessageTemplates(); // Assumed API call
      setTemplates(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load message templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTemplates(); }, []);

  const openAddEditDialog = (template?: MessageTemplate) => {
    setCurrentTemplate(template || null);
    setTemplateName(template?.name || "");
    setTemplateDesc(template?.desc || "");
    setTemplateBody(template?.body || "");
    setTemplateTag(template?.tag || "");
    setAttachment(template || { name: "", desc: "", body: "" });
    setAddEditOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim()) {
      toast.error("Template name and body are required.");
      return;
    }
    const payload = {
      name: templateName.trim(), desc: templateDesc.trim(), body: templateBody.trim(), tag: templateTag.trim() || undefined,
      attachmentUrl: attachment.attachmentUrl || null, attachmentName: attachment.attachmentName || null,
      attachmentType: attachment.attachmentType || null, attachmentSize: attachment.attachmentSize || null,
    };
    try {
      if (currentTemplate?._id || currentTemplate?.id) {
        // Assert that the ID is a string, as the 'if' condition guarantees its presence.
        await api.updateMessageTemplate((currentTemplate._id || currentTemplate.id) as string, payload);
        toast.success("Template updated.");
      } else {
        await api.createMessageTemplate(payload); // Assumed API call
        toast.success("Template created.");
      }
      setAddEditOpen(false);
      void loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template.");
    }
  };

  const uploadAttachment = async (file?: File) => {
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await api.uploadMessageTemplateAttachment(formData);
      setAttachment((current) => ({ ...current, ...uploaded }));
      toast.success("Attachment uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Could not upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await api.deleteMessageTemplate(id); // Assumed API call
      toast.success("Template deleted.");
      void loadTemplates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete template.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SettingsTopBar title="Message Templates" />
        <div className="space-y-6 max-w-[1400px] mx-auto">Loading message templates...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <SettingsTopBar title="Message Templates" />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <List className="w-4 h-4 text-gray-500" />
            <h3 className="font-bold text-gray-900">Your Templates</h3>
            <button className="ml-auto flex items-center gap-1 text-sm text-blue-600 hover:underline" onClick={() => openAddEditDialog()}>
              <Plus className="w-4 h-4" /> Add New
            </button>
          </div>

          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t._id || t.id} className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: BRAND }}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                      {t.attachmentName && <div className="mt-1 flex items-center gap-1 text-xs text-blue-600"><Paperclip className="size-3" /> {t.attachmentName}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-gray-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); openAddEditDialog(t); }} title="Edit Template">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-500" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate((t._id || t.id) as string); // Assert that the ID is a string
                  }} title="Delete Template"><Trash2 className="w-4 h-4" /></button>
                  {t.tag && (
                    <span className="inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs" style={{ color: BRAND, borderColor: BRAND }}>
                      <Link2 className="w-3 h-3" /> {t.tag}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={addEditOpen} onOpenChange={setAddEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{currentTemplate ? "Edit Message Template" : "Add New Message Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g., Welcome Message" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="Short description of template" />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} placeholder="Hi {{name}}, welcome to WebDial!" rows={5} />
            </div>
            <div>
              <Label>Tag (optional)</Label>
              <Input value={templateTag} onChange={(e) => setTemplateTag(e.target.value)} placeholder="e.g., Link, Auto" />
            </div>
            <div>
              <Label>Attachment (optional)</Label>
              <Input type="file" onChange={(e) => void uploadAttachment(e.target.files?.[0])} disabled={uploadingAttachment} />
              {uploadingAttachment && <div className="text-xs text-muted-foreground mt-1">Uploading attachment...</div>}
              {attachment.attachmentUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs">
                  <Paperclip className="size-4 text-blue-600" />
                  <a href={resolveFileUrl(attachment.attachmentUrl)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-blue-600 hover:underline">{attachment.attachmentName}</a>
                  <button type="button" onClick={() => setAttachment((current) => ({ ...current, attachmentUrl: undefined, attachmentName: undefined, attachmentType: undefined, attachmentSize: undefined }))} title="Remove attachment" className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} style={{ backgroundColor: BRAND }}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
