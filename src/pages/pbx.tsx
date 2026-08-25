import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Headphones } from "lucide-react";

function PBXPage() {
  const [settings, setSettings] = useState<any>({ active: false, provider: "Browser SIP", sipDomain: "", extensions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.getPbxSettings().then((data) => setSettings(data || settings)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const save = async (patch: any) => {
    setSaving(true);
    try {
      const next = { ...settings, ...patch, extensions: (settings.extensions || []).map((extension: any) => ({ ...extension, agent: typeof extension.agent === "object" ? extension.agent?._id || extension.agent?.id : extension.agent })) };
      setSettings(await api.updatePbxSettings(next));
    }
    finally { setSaving(false); }
  };
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <Headphones className="size-8"/>
          <h2 className="text-2xl font-bold">Web Dail PBX <span className="text-xs bg-white/20 px-2 py-1 rounded ml-2">BETA</span></h2>
        </div>
        <p className="opacity-90">Cloud-based phone system with extensions, IVR, call routing, and recording — all in the browser.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void save({ active: !settings.active })} disabled={saving}>{settings.active ? "Deactivate PBX" : "Activate PBX"}</Button>
          <Button variant="ghost" className="w-full text-white border border-white/30 hover:bg-white/10 sm:w-auto">Learn more</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          {icon:PhoneIncoming,label:"Inbound today",value:"-",color:"text-success"},
          {icon:PhoneOutgoing,label:"Outbound today",value:"-",color:"text-primary"},
          {icon:PhoneMissed,label:"Missed",value:"-",color:"text-destructive"},
          {icon:Phone,label:"Extensions",value:settings.extensions?.length || 0,color:"text-amber-500"},
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-5">
            <s.icon className={`size-5 mb-2 ${s.color}`}/>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>PBX provider</Label><Input value={settings.provider || ""} onChange={(event) => setSettings({ ...settings, provider: event.target.value })} /></div>
          <div><Label>SIP domain</Label><Input value={settings.sipDomain || ""} onChange={(event) => setSettings({ ...settings, sipDomain: event.target.value })} placeholder="sip.example.com" /></div>
        </div>
        <Button onClick={() => void save({ provider: settings.provider, sipDomain: settings.sipDomain })} disabled={saving}>{loading ? "Loading..." : saving ? "Saving..." : "Save PBX settings"}</Button>
        <h3 className="font-semibold mb-3">Extensions</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr><th className="p-2">Ext</th><th className="p-2">Agent</th><th className="p-2">Status</th><th className="p-2">Today's calls</th></tr>
          </thead>
          <tbody>
            {(settings.extensions || []).map((e: any) => (
              <tr key={e.ext} className="border-b">
                <td className="p-2 font-mono">{e.ext}</td>
                <td className="p-2">{e.agent}</td>
                <td className="p-2"><span className={`text-xs px-2 py-1 rounded ${e.status==="online"?"bg-success/20 text-success":e.status==="on call"?"bg-amber-100 text-amber-700":"bg-muted text-muted-foreground"}`}>{e.status}</span></td>
                <td className="p-2">{e.calls}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PBXPage;
