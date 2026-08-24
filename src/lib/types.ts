export type LeadStatus = "new" | "contacted" | "interested" | "not_interested" | "callback" | "converted" | "dnd";
export type CallDisposition = "answered" | "no_answer" | "busy" | "wrong_number" | "callback" | "interested" | "not_interested" | "converted" | "dnd";
export type CampaignStatus = "active" | "paused" | "completed";
export type AppRole = "admin" | "manager" | "agent";

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "interested", "not_interested", "callback", "converted", "dnd"];
export const DISPOSITIONS: CallDisposition[] = ["answered", "no_answer", "busy", "wrong_number", "callback", "interested", "not_interested", "converted", "dnd"];

export const statusColor: Record<LeadStatus | CallDisposition, string> = {
  new: "bg-secondary text-secondary-foreground",
  contacted: "bg-accent text-accent-foreground",
  interested: "bg-primary/15 text-primary",
  not_interested: "bg-muted text-muted-foreground",
  callback: "bg-warning/20 text-warning-foreground",
  converted: "bg-success/20 text-success-foreground",
  dnd: "bg-destructive/15 text-destructive",
  answered: "bg-accent text-accent-foreground",
  no_answer: "bg-muted text-muted-foreground",
  busy: "bg-muted text-muted-foreground",
  wrong_number: "bg-muted text-muted-foreground",
};

export const prettyStatus = (s: string) => s.replace(/_/g, " ");
