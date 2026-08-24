import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentMember, useStore, store } from "@/lib/mock-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, X, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { getSelectedCompanyId } from "@/lib/api";
import { cn } from "@/lib/utils";

type TaskItem = { _id?: string; id?: string; title: string; description?: string; contact?: string; when: string; assignedTo?: any; createdBy?: any; status?: "open" | "inprogress" | "completed" | "done" };
type LeadItem = { _id?: string; id?: string; name: string; phone: string; company?: string; list?: string };
type MemberItem = { _id?: string; id?: string; name: string; lists?: string[]; companyId?: string; };
type ListItem = { _id?: string; id?: string; name: string; leadsCount?: number; };
type CallItem = { leadId?: any; agent?: any; calledAt: string; };

function TasksPage() {
  const me = useCurrentMember();
  const tasks = useStore(s => s.tasks);
  const location = useLocation();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [when, setWhen] = useState("now");
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0,16));
  const [assign, setAssign] = useState<"me" | "other">("me");
  const [assignTo, setAssignTo] = useState("");
  const highlightedTaskId = new URLSearchParams(location.search).get("taskId") || "";

  const loadData = async () => {
    try {
      const [tasksRes, leadsRes, membersRes, listsRes, callsRes] = await Promise.all([
        api.getTasks(), 
        api.getLeads({ limit: 50000 }), 
        api.getMembers(), 
        api.getLists(), 
        api.getCallLogs({ limit: 50000, scope: 'team' }) // Fetch team-wide calls
      ]);
      store.setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setLeads(Array.isArray(leadsRes?.leads) ? leadsRes.leads : []);
      setMembers(Array.isArray(membersRes) ? membersRes : []);
      setLists(Array.isArray(listsRes) ? listsRes : (listsRes?.lists || []));
      setCalls(Array.isArray(callsRes?.calls) ? callsRes.calls : []);
      setAssignTo((current) => current || (Array.isArray(membersRes) && (membersRes[0]?._id || membersRes[0]?.id || "")) || "");
    } catch (err: any) {
      toast.error(err?.message || "Could not load tasks");
    }
  };

  useEffect(() => { void loadData(); }, [me]);

  useEffect(() => {
    const handleCrmUpdated = () => { void loadData(); };
    window.addEventListener('ifox-crm-updated', handleCrmUpdated);
    return () => window.removeEventListener('ifox-crm-updated', handleCrmUpdated);
  }, [me]);
  
  // When the user visits the tasks page, clear unread notifications
  useEffect(() => {
    if (!me?.id) return;
    // Mark notifications as read on the backend when the page is visited.
    const markBackendNotificationsRead = async () => {
      try {
        const notifications = await api.getNotifications();
        const unread = Array.isArray(notifications) ? notifications.filter((n: any) => !n.read && n.type === 'task_assigned') : [];
        await Promise.all(unread.map((notification: any) => api.markNotificationRead(notification._id || notification.id)));
      } catch {}
    };
    // Also clear the frontend mock store for immediate UI update.
    store.clearUnreadTasks(me.id);
    void markBackendNotificationsRead();
  }, [me?.id, tasks]);

  useEffect(() => {
    if (!highlightedTaskId) return;
    const target = document.getElementById(`task-${highlightedTaskId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedTaskId, tasks]);

  // Auto-update 'today' tasks to 'inprogress' at the end of the day if not started
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const endOfDay = new Date(now).setHours(23, 59, 59, 999);
      if (now.getTime() < endOfDay - 5 * 60 * 1000) return; // Only run in the last 5 mins of the day

      const todayTasksToUpdate = tasks.filter(t => t.status === 'open' && new Date(t.when).toDateString() === now.toDateString());
      for (const task of todayTasksToUpdate) {
        await api.updateTask(task._id || task.id || "", { status: 'inprogress' });
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  if (!me) return null;

  const listStats = useMemo(() => {
    if (!me) return {};
    const isAdmin = me.role === "SuperAdmin" || me.role === "Admin";
    
    const stats: Record<string, { pending: number; progress: number }> = {};

    for (const list of lists) {
        const listName = list.name;
        const leadsInList = leads.filter(l => l.list === listName);
        const totalInList = leadsInList.length;

        if (totalInList === 0) {
            stats[listName] = { pending: 0, progress: 0 };
            continue;
        }

        const callsForAnalytics = isAdmin 
            ? calls 
            : calls.filter(c => {
                const agent = c.agent;
                const agentId = typeof agent === 'object' && agent !== null ? (agent._id || agent.id) : agent;
                return String(agentId) === me.id;
            });

        const callsInList = callsForAnalytics.filter(c => leads.find(l => (l._id || l.id) === (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id))?.list === listName);
        const calledLeadIdsInList = new Set(callsInList.map(c => (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id)).filter(Boolean));
        const doneCount = calledLeadIdsInList.size;
        const pendingCount = totalInList - doneCount;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const callsTodayInList = callsInList.filter(c => new Date(c.calledAt) >= todayStart);
        const calledTodayCount = new Set(callsTodayInList.map(c => (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id)).filter(Boolean)).size;
        const progressDenominator = pendingCount + calledTodayCount;
        const progress = progressDenominator > 0 ? Math.round((calledTodayCount / progressDenominator) * 100) : 0;

        stats[listName] = { pending: pendingCount, progress };
    }
    return stats;
  }, [leads, lists, calls, me]);

  const contactLists = useMemo(() => {
    return lists.map(list => ({ ...list, pendingCount: listStats[list.name]?.pending ?? 0, progress: listStats[list.name]?.progress ?? 0, }));
  }, [lists, listStats]);

  const submit = async () => {
    if (!title) return toast.error("Title required");
    let whenIso = new Date().toISOString();
    if (when === "hour") whenIso = new Date(Date.now() + 3600_000).toISOString();
    else if (when === "tomorrow") whenIso = new Date(Date.now() + 86400_000).toISOString();
    else if (when === "custom") whenIso = new Date(customDate).toISOString();
    try {
      const assignedToId = assign === "me" ? me.id : assignTo;
      let taskCompanyId: string | undefined | null = me.companyId;

      if (me.role === 'SuperAdmin') {
        if (assign === 'me') {
          taskCompanyId = getSelectedCompanyId() || me.companyId || null;
          if (!taskCompanyId) {
            return toast.error("Select a company or assign this task to another member before creating it.");
          }
        } else {
          const assignedMember = members.find(m => (m._id || m.id) === assignedToId);
          taskCompanyId = assignedMember?.companyId || getSelectedCompanyId() || me.companyId || null;
        }
      }

      const payload: any = {
        title, description: desc, contact, when: whenIso,
        assignedTo: assignedToId,
        createdBy: me.id,
      };
      if (taskCompanyId) payload.companyId = taskCompanyId;

      const createdTask = await api.createTask(payload);
      // If assigning to another member, mark it as an unread task for them
      if (assign === 'other' && assignTo) {
        store.addUnreadTask(assignTo, createdTask._id || createdTask.id);
      }
      toast.success("Task created");
      setOpen(false); setTitle(""); setDesc(""); setContact(""); setWhen("now"); setAssign("me");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Task could not be created");
    }
  };

  const handleTaskAction = async (task: TaskItem, action: 'start' | 'complete' | 'reopen') => {
    const taskId = task._id || task.id || "";
    if (!taskId) return;

    try {
      let newStatus: TaskItem['status'] = task.status;
      if (action === 'start') {
        newStatus = 'inprogress';
      } else if (action === 'complete') {
        newStatus = 'completed';
      } else if (action === 'reopen') {
        newStatus = 'open';
      }

      await api.updateTask(taskId, { status: newStatus });
      await loadData();

      if (newStatus === 'inprogress') {
        toast.success("Task started");
      } else if (newStatus === 'completed') {
        toast.success("Task marked as completed");
      } else if (newStatus === 'open') {
        toast.success("Task Reopened");
      }

      if ((newStatus === 'inprogress' || newStatus === 'open') && task.contact) {
        navigate(`/dialer?list=${encodeURIComponent(task.contact)}`);
      }
    } catch (err: any) { toast.error(err?.message || "Could not update task"); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><ClipboardCheck className="size-7"/> Tasks</h1>
            <p className="opacity-90 mt-1 text-sm">Manage and track your team's tasks efficiently</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Track Progress</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Scheduled</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Team Tasks</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={()=>setOpen(true)} className="bg-primary gap-1"><Plus className="size-4"/> New Task</Button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-card border rounded-2xl p-8 grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <h3 className="text-xl font-bold">Stay on Top of Follow-Ups</h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-blue-600">➜</span><span><b>Never Miss a Follow-Up:</b> customizable reminders for every customer interaction.</span></div>
              <div className="flex gap-2"><span className="text-blue-600">➜</span><span><b>Boost Team Performance:</b> managers gain insights and can reassign tasks.</span></div>
              <div className="flex gap-2"><span className="text-blue-600">➜</span><span><b>Seamless Integration:</b> sync tasks with calendar for a unified schedule.</span></div>
            </div>
            <Button onClick={()=>setOpen(true)} className="bg-blue-600 gap-1"><Plus className="size-4"/> Get Started</Button>
          </div>
          <div className="hidden md:grid place-items-center text-8xl opacity-50">📋</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map((t: any) => {
            const taskId = t._id || t.id || "";
            const isHighlighted = Boolean(highlightedTaskId && taskId === highlightedTaskId);
            const isCreator = (t.createdBy?._id || t.createdBy) === me.id;

            const listName = t.contact;
            const leadsInList = leads.filter(l => l.list === listName);
            const totalInList = leadsInList.length;
            const callsInList = calls.filter(c => leads.find(l => (l._id || l.id) === (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id))?.list === listName);
            const calledLeadIds = new Set(callsInList.map(c => (typeof c.leadId === 'string' ? c.leadId : c.leadId?._id)).filter(Boolean));
            const doneCount = calledLeadIds.size;
            const pendingCount = totalInList - doneCount;
            const progress = totalInList > 0 ? Math.round((doneCount / totalInList) * 100) : 0;
            const isListComplete = pendingCount === 0 && totalInList > 0;

            return (
              <div id={`task-${taskId}`} key={taskId} className={`bg-card border rounded-xl p-4 transition-all ${(t.status === "completed" || t.status === "done") ? "opacity-60" : ""} ${isHighlighted ? "ring-2 ring-blue-500 shadow-lg" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${(t.status === "completed" || t.status === "done") ? "line-through" : ""}`}>{t.title}</div>
                    {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                  </div>
                  {me.role === 'SuperAdmin' && (
                    <button onClick={async()=>{ try { await api.deleteTask(taskId); await loadData(); } catch (err: any) { toast.error(err?.message || "Could not delete task"); } }} className="text-muted-foreground hover:text-red-500 p-1"><Trash2 className="size-3.5"/></button>
                  )}
                </div>
                {t.contact && (
                  <div className="text-xs mt-3 pt-3 border-t border-dashed">
                    {(() => {
                      if (totalInList === 0) return null;
                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <div className="font-semibold text-foreground">List: {listName}</div>
                            <div className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">{pendingCount} pending</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                            <span className="text-[11px] text-muted-foreground font-semibold w-8 text-right">{progress}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">📅 {new Date(t.when).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <div>
                    Assigned to <b className="text-foreground">{t.assignedTo?.name || members.find(m => (m._id || m.id) === t.assignedTo)?.name || '—'}</b>
                  </div>
                  {me.role === 'SuperAdmin' && t.companyName && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t.companyName}</span>
                  )}
                </div>
                {isCreator ? (
                  <>
                    {t.status === 'completed' && (
                      <div className="mt-3 text-center text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-md py-1.5">
                        ✓ Completed
                      </div>
                    )}
                    {(t.status === 'open' || t.status === 'inprogress') && (
                      <div className="mt-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-1.5">
                        {t.status === 'inprogress' ? 'In Progress' : 'Pending'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleTaskAction(t, 'start')} disabled={t.status === 'completed' || t.status === 'inprogress'}>Start Task</Button>
                    <Button size="sm" className="bg-blue-600 gap-1" onClick={() => handleTaskAction(t, 'complete')} disabled={t.status === 'completed' || !isListComplete}>Mark as Completed</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
            <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><ClipboardCheck/> Create Task</DialogTitle></DialogHeader>
            <button onClick={()=>setOpen(false)} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "size-7 rounded-full text-white hover:bg-white/20 hover:text-white")}><X className="size-4"/></button>
          </div>
          <div className="p-5 space-y-3">
            <Input placeholder="Task Title *" value={title} onChange={e=>setTitle(e.target.value)}/>
            <Input placeholder="Task Description" value={desc} onChange={e=>setDesc(e.target.value)}/>

            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { k: "now", label: "Now" },
                { k: "hour", label: "In an hour" },
                { k: "tomorrow", label: "Tomorrow" },
                { k: "custom", label: "Choose Date" },
              ].map(o => (
                <label key={o.k} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="when" checked={when===o.k} onChange={()=>setWhen(o.k)} className="accent-blue-500"/>
                  {o.label}
                </label>
              ))}
            </div>
            {when === "custom" && <Input type="datetime-local" value={customDate} onChange={e=>setCustomDate(e.target.value)}/>}

            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">Assign To</span>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={assign==="me"} onChange={()=>setAssign("me")} className="accent-blue-500"/> Me</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={assign==="other"} onChange={()=>setAssign("other")} className="accent-blue-500"/> Other</label>
              </div>
              {assign === "other" && (
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger><SelectValue placeholder="Select Member"/></SelectTrigger>
                  <SelectContent>{members.map(m => <SelectItem key={m._id || m.id || m.name} value={m._id || m.id || ""}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <Select value={contact} onValueChange={setContact}>
              <SelectTrigger><SelectValue placeholder="Contact List"/></SelectTrigger>
              <SelectContent>{contactLists.map(l => (
                <SelectItem key={l._id || l.id || l.name} value={l.name} >
                  <div className="flex justify-between w-full items-center">
                    <span>{l.name} - </span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mr-2 ms-1">
                      <span>{l.pendingCount} pending</span> |
                      <span className="font-semibold">{l.progress}% today</span>
                    </div>
                  </div>
                </SelectItem>
              ))}</SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="ghost" onClick={()=>setOpen(false)} className="text-red-600">CLOSE</Button>
              <Button onClick={submit} className="bg-blue-600">SAVE</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TasksPage;
