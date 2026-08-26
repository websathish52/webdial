import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Download, Mic, Search as SearchIcon } from "lucide-react";
import api, { resolveFileUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type RecordingItem = { _id?: string; id?: string; leadName?: string; phone?: string; agent?: any; duration?: number; date?: string; url?: string };

function RecordingPage() {
  const [recs, setRecs] = useState<RecordingItem[]>([]);
  const [playing, setPlaying] = useState<RecordingItem | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isPhone, setIsPhone] = useState(false);

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
  useEffect(() => {
    const updateViewport = () => setIsPhone(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const filteredRecs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recs;
    return recs.filter((record) => {
      const agent = typeof record.agent === "string" ? record.agent : record.agent?.name || "";
      return [record.leadName, record.phone, agent, record.date].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [recs, search]);
  const rowsPerPage = isPhone ? 5 : 10;
  const totalPages = Math.max(1, Math.ceil(filteredRecs.length / rowsPerPage));
  const paginatedRecs = filteredRecs.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  useEffect(() => setPage(1), [search, rowsPerPage]);
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">Recordings <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">BETA</span></h2>
      </div>
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input className="pl-9 bg-card" placeholder="Search lead, phone, agent or date" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted-foreground bg-muted/50">
            <tr><th className="p-3">Lead</th><th className="p-3">Phone</th><th className="p-3">Agent</th><th className="p-3">Duration</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {paginatedRecs.map(r => (
              <tr key={r._id || r.id} className="border-t hover:bg-accent/30">
                <td className="p-3 font-medium">{r.leadName || "—"}</td>
                <td className="p-3">{r.phone || "—"}</td>
                <td className="p-3">{typeof r.agent === "string" ? r.agent : r.agent?.name || "—"}</td>
                <td className="p-3">{r.duration || 0}s</td>
                <td className="p-3">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => r.url ? setPlaying(r) : toast.info("No recording URL available") }><Play className="size-3"/>Play</Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => r.url ? window.open(resolveFileUrl(r.url), "_blank") : toast.info("No recording URL available") }><Download className="size-3"/>Download</Button>
                </td>
              </tr>
            ))}
            {filteredRecs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Mic className="size-8 mx-auto mb-2 opacity-50"/>{recs.length ? "No recordings match your search" : "No recordings yet"}</td></tr>}
          </tbody>
          </table>
        </div>
        {filteredRecs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
            <span className="text-muted-foreground">{(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredRecs.length)} of {filteredRecs.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</Button>
              <span className="min-w-14 text-center text-xs text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>
      <Dialog open={!!playing} onOpenChange={(open) => !open && setPlaying(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{playing?.leadName || "Call recording"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{playing?.phone || ""} · {playing?.duration || 0}s</div>
            {playing?.url && <audio controls autoPlay className="w-full" src={resolveFileUrl(playing.url)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RecordingPage;
