// Frontend-only mock data store, persisted to localStorage. No backend.
import { useSyncExternalStore } from "react";

export type Disposition =
  | "new"
  | "interested"
  | "not_interested"
  | "callback"
  | "converted"
  | "dnd"
  | "no_answer"
  | "busy"
  | "wrong_number";

export const DISPOSITIONS: { key: Disposition; label: string; color: string; text: string }[] = [
  { key: "new", label: "New", color: "#4285F4", text: "#ffffff" },
  { key: "interested", label: "Interested", color: "#eab308", text: "#ffffff" },
  { key: "not_interested", label: "Not Interested", color: "#6b7280", text: "#ffffff" },
  { key: "callback", label: "Callback", color: "#f59e0b", text: "#ffffff" },
  { key: "converted", label: "Converted", color: "#059669", text: "#ffffff" },
  { key: "no_answer", label: "Ringing / No Response", color: "#ef4444", text: "#ffffff" },
  { key: "busy", label: "Busy", color: "#92400e", text: "#ffffff" },
  { key: "wrong_number", label: "Wrong Number", color: "#111827", text: "#ffffff" },
  { key: "dnd", label: "DND", color: "#7f1d1d", text: "#ffffff" },
];
export const dispoMeta = (d: Disposition) => DISPOSITIONS.find(x => x.key === d) || DISPOSITIONS[0];

export type Permissions = {
  crm: boolean; team: boolean; whatsapp: boolean; reports: boolean; tools: boolean;
  marketing: boolean; pbx: boolean; subscribe: boolean; payment: boolean; integration: boolean;
  recording: boolean; settings: boolean;
};
export type MemberFlags = {
  accessCrmOnApp: boolean;
  modifyMember: boolean;
  skipCall: boolean;
  deleteList: boolean;
  mobileRecording: boolean;
  enableWhatsapp: boolean;
  allowAllListAccess: boolean;
  callLogAccess: boolean;
  disableExportList: boolean;
  disableContactDelete: boolean;
  markAttendance: boolean;
  captureLocation: boolean;
  capturePhoto: boolean;
  enableSessionLock: boolean;
};
export const defaultFlags = (): MemberFlags => ({
  accessCrmOnApp: true, modifyMember: false, skipCall: false, deleteList: false,
  mobileRecording: false, enableWhatsapp: true, allowAllListAccess: false,
  callLogAccess: true, disableExportList: false, disableContactDelete: false,
  markAttendance: false, captureLocation: false, capturePhoto: false, enableSessionLock: false,
});
export const newTelecallerFlags = (): MemberFlags => ({
  accessCrmOnApp: false, modifyMember: false, skipCall: false, deleteList: false,
  mobileRecording: false, enableWhatsapp: true, allowAllListAccess: true,
  callLogAccess: true, disableExportList: false, disableContactDelete: false,
  markAttendance: false, captureLocation: false, capturePhoto: false, enableSessionLock: false,
});
export const defaultTelecallerPerms = (): Permissions => ({
  crm: true, team: false, whatsapp: true, reports: true, tools: true, marketing: false,
  pbx: false, subscribe: false, payment: true, integration: false, recording: false, settings: true,
});
export const fullPerms = (): Permissions => ({
  crm: true, team: true, whatsapp: true, reports: true, tools: true, marketing: true,
  pbx: true, subscribe: true, payment: true, integration: true, recording: true, settings: true,
});

export const normalizeRole = (role?: string): Member["role"] => {
  switch ((role || "").toLowerCase()) {
    case "master":
      return "Master";
    case "superadmin":
      return "SuperAdmin";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "submanager":
      return "Submanager";
    case "telecaller":
      return "Telecaller";
    default:
      return "Telecaller";
  }
};

export type Lead = {
  id: string; name: string; phone: string; secondaryPhone?: string;
  email?: string; company?: string; address?: string; remarks?: string; note?: string;
  disposition: Disposition; list: string; assignedTo?: string;
  totalDuration: number; createdAt: string;
};
export type Member = {
  id: string; name: string; username: string; email: string; password: string;
  phone: string; role: "Master" | "SuperAdmin" | "Admin" | "Manager" | "Submanager" | "Telecaller";
  companyId?: string;
  teams: string[]; lists: string[]; permissions: Permissions; flags?: MemberFlags;
};
export type CallLog = {
  id: string; leadId: string; phone: string; name: string; agent: string;
  duration: number; disposition: Disposition; notes?: string; calledAt: string;
  recordingUrl?: string;
};
export type Campaign = { id: string; name: string; script: string; status: "active" | "paused" | "completed"; leadsCount: number; createdAt: string };
export type WhatsappTemplate = { id: string; name: string; body: string; status: "approved" | "pending" };
export type WhatsappMessage = { id: string; phone: string; name: string; text: string; direction: "out" | "in"; at: string };
export type Recording = { id: string; leadName: string; phone: string; agent: string; duration: number; date: string; url: string; disposition?: Disposition };
export type Integration = { id: string; name: string; description: string; connected: boolean; icon: string };
export type ListMeta = { assignedTo: string[] };
export type Task = { id: string; title: string; description?: string; contact?: string; when: string; assignedTo: string; createdBy: string; status: "open" | "done"; createdAt: string };
export type PipelineStage = { id: string; name: string; color: string };
export type PipelineDeal = { id: string; leadId: string; stageId: string; list: string; value?: number };
export type AuditEntry = { id: string; actor: string; action: string; module: string; at: string; ip?: string };
export type SettingsState = {
  recordCalls: boolean;
  dialGap: number;
  customDispositions: { label: string; color: string }[];
  customFields: { key: string; label: string; type: "text" | "number" | "date" }[];
  messageTemplates: { id: string; name: string; body: string }[];
  storageUsedMb: number;
  storageLimitMb: number;
  companyName: string;
};
export type Subscription = {
  plan: string; cycle: "monthly" | "halfyearly" | "yearly"; expiry: string;
  memberLimit: number; pricePerUser: number; profile: {
    company: string; firstName: string; lastName: string; email: string; phone: string;
    address: string; state: string; city: string; pincode: string; country: string; gstin: string;
  };
  invoices: { id: string; date: string; user: number; amount: number; expiry: string; status: "Paid" | "Pending" }[];
};

type State = {
  session: { memberId: string } | null;
  leads: Lead[];
  unreadTasks: Record<string, string[]>; // memberId -> taskId[]
  members: Member[];
  calls: CallLog[];
  campaigns: Campaign[];
  templates: WhatsappTemplate[];
  messages: WhatsappMessage[];
  recordings: Recording[];
  integrations: Integration[];
  lists: string[];
  listMeta: Record<string, ListMeta>;
  tasks: Task[];
  pipelineStages: PipelineStage[];
  pipelineDeals: PipelineDeal[];
  audit: AuditEntry[];
  settings: SettingsState;
  subscription: Subscription;
};

const KEY = "ifoxdial_mock_v3";

const seedStages = (): PipelineStage[] => ([
  { id: "s_new", name: "New", color: "#4285F4" },
  { id: "s_prog", name: "In progress", color: "#f59e0b" },
  { id: "s_won", name: "Won", color: "#10b981" },
  { id: "s_lost", name: "Lost", color: "#ef4444" },
]);

const seed = (): State => ({
  session: null,
  lists: [],
  unreadTasks: {},
  listMeta: {},
  leads: [],
  members: [
    { id: "m1", name: "Sidhartha Mohan", username: "admin", email: "admin@ifox.com", password: "admin", phone: "+919884339436", role: "SuperAdmin", teams: ["iFox"], lists: [], permissions: fullPerms(), flags: defaultFlags() },
    { id: "m2", name: "Shariya Mariyam", username: "shariya", email: "shariya@ifox.com", password: "shariya123", phone: "+919940222912", role: "Telecaller", teams: ["iFox"], lists: [], permissions: defaultTelecallerPerms(), flags: defaultFlags() },
    // { id: "m3", name: "Ravi Kumar", username: "ravi", email: "ravi@ifox.com", password: "ravi123", phone: "+919876543210", role: "Telecaller", teams: ["iFox"], lists: [], permissions: defaultTelecallerPerms(), flags: defaultFlags() },
  ],
  calls: [],
  campaigns: [],
  templates: [],
  messages: [],
  recordings: [],
  integrations: [
    { id: "i1", name: "Google Sheets", description: "Sync leads from Google Sheets", connected: true, icon: "📊" },
    { id: "i2", name: "Zapier", description: "Connect 5000+ apps", connected: false, icon: "⚡" },
    { id: "i3", name: "Facebook Lead Ads", description: "Import leads from FB ads", connected: true, icon: "📘" },
    { id: "i4", name: "WhatsApp Business API", description: "Send template messages", connected: true, icon: "💬" },
    { id: "i5", name: "Webhook", description: "Custom HTTP webhooks", connected: false, icon: "🔗" },
  ],
  tasks: [],
  pipelineStages: seedStages(),
  pipelineDeals: [],
  audit: [],
  settings: {
    recordCalls: true,
    dialGap: 3,
    customDispositions: [],
    customFields: [{ key: "source", label: "Lead Source", type: "text" }],
    messageTemplates: [
      { id: "mt1", name: "Welcome", body: "Hi {{name}}, thanks for reaching out to Webdial!" },
      { id: "mt2", name: "Follow up", body: "Hi {{name}}, following up on our earlier call." },
    ],
    storageUsedMb: 0, storageLimitMb: 5120,
    companyName: "Web",
  },
  subscription: {
    plan: "Web Dail Enterprise Basic Monthly",
    cycle: "monthly",
    expiry: "2026-07-31T13:43:00.000Z",
    memberLimit: 4,
    pricePerUser: 0,
    profile: {
      company: "iFox", firstName: "Sidhartha", lastName: "Mohan",
      email: "sidhartha@ifoxad.com", phone: "+919884339436",
      address: "Flat F, 2nd Floor, 11th Sector Park, Plot #922, 66th St, K.K. Nagar",
      state: "Tamil Nadu", city: "Chennai", pincode: "600078", country: "India",
      gstin: "33EAAPB9400H1Z9",
    },
    invoices: [],
  },
});

let state: State = (() => {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    const token = localStorage.getItem('ifox_token') || sessionStorage.getItem('ifox_token');
    if (raw) {
      const parsed = JSON.parse(raw);
      const restored = { ...seed(), ...parsed };
      if (!token) restored.session = null;
      return restored;
    }
  } catch {}
  return seed();
})();

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const persist = () => { if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state)); };
const notify = () => { persist(); listeners.forEach(l => l()); };

const logAudit = (actor: string, action: string, module: string) => {
  state = { ...state, audit: [{ id: crypto.randomUUID(), actor, action, module, at: new Date().toISOString(), ip: "127.0.0.1" }, ...state.audit].slice(0, 500) };
};

export const store = {
  get: () => state,
  currentMember: (): Member | null => state.session ? state.members.find(m => m.id === state.session!.memberId) || null : null,
  login: (u: string, p: string): Member | null => {
    const m = state.members.find(x => (x.username === u || x.email === u) && x.password === p);
    if (!m) return null;
    state = { ...state, session: { memberId: m.id } };
    logAudit(m.name, "Account login", "Auth");
    notify();
    return m;
  },
  logout: () => { state = { ...state, session: null }; notify(); },

  addLead: (l: Omit<Lead, "id" | "createdAt" | "disposition" | "totalDuration"> & Partial<Pick<Lead, "disposition">>) => {
    // This function seems to be from the mock implementation and might not be used with a real backend.
    state = { ...state, leads: [{ id: crypto.randomUUID(), createdAt: new Date().toISOString().slice(0,10), disposition: "new", totalDuration: 0, ...l }, ...state.leads] };
    notify();
  },
  addLeadsBulk: (leads: Array<Omit<Lead, "id" | "createdAt" | "disposition" | "totalDuration">>) => {
    const now = new Date().toISOString().slice(0,10);
    const added = leads.map(l => ({ id: crypto.randomUUID(), createdAt: now, disposition: "new" as Disposition, totalDuration: 0, ...l }));
    state = { ...state, leads: [...added, ...state.leads] };
    notify();
  },
  updateLead: (id: string, patch: Partial<Lead>) => { state = { ...state, leads: state.leads.map(l => l.id === id ? { ...l, ...patch } : l) }; notify(); },
  deleteLead: (id: string) => { state = { ...state, leads: state.leads.filter(l => l.id !== id) }; notify(); },

  addList: (name: string) => { if (state.lists.includes(name)) return; state = { ...state, lists: [...state.lists, name] }; const m = store.currentMember(); if (m) logAudit(m.name, `List ${name} added`, "CRM"); notify(); },
  renameList: (oldName: string, newName: string) => {
    if (!newName || state.lists.includes(newName)) return;
    state = {
      ...state,
      lists: state.lists.map(l => l === oldName ? newName : l),
      leads: state.leads.map(l => l.list === oldName ? { ...l, list: newName } : l),
      members: state.members.map(m => ({ ...m, lists: m.lists.map(x => x === oldName ? newName : x) })),
      listMeta: Object.fromEntries(Object.entries(state.listMeta).map(([k, v]) => [k === oldName ? newName : k, v])),
    };
    notify();
  },
  deleteList: (name: string) => {
    state = {
      ...state,
      lists: state.lists.filter(l => l !== name),
      leads: state.leads.filter(l => l.list !== name),
      members: state.members.map(m => ({ ...m, lists: m.lists.filter(x => x !== name) })),
    };
    notify();
  },
  rechurnList: (name: string) => {
    state = { ...state, leads: state.leads.map(l => l.list === name ? { ...l, disposition: "new", totalDuration: 0 } : l) };
    const m = store.currentMember(); if (m) logAudit(m.name, `List ${name} rechurned`, "CRM");
    notify();
  },
  assignList: (name: string, memberIds: string[]) => {
    state = {
      ...state,
      listMeta: { ...state.listMeta, [name]: { assignedTo: memberIds } },
      members: state.members.map(m => memberIds.includes(m.id)
        ? (m.lists.includes(name) ? m : { ...m, lists: [...m.lists, name] })
        : { ...m, lists: m.lists.filter(x => x !== name) }),
    };
    const me = store.currentMember(); if (me) logAudit(me.name, `List ${name} assigned to ${memberIds.length} members`, "CRM");
    notify();
  },

  logCall: (c: Omit<CallLog, "id" | "calledAt">) => {
    const log: CallLog = { ...c, id: crypto.randomUUID(), calledAt: new Date().toISOString() };
    state = {
      ...state,
      calls: [log, ...state.calls],
      leads: state.leads.map(l => l.id === c.leadId ? { ...l, disposition: c.disposition, totalDuration: l.totalDuration + c.duration } : l),
    };
    if (state.settings.recordCalls && c.duration > 0) {
      state = { ...state, recordings: [{ id: crypto.randomUUID(), leadName: c.name, phone: c.phone, agent: c.agent, duration: c.duration, date: log.calledAt, url: c.recordingUrl || "#", disposition: c.disposition }, ...state.recordings] };
    }
    notify();
  },

  addMember: (m: Omit<Member, "id">) => { state = { ...state, members: [...state.members, { ...m, id: crypto.randomUUID(), flags: m.flags ?? defaultFlags() }] }; const me = store.currentMember(); if (me) logAudit(me.name, `Member ${m.name} added`, "Team"); notify(); },
  updateMember: (id: string, patch: Partial<Member>) => { state = { ...state, members: state.members.map(m => m.id === id ? { ...m, ...patch } : m) }; notify(); },
  removeMember: (id: string) => { const rem = state.members.find(m => m.id === id); state = { ...state, members: state.members.filter(m => m.id !== id) }; const me = store.currentMember(); if (me && rem) logAudit(me.name, `Member ${rem.name} removed`, "Team"); notify(); },

  addCampaign: (c: Omit<Campaign, "id" | "createdAt" | "leadsCount">) => { state = { ...state, campaigns: [{ ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString().slice(0,10), leadsCount: 0 }, ...state.campaigns] }; notify(); },
  updateCampaign: (id: string, patch: Partial<Campaign>) => { state = { ...state, campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...patch } : c) }; notify(); },
  toggleIntegration: (id: string) => { state = { ...state, integrations: state.integrations.map(i => i.id === id ? { ...i, connected: !i.connected } : i) }; notify(); },

  sendWhatsapp: (phone: string, name: string, text: string) => {
    state = { ...state, messages: [{ id: crypto.randomUUID(), phone, name, text, direction: "out", at: new Date().toISOString() }, ...state.messages] };
    notify();
  },

  setTasks: (tasks: Task[]) => { state = { ...state, tasks }; notify(); },
  addTask: (t: Omit<Task, "id" | "createdAt" | "status">) => {
    const newTask = { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "open" as const };
    state = { ...state, tasks: [newTask, ...state.tasks] };
    // If assigned to someone, add to their unread list
    if (t.assignedTo && store.currentMember()?.id !== t.assignedTo) {
      store.addUnreadTask(t.assignedTo, newTask.id);
    }
    notify();
    return newTask;
  },
  toggleTask: (id: string) => { state = { ...state, tasks: state.tasks.map(t => t.id === id ? { ...t, status: t.status === "open" ? "done" : "open" } : t) }; notify(); },
  deleteTask: (id: string) => { state = { ...state, tasks: state.tasks.filter(t => t.id !== id) }; notify(); },
  addUnreadTask: (memberId: string, taskId: string) => { const current = state.unreadTasks[memberId] || []; if (current.includes(taskId)) return; state = { ...state, unreadTasks: { ...state.unreadTasks, [memberId]: [...current, taskId] } }; notify(); },
  clearUnreadTasks: (memberId: string) => { if (!state.unreadTasks[memberId]?.length) return; state = { ...state, unreadTasks: { ...state.unreadTasks, [memberId]: [] } }; notify(); },

  addPipelineStage: (name: string, color = "#64748b") => { state = { ...state, pipelineStages: [...state.pipelineStages, { id: crypto.randomUUID(), name, color }] }; notify(); },
  removePipelineStage: (id: string) => { state = { ...state, pipelineStages: state.pipelineStages.filter(s => s.id !== id), pipelineDeals: state.pipelineDeals.filter(d => d.stageId !== id) }; notify(); },
  moveDeal: (dealId: string, stageId: string) => { state = { ...state, pipelineDeals: state.pipelineDeals.map(d => d.id === dealId ? { ...d, stageId } : d) }; notify(); },
  addDealFromLead: (leadId: string, stageId: string, list: string) => { state = { ...state, pipelineDeals: [{ id: crypto.randomUUID(), leadId, stageId, list }, ...state.pipelineDeals] }; notify(); },

  updateSettings: (patch: Partial<SettingsState>) => { state = { ...state, settings: { ...state.settings, ...patch } }; notify(); },
  updateSubscription: (patch: Partial<Subscription>) => { state = { ...state, subscription: { ...state.subscription, ...patch } }; notify(); },
  addInvoice: (amt: number, users: number) => {
    const now = new Date().toISOString();
    const exp = new Date(Date.now() + 30 * 86400_000).toISOString();
    state = { ...state, subscription: { ...state.subscription, invoices: [{ id: crypto.randomUUID(), date: now, user: users, amount: amt, expiry: exp, status: "Paid" }, ...state.subscription.invoices], expiry: exp } };
    notify();
  },

  reset: () => { state = seed(); notify(); },
};

// allow setting session from backend auth during migration from mock data
export const setBackendSession = (user: { id: string; name: string; email: string; role?: string; username?: string; teams?: string[]; lists?: string[]; companyId?: string; permissions?: Permissions; flags?: MemberFlags }) => {
  const exists = state.members.find(m => m.id === user.id);
  const member = exists
    ? {
        ...exists,
        name: user.name,
        email: user.email,
        username: user.username || exists.username || user.email.split('@')[0],
        role: normalizeRole(user.role),
        companyId: user.companyId || exists.companyId,
        teams: Array.isArray(user.teams) ? user.teams : exists.teams,
        lists: Array.isArray(user.lists) ? user.lists : exists.lists,
        permissions: user.permissions ? { ...defaultTelecallerPerms(), ...user.permissions } : exists.permissions,
        flags: user.flags ? { ...(exists.flags || defaultFlags()), ...user.flags } : exists.flags,
      }
    : {
        id: user.id,
        name: user.name,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        password: 'backend',
        phone: '',
        role: normalizeRole(user.role),
        companyId: user.companyId,
        teams: Array.isArray(user.teams) ? user.teams : [],
        lists: Array.isArray(user.lists) ? user.lists : [],
        permissions: { ...defaultTelecallerPerms(), ...(user.permissions || {}) },
        flags: user.flags ? { ...defaultFlags(), ...user.flags } : defaultFlags(),
      };
  state = { ...state, members: [member, ...state.members.filter(m => m.id !== user.id)], session: { memberId: user.id } };
  notify();
};

// clear session on logout
export const clearSession = () => {
  state = { ...state, session: null };
  notify();
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
export function useCurrentMember(): Member | null {
  return useStore(s => {
    if (!s.session) return null;
    const member = s.members.find(m => m.id === s.session!.memberId);
    return member ? member : null;
  });
}
