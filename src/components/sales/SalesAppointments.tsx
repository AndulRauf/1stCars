/**
 * CRM Appointments & Test Drives — backed by the EXISTING test_drives
 * table (sales_associate_id = the vehicle's owning associate; the
 * phase-1 trigger creates a scheduled row for every test-drive lead).
 */
import * as React from "react";
import { Calendar, Car, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { toast } from "@/src/lib/toast";
import { supabase, isRealSupabase } from "@/src/lib/supabaseClient";
import type { SalesData } from "./SalesCrmBits";
import { CrmCard, EmptyState, StageBadge } from "./SalesCrmBits";

interface SalesAppointmentsProps {
  data: SalesData;
  userId: string;
  isAdmin: boolean;
}

const TD_STATUS_LABELS: Record<string, string> = {
  pending: "Scheduled",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show"
};

export function SalesAppointments({ data, userId, isAdmin }: SalesAppointmentsProps) {
  // Appointments come from two existing sources:
  //  - test_drives rows (created by the phase-1 trigger / staff)
  //  - test-drive leads (sales_notifications type = test_drive)
  const { leads, testDrives, reload } = data;

  const updateTdStatus = async (id: string, status: string) => {
    if (!isRealSupabase) { toast.error("Switch to live Supabase to update test drives"); return; }
    const { error } = await supabase.from("test_drives").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Test drive marked ${TD_STATUS_LABELS[status] || status}`);
    await reload();
  };

  const tdLeadAppointments = leads.filter((l) => String(l.type || "").toLowerCase().includes("test_drive"));
  const today = new Date().toISOString().split("T")[0];

  return (
    <CrmCard
      title="Appointments & Test Drives"
      subtitle="Every test-drive inquiry creates an appointment owned by the vehicle's Sales Associate."
      actions={
        <Button size="sm" variant="outline" onClick={() => void reload()} className="border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      }
    >
      {/* Scheduled appointments from the test_drives table */}
      {testDrives.length === 0 ? (
        <EmptyState icon={Calendar} title="No test drives scheduled yet." hint="Test-drive inquiries automatically appear here." />
      ) : (
        <div className="space-y-2">
          {testDrives.map((td: any) => {
            const upcoming = String(td.preferred_date || td.date || "") >= today;
            return (
              <div key={td.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      upcoming ? "bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/20" : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {upcoming ? "Upcoming" : "Past"}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{td.lead_id ? "from lead" : "manual"}</span>
                  </div>
                  <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-[#2E7D32]" />
                    {td.car_title || (td.car_id ? `Vehicle ${String(td.car_id).substring(0, 8)}` : "Vehicle")}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {td.preferred_date || td.date} • {td.preferred_time || td.time} • {TD_STATUS_LABELS[String(td.status).toLowerCase()] || td.status}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5 flex-wrap shrink-0">
                    {["confirmed", "completed", "cancelled", "no_show"].map((s) => (
                      <Button key={s} size="sm" onClick={() => void updateTdStatus(String(td.id), s)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[9px] font-black uppercase h-7 rounded-lg px-2">
                        {TD_STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Raw test-drive inquiries (lead stage view) */}
      {tdLeadAppointments.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Test-drive inquiries</p>
          <div className="space-y-2">
            {tdLeadAppointments.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-xl px-3 py-2 bg-white">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{l.name} • {l.car_brand} {l.car_model}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{l.preferred_date} {l.preferred_time ? `• ${l.preferred_time}` : ""} • {l.city}</p>
                </div>
                <StageBadge status={l.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </CrmCard>
  );
}
