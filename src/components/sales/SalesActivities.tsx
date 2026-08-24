/**
 * CRM Activities — chronological activity history built on the
 * EXISTING audit_trail + automation_events (no new logging tables).
 */
import * as React from "react";
import { History } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { salesCrm, LeadRow, SalesActivity } from "@/src/lib/salesCrm";
import type { SalesData } from "./SalesCrmBits";
import { CrmCard, EmptyState } from "./SalesCrmBits";

interface SalesActivitiesProps {
  data: SalesData;
}

export function SalesActivities({ data }: SalesActivitiesProps) {
  const { leads, reload } = data;
  const [rows, setRows] = React.useState<SalesActivity[]>([]);
  const [loading, setLoading] = React.useState(true);

  const leadById = React.useMemo(() => {
    const m = new Map<string, LeadRow>();
    for (const l of leads) m.set(String(l.id), l);
    return m;
  }, [leads]);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      // Activities for the associate's leads (audit trail + automation events),
      // capped so very large CRMs stay fast.
      const all: SalesActivity[] = [];
      const perLead = await Promise.all(leads.slice(0, 50).map((l) => salesCrm.getLeadActivities(l.id)));
      perLead.forEach((list, i) => {
        const lead = leads[i];
        for (const a of list) {
          all.push({ ...a, detail: a.detail || `${lead.name} • ${lead.car_brand} ${lead.car_model}` });
        }
      });
      const seen = new Set<string>();
      setRows(
        all
          .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 120)
      );
      setLoading(false);
    })();
  }, [leads]);

  return (
    <div>
      <CrmCard
        title="Activities"
        subtitle="Chronological CRM history — lead created, assigned, followed up, stage changes."
        actions={
          <Button size="sm" variant="outline" onClick={() => void reload()} className="border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5">
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center py-8">Loading activities...</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title="No activity yet." hint="Lead events and stage changes are logged here automatically." />
        ) : (
          <div className="space-y-1.5">
            {rows.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-xs border-l-2 border-[#2E7D32]/30 pl-3 py-1.5">
                <div className="min-w-0">
                  <span className="font-black text-slate-700">{a.label}</span>
                  {a.detail && <span className="text-slate-400 font-bold"> • {a.detail}</span>}
                </div>
                <span className="text-[9px] text-slate-400 font-bold shrink-0">{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CrmCard>
    </div>
  );
}
