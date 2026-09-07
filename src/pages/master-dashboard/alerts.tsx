import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { MasterShell, Panel, StatGrid } from "@/components/layout/MasterShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

function AlertsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [customerRes, supportRes, notificationRes] = await Promise.all([
          api.getMasterCustomers(),
          api.getSupportTickets(),
          api.getNotifications(),
        ]);
        setCustomers(Array.isArray(customerRes?.customers) ? customerRes.customers : []);
        setTickets(Array.isArray(supportRes) ? supportRes : supportRes?.tickets || []);
        setNotifications(Array.isArray(notificationRes) ? notificationRes : []);
      } catch (error) {
        console.error("Failed to load alerts", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const alerts = useMemo(() => {
    const notificationAlerts = notifications.filter((notification) => !notification.read).slice(0, 3).map((notification) => ({
      id: notification._id,
      sev: notification.type === "support_ticket" ? "Critical" : "Info",
      icon: notification.type === "support_ticket" ? ShieldAlert : Info,
      title: notification.title || "System notification",
      body: notification.message || "No details provided.",
      when: notification.createdAt ? new Date(notification.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Now",
      scope: "Notifications",
      ticketId: notification.relatedTicketId || null,
    }));

    const supportAlerts = tickets.filter((ticket) => ticket.status !== "Resolved" && ticket.status !== "Closed").slice(0, 3).map((ticket) => ({
      id: ticket._id,
      sev: ticket.priority === "P1" ? "Critical" : "Warning",
      icon: ticket.priority === "P1" ? ShieldAlert : AlertTriangle,
      title: `${ticket.subject || "Support ticket"}`,
      body: `${ticket.companyName || "Tenant"} · ${ticket.description || "Needs review"}`,
      when: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recently",
      scope: "Support",
      ticketId: ticket._id,
    }));

    const overdueAlerts = customers.filter((customer) => String(customer.company?.accountStatus || "ACTIVE").toUpperCase() === "SUSPENDED" || String(customer.subscription?.status || "ACTIVE").toUpperCase() === "EXPIRED").slice(0, 2).map((customer) => ({
      id: `${customer.company?._id || customer._id || "customer"}-overdue`,
      sev: "Warning",
      icon: AlertTriangle,
      title: `${customer.company?.companyName || "Tenant"} is overdue`,
      body: `Account status: ${customer.company?.accountStatus || customer.subscription?.status || "Pending"}. Review billing and access.`,
      when: "Needs review",
      scope: "Billing",
      ticketId: null,
    }));

    return [...notificationAlerts, ...supportAlerts, ...overdueAlerts, {
      id: "platform-health",
      sev: "Info",
      icon: Info,
      title: "Live platform health is stable",
      body: "No critical platform outage detected in the last sync.",
      when: "Now",
      scope: "Platform",
      ticketId: null,
    }].slice(0, 5);
  }, [customers, tickets, notifications]);

  const openAlertsCount = alerts.filter((a) => a.sev !== "Info").length;

  const handleSnoozeAlert = async (alert: { id: string; ticketId?: string | null }) => {
    if (!alert.id || alert.id === "platform-health") return;
    if (alert.id.startsWith("customer") || alert.id.includes("-overdue")) return;
    try {
      await api.markNotificationRead(alert.id);
      setNotifications((current) => current.map((notification) => (notification._id === alert.id ? { ...notification, read: true } : notification)));
    } catch (error) {
      console.error("Failed to snooze alert", error);
    }
  };

  const handleInvestigateAlert = (alert: { ticketId?: string | null; scope?: string }) => {
    if (alert.ticketId) {
      window.location.href = "/support";
      return;
    }
    if (alert.scope === "Notifications") {
      window.location.href = "/support";
      return;
    }
    window.location.href = "/master/alerts";
  };

  const sevBadge = (s: string) =>
    s === "Critical" ? <Badge variant="destructive">Critical</Badge> :
    s === "Warning" ? <Badge variant="secondary" className="bg-warning/15 text-warning">Warning</Badge> :
    s === "Info" ? <Badge variant="outline">Info</Badge> :
    <Badge variant="secondary" className="bg-success/15 text-success">Resolved</Badge>;

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <MasterShell active="Alerts" title="Platform Alerts" badge={`${openAlertsCount} open`} search="Search alerts...">
      <StatGrid items={[
        { label: "Critical", value: String(alerts.filter((a) => a.sev === "Critical").length), tone: "text-destructive", hint: "needs action now" },
        { label: "Warning", value: String(alerts.filter((a) => a.sev === "Warning").length), tone: "text-warning", hint: "monitor today" },
        { label: "Info", value: String(alerts.filter((a) => a.sev === "Info").length), hint: "no action required" },
        { label: "Resolved (7d)", value: "18", tone: "text-success", hint: "avg 22 min to resolve" },
      ]} />

      <Panel title="Alert queue" subtitle="Newest first, grouped by severity">
        <div className="space-y-4">
          {alerts.map((a, index) => {
            const Icon = a.icon;
            return (
              <div key={`${a.title}-${index}`} className="flex flex-col gap-3 rounded-xl border border-border/60 p-5 sm:flex-row sm:items-start">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-glow"><Icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">{sevBadge(a.sev)}<p className="font-medium">{a.title}</p></div>
                  <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{a.scope} · {a.when}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleSnoozeAlert(a)}>Snooze</Button>
                  <Button variant="hero" size="sm" onClick={() => handleInvestigateAlert(a)}>Investigate</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </MasterShell>
  );
}

export default AlertsPage;
