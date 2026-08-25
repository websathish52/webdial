import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";

type IntegrationItem = { id: string; name: string; description: string; connected: boolean; icon: string; logoUrl?: string };

function IntegrationPage() {
  const [items, setItems] = useState<IntegrationItem[]>([]);
  const [selected, setSelected] = useState<IntegrationItem | null>(null);
  const [configValue, setConfigValue] = useState("");
  const [loading, setLoading] = useState(true);
  const logos: Record<string, string> = {
    "facebook-lead-ads": "https://cdn.simpleicons.org/facebook/1877F2", indiamart: "https://cdn.simpleicons.org/indiamart/00AEEF", "indiamart-v2": "https://cdn.simpleicons.org/indiamart/00AEEF", justdial: "https://cdn.simpleicons.org/justdial/EF3D42", "justdial-v2": "https://cdn.simpleicons.org/justdial/EF3D42", tradeindia: "https://cdn.simpleicons.org/tradeindia/F58220", pabbly: "https://cdn.simpleicons.org/pabbly/FF6B35", quikr: "https://cdn.simpleicons.org/quikr/2F80ED", "99acres": "https://cdn.simpleicons.org/99acres/E63946", magicbricks: "https://cdn.simpleicons.org/magicbricks/EC1C24", hubspot: "https://cdn.simpleicons.org/hubspot/FF7A59", housing: "https://cdn.simpleicons.org/housing/EC5A29", shopify: "https://cdn.simpleicons.org/shopify/95BF47", woocommerce: "https://cdn.simpleicons.org/woocommerce/96588A", "google-sheet-sync": "https://cdn.simpleicons.org/googlesheets/34A853", "google-sheet-import": "https://cdn.simpleicons.org/googlesheets/34A853", "external-api": "https://cdn.simpleicons.org/fastapi/009688", webhook: "https://cdn.simpleicons.org/webhooks/4353FF", integrately: "https://cdn.simpleicons.org/integrately/FF6B35", zoho: "https://cdn.simpleicons.org/zoho/E42527", "web-forms": "https://cdn.simpleicons.org/googleforms/7248B9",
  };

  useEffect(() => {
    api.getIntegrations().then((data: any[]) => setItems((Array.isArray(data) ? data : []).map((item) => ({ ...item, id: item.provider, icon: item.name?.charAt(0) || "•", logoUrl: logos[item.provider] })))).catch((err: any) => toast.error(err?.message || "Could not load integrations")).finally(() => setLoading(false));
  }, []);

  const toggleItem = (item: IntegrationItem) => {
    setSelected(item);
    setConfigValue("");
  };

  const saveConnection = async () => {
    if (!selected) return;
    try {
      const next = await api.updateIntegration(selected.id, { provider: selected.id, name: selected.name, description: selected.description, connected: !selected.connected, config: { credential: configValue.trim() } });
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, connected: next.connected } : item));
      setSelected(null);
      toast.success(next.connected ? "Integration connected" : "Integration disconnected");
    } catch (err: any) { toast.error(err?.message || "Could not update integration"); }
  };
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-2xl font-bold">Integrations</h2>
      <p className="text-muted-foreground">Company integrations and connection settings.</p>
      {loading && <div className="text-sm text-muted-foreground">Loading integrations...</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(i => (
          <div key={i.id} className="bg-card rounded-xl border p-5 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center text-xl font-bold">{i.logoUrl ? <img src={i.logoUrl} alt={`${i.name} logo`} className="size-7 object-contain" /> : i.icon}</div>
              {i.connected && <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">Connected</span>}
            </div>
            <h3 className="font-semibold">{i.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{i.description}</p>
            <Button
              variant={i.connected ? "outline" : "default"}
              className={i.connected ? "" : "bg-primary"}
              onClick={() => toggleItem(i)}
            >
              {i.connected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.connected ? "Disconnect" : "Connect"} {selected?.name}</DialogTitle></DialogHeader>
          {!selected?.connected && <div><Label>API key, token, webhook URL, or account ID</Label><Input value={configValue} onChange={(event) => setConfigValue(event.target.value)} placeholder="Enter provider credentials" /></div>}
          <p className="text-xs text-muted-foreground">Provider-specific live sync requires valid credentials and webhook/OAuth configuration.</p>
          <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button onClick={() => void saveConnection()}>{selected?.connected ? "Disconnect" : "Save and Connect"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IntegrationPage;
