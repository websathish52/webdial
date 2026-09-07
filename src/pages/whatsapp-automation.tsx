import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { toast } from "sonner";
import { BarChart3, Bot, CheckCircle2, Clock, Facebook, Megaphone, MessageCircleMore, MessageSquare, Plus, Users, Workflow, Zap } from "lucide-react";

type AutomationSettings = { enabled: boolean; autoReply: boolean; welcomeFlow: boolean; missedCallTrigger: boolean };
type Integration = { provider: string; name: string; description: string; connected: boolean; config?: Record<string, unknown> };
type Template = { _id?: string; id?: string; name: string; body: string };
type Feature = { icon: typeof Bot; title: string; description: string };

const defaultSettings: AutomationSettings = { enabled: false, autoReply: false, welcomeFlow: false, missedCallTrigger: false };
const features: Feature[] = [
  { icon: Megaphone, title: "Broadcast messages", description: "Send campaigns to segmented contacts." },
  { icon: Users, title: "Contact segmentation", description: "Target leads by activity or list." },
  { icon: Clock, title: "Scheduled messages", description: "Queue follow-ups for later." },
  { icon: BarChart3, title: "Automation analytics", description: "Monitor rule performance." },
];

export default function WhatsappAutomationPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          api.getWhatsappAutomation(), api.getIntegrations(), api.getMessageTemplates(),
        ]);
        const [automationResult, integrationsResult, templatesResult] = results;
        if (automationResult.status === "fulfilled") setSettings({ ...defaultSettings, ...(automationResult.value || {}) });
        if (integrationsResult.status === "fulfilled") {
          const integrations = integrationsResult.value;
          setIntegration((Array.isArray(integrations) ? integrations : []).find((item: Integration) => item.provider === "facebook-lead-ads") || null);
        }
        if (templatesResult.status === "fulfilled") setTemplates(Array.isArray(templatesResult.value) ? templatesResult.value : []);
        const failedRequest = results.find((result) => result.status === "rejected");
        if (failedRequest?.status === "rejected") toast.error(failedRequest.reason?.message || "Some WhatsApp automation data could not be loaded");
      } catch (error: any) {
        toast.error(error?.message || "Could not load WhatsApp automation settings");
      } finally { setLoading(false); }
    };
    void load();
  }, []);

  const updateSettings = async (patch: Partial<AutomationSettings>) => {
    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      setSaving(true);
      const saved = await api.updateWhatsappAutomation(next);
      setSettings({ ...defaultSettings, ...saved });
      toast.success("Automation settings saved");
    } catch (error: any) {
      setSettings(previous);
      toast.error(error?.message || "Could not save automation settings");
    } finally { setSaving(false); }
  };

  const connectFacebook = async () => {
    if (!integration) return;
    try {
      setSaving(true);
      const saved = await api.updateIntegration(integration.provider, { ...integration, connected: !integration.connected });
      setIntegration(saved);
      toast.success(saved.connected ? "Facebook Business marked as connected" : "Facebook Business disconnected");
    } catch (error: any) { toast.error(error?.message || "Could not update Facebook integration"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading WhatsApp automation...</div>;

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        
        <div className="relative overflow-hidden rounded-xl   p-6 text-white shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg flex items-center gap-3">
            
          <div className="absolute -right-16 -top-20 " />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-xl bg-white/15"><Bot className="size-7" /></div><div><p className="text-sm font-medium text-blue-100">WhatsApp workspace</p><h1 className="text-2xl font-bold">Automation</h1><p className="mt-1 text-sm text-blue-100">Control replies and lead follow-ups from one place.</p></div></div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Bot className="size-4" /> Auto-reply</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Zap className="size-4" /> Trigger rules</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><MessageSquare className="size-4" /> Templates</span></div>
        </div>

        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Facebook className="size-5 text-blue-600" /> Facebook Business connection</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium text-slate-900">{integration?.connected ? "Connected" : "Not connected"}</p><p className="text-sm text-slate-500">{integration?.description || "Connect Facebook Lead Form Ads to import leads."}</p></div><Button onClick={() => void connectFacebook()} disabled={saving || !integration} variant={integration?.connected ? "outline" : "default"} className={!integration?.connected ? "gap-2 bg-blue-600 hover:bg-blue-700" : "gap-2"}>{integration?.connected && <CheckCircle2 className="size-4 text-emerald-600" />}{integration?.connected ? "Disconnect" : "Connect Facebook Business"}</Button></CardContent></Card>

        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Workflow className="size-5 text-blue-600" /> Automation controls</CardTitle></CardHeader><CardContent className="space-y-1">{[
          { key: "enabled", title: "Enable WhatsApp automation", description: "Turn automated WhatsApp actions on or off for this company." },
          { key: "autoReply", title: "Auto-reply", description: "Enable automatic replies for incoming WhatsApp conversations." },
          { key: "welcomeFlow", title: "Welcome flow", description: "Send a welcome template when a lead is created." },
          { key: "missedCallTrigger", title: "Missed call trigger", description: "Send a follow-up when a call is missed or unanswered." },
        ].map((item) => <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg px-3 py-4 hover:bg-slate-50"><div><p className="font-medium text-slate-900">{item.title}</p><p className="text-sm text-slate-500">{item.description}</p></div><Switch checked={settings[item.key as keyof AutomationSettings]} disabled={saving} onCheckedChange={(checked) => void updateSettings({ [item.key]: checked })} /></div>)}</CardContent></Card>

        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center justify-between text-base"><span className="flex items-center gap-2"><MessageSquare className="size-5 text-blue-600" /> Available message templates</span><Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.location.assign("/whatsapp-templates")}><Plus className="size-4" /> Manage templates</Button></CardTitle></CardHeader><CardContent>{templates.length ? <div className="grid gap-3 md:grid-cols-3">{templates.slice(0, 6).map((template) => <div key={template._id || template.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-medium text-slate-900">{template.name}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{template.body}</p></div>)}</div> : <p className="py-5 text-sm text-slate-500">No message templates found. Create one to use with automation.</p>}</CardContent></Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, description }) => <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Icon className="size-5 text-blue-600" /><p className="mt-3 font-medium text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{description}</p></div>)}</div>
      </div>
    </div>
  );
}
