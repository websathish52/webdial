import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Play, Pause, CheckCircle2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type Campaign = { _id?: string; id?: string; name: string; script: string; status: "active" | "paused" | "completed"; leadsCount?: number; createdAt?: string };

function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [script, setScript] = useState("");

  const loadCampaigns = async () => {
    try {
      const res = await api.getCampaigns();
      setCampaigns(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error(err?.message || "Could not load campaigns");
    }
  };

  useEffect(() => { void loadCampaigns(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Marketing Campaigns</h2>
        <Button className="bg-primary gap-2" onClick={()=>setOpen(true)}><Plus className="size-4"/>New Campaign</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(c => (
          <div key={c.id} className="bg-card rounded-xl border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Megaphone className="size-5"/></div>
              <span className={`text-xs px-2 py-1 rounded capitalize ${c.status==="active"?"bg-success/20 text-success":c.status==="paused"?"bg-warning/20 text-warning-foreground":"bg-muted text-muted-foreground"}`}>{c.status}</span>
            </div>
            <h3 className="font-semibold mb-1">{c.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.script}</p>
            <div className="text-xs text-muted-foreground mb-3">{c.leadsCount ?? 0} leads · created {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</div>
            <div className="flex gap-2">
              {c.status === "active" ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={async()=>{ try { await api.updateCampaign(c._id || c.id || "", { status: "paused" }); await loadCampaigns(); } catch (err: any) { toast.error(err?.message || "Could not update campaign"); } }}><Pause className="size-3"/>Pause</Button>
              ) : c.status === "paused" ? (
                <Button size="sm" className="bg-primary gap-1" onClick={async()=>{ try { await api.updateCampaign(c._id || c.id || "", { status: "active" }); await loadCampaigns(); } catch (err: any) { toast.error(err?.message || "Could not update campaign"); } }}><Play className="size-3"/>Resume</Button>
              ) : null}
              {c.status !== "completed" && <Button size="sm" variant="outline" className="gap-1" onClick={async()=>{ try { await api.updateCampaign(c._id || c.id || "", { status: "completed" }); await loadCampaigns(); } catch (err: any) { toast.error(err?.message || "Could not update campaign"); } }}><CheckCircle2 className="size-3"/>Complete</Button>}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)}/></div>
            <div><Label>Script</Label><Textarea value={script} onChange={e=>setScript(e.target.value)}/></div>
          </div>
          <DialogFooter><Button onClick={async()=>{ if(!name || !script) return toast.error("Name and script are required"); try { await api.createCampaign({ name, script, status: "active" }); toast.success("Campaign created"); setOpen(false); setName(""); setScript(""); await loadCampaigns(); } catch (err: any) { toast.error(err?.message || "Campaign could not be created"); } }} className="bg-primary">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MarketingPage;
