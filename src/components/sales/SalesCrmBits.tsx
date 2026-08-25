/**
 * Shared UI primitives + data hook for the Sales Associate CRM.
 * Uses the existing 1stCars design language: #2E7D32 green, white
 * rounded cards, Tailwind, existing Button/Badge components.
 */
import * as React from "react";
import { salesCrm, LeadRow, MyCarRow, mapLegacyStatus, STAGE_LABELS, PipelineStage } from "@/src/lib/salesCrm";
import type { FollowUp } from "@/src/lib/automation";

export interface SalesData {
  leads: LeadRow[];
  cars: MyCarRow[];
  testDrives: any[];
  followUps: FollowUp[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

/** Loads every CRM dataset the tabs need, with one shared reload. */
export function useSalesData(userId: string | null | undefined, isAdmin: boolean): SalesData {
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [cars, setCars] = React.useState<MyCarRow[]>([]);
  const [testDrives, setTestDrives] = React.useState<any[]>([]);
  const [followUps, setFollowUps] = React.useState<FollowUp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [l, c, td] = await Promise.all([
        salesCrm.getLeads(userId, isAdmin),
        userId ? salesCrm.getMyCars(userId, isAdmin) : Promise.resolve([] as MyCarRow[]),
        salesCrm.getTestDrives(userId, isAdmin)
      ]);
      setLeads(l);
      setCars(c);
      setTestDrives(td);
      setFollowUps(await salesCrm.getFollowUpsFor(l.map((x) => x.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { leads, cars, testDrives, followUps, loading, error, reload };
}

export function KpiCard({ label, value, tone = "slate", onClick }: {
  label: string;
  value: number | string;
  tone?: "green" | "amber" | "sky" | "indigo" | "rose" | "slate";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    green: "text-[#2E7D32]",
    amber: "text-amber-600",
    sky: "text-sky-600",
    indigo: "text-indigo-600",
    rose: "text-rose-600",
    slate: "text-slate-900"
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-4 rounded-2xl border bg-white border-slate-200/80 shadow-xs text-left transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "cursor-default"}`}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-2xl font-black mt-1 leading-none ${tones[tone]}`}>{value}</p>
    </button>
  );
}

export function StageBadge({ status }: { status?: string | null }) {
  const stage = mapLegacyStatus(status);
  const tones: Record<string, string> = {
    new: "bg-slate-100 text-slate-600 border-slate-200",
    contacted: "bg-sky-50 text-sky-700 border-sky-200",
    qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
    appointment: "bg-violet-50 text-violet-700 border-violet-200",
    test_drive: "bg-amber-50 text-amber-700 border-amber-200",
    negotiation: "bg-orange-50 text-orange-700 border-orange-200",
    booked: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sold: "bg-[#2E7D32] text-white border-[#2E7D32]",
    lost: "bg-rose-50 text-rose-600 border-rose-200"
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${tones[stage]}`}>
      {STAGE_LABELS[stage as PipelineStage]}
    </span>
  );
}

export function CrmCard({ title, subtitle, children, actions }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-sm">
      <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-black text-xl text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
      <Icon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
      <p className="text-xs text-slate-500 font-bold">{title}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Loading({ label = "Loading CRM data..." }: { label?: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-xs">
      <div className="h-10 w-10 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}
