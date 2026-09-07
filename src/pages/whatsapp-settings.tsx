import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, Coins, Facebook, KeyRound, MessageCircleMore, Save, ShieldCheck, UserRound } from "lucide-react";

type Integration = { provider: string; name: string; description: string; connected: boolean; config?: Record<string, string> };
type AutomationSettings = { enabled: boolean; autoReply: boolean; welcomeFlow: boolean; missedCallTrigger: boolean };
type Subscription = { plan?: string; type?: string; status?: string; numberOfUsers?: number; expiryDate?: string } | null;

const defaults: AutomationSettings = { enabled: false, autoReply: false, welcomeFlow: false, missedCallTrigger: false };

export default function WhatsappSettingsPage() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [automation, setAutomation] = useState(defaults);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [account, setAccount] = useState({ businessName: "", phoneNumber: "", businessId: "" });
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [whatsappResponse, subscriptionResponse] = await Promise.all([
          api.getWhatsappSettings(), api.getCurrentSubscription().catch(() => null),
        ]);
        const facebook = whatsappResponse?.integration || null;
        setIntegration(facebook);
        setAutomation({ ...defaults, ...(whatsappResponse?.automation || {}) });
        setSubscription(subscriptionResponse);
        const config = whatsappResponse?.account || {};
        setAccount({ businessName: config.businessName || "", phoneNumber: config.phoneNumber || "", businessId: config.businessId || "" });
      } catch (error: any) { toast.error(error?.message || "Could not load WhatsApp settings"); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const saveAccount = async () => {
    try {
      setSavingAccount(true);
      const saved = await api.updateWhatsappSettings({ account, automation });
      toast.success("WhatsApp account settings saved");
    } catch (error: any) { toast.error(error?.message || "Could not save account settings"); }
    finally { setSavingAccount(false); }
  };

  const updatePermission = async (field: keyof AutomationSettings, checked: boolean) => {
    const previous = automation;
    const next = { ...automation, [field]: checked };
    setAutomation(next);
    try {
      setSavingPermissions(true);
      const saved = await api.updateWhatsappSettings({ account, automation: next });
      setAutomation({ ...defaults, ...(saved?.automation || next) });
      toast.success("WhatsApp permission updated");
    } catch (error: any) { setAutomation(previous); toast.error(error?.message || "Could not update WhatsApp permission"); }
    finally { setSavingPermissions(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading WhatsApp settings...</div>;
  const plan = subscription?.type === "FREE_TRIAL" ? "Trial plan" : subscription?.plan || "No active plan";

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg">
          <div className="absolute -right-16 -top-20 size-64 rounded-full border-[28px] border-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-blue-100">WhatsApp</p><h1 className="text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-blue-100">Configure your WhatsApp business account and preferences.</p></div><Badge className="gap-1.5 border-0 bg-white/15 text-white hover:bg-white/15"><MessageCircleMore className="size-3.5" /> WhatsApp</Badge></div>
          <div className="relative mt-6 flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><UserRound className="size-4" /> Account setup</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><Coins className="size-4" /> Credits</span><span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2"><ShieldCheck className="size-4" /> Permissions</span></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Facebook className="size-5 text-blue-600" /> Account setup</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><div><p className="font-medium text-slate-900">Facebook Business integration</p><p className="text-sm text-slate-500">{integration?.connected ? "Connected and ready to use" : "Configure connection in Integrations"}</p></div><Badge className={integration?.connected ? "bg-emerald-600" : ""} variant={integration?.connected ? "default" : "outline"}>{integration?.connected ? "Connected" : "Not connected"}</Badge></div><div><Label htmlFor="business-name">Business name</Label><Input id="business-name" value={account.businessName} onChange={(event) => setAccount({ ...account, businessName: event.target.value })} placeholder="Your WhatsApp business name" /></div><div><Label htmlFor="phone-number">WhatsApp phone number</Label><Input id="phone-number" value={account.phoneNumber} onChange={(event) => setAccount({ ...account, phoneNumber: event.target.value })} placeholder="+91 98765 43210" /></div><div><Label htmlFor="business-id">Business account ID</Label><Input id="business-id" value={account.businessId} onChange={(event) => setAccount({ ...account, businessId: event.target.value })} placeholder="Enter business account ID" /></div><Button onClick={() => void saveAccount()} disabled={savingAccount} className="gap-2 bg-blue-600 hover:bg-blue-700"><Save className="size-4" />{savingAccount ? "Saving..." : "Save account"}</Button></CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Coins className="size-5 text-blue-600" /> Credits</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-sm text-blue-700">Current plan</p><p className="mt-1 text-2xl font-bold text-slate-900">{plan}</p><p className="mt-1 text-sm text-slate-500">{subscription?.status ? `Status: ${subscription.status}` : "Choose a subscription to enable paid messaging."}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Team seats</p><p className="mt-1 text-xl font-semibold text-slate-900">{subscription?.numberOfUsers || 0}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Expires</p><p className="mt-1 text-sm font-semibold text-slate-900">{subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : "-"}</p></div></div><Button variant="outline" onClick={() => window.location.assign("/payment")} className="w-full">Manage subscription</Button></CardContent></Card>
        </div>

        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-blue-600" /> Permissions and preferences</CardTitle></CardHeader><CardContent className="space-y-1">{[{ field: "enabled", title: "Enable WhatsApp features", description: "Allow this company to use WhatsApp automation and broadcasts." }, { field: "autoReply", title: "Auto-reply", description: "Permit automatic responses for incoming conversations." }, { field: "welcomeFlow", title: "Welcome messages", description: "Allow the welcome flow to send configured templates." }, { field: "missedCallTrigger", title: "Missed call follow-up", description: "Allow automated follow-up after unanswered calls." }].map((item) => <div key={item.field} className="flex items-center justify-between gap-4 rounded-lg px-3 py-4 hover:bg-slate-50"><div><p className="font-medium text-slate-900">{item.title}</p><p className="text-sm text-slate-500">{item.description}</p></div><Switch checked={automation[item.field as keyof AutomationSettings]} disabled={savingPermissions} onCheckedChange={(checked) => void updatePermission(item.field as keyof AutomationSettings, checked)} /></div>)}</CardContent></Card>
        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-5 text-blue-600" /> Integration status</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium text-slate-900">{integration?.name || "Facebook Business"}</p><p className="text-sm text-slate-500">{integration?.description || "Connect your business account through Integrations."}</p></div><Button variant="outline" onClick={() => window.location.assign("/integration")} className="gap-2"><CheckCircle2 className="size-4" /> Manage integrations</Button></CardContent></Card>
      </div>
    </div>
  );
}
