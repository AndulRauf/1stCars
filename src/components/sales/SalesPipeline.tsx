/**
 * Sales Pipeline — leads grouped by CRM stage
 * (NEW → CONTACTED → QUALIFIED → APPOINTMENT → TEST DRIVE →
 *  NEGOTIATION → BOOKED → SOLD, with LOST as terminal).
 * Legacy statuses map in via mapLegacyStatus.
 */
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { salesCrm, LeadRow, PIPELINE_STAGES, mapLegacyStatus, STAGE_LABELS, nextStages, stageIndex, PipelineStage } from "@/src/lib/salesCrm";
import type { SalesData } from "./SalesCrmBits";
import { CrmCard, EmptyState, StageBadge } from "./SalesCrmBits";

interface SalesPipelineProps {
  data: SalesData;
  userId: string;
  isAdmin: boolean;
}

export function SalesPipeline({ data, userId, isAdmin }: SalesPipelineProps) {
  const { leads, reload } = data;
  const [busy, setBusy] = React.useState(false);

  const columns = React.useMemo(() => {
    const cols: Record<string, LeadRow[]> = {};
    for (const s of PIPELINE_STAGES) cols[s] = [];
    cols.lost = [];
    for (const l of leads) {
      const st = mapLegacyStatus(l.status);
      (cols[st] || cols.lost).push(l);
    }
    return cols;
  }, [leads]);

  const advance = async (lead: LeadRow, stage: PipelineStage) => {
    setBusy(true);
    const res = await salesCrm.updateLeadStage(lead, stage);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { toast.success(`Moved to ${STAGE_LABELS[stage]}`); await reload(); }
  };

  const openCount = leads.filter((l) => {
    const s = mapLegacyStatus(l.status);
    return s !== "sold" && s !== "lost";
  }).length;

  if (leads.length === 0) {
    return (
      <CrmCard title="Sales Pipeline" subtitle="NEW → CONTACTED → QUALIFIED → APPOINTMENT → TEST DRIVE → NEGOTIATION → BOOKED → SOLD">
        <EmptyState icon={ArrowRight} title="No leads in the pipeline yet." hint="Leads appear here the moment buyers inquire about your cars." />
      </CrmCard>
    );
  }

  return (
    <CrmCard title="Sales Pipeline" subtitle={`${openCount} open lead${openCount === 1 ? "" : "s"} • drag-free stage advance`}>
      <div className="space-y-4">
        {[...PIPELINE_STAGES, "lost" as PipelineStage].map((stage) => {
          const rows = columns[stage] || [];
          if (rows.length === 0) return null;
          return (
            <div key={stage} className="border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <StageBadge status={stage} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {rows.length} lead{rows.length === 1 ? "" : "s"} • stage {stageIndex(stage as PipelineStage) + 1}
                </span>
              </div>
              <div className="space-y-2">
                {rows.map((lead) => {
                  const moves = nextStages(lead.status).filter((m) => m !== "lost");
                  const canEdit = isAdmin || !lead.assigned_to || lead.assigned_to === userId;
                  if (!canEdit) return null;
                  return (
                    <div key={lead.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-slate-100 rounded-xl px-3 py-2 bg-[#FAF9F6]">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{lead.name} • {lead.car_brand} {lead.car_model}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{lead.city} • {String(lead.type || "lead").replace(/_/g, " ")}</p>
                      </div>
                      <div className="flex gap-1.5 flex-wrap shrink-0">
                        {moves.map((m) => (
                          <Button
                            key={m}
                            size="sm"
                            onClick={() => void advance(lead, m)}
                            className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[9px] font-black uppercase tracking-wider h-7 rounded-lg px-2 flex items-center gap-1"
                          >
                            {STAGE_LABELS[m]} <ArrowRight className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </CrmCard>
  );
}
