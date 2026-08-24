import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type IntegrationItem = { id: string; name: string; description: string; connected: boolean; icon: string };

function IntegrationPage() {
  const [items, setItems] = useState<IntegrationItem[]>([
    { id: "google-sheets", name: "Google Sheets", description: "Sync leads from Google Sheets", connected: false, icon: "📊" },
    { id: "zapier", name: "Zapier", description: "Connect 5000+ apps", connected: false, icon: "⚡" },
    { id: "facebook", name: "Facebook Lead Ads", description: "Import leads from FB ads", connected: false, icon: "📘" },
    { id: "whatsapp", name: "WhatsApp Business API", description: "Send template messages", connected: false, icon: "💬" },
    { id: "webhook", name: "Webhook", description: "Custom HTTP webhooks", connected: false, icon: "🔗" },
  ]);

  useEffect(() => {
    const stored = localStorage.getItem("ifox_integrations");
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch {}
    }
  }, []);

  const toggleItem = (id: string) => {
    const next = items.map(item => item.id === id ? { ...item, connected: !item.connected } : item);
    setItems(next);
    localStorage.setItem("ifox_integrations", JSON.stringify(next));
    toast.success(next.find(item => item.id === id)?.connected ? "Connected" : "Disconnected");
  };
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Integrations</h2>
      <p className="text-muted-foreground">Connect Web Dail to your favorite tools.</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(i => (
          <div key={i.id} className="bg-card rounded-xl border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">{i.icon}</div>
              {i.connected && <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">Connected</span>}
            </div>
            <h3 className="font-semibold">{i.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{i.description}</p>
            <Button
              variant={i.connected ? "outline" : "default"}
              className={i.connected ? "" : "bg-primary"}
              onClick={() => toggleItem(i.id)}
            >
              {i.connected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IntegrationPage;
