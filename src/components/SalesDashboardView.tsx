/**
 * Sales Associate CRM — the upgraded "CRM Sales Desk".
 *
 * Phase 1 turns the old notifications console into a full CRM:
 *   Overview · My Cars · Leads · Follow-ups · Appointments ·
 *   Test Drives · Sales Pipeline · Activities
 *
 * All data is real (cars.created_by ownership + sales_notifications +
 * test_drives + follow_ups + audit_trail). Lead routing is enforced
 * server-side by public/sales_crm_phase1.sql.
 */
import * as React from "react";
import {
  LayoutDashboard, Car, ClipboardList, AlarmClock, Calendar,
  CalendarClock, GitBranch, History, ArrowLeft, ShieldCheck
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { useSalesData, Loading } from "@/src/components/sales/SalesCrmBits";
import { SalesOverview } from "@/src/components/sales/SalesOverview";
import { MyCars } from "@/src/components/sales/MyCars";
import { SalesLeads } from "@/src/components/sales/SalesLeads";
import { SalesPipeline } from "@/src/components/sales/SalesPipeline";
import { SalesFollowUps } from "@/src/components/sales/SalesFollowUps";
import { SalesAppointments } from "@/src/components/sales/SalesAppointments";
import { SalesActivities } from "@/src/components/sales/SalesActivities";

interface SalesDashboardViewProps {
  onBackToInventory: () => void;
  currentUserId?: string | null;
  userRole?: string | null;
}

type CrmTab = "overview" | "my_cars" | "leads" | "follow_ups" | "appointments" | "test_drives" | "pipeline" | "activities";

const TABS: { id: CrmTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "my_cars", label: "My Cars", icon: Car },
  { id: "leads", label: "Leads", icon: ClipboardList },
  { id: "follow_ups", label: "Follow-ups", icon: AlarmClock },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "test_drives", label: "Test Drives", icon: CalendarClock },
  { id: "pipeline", label: "Sales Pipeline", icon: GitBranch },
  { id: "activities", label: "Activities", icon: History }
];

export function SalesDashboardView({ onBackToInventory, currentUserId, userRole }: SalesDashboardViewProps) {
  const [tab, setTab] = React.useState<CrmTab>("overview");
  const [leadCarFilter, setLeadCarFilter] = React.useState<string | null>(null);
  const isAdmin = String(userRole || "").toLowerCase() === "admin";
  const data = useSalesData(currentUserId, isAdmin);

  const drillIntoLeads = (carId: string) => {
    setLeadCarFilter(carId);
    setTab("leads");
  };

  const navigate = (t: string) => {
    if (t !== "leads") setLeadCarFilter(null);
    setTab(t as CrmTab);
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-24 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Title block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-[#2E7D32] uppercase mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Sales Associate CRM
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {isAdmin ? "Sales CRM — All Associates" : "My Sales CRM"}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Cars you upload are owned by you — every buyer inquiry on them lands in your CRM automatically.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onBackToInventory}
            className="border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-wider h-10 px-4 rounded-xl flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Button>
        </div>

        {/* CRM navigation */}
        <div className="bg-white border border-slate-100 rounded-2xl p-2 shadow-sm flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { if (t.id !== "leads") setLeadCarFilter(null); setTab(t.id); }}
              className={`px-3.5 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                tab === t.id ? "bg-[#2E7D32] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        {data.loading ? (
          <Loading label="Loading your CRM..." />
        ) : data.error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-10 text-center">
            <p className="text-sm font-black text-rose-700">Could not load CRM data</p>
            <p className="text-xs text-rose-500 mt-1">{data.error}</p>
            <Button onClick={() => void data.reload()} className="mt-4 bg-[#2E7D32] text-white text-[10px] font-black uppercase tracking-wider h-9 px-4 rounded-xl">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {tab === "overview" && <SalesOverview data={data} onNavigate={navigate} />}
            {tab === "my_cars" && <MyCars data={data} onDrillIntoLeads={drillIntoLeads} />}
            {tab === "leads" && (
              <div className="space-y-4">
                {leadCarFilter && (
                  <button
                    onClick={() => setLeadCarFilter(null)}
                    className="text-[10px] font-black uppercase tracking-widest text-[#2E7D32] hover:underline cursor-pointer"
                  >
                    ← Clear vehicle filter
                  </button>
                )}
                <SalesLeads data={data} userId={currentUserId || ""} userName="Sales Associate" isAdmin={isAdmin} carIdFilter={leadCarFilter} />
              </div>
            )}
            {tab === "follow_ups" && <SalesFollowUps data={data} userId={currentUserId || ""} />}
            {tab === "appointments" && <SalesAppointments data={data} userId={currentUserId || ""} isAdmin={isAdmin} />}
            {tab === "test_drives" && <SalesAppointments data={data} userId={currentUserId || ""} isAdmin={isAdmin} />}
            {tab === "pipeline" && <SalesPipeline data={data} userId={currentUserId || ""} isAdmin={isAdmin} />}
            {tab === "activities" && <SalesActivities data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}

