import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Plus, Send, CircleDashed, CheckCircle2, Clock3, Search, Download, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useCurrentMember } from "@/lib/mock-store";
import { MasterShell, Panel, StatGrid } from "@/components/layout/MasterShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type SupportMessage = {
  _id?: string;
  sender?: string;
  senderRole?: string;
  message?: string;
  createdAt?: string;
};

type SupportTicket = {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  owner?: string;
  createdBy?: string;
  requesterName?: string;
  companyName?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: SupportMessage[];
};

const priorityBadge = (priority: string) => {
  if (priority === "P1") return <Badge variant="destructive">P1</Badge>;
  if (priority === "P2") return <Badge variant="secondary" className="bg-warning/15 text-warning">P2</Badge>;
  return <Badge variant="outline">P3</Badge>;
};

const statusBadge = (status: string) => {
  if (status === "Open") return <Badge variant="secondary" className="bg-primary/15 text-primary-glow">Open</Badge>;
  if (status === "In progress") return <Badge variant="outline">In progress</Badge>;
  if (status === "Resolved") return <Badge variant="secondary" className="bg-success/15 text-success">Resolved</Badge>;
  return <Badge variant="secondary" className="bg-muted text-muted-foreground">Closed</Badge>;
};

export default function SupportPage() {
  const member = useCurrentMember();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", priority: "P2" });
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getSupportTickets();
      const list = Array.isArray(data) ? data : data?.tickets || [];
      setTickets(list);
      if (!selectedTicketId && list.length) setSelectedTicketId(list[0]._id);
    } catch (err: any) {
      setError(err.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (member) void loadTickets();
  }, [member]);

  const filteredTickets = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return tickets;
    return tickets.filter((ticket) => [
      ticket.ticketNumber,
      ticket.subject,
      ticket.description,
      ticket.companyName,
      ticket.requesterName,
      ticket.owner,
    ].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [tickets, search]);

  const selectedTicket = filteredTickets.find((ticket) => ticket._id === selectedTicketId) || filteredTickets[0] || null;
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleTickets = filteredTickets.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCreate = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    try {
      await api.createSupportTicket({
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
      });
      setNewTicket({ subject: "", description: "", priority: "P2" });
      await loadTickets();
    } catch (err: any) {
      setError(err.message || "Failed to create support ticket");
    }
  };

  const handleReply = async (ticketId: string) => {
    const text = (replyDrafts[ticketId] || "").trim();
    if (!text) return;
    try {
      await api.addSupportReply(ticketId, { message: text, senderName: member?.name || "User" });
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
      await loadTickets();
    } catch (err: any) {
      setError(err.message || "Failed to send reply");
    }
  };

  const handleStatus = async (ticketId: string, status: string) => {
    try {
      await api.updateSupportTicket(ticketId, { status });
      await loadTickets();
    } catch (err: any) {
      setError(err.message || "Failed to update ticket");
    }
  };

  const handleDelete = async (ticketId: string) => {
    try {
      await api.deleteSupportTicket(ticketId);
      await loadTickets();
      if (selectedTicketId === ticketId) {
        setSelectedTicketId(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete ticket");
    }
  };

  const exportTicketsCsv = () => {
    if (!filteredTickets.length) return;
    const rows = filteredTickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      company: ticket.companyName || "General",
      requester: ticket.requesterName || ticket.createdBy || "Unknown",
      owner: ticket.owner || "Unassigned",
      createdAt: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("en-IN") : "",
    }));

    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => `"${String(row[key as keyof typeof row] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "webdial-support-tickets.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Open tickets", value: String(tickets.filter((ticket) => ticket.status !== "Resolved" && ticket.status !== "Closed").length), hint: "Active queue", tone: "text-primary-glow" },
    { label: "P1 issues", value: String(tickets.filter((ticket) => ticket.priority === "P1").length), hint: "Critical", tone: "text-destructive" },
    { label: "Avg first response", value: "< 30 min", hint: "Based on ticket replies", tone: "text-success" },
    { label: "Resolved", value: String(tickets.filter((ticket) => ticket.status === "Resolved" || ticket.status === "Closed").length), hint: "Last 30 days", tone: "text-foreground" },
  ];

  return (
    <MasterShell
      active="Support Tickets"
      title={member?.role === "Master" ? "Support Tickets" : "Support"}
      badge={tickets.length ? `${tickets.length} tickets` : "No tickets"}
      search="Search ticket, company, subject..."
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Support center</h1>
          <p className="text-sm text-muted-foreground">Track client issues, update status and reply to ticket threads.</p>
        </div>
        <Button variant="outline" onClick={exportTicketsCsv} disabled={!filteredTickets.length}>
          <Download className="size-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="[&_.glass-card]:bg-white [&_.glass-card]:shadow-sm">
        <StatGrid items={stats} />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Ticket queue" subtitle="Live support cases from your company or all tenants" className="bg-white shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Loading tickets...</div>
            ) : visibleTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No support tickets found.</div>
            ) : (
              visibleTickets.map((ticket) => (
                <button
                  key={ticket._id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket._id)}
                  className={"w-full rounded-xl border p-4 text-left shadow-sm transition-colors " + (selectedTicket?._id === ticket._id ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-secondary/30")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{ticket.ticketNumber}</p>
                      <p className="mt-1 font-medium text-foreground">{ticket.subject}</p>
                    </div>
                    {priorityBadge(ticket.priority)}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{ticket.companyName || ticket.requesterName || "General"}</span>
                    {statusBadge(ticket.status)}
                  </div>
                </button>
              ))
            )}
          </div>
          {filteredTickets.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Showing {filteredTickets.length === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredTickets.length)} of {filteredTickets.length}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>Previous</Button>
                <span className="rounded border px-2 py-1 text-xs font-medium">{safePage}/{totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title={selectedTicket ? `${selectedTicket.ticketNumber} · ${selectedTicket.subject}` : "Ticket details"} subtitle={selectedTicket ? `Opened by ${selectedTicket.requesterName}` : "Select a ticket to view details"} className="bg-white shadow-sm">
          {selectedTicket ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {priorityBadge(selectedTicket.priority)}
                {statusBadge(selectedTicket.status)}
                <span className="text-xs text-muted-foreground">Owner: {selectedTicket.owner || 'Unassigned'}</span>
              </div>

              <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground shadow-sm">
                {selectedTicket.description}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleStatus(selectedTicket._id, "Open")}>Open</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleStatus(selectedTicket._id, "In progress")}>In progress</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleStatus(selectedTicket._id, "Resolved")}>Resolved</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleStatus(selectedTicket._id, "Closed")}>Closed</Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(selectedTicket._id)}>
                  <Trash2 className="size-4 mr-1" /> Delete
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Thread</h3>
                {(selectedTicket.messages || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No replies yet.</div>
                ) : (
                  <div className="space-y-3">
                    {(selectedTicket.messages || []).map((message, index) => (
                      <div key={`${message._id || index}-${message.createdAt}`} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{message.sender || 'User'}</span>
                          <span>{message.senderRole || 'user'}</span>
                        </div>
                        <p className="text-sm text-foreground">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground"><MessageSquareText className="size-4" /> Add reply</div>
                <Textarea
                  value={replyDrafts[selectedTicket._id] || ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [selectedTicket._id]: e.target.value }))}
                  placeholder="Type your reply to the customer..."
                  className="min-h-[110px]"
                />
                <div className="flex justify-end">
                  <Button onClick={() => handleReply(selectedTicket._id)}>
                    <Send className="size-4" /> Send reply
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">No ticket selected.</div>
          )}
        </Panel>
      </div>

      <Panel title="Create new ticket" subtitle="Raise a new support issue for your team or tenant" className="bg-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <Input
              value={newTicket.subject}
              onChange={(e) => setNewTicket((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="IVR routing issue, recordings missing, login error..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <select
              value={newTicket.priority}
              onChange={(e) => setNewTicket((prev) => ({ ...prev, priority: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <Textarea
            value={newTicket.description}
            onChange={(e) => setNewTicket((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the issue, include affected users, time, tenant, and any error message..."
            className="min-h-[120px]"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleCreate}>
            <Plus className="size-4" /> Create ticket
          </Button>
        </div>
      </Panel>
    </MasterShell>
  );
}
