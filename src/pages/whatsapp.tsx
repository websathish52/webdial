import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
function useAppSearch(): any { const [sp] = useSearchParams(); return Object.fromEntries(sp.entries()); }
import { store, useStore, type Lead } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api, { resolveFileUrl } from "@/lib/api";
import { Send, MessageCircle, Search, Phone } from "lucide-react";
import { toast } from "sonner";

type Search = { phone?: string; name?: string };
type MessageTemplate = { _id?: string; id?: string; name: string; desc?: string; body: string; attachmentUrl?: string; attachmentName?: string; attachmentType?: string };

function WhatsappPage() {
  const q = useAppSearch();
  const [leads, setLeads] = useState<Lead[]>([]);
  const messages = useStore(s => s.messages);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [lists, setLists] = useState<string[]>([]);

  const loadLists = useCallback(async () => {
    try {
      const listsRes = await api.getLists();
      const nextLists = Array.isArray(listsRes) ? listsRes.map(l => l.name) : (listsRes?.lists?.map((l: any) => l.name) || []);
      setLists(nextLists);
    } catch (err) {
      console.error("Failed to fetch lists:", err);
      toast.error("Could not load lists for filtering.");
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const leadsRes = await api.getLeads({ limit: 50000 });
      const nextLeads = Array.isArray(leadsRes?.leads) ? leadsRes.leads : [];
      setLeads(nextLeads);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      toast.error("Could not load leads.");
    }
  }, []);

  useEffect(() => { void loadLists(); void loadLeads(); }, [loadLists, loadLeads]);

  useEffect(() => {
    api.getMessageTemplates()
      .then((response: any) => setTemplates(Array.isArray(response) ? response : []))
      .catch((err: any) => toast.error(err?.message || "Could not load message templates"));
  }, []);

  useEffect(() => {
    const handleCrmUpdated = () => {
      void loadLists();
      void loadLeads();
    };
    window.addEventListener('ifox-crm-updated', handleCrmUpdated);
    return () => window.removeEventListener('ifox-crm-updated', handleCrmUpdated);
  }, [loadLists, loadLeads]);

  const contacts = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; list: string; last?: string }>();
    for (const l of leads) map.set(l.phone, { phone: l.phone, name: l.name, list: l.list });
    for (const m of messages) {
      const prev = map.get(m.phone) || { phone: m.phone, name: m.name, list: "" };
      if (!prev.last) prev.last = m.text;
      map.set(m.phone, prev);
    }
    return Array.from(map.values());
  }, [leads, messages]);

  const [selectedList, setSelectedList] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<{ phone: string; name: string } | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<MessageTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    if (q.phone) setActive({ phone: q.phone, name: q.name || q.phone });
  }, [q.phone, q.name]);

  const filtered = contacts.filter(c => (selectedList === "all" || c.list === selectedList) && (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)));
  const thread = active ? messages.filter(m => m.phone === active.phone).slice().reverse() : [];

  const templateText = (template: MessageTemplate) => {
    const message = template.body.replaceAll("{{name}}", active?.name || "");
    return template.attachmentUrl ? `${message}\n${resolveFileUrl(template.attachmentUrl)}` : message;
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => (item._id || item.id) === templateId);
    if (template) {
      setText(templateText(template));
      setSelectedTemplate(template);
      setSelectedAttachment(template.attachmentUrl ? template : null);
    }
  };

  const send = () => {
    if (!active || !text.trim()) return;
    store.sendWhatsapp(active.phone, active.name, text.trim());
    // Open WhatsApp with the message
    const cleanPhone = active.phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text.trim())}`, "_blank");
    toast.success("Sent via WhatsApp");
    setText("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg flex items-center gap-3">
        <MessageCircle className="size-8"/>
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Chat</h2>
          <p className="opacity-90 text-sm">Click a contact — type — send. Message opens in WhatsApp with your text pre-filled.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 bg-card border rounded-2xl overflow-hidden min-h-[70vh] lg:h-[70vh]">
        {/* Contacts */}
        <div className="border-b lg:border-r lg:border-b-0 flex flex-col min-h-0">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/>
              <Input className="pl-9 bg-background" placeholder="Search chats" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lists</SelectItem>{lists.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[40vh] lg:max-h-none">
            {filtered.map(c => (
              <button key={c.phone} onClick={()=>{ setActive(c); if (window.matchMedia("(max-width: 1023px)").matches) setMobileChatOpen(true); }}
                className={`w-full text-left flex items-center gap-3 p-3 border-b hover:bg-muted/50 ${active?.phone===c.phone ? "bg-blue-50" : ""}`}>
                <div className="size-10 rounded-full bg-blue-500 text-white grid place-items-center font-bold">{c.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.last || c.phone}</div>
                </div>
              </button>
            ))}
            {filtered.length===0 && <div className="p-6 text-center text-sm text-muted-foreground">No contacts</div>}
          </div>
        </div>

        {/* Thread */}
        <div className="hidden lg:flex flex-col min-h-[40vh] lg:min-h-0" style={{
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><text x='0' y='40' font-size='30' opacity='0.05'>💬</text></svg>\")",
          backgroundColor: "#f0f2f5",
        }}>
          {active ? (
            <>
              <div className="bg-blue-600 text-white p-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-white/25 grid place-items-center font-bold">{active.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{active.name}</div>
                  <div className="text-xs opacity-90 flex items-center gap-1"><Phone className="size-3"/> {active.phone}</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hi 👋</div>}
                {thread.map(m => (
                  <div key={m.id} className={`flex ${m.direction==="out" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow ${m.direction==="out" ? "bg-blue-500 text-white rounded-br-sm" : "bg-white rounded-bl-sm"}`}>
                      {m.text}
                      <div className={`text-[10px] mt-0.5 ${m.direction==="out" ? "text-white/70" : "text-muted-foreground"}`}>
                        {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t bg-card space-y-2">
                {templates.length > 0 && <Select onValueChange={applyTemplate}><SelectTrigger className="bg-background text-xs"><SelectValue placeholder="Choose message template" /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t._id || t.id} value={t._id || t.id || t.name}>{t.name}{t.attachmentName ? " + file" : ""}</SelectItem>)}</SelectContent></Select>}
                <div className="flex gap-2">
                  <Input placeholder="Type a message" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} className="bg-background"/>
                  <Button onClick={send} className="bg-blue-600 hover:bg-blue-700 gap-1"><Send className="size-4"/> Send</Button>
                </div>
                {selectedAttachment?.attachmentUrl && <a href={resolveFileUrl(selectedAttachment.attachmentUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-xs text-blue-700 hover:underline"><span>Attachment:</span> {selectedAttachment.attachmentName || "Open file"}</a>}
                {selectedTemplate?.desc && <div className="text-xs text-muted-foreground">{selectedTemplate.desc}</div>}
                {selectedAttachment?.attachmentUrl && selectedAttachment.attachmentType?.startsWith("image/") && <img src={resolveFileUrl(selectedAttachment.attachmentUrl)} alt={selectedAttachment.attachmentName || "Template attachment"} className="max-h-32 max-w-full rounded-lg object-contain" />}
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="size-16 mx-auto mb-3 opacity-30"/>
                <div className="font-semibold">Select a contact to start</div>
                <div className="text-sm">Or click WA on any lead in the CRM.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={mobileChatOpen && !!active} onOpenChange={setMobileChatOpen}>
        <DialogContent className="lg:hidden max-w-[calc(100%-1rem)] p-0 overflow-hidden">
          <DialogHeader className="bg-blue-600 text-white p-4">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5" /> {active?.name}
              <span className="text-xs font-normal opacity-90">{active?.phone}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col bg-[#f0f2f5]">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[35vh]">
              {thread.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No messages yet.</div>}
              {thread.map(m => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${m.direction === "out" ? "bg-blue-500 text-white rounded-br-sm" : "bg-white rounded-bl-sm"}`}>
                    {m.text}
                    <div className={`text-[10px] mt-0.5 ${m.direction === "out" ? "text-white/70" : "text-muted-foreground"}`}>{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t bg-card space-y-2">
              {templates.length > 0 && <Select onValueChange={applyTemplate}><SelectTrigger className="bg-background text-xs"><SelectValue placeholder="Choose message template" /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t._id || t.id} value={t._id || t.id || t.name}>{t.name}{t.attachmentName ? " + file" : ""}</SelectItem>)}</SelectContent></Select>}
              <div className="flex gap-2"><Input placeholder="Type a message" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="bg-background min-w-0" /><Button onClick={send} className="bg-blue-600 hover:bg-blue-700 gap-1 shrink-0"><Send className="size-4" /><span className="hidden sm:inline">Send</span></Button></div>
              {selectedAttachment?.attachmentUrl && <a href={resolveFileUrl(selectedAttachment.attachmentUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-xs text-blue-700 hover:underline"><span>Attachment:</span> {selectedAttachment.attachmentName || "Open file"}</a>}
              {selectedTemplate?.desc && <div className="text-xs text-muted-foreground">{selectedTemplate.desc}</div>}
              {selectedAttachment?.attachmentUrl && selectedAttachment.attachmentType?.startsWith("image/") && <img src={resolveFileUrl(selectedAttachment.attachmentUrl)} alt={selectedAttachment.attachmentName || "Template attachment"} className="max-h-32 max-w-full rounded-lg object-contain" />}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WhatsappPage;
