/**
 * My Cars — vehicles owned by the logged-in Sales Associate
 * (cars.created_by) with live lead/appointment/test-drive counts.
 * Clicking the lead count drills into CRM Leads for that vehicle.
 */
import * as React from "react";
import { Car, Eye, Users, Calendar, ClipboardList } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { salesCrm } from "@/src/lib/salesCrm";
import type { SalesData } from "./SalesCrmBits";
import { CrmCard, EmptyState, StageBadge } from "./SalesCrmBits";

interface MyCarsProps {
  data: SalesData;
  onDrillIntoLeads: (carId: string) => void;
}

export function MyCars({ data, onDrillIntoLeads }: MyCarsProps) {
  const { cars, leads, testDrives, reload } = data;
  const counts = React.useMemo(() => salesCrm.countByCar(leads, testDrives), [leads, testDrives]);

  return (
    <CrmCard
      title="My Cars"
      subtitle="Vehicles you uploaded — each one routes its buyer leads to you automatically."
      actions={
        <Button size="sm" variant="outline" onClick={() => void reload()} className="border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5">
          Refresh
        </Button>
      }
    >
      {cars.length === 0 ? (
        <EmptyState icon={Car} title="You haven't uploaded any cars yet." hint="Use the Upload New Car tab — every car you upload makes you the owner of its buyer leads." />
      ) : (
        <div className="space-y-3">
          {cars.map((car) => {
            const c = counts[String(car.id)] || { leads: 0, appointments: 0, testDrives: 0 };
            const isLive = ["available", "listed"].includes(String(car.status));
            return (
              <div key={car.id} className="border border-slate-100 rounded-2xl p-4 bg-[#FAF9F6] flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      isLive ? "bg-[#2E7D32]/10 text-[#2E7D32]" : "bg-amber-100 text-amber-700"
                    }`}>
                      {isLive ? "Live" : String(car.status || "pending").replace(/_/g, " ")}
                    </span>
                    {car.overall_score != null && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        1stMark {car.overall_score}/10
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-slate-400">{new Date(car.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-base">{car.brand} {car.model} ({car.year})</h4>
                  <p className="text-[11px] text-slate-500 font-bold">
                    {car.variant || "—"} • {Number(car.km_driven || 0).toLocaleString()} km • {car.city || "Surat"}
                  </p>
                  <p className="text-sm font-black text-[#2E7D32]">₹{Number(car.price || 0).toLocaleString("en-IN")}</p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => onDrillIntoLeads(String(car.id))}
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 cursor-pointer hover:bg-sky-100 flex items-center gap-1"
                      title="Open CRM leads for this vehicle"
                    >
                      <Users className="h-3 w-3" /> {c.leads} Lead{c.leads === 1 ? "" : "s"}
                    </button>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {c.appointments} Appt{c.appointments === 1 ? "" : "s"}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" /> {c.testDrives} Test Drive{c.testDrives === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {isLive && (
                  <div className="flex items-start shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { window.location.hash = ""; window.open(`/cars/${car.id}`, "_blank"); }}
                      className="border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-wider h-8 rounded-lg px-2.5 flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CrmCard>
  );
}
