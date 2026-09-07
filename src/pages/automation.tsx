import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Zap,
  Sparkles,
  Bolt,
  TimerReset,
  Repeat,
  ListChecks,
  Webhook,
  MessageSquareText,
  Bell,
  Plus,
  Bot,
  ArrowRight,
  X,
  ListFilter,
} from "lucide-react";
import api from "@/lib/api";
import { readSelection, writeSelection } from "@/lib/persistent-selection";
import { useCurrentMember } from "@/lib/mock-store";
import { toast } from "sonner";

type AutomationRule = { _id: string; name: string; list: string; trigger: string; action: string; enabled: boolean };

export default function FormPage() {
  const member = useCurrentMember();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(() => readSelection(member, "automation-list") || "Default");
  const [lists, setLists] = useState<string[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    writeSelection(member, "automation-list", selectedList);
  }, [member, selectedList]);

  const loadRules = async () => {
    try {
      const [ruleResponse, listResponse] = await Promise.all([api.getAutomationRules(), api.getLists()]);
      setRules(Array.isArray(ruleResponse) ? ruleResponse : []);
      const nextLists = (Array.isArray(listResponse) ? listResponse : listResponse?.lists || [])
        .map((list: any) => list.name).filter(Boolean);
      setLists(nextLists);
      if (nextLists.length) setSelectedList((current) => nextLists.includes(current) ? current : nextLists[0]);
    } catch (error: any) {
      toast.error(error?.message || "Could not load automation rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRules(); }, []);

  const createRule = async () => {
    if (!selectedList) return;
    try {
      await api.createAutomationRule({ name: `${selectedList} follow-up`, list: selectedList });
      setCreateOpen(false);
      await loadRules();
      toast.success("Automation created");
    } catch (error: any) {
      toast.error(error?.message || "Could not create automation");
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Automation</h1>
              <p className="text-sm text-white/85">Automate your workflow with intelligent rules and triggers</p>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> Smart Rules
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <Bolt className="h-3.5 w-3.5" /> Auto Actions
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <TimerReset className="h-3.5 w-3.5" /> Time Saving
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <Repeat className="h-3.5 w-3.5" /> Disposition Change
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <ListChecks className="h-3.5 w-3.5" /> List Management
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <Webhook className="h-3.5 w-3.5" /> Webhooks
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <MessageSquareText className="h-3.5 w-3.5" /> Auto Messaging
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </button>
        </div>
      </div>

      {/* Create automation card */}
      <Card className="rounded-2xl border-blue-200 bg-blue-50/40">
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Zap className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold">Create New Automation</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Automate your workflow by setting up rules that trigger actions based on disposition changes, list updates, and more.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-2 gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Create Automation
          </Button>
        </div>
      </Card>

      {loading ? <div className="py-14 text-center text-sm text-muted-foreground">Loading automation rules...</div> : rules.length ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
              <div><p className="font-semibold">{rule.name}</p><p className="text-sm text-muted-foreground">{rule.list} · {rule.trigger.replaceAll("_", " ")} · {rule.action.replaceAll("_", " ")}</p></div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void api.updateAutomationRule(rule._id, !rule.enabled).then(loadRules)}>{rule.enabled ? "Enabled" : "Disabled"}</Button>
                <Button variant="ghost" size="icon" onClick={() => void api.deleteAutomationRule(rule._id).then(loadRules)} title="Delete rule"><X className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      ) : <div className="flex flex-col items-center gap-2 py-14 text-center"><Bot className="h-10 w-10 text-muted-foreground/40" /><h3 className="text-base font-semibold text-muted-foreground">No Automation Rules</h3><p className="text-sm text-muted-foreground">Use the button above to create your first automation</p></div>}

      {/* Create Automation modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <ListFilter className="h-5 w-5" />
              </div>
              <DialogHeader className="space-y-0.5 text-left">
                <DialogTitle className="text-white">Create Automation</DialogTitle>
                <DialogDescription className="text-white/85">Select a list to add an automation rule</DialogDescription>
              </DialogHeader>
            </div>
            <button onClick={() => setCreateOpen(false)} className="rounded-full p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 p-6">
            <span className="text-sm font-medium">Choose a List</span>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Select List</span>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list} value={list}>
                      {list}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-end">
            <Button variant="outline" className="gap-1.5" onClick={() => setCreateOpen(false)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={() => void createRule()} disabled={!selectedList} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}