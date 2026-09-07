import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Phone,
  Globe,
  MonitorSmartphone,
  Info,
  UserRound,
  ListFilter,
  SkipForward,
  Play,
  Pause,
} from "lucide-react";

type Contact = { id: string; name: string; phone: string; list: string };

const CALL_INTERVAL_SECONDS = 5;

export default function WebDialerPage() {
  const [listName, setListName] = useState("");
  const [listNames, setListNames] = useState<string[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callStarting, setCallStarting] = useState(false);
  const [countdown, setCountdown] = useState(CALL_INTERVAL_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [leadsResponse, listsResponse] = await Promise.all([
          api.getLeads({ limit: 50000 }),
          api.getLists(),
        ]);
        if (!active) return;
        const leads = Array.isArray(leadsResponse?.leads) ? leadsResponse.leads : [];
        const names = (Array.isArray(listsResponse) ? listsResponse : listsResponse?.lists || [])
          .map((list: any) => list.name)
          .filter(Boolean);
        const fallbackNames = [...new Set(leads.map((lead: any) => lead.list).filter(Boolean))];
        const nextNames = names.length ? names : fallbackNames;
        setListNames(nextNames);
        setListName((current) => current && nextNames.includes(current) ? current : nextNames[0] || "");
        const nextContacts: Contact[] = leads.map((lead: any) => ({ id: lead._id || lead.id, name: lead.name, phone: lead.phone, list: lead.list }));
        setAllContacts(nextContacts);
        setContacts(nextContacts.filter((contact) => contact.list === (nextNames[0] || "")));
      } catch (error: any) {
        if (active) toast.error(error?.message || "Could not load dialer contacts");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setContacts(allContacts.filter((contact) => contact.list === listName));
    setIndex(0);
    setRunning(false);
    setInCall(false);
    setCallSeconds(0);
    setCountdown(CALL_INTERVAL_SECONDS);
  }, [listName, allContacts]);

  const current = contacts[index];

  const placeCall = async (contact: Contact) => {
    if (callStarting || inCall) return;
    try {
      setCallStarting(true);
      await api.logCall({ leadId: contact.id, phone: contact.phone, name: contact.name, duration: 0, disposition: "new", notes: "Web Dialer call" });
      setInCall(true);
      setCallSeconds(0);
      window.location.href = `tel:${contact.phone}`;
      toast.success(`Calling ${contact.name} · ${contact.phone}`);
    } catch (error: any) {
      toast.error(error?.message || "Could not start the call");
    } finally {
      setCallStarting(false);
    }
  };

  useEffect(() => {
    if (!inCall) {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      return;
    }
    callTimerRef.current = setInterval(() => setCallSeconds((seconds) => seconds + 1), 1000);
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [inCall]);

  const goToNext = () => {
    setIndex((prev) => {
      const next = prev + 1;
      if (next >= contacts.length) {
        setRunning(false);
        setInCall(false);
        toast.info("All contacts in this list have been dialed");
        return prev;
      }
      return next;
    });
    setCountdown(CALL_INTERVAL_SECONDS);
  };

  const endCurrentCall = () => {
    setInCall(false);
    setCallSeconds(0);
    if (running) goToNext();
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (current) placeCall(current);
          goToNext();
          return CALL_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index, contacts]);

  const toggleStart = () => {
    if (!contacts.length) return;
    if (!running && current) void placeCall(current);
    setRunning((r) => !r);
    setCountdown(CALL_INTERVAL_SECONDS);
  };

  const skip = () => {
    if (!contacts.length) return;
    toast.message(`Skipped ${current?.name}`);
    goToNext();
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Web Dialer</h1>
              <p className="text-sm text-white/85">Dial from your desktop – BETA</p>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <Globe className="h-3.5 w-3.5" /> Browser Calling
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <MonitorSmartphone className="h-3.5 w-3.5" /> Desktop Integration
            </span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-5 py-4 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Info className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">How It Works</p>
            <p className="text-xs text-white/85">Launch calls from your browser</p>
          </div>
        </div>
        <p className="px-5 py-4 text-sm text-blue-700">
          Launch calls from your browser using Skype for Business, webdial Telecmi Cloud Calling or any Calling app
          which can become the default call handler for your computer.
        </p>
      </Card>

      {/* Phone mockup */}
      <Card className="flex justify-center rounded-2xl p-10">
        <div className="relative h-[620px] w-[280px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
          <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
          <div className="absolute right-[-3px] top-24 h-10 w-1.5 rounded-l bg-slate-700" />

          <div className="flex h-full flex-col gap-4 overflow-hidden rounded-[1.9rem] bg-slate-900 p-5 pt-8">
            <div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-white">Dialer</p>
                  <span className="text-[10px] font-semibold text-blue-300">{contacts.length ? `${Math.min(index + 1, contacts.length)} / ${contacts.length}` : "0 / 0"}</span>
                </div>
              <div className="mt-3 flex flex-col gap-1">
                <span className="text-[11px] text-blue-300">Choose List</span>
                <Select value={listName} onValueChange={setListName}>
                  <SelectTrigger className="h-9 border-0 bg-slate-800 text-sm text-white">
                    <span className="flex items-center gap-2">
                      <ListFilter className="h-3.5 w-3.5 text-blue-400" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {listNames.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(160deg,#1D4ED8_0%,#3B82F6_100%)] px-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <UserRound className="h-8 w-8 text-white" />
              </div>
              {loading ? (
                <p className="text-sm text-white/85">Loading contacts...</p>
              ) : current ? (
                <>
                  <p className="text-base font-bold leading-tight text-white">{current.name}</p>
                  <p className="text-sm text-white/85">{current.phone}</p>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white/90">{current.list}</span>
                </>
              ) : (
                <p className="text-sm text-white/85">No contacts in this list</p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white">
                  {callStarting ? "Connecting..." : inCall ? `In call ${Math.floor(callSeconds / 60).toString().padStart(2, "0")}:${(callSeconds % 60).toString().padStart(2, "0")}` : running ? `Next call in: ${countdown}s` : "Paused"}
                </span>
                <button
                  onClick={skip}
                  className="flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white hover:bg-black/35"
                >
                  Skip <SkipForward className="h-3 w-3" />
                </button>
              </div>
              {inCall && (
                <button onClick={endCurrentCall} className="mt-1 rounded-lg bg-red-500/90 px-4 py-2 text-[11px] font-bold uppercase text-white hover:bg-red-500">
                  End Call &amp; Next
                </button>
              )}
            </div>

            <button
              onClick={toggleStart}
              disabled={!contacts.length || callStarting || inCall}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-blue-400 disabled:opacity-50"
            >
              {running ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start
                </>
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}