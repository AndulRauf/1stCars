/**
 * CRM Leads — list with pipeline advance, claim + filters.
 * Detail view lives in LeadDetail.tsx. Used by both the standalone
 * Sales CRM (SalesDashboardView) and the RoleDashboards "leads" tab.
 */
import * as React from "react";
import { ClipboardList, RefreshCw, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { salesCrm, LeadRow, mapLegacyStatus, STAGE_LABELS, nextStages } from "@/src/lib/salesCrm";
import type { SalesData } from "./SalesCrmBits";
import { CrmCard, EmptyState, StageBadge } from "./SalesCrmBits";
import { LeadDetailPanel } from "./LeadDetail";

interface SalesLeadsProps {
  data: SalesData;
  userId: string;
  userName?: string;
  isAdmin: boolean;
  /** When set, only leads for this car are shown (My Cars drill-down). */
  carIdFilter?: string | null;
}

export function SalesLeads({ data, userId, userName, isAdmin, carIdFilter }: SalesLeadsProps) {
  const { leads, followUps, reload } = data;
  const [filter, setFilter] = React.useState<"all" | "mine" | "pool">("mine");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const visible = React.useMemo(() => {
    let rows = leads;
    if (carIdFilter) rows = rows.filter((l) => String(l.car_id) === String(carIdFilter));
    if (filter === "mine") rows = rows.filter((l) => l.assigned_to === userId);
    if (filter === "pool") rows = rows.filter((l) => !l.assigned_to);
    return rows;
  }, [leads, filter, carIdFilter, userId]);

  const selected = leads.find((l) => l.id === selectedId) || null;

  const advance = async (lead: LeadRow, stage: ReturnType<typeof mapLegacyStatus>) => {
    setBusy(true);
    const res = await salesCrm.updateLeadStage(lead, stage);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(`Lead moved to ${STAGE_LABELS[stage]}`);
      await reload();
    }
  };

  const claim = async (lead: LeadRow) => {
    setBusy(true);
    const res = await salesCrm.claimLead(lead.id, userId, userName || "Sales Associate");
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Lead claimed — it is now yours");
      await reload();
    }
  };

  if (visible.length === 0) {
    return (
      <CrmCard title="CRM Leads" subtitle="Every buyer inquiry routed to you — follow up, qualify, close.">
        <EmptyState
          icon={ClipboardList}
          title={carIdFilter ? "No leads for this vehicle yet." : filter === "pool" ? "The shared pool is empty." : "No leads assigned to you yet."}
          hint="Buyer inquiries from car detail pages land here automatically."
        />
      </CrmCard>
    );
  }

  return (
    <>
      <CrmCard
        title="CRM Leads"
        subtitle={`${visible.length} lead${visible.length === 1 ? "" : "s"}${carIdFilter ? " for this vehicle" : ""}`}
        actions={
          <div className="flex gap-1.5 flex-wrap">
            {(["mine", "pool", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border cursor-pointer transition-all ${
                  filter === f ? "bg-[#2E7D32] text-white border-[#2E7D32]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f === "mine" ? "My Leads" : f === "pool" ? "Unassigned Pool" : "All"}
              </button>
            ))}
            <button onClick={() => void reload()} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer" title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {visible.map((lead) => {
            const stage = mapLegacyStatus(lead.status);
            const moves = nextStages(lead.status);
            const isMine = lead.assigned_to === userId;
            return (
              <div key={lead.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] space-y-3">
                <div className="flex flex-col md:flex-row justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StageBadge status={lead.status} />
                      <span className="text-[9px] font-mono text-slate-400">#{String(lead.id).substring(0, 8)}</span>
                      {isMine && (
                        <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20">
                          Yours
                        </span>
                      )}
                      {!lead.assigned_to && (
                        <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Unassigned pool
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-slate-900 text-base truncate">{lead.name} • {lead.mobile}</h4>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-wider truncate">
                      {lead.car_brand} {lead.car_model} • {STAGE_LABELS[stage]} • {String(lead.type || "lead").replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {lead.city} • {lead.preferred_date || "—"} {lead.preferred_time ? `(${lead.preferred_time})` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-1.5 shrink-0">
                    {!lead.assigned_to && !isAdmin && (
                      <Button size="sm" disabled={busy} onClick={() => void claim(lead)} className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5">
                        <UserCheck className="h-3.5 w-3.5" /> Claim
                      </Button>
                    )}
                    {moves.map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        disabled={busy}
                        onClick={() => void advance(lead, m)}
                        className={m === "lost"
                          ? "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5"
                          : "bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5"}
                      >
                        {m === "lost" ? "Lost" : <><ArrowRight className="h-3 w-3" /> {STAGE_LABELS[m]}</>}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedId(lead.id)}
                      className="border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5"
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CrmCard>

      {selected && (
        <LeadDetailPanel
          lead={selected}
          followUps={followUps.filter((f) => !f.related_id || String(f.related_id) === String(selected.id))}
          userId={userId}
          userName={userName}
          isAdmin={isAdmin}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}

