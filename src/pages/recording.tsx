import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Download, Mic } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

type RecordingItem = { _id?: string; id?: string; leadName?: string; phone?: string; agent?: any; duration?: number; date?: string; url?: string };

function RecordingPage() {
  const [recs, setRecs] = useState<RecordingItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.getRecordings({ limit: 100 });
        setRecs(Array.isArray(res?.recordings) ? res.recordings : []);
      } catch (err: any) {
        toast.error(err?.message || "Could not load recordings");
      }
    };
    void loadData();
  }, []);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">Recordings <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">BETA</span></h2>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground bg-muted/50">
            <tr><th className="p-3">Lead</th><th className="p-3">Phone</th><th className="p-3">Agent</th><th className="p-3">Duration</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {recs.map(r => (
              <tr key={r._id || r.id} className="border-t hover:bg-accent/30">
                <td className="p-3 font-medium">{r.leadName || "—"}</td>
                <td className="p-3">{r.phone || "—"}</td>
                <td className="p-3">{typeof r.agent === "string" ? r.agent : r.agent?.name || "—"}</td>
                <td className="p-3">{r.duration || 0}s</td>
                <td className="p-3">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => r.url ? window.open(r.url, "_blank") : toast.info("No recording URL available") }><Play className="size-3"/>Play</Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => r.url ? window.open(r.url, "_blank") : toast.info("No recording URL available") }><Download className="size-3"/>Download</Button>
                </td>
              </tr>
            ))}
            {recs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Mic className="size-8 mx-auto mb-2 opacity-50"/>No recordings yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecordingPage;
