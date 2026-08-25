import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
function useAppSearch(): any { const [sp] = useSearchParams(); return Object.fromEntries(sp.entries()); }
import { useState, useEffect, useRef } from "react";
import { useCurrentMember, DISPOSITIONS, dispoMeta, type Disposition } from "@/lib/mock-store";
import api from "@/lib/api";
import { useDispositionColors } from "@/lib/use-disposition-colors";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Play, Pause, SkipForward, PhoneOff, ArrowLeft, Settings2, Mic, MicOff, MessageCircle, Kanban } from "lucide-react";
import { toast } from "sonner";


type LeadRecord = { _id?: string; id?: string; name: string; phone: string; email?: string; disposition: Disposition; list: string; totalDuration: number; createdAt?: string };
type ListItem = { _id?: string; id?: string; name: string; assignedTo?: Array<{ _id?: string; id?: string; name?: string } | string> };
type CallLogRecord = { _id?: string; id?: string; leadId?: string | { _id?: string; id?: string }; phone: string; name: string; agent?: string | { _id?: string; id?: string; name?: string }; duration: number; disposition: Disposition; notes?: string; calledAt: string; recordingUrl?: string };
type MemberRecord = { _id?: string; id?: string; name: string; role?: string; email?: string; username?: string; lists?: string[] };

function getAgentKey(agent: CallLogRecord['agent']) {
  if (!agent) return '';
  if (typeof agent === 'string') return agent;
  return agent._id || agent.id || agent.name || '';
}

function sameAgent(agent: CallLogRecord['agent'], user: MemberRecord) {
  const agentKey = getAgentKey(agent);
  const userKey = user._id || user.id || '';
  if (agentKey && userKey) return agentKey === userKey;
  return false;
}

function normalizeMemberKey(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return String((value as any)._id || (value as any).id || '');
  }
  return String(value);
}

function DialerPage() {
  useDispositionColors();
  const nav = useNavigate();
  const { list: listParam } = useAppSearch();
  const member = useCurrentMember();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [calls, setCalls] = useState<CallLogRecord[]>([]);

  const isAdmin = ["superadmin", "admin"].includes(String(member?.role || "").toLowerCase());
  const memberKey = normalizeMemberKey((member as any)?._id || member?.id || member?.username || member?.email || "");
  const availableLists = isAdmin
    ? lists.map((l: ListItem) => l.name)
    : lists
        .filter((l: ListItem) => {
          if (!memberKey) return false;
          if (!l.assignedTo?.length) return true;
          const assignedToMatch = l.assignedTo.some((assignee) => {
            const assigneeKey = normalizeMemberKey(assignee);
            return assigneeKey === memberKey || member?.lists?.includes(l.name);
          });
          return assignedToMatch || member?.lists?.includes(l.name);
        })
        .map((l: ListItem) => l.name);
  const [selectedList, setSelectedList] = useState(listParam || availableLists[0] || "");

  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [timer, setTimer] = useState(0);
  const [notes, setNotes] = useState("");
  const [gap, setGap] = useState(5);
  const [gapDraft, setGapDraft] = useState("5");
  const [gapCountdown, setGapCountdown] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [dispoOpen, setDispoOpen] = useState(false);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | undefined>();
  const timerRef = useRef<number | null>(null);
  const gapRef = useRef<number | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStopResolveRef = useRef<((url?: string) => void) | null>(null);

  const loadDialerSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (typeof settings?.recordCalls === "boolean") setRecording(settings.recordCalls);
      const savedGap = Number(settings?.dialGap);
      if (Number.isFinite(savedGap) && savedGap >= 0) {
        setGap(savedGap);
        setGapDraft(String(savedGap));
      }
    } catch (err) {
      console.warn("Could not load dialer settings:", err);
    }
  };

  const loadData = async () => {
    if (!member) return;
    try {
      const [leadsRes, listsRes, callsRes] = await Promise.all([
        api.getLeads({ limit: 50000 }),
        api.getLists(),
        // ⭐ FIX: scope: 'team' tells the backend to return company-wide calls
        // (all agents), not just the logged-in agent's own calls. Without this,
        // getCallLogs defaults to { agent: req.user._id } server-side, so the
        // queue/pending-count logic below never actually sees teammates' calls.
        api.getCallLogs({ limit: 50000, scope: 'team' }),
      ]);
      const nextLeads = Array.isArray(leadsRes?.leads) ? leadsRes.leads : [];
      const nextLists = Array.isArray(listsRes) ? listsRes : (listsRes?.lists || []);
      const nextCalls = Array.isArray(callsRes?.calls) ? callsRes.calls : [];
      const nextAvailableLists = isAdmin
        ? nextLists.map((l: ListItem) => l.name)
        : nextLists
            .filter((l: ListItem) => {
              if (!memberKey) return false;
              if (!l.assignedTo?.length) return true;
              return l.assignedTo.some((assignee) => {
                if (typeof assignee === "string") return assignee === memberKey;
                return assignee._id === memberKey || assignee.id === memberKey;
              });
            })
            .map((l: ListItem) => l.name);
      setLeads(nextLeads);
      setLists(nextLists);
      setCalls(nextCalls);
      setSelectedList((current: string) => {
        if (current && nextAvailableLists.includes(current)) return current;
        return listParam || nextAvailableLists[0] || "";
      });
    } catch (err) {
      console.error("Failed to load dialer data:", err);
      toast.error("Could not load dialer data");
    }
  };

  useEffect(() => setIdx(0), [selectedList]);

  useEffect(() => {
    if (member) {
      void loadData();
      void loadDialerSettings();
    }
    const handleCrmUpdated = () => { void loadData(); };
    window.addEventListener('ifox-crm-updated', handleCrmUpdated);
    return () => window.removeEventListener('ifox-crm-updated', handleCrmUpdated);
  }, [member, listParam]);

  useEffect(() => {
    if (inCall) {
      timerRef.current = window.setInterval(() => setTimer((t) => t + 1), 1000);
      return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }
  }, [inCall]);

  useEffect(() => {
    if (!inCall) return;
    const onFocus = () => {
      setTimeout(() => { if (inCall) endCallCapture(); }, 300);
    };
    const onVis = () => { if (document.visibilityState === "visible" && inCall) onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVis); };
  }, [inCall]);

  if (!member) return null;

  // Personal calls — used ONLY for this agent's own counters (My Dials, My Calls Today, Today Talk Time)
  const myCalls = calls.filter((c) => sameAgent(c.agent, member as MemberRecord));

  // TEAM-WIDE calls for this list — if ANY agent in the company already called a lead,
  // it must disappear from EVERYONE's queue and its feedback/disposition must show for everyone.
  const calledLeadIdsInList = new Set(
    calls
      .filter(c => leads.find(l => (l._id || l.id) === (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id))?.list === selectedList)
      .map(c => typeof c.leadId === 'string' ? c.leadId : c.leadId?._id)
      .filter(Boolean) as string[]
  );
  const calledPhonesInList = new Set(
    calls
      .filter(c => leads.find(l => (l._id || l.id) === (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id))?.list === selectedList)
      .map(c => String(c.phone || '').replace(/\D/g, ''))
      .filter(Boolean)
  );

  // Personal "done" set — kept only for the personal counters below (My Dials)
  const myCalledLeadIdsInList = new Set(
    myCalls.filter(c => leads.find(l => (l._id || l.id) === (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id))?.list === selectedList)
           .map(c => typeof c.leadId === 'string' ? c.leadId : c.leadId?._id)
           .filter(Boolean) as string[]
  );

  // Queue must exclude leads called by ANYONE on the team, not just "me"
  const queue: LeadRecord[] = [];
  const queuedPhones = new Set<string>();
  for (const lead of leads) {
    const phone = String(lead.phone || '').replace(/\D/g, '');
    if (lead.list !== selectedList || calledLeadIdsInList.has(lead._id || lead.id || "") || calledPhonesInList.has(phone) || queuedPhones.has(phone)) continue;
    queuedPhones.add(phone);
    queue.push(lead);
  }
  const myDoneCount = myCalledLeadIdsInList.size; // personal stat — "My Dials"
  const current = queue[idx];

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const myTodayCalls = myCalls.filter(c => new Date(c.calledAt) >= today);
  const todayDuration = myTodayCalls.reduce((s, c) => s + c.duration, 0);

  const startRecording = async () => {
    if (!recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, `call-${Date.now()}.webm`);
        formData.append("purpose", "call-recording");
        try {
          const uploaded = await api.uploadFile(formData);
          const url = uploaded?.file?.url || uploaded?.file?.path || undefined;
          setRecordingUrl(url);
          recordingStopResolveRef.current?.(url);
        } catch {
          const url = URL.createObjectURL(blob);
          setRecordingUrl(url);
          recordingStopResolveRef.current?.(url);
        }
        recordingStopResolveRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;
    } catch {
      /* mic denied */
    }
  };
  const stopRecording = () => {
    if (!mediaRecRef.current || mediaRecRef.current.state !== "recording") return Promise.resolve(recordingUrl);
    return new Promise<string | undefined>((resolve) => {
      recordingStopResolveRef.current = resolve;
      try { mediaRecRef.current?.stop(); } catch { resolve(undefined); }
    });
  };

  const startCall = () => {
    if (!current) return toast.info("Queue complete!");
    const duplicateCount = leads.filter(lead => lead.list === selectedList && String(lead.phone || '').replace(/\D/g, '') === String(current.phone || '').replace(/\D/g, '')).length;
    if (duplicateCount > 1) {
      const dialAgain = window.confirm(`This number already exists in the list: ${current.phone}\n\nOK = dial again\nCancel = remove this duplicate`);
      if (!dialAgain) {
        void api.deleteLead(current._id || current.id || '').then(() => loadData()).catch((err: any) => toast.error(err?.message || "Could not remove duplicate number"));
        return;
      }
    }
    if (gapRef.current) { window.clearInterval(gapRef.current); gapRef.current = null; }
    setInCall(true); setTimer(0); setNotes(""); setRecordingUrl(undefined);
    void startRecording();
    window.location.href = `tel:${current.phone}`;
  };

  useEffect(() => {
    if (!autoAdvance || gapCountdown !== 0 || !running || inCall) return;
    setAutoAdvance(false);
    startCall();
  }, [autoAdvance, gapCountdown, running, inCall, current]);

  const endCallCapture = async () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    const savedRecordingUrl = await stopRecording();
    setInCall(false);
    setPendingDuration(timer);
    setRecordingUrl(savedRecordingUrl);
    setDispoOpen(true);
  };

  const logAndAdvance = async (dispo: Disposition) => {
    if (!current) return;
    try {
      await api.logCall({
        leadId: current._id || current.id || "",
        phone: current.phone,
        name: current.name,
        agent: member.name,
        duration: pendingDuration,
        disposition: dispo,
        notes,
        recordingUrl,
      });
      setDispoOpen(false); setTimer(0); setNotes(""); setRecordingUrl(undefined);
      toast.success(`Logged: ${dispoMeta(dispo).label}`);
      const refreshPromise = loadData();
      if (running) {
        await refreshPromise;
        setGapCountdown(gap);
        gapRef.current = window.setInterval(() => {
          setGapCountdown((c) => {
            if (c <= 1) {
              if (gapRef.current) window.clearInterval(gapRef.current);
              gapRef.current = null;
              // NOTE: after loadData(), `queue` is recomputed team-wide (called lead is now excluded),
              // so idx 0 already points at the next fresh lead — reset instead of incrementing.
              setIdx(0);
              setAutoAdvance(true);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err?.message || "Call could not be logged");
    }
  };

  const skip = () => setIdx((i) => Math.min(i + 1, Math.max(0, queue.length - 1)));
  const stop = () => {
    setRunning(false); setInCall(false); void stopRecording();
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (gapRef.current) window.clearInterval(gapRef.current);
    setGapCountdown(0);
    setAutoAdvance(false);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // TEAM-WIDE disposition feedback for this list — whoever called it, the lead's current
  // disposition should show the same for every agent looking at this list.
  const byDispo = (d: Disposition) => {
    return leads.filter(l =>
      l.list === selectedList && calledLeadIdsInList.has(l._id || l.id || "") && l.disposition === d
    ).length;
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => nav("/crm")}><ArrowLeft className="size-4" /></Button>
          <h1 className="text-xl sm:text-2xl font-bold">Auto Dialer</h1>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground shrink-0">List:</span>
          <Select value={selectedList} onValueChange={setSelectedList}>
            <SelectTrigger className="w-full sm:w-56 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{availableLists.map((l: string) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant={recording ? "default" : "outline"} size="sm" className={`gap-1 ${recording ? "bg-primary" : ""}`} onClick={() => {
            const nextRecording = !recording;
            setRecording(nextRecording);
            void api.updateSettings({ recordCalls: nextRecording }).catch((err: any) => {
              setRecording(recording);
              toast.error(err?.message || "Could not save recording preference");
            });
          }}>
            {recording ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
            <span className="hidden sm:inline">Rec {recording ? "ON" : "OFF"}</span>
          </Button>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden shadow-lg" style={{
        background: current
          ? "linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #60A5FA 100%)"
          : "linear-gradient(135deg, #d1d5db, #9ca3af)",
      }}>
        <div className="p-5 sm:p-8 min-h-[220px] text-white relative">
          <div className="absolute right-4 sm:right-6 top-4 sm:top-6 opacity-20 text-7xl sm:text-9xl font-black leading-none pointer-events-none">
            {current ? "☏" : ""}
          </div>
          {current ? (
            <>
              <div className="flex items-center gap-4">
                <div className="size-14 sm:size-16 rounded-full bg-white/25 grid place-items-center text-2xl sm:text-3xl font-bold shrink-0">
                  {current.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold truncate">{current.name}</div>
                  <div className="flex items-center gap-2 mt-1 opacity-90 text-sm sm:text-base"><Phone className="size-4" /> {current.phone}</div>
                  {current.email && <div className="text-xs sm:text-sm opacity-80 mt-1 truncate">{current.email}</div>}
                </div>
              </div>
              <div className="mt-6 sm:mt-0 sm:absolute sm:bottom-4 sm:left-6 text-sm">Queue #{idx + 1} / {queue.length}</div>
              <div className="mt-2 sm:mt-0 sm:absolute sm:bottom-4 sm:right-6 flex items-center gap-2 sm:gap-3 flex-wrap">
                {inCall && <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-mono">● {fmt(timer)}</span>}
                {gapCountdown > 0 && <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm">Next in {gapCountdown}s</span>}
                {recording && inCall && <span className="bg-red-500/80 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">REC</span>}
              </div>
            </>
          ) : (
            <div className="grid place-items-center h-full text-center py-10">
              <div>
                <div className="text-2xl font-bold">Queue Complete 🎉</div>
                <div className="opacity-80 mt-2">All new leads in "{selectedList}" have been dialled.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {!inCall ? (
          <Button size="lg" className="bg-primary gap-2 h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base rounded-full" onClick={() => { setRunning(true); startCall(); }} disabled={!current}>
            <Play className="size-5 fill-current" /> {running ? "CONTINUE" : "START"}
          </Button>
        ) : (
          <Button size="lg" variant="destructive" className="gap-2 h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base rounded-full" onClick={endCallCapture}>
            <PhoneOff className="size-5" /> END CALL
          </Button>
        )}
        <Button size="lg" variant="outline" className="h-12 sm:h-14 rounded-full gap-2" onClick={skip} disabled={!current || !member?.flags?.skipCall}><SkipForward className="size-5" /> Skip</Button>
        {running && <Button size="lg" variant="outline" className="h-12 sm:h-14 rounded-full gap-2" onClick={stop}><Pause className="size-5" /> Stop Auto</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <ProgressBox label="Pending" value={queue.length} color="text-blue-600" />
        <ProgressBox label="My Dials" value={myDoneCount} />
        <ProgressBox label="My Calls Today" value={myTodayCalls.length} color="text-primary" />
        <ProgressBox label="Today Talk Time" value={fmt(todayDuration)} />
      </div>

      <div className="bg-card border rounded-xl p-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team Progress — {selectedList}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {DISPOSITIONS.filter((d) => d.key !== "dnd").map((d) => (
            <div key={d.key} className="flex items-center gap-2 px-2.5 py-1 rounded-full text-white font-semibold" style={{ background: d.color }}>
              <span>{d.label}</span>
              <span className="bg-white/25 rounded-full px-1.5 min-w-5 text-center">{d.key === 'new' ? queue.length : byDispo(d.key)}</span>
            </div>
          ))}
        </div>
      </div>

      <details className="bg-card border rounded-xl p-4">
        <summary className="flex items-center gap-2 cursor-pointer font-semibold text-sm"><Settings2 className="size-4" /> Advanced</summary>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <label>Gap between calls (s):</label>
          <input
            type="number"
            min="0"
            value={gapDraft}
            onChange={(e) => setGapDraft(e.target.value)}
            className="w-20 border rounded px-2 py-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const nextGap = Math.max(0, Number.parseInt(gapDraft, 10) || 0);
              setGap(nextGap);
              setGapDraft(String(nextGap));
              void api.updateSettings({ dialGap: nextGap })
                .then(() => toast.success(`Gap saved: ${nextGap}s`))
                .catch((err: any) => toast.error(err?.message || "Could not save call gap"));
            }}
          >
            Apply
          </Button>
        </div>
      </details>

      <Dialog open={dispoOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Call ended — {current?.name}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground -mt-2">
            Duration: <span className="font-mono font-semibold">{fmt(pendingDuration)}</span>
            {recordingUrl && <span className="ml-2 text-primary">· Recording saved</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {current?.phone && <a href={`https://wa.me/${String(current.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"><MessageCircle className="size-4" /> WhatsApp this number</a>}
            {current && <button type="button" onClick={() => nav(`/pipeline?phone=${encodeURIComponent(current.phone)}`)} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"><Kanban className="size-4" /> Pipeline</button>}
          </div>
          <div className="text-xs font-semibold mt-2">Select disposition to continue</div>
          <div className="grid grid-cols-2 gap-2">
            {DISPOSITIONS.filter((d) => d.key !== "new").map((d) => (
              <button key={d.key} onClick={() => void logAndAdvance(d.key)}
                className="p-3 rounded-lg text-white text-xs font-bold uppercase hover:brightness-110 transition"
                style={{ background: d.color }}>{d.label}</button>
            ))}
          </div>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgressBox({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-card border rounded-xl p-3 sm:p-4 text-center">
      <div className={`text-xl sm:text-2xl font-bold ${color ?? ""}`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

export default DialerPage;