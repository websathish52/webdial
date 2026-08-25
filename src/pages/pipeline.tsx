import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentMember, dispoMeta, type Disposition } from "@/lib/mock-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Kanban, Plus, Search, Bot, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import api, { getSelectedCompanyId } from "@/lib/api";
import { useDispositionColors } from "@/lib/use-disposition-colors";

type Stage = { _id?: string; id?: string; name: string; color?: string; createdBy?: string };
type Deal = { _id?: string; id?: string; leadId?: any; stageId?: string; list?: string; value?: number };
type Lead = { _id?: string; id?: string; name?: string; email?: string; phone?: string; disposition?: string; list?: string; assignedTo?: string; };

type EnrichedDeal = Deal & { lead?: Lead; list: string; isTemp?: boolean; sourceLeadId?: string };

function PipelinePage() {
  useDispositionColors();
  const me = useCurrentMember();
  const [searchParams] = useSearchParams();
  const focusedPhone = searchParams.get("phone") || "";
  const isSuperAdmin = String(me?.role || '').toLowerCase() === 'superadmin';
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState("all");
  const [selectedDisposition, setSelectedDisposition] = useState("all");
  const [search, setSearch] = useState("");
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState("#6b7280");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pipelineRes, leadsRes, listsRes] = await Promise.all([
        api.getPipeline(),
        api.getLeads({ limit: 50000 }),
        api.getLists(),
      ]);
      setStages(Array.isArray(pipelineRes?.stages) ? pipelineRes.stages : []);
      setDeals(Array.isArray(pipelineRes?.deals) ? pipelineRes.deals : []);
      setLeads(Array.isArray(leadsRes?.leads) ? leadsRes.leads : []);
      setLists(Array.isArray(listsRes) ? listsRes.map((l: any) => l.name) : (listsRes?.lists || []).map((l: any) => l.name));
      setSelectedList((current) => current || "all");
      if (focusedPhone) setSearch(focusedPhone);
    } catch (err: any) {
      toast.error(err?.message || "Could not load pipeline data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [focusedPhone]);

  useEffect(() => {
    const handleCrmUpdated = () => { void loadData(); };
    window.addEventListener('ifox-crm-updated', handleCrmUpdated);
    return () => window.removeEventListener('ifox-crm-updated', handleCrmUpdated);
  }, []);

  const getDealLead = (deal: Deal) => {
    if (!deal.leadId) return undefined;
    if (typeof deal.leadId === 'object') return deal.leadId as Lead;
    return leads.find((lead) => (lead._id || lead.id) === deal.leadId);
  };

  const getDealList = (deal: Deal, lead?: Lead) => deal.list || lead?.list || 'Unassigned';

  const enrichedDeals: EnrichedDeal[] = deals.map((deal) => {
    const lead = getDealLead(deal);
    return { ...deal, lead, list: getDealList(deal, lead) };
  });

  const assignedLeadIds = new Set(
    enrichedDeals
      .map((deal) => {
        const id = typeof deal.leadId === 'string' ? deal.leadId : deal.leadId?._id || deal.leadId?.id;
        return id ? String(id) : undefined;
      })
      .filter(Boolean)
  );

  const relevantLeads = leads.filter(lead => {
    if (isSuperAdmin) return true;
    // For non-superadmins, show leads from their company.
    // We assume the backend already filters leads by company for non-superadmins.
    return true;
  });

  const unassignedLeads = relevantLeads.filter((lead) => {
    const leadId = String(lead._id || lead.id || '');
    return leadId && !assignedLeadIds.has(leadId);
  });

  const scoped = enrichedDeals.filter((deal) => selectedList === "all" || deal.list === selectedList);

  const onDragStart = (e: React.DragEvent, payload: { type: 'deal' | 'lead'; id: string; list?: string }) => {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const onDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const payloadText = e.dataTransfer.getData('application/json');
    if (!payloadText) return;

    try {
      const payload = JSON.parse(payloadText) as { type: 'deal' | 'lead'; id: string; list?: string };
      if (payload.type === 'deal') {
        const movedDeal = await api.moveDeal(payload.id, stageId); // This moves an existing deal
        setDeals(deals.map(d => (d._id || d.id) === payload.id ? movedDeal : d));
      } else if (payload.type === 'lead') {
        const newDeal = await api.addDeal({ leadId: payload.id, stageId, list: payload.list || 'Unassigned' }); // This creates a new deal for the current user
        setDeals([...deals, newDeal]);
      }
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Could not move deal');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Kanban className="size-7"/> Pipeline Stages</h1>
            <p className="opacity-90 mt-1 text-sm">Manage your sales pipeline and move deals forward</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Drag & Drop</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Database</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Real Leads</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["New","In progress","Won","Lost"].map((x) => (
            <span key={x} className="bg-white/15 px-3 py-1.5 rounded-full">{x}</span>
          ))}
        </div>
      </div>

      <div className="bg-blue-500/10 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0 sm:min-w-[200px]">
          <div className="text-xs text-muted-foreground mb-1">Select List</div>
          <Select value={selectedList} onValueChange={setSelectedList}>
            <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lists</SelectItem>
              {lists.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0 sm:min-w-[180px]">
          <div className="text-xs text-muted-foreground mb-1">Disposition</div>
          <Select value={selectedDisposition} onValueChange={setSelectedDisposition}>
            <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dispositions</SelectItem>
              {['new','interested','not_interested','callback','converted','dnd','no_answer','busy','wrong_number'].map((value) => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0 sm:min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-10 bg-card" placeholder="Phone / Name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="bg-primary shrink-0" size="icon" onClick={() => void loadData()} aria-label="Search pipeline"><Search className="size-4" /></Button>
        <Button className="bg-blue-600 shrink-0" size="icon" aria-label="Pipeline assistant"><Bot className="size-4" /></Button>
      </div>

      <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-4 touch-pan-x snap-x snap-mandatory">
        {stages.map((s) => {
          const isNewStage = (s.name || '').trim().toLowerCase() === 'new';
          const stageDeals = scoped
            .filter((d) => d.stageId === (s._id || s.id))
            .filter((d) => {
              const lead = d.lead;
              if (!lead) return false;
              const q = search.toLowerCase();
              const matchesSearch = !q || lead.name?.toLowerCase().includes(q) || lead.phone?.toLowerCase().includes(q);
              const matchesDisposition = selectedDisposition === 'all' || lead.disposition === selectedDisposition;
              return matchesSearch && matchesDisposition;
            });

          const extraLeads = isNewStage
            ? unassignedLeads
                .filter((lead) => selectedList === 'all' || lead.list === selectedList)
                .filter((lead) => {
                  const q = search.toLowerCase();
                  const matchesSearch = !q || lead.name?.toLowerCase().includes(q) || lead.phone?.toLowerCase().includes(q) || lead.email?.toLowerCase().includes(q);
                  const matchesDisposition = selectedDisposition === 'all' || lead.disposition === selectedDisposition;
                  return matchesSearch && matchesDisposition;
                })
                .map((lead) => ({
                  _id: `lead-${lead._id || lead.id}`,
                  id: `lead-${lead._id || lead.id}`,
                  lead,
                  list: lead.list || 'Unassigned',
                  value: undefined,
                  isTemp: true,
                  sourceLeadId: String(lead._id || lead.id),
                }))
            : [];

          const combinedDeals = [...extraLeads, ...stageDeals];

          return (
            <div key={s._id || s.id} className="w-[min(18rem,calc(100vw-2rem))] shrink-0 snap-start bg-card border rounded-xl flex flex-col max-h-[70vh]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => void onDrop(e, s._id || s.id || "") }>
              <div className="p-3 border-b flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: s.color }} /> {s.name}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold">{combinedDeals.length}</span>
                  {!['new', 'in progress', 'won', 'lost'].includes((s.name || '').trim().toLowerCase()) && (
                    <button
                      onClick={async () => {
                        if (confirm(`Delete stage "${s.name}"?`)) {
                          try {
                            await api.deleteStage(s._id || s.id || "");
                            await loadData();
                          } catch (err: any) {
                            toast.error(err?.message || "Could not delete stage");
                          }
                        }
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2 space-y-2 overflow-y-auto flex-1">
                {combinedDeals.map((d) => {
                  const disposition = d.lead?.disposition || 'new';
                  const dispositionMeta = dispoMeta(disposition as Disposition);
                  const dispositionLabel = dispositionMeta.label;
                  const dispositionColor = dispositionMeta.color;
                  const contactName = d.lead?.email || d.lead?.name || 'Unknown contact';
                  const initials = contactName
                    .split(/\s+|@/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: string) => part.charAt(0).toUpperCase())
                    .join('')
                    .slice(0, 2) || 'U';

                  return (
                    <div key={d._id || d.id} draggable onDragStart={(e) => onDragStart(e, { type: d.isTemp ? 'lead' : 'deal', id: d.isTemp ? d.sourceLeadId || '' : d._id || d.id || '', list: d.list })} className="bg-background border rounded-lg p-3 cursor-move hover:shadow-md transition">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-[10px] font-bold uppercase text-white px-2 py-0.5 rounded inline-block" style={{ background: dispositionColor }}>
                          {dispositionLabel}
                        </div>
                        <GripVertical className="size-3 text-muted-foreground" />
                      </div>
                      <div className="font-bold text-sm flex items-center justify-between gap-2">
                        <div className="truncate">{contactName}</div>
                        <div className="size-6 rounded-full text-white grid place-items-center text-[10px] font-bold shrink-0" style={{ background: dispositionColor }}>
                          {initials}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{d.lead?.phone || '—'}</div>
                      <div className="text-[11px] text-muted-foreground mt-2">List: {d.list || d.lead?.list || '—'}</div>
                      {d.value ? <div className="text-xs text-blue-600 font-bold mt-1">₹{d.value.toLocaleString()}</div> : null}
                    </div>
                  );
                })}
                {stageDeals.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg m-1">
                    <div className="text-2xl mb-2">═</div>
                    No Contacts Here Yet<br />Drop contacts here
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={() => setAddStageOpen(true)}
          className="w-72 shrink-0 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-semibold hover:bg-blue-50 grid place-items-center min-h-[200px]"
        >
          <div className="flex items-center gap-2"><Plus className="size-5"/> ADD STAGE</div>
        </button>
      </div>

      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pipeline Stage</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Stage name" value={stageName} onChange={(e) => setStageName(e.target.value)} />
            <div className="flex items-center gap-3">
              <label htmlFor="stageColor" className="text-sm font-medium">Stage Color</label>
              <input id="stageColor" type="color" value={stageColor} onChange={(e) => setStageColor(e.target.value)} className="h-8 w-14 p-1 border rounded-md" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              if (!stageName.trim()) return;
              try {
                const companyId = getSelectedCompanyId();
                const payload: any = { name: stageName.trim(), color: stageColor };
                if (companyId) {
                  payload.companyId = companyId;
                }
                if (isSuperAdmin && !payload.companyId) {
                  return toast.error("No company selected. Please select a company from the sidebar to create a stage.");
                }
                await api.createStage(payload);
                toast.success("Stage added");
                setStageName("");
                setAddStageOpen(false);
                await loadData();
              } catch (err: any) { toast.error(err?.message || "Could not add stage"); }
            }} className="bg-primary">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PipelinePage;
