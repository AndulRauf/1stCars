import * as React from "react";
import { 
  Gavel, ClipboardList, Users, Car, UserCheck, Bell, BookOpen,
  Plus, CheckCircle2, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { CMSModule } from "./adminNavData";

interface AdminDashboardProps {
  cars: any[];
  users: any[];
  auctions: any[];
  inspections: any[];
  notifications: any[];
  pages: any[];
  salesLeads: any[];
  expenses: any[];
  onNavigate: (mod: CMSModule, status?: string) => void;
}

const DAY_MS = 86400000;

// Bucket records into a daily count series for the trailing `days` days.
function dailyCounts(records: any[], days = 7): number[] {
  const out = Array(days).fill(0);
  const now = Date.now();
  for (const r of records) {
    const raw = r?.created_at || r?.date;
    const t = raw ? new Date(raw).getTime() : NaN;
    if (!t || isNaN(t)) continue;
    const diff = now - t;
    if (diff < 0 || diff >= days * DAY_MS) continue;
    const idx = days - 1 - Math.floor(diff / DAY_MS);
    if (idx >= 0 && idx < days) out[idx]++;
  }
  return out;
}

// % change of the trailing 7 days vs the 7 days before that (null when unknown).
function periodChange(records: any[]): number | null {
  const last = dailyCounts(records, 7).reduce((s, v) => s + v, 0);
  const prev = dailyCounts(records, 14).slice(0, 7).reduce((s, v) => s + v, 0);
  if (prev === 0) return last > 0 ? 100 : null;
  return Math.round(((last - prev) / prev) * 100);
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 64;
  const h = 20;
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const range = max || 1;
  const step = Math.max(1, data.length - 1);
  const pts = data
    .map((v, i) => `${((i / step) * w).toFixed(1)},${(h - 2 - ((v / range) * (h - 4))).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendChip({ change }: { change: number | null }) {
  if (change === null) return null;
  const up = change > 0;
  const flat = change === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black ${up ? "bg-emerald-50 text-emerald-600" : flat ? "bg-slate-100 text-slate-400" : "bg-rose-50 text-rose-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : flat ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{change}% 7d
    </span>
  );
}

export function AdminDashboard({
  cars,
  users,
  auctions,
  inspections,
  notifications,
  pages,
  salesLeads,
  expenses,
  onNavigate
}: AdminDashboardProps) {
  // CRM leads fall back to the legacy localStorage list (matches the lead
  // modules) so the KPI is correct even before any Supabase rows arrive.
  const leads = React.useMemo(() => {
    if (salesLeads.length > 0) return salesLeads;
    try {
      const raw = localStorage.getItem("1stcars_sales_leads");
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {}
    return [];
  }, [salesLeads]);

  const activeAuctionsCount = auctions.filter((a) => ["LIVE", "EXTENDED", "CLOSING"].includes(a.status)).length;
  const pendingInspsCount = inspections.filter((i) => i.status === "pending").length;
  const pendingCarsCount = cars.filter((c) => String(c.status || "").toLowerCase() === "pending").length;
  const totalExpensesLogged = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalUnreadAlerts = notifications.filter((n) => !n.is_read).length;
  const inventoryValue = cars.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
  const soldCount = cars.filter((c) => String(c.status || "").toLowerCase() === "sold").length;
  const readyCarsCount = cars.filter((c) => ["available", "listed", "inspection_completed", "ready_for_sale"].includes(String(c.status || "").toLowerCase())).length;

  const carSeries = dailyCounts(cars);
  const kpiCards = [
    { label: "Active Auctions", val: String(activeAuctionsCount), desc: "Dealer bidding open", color: "bg-indigo-500/10 text-indigo-600", mod: "auctions" as CMSModule, status: "live", icon: Gavel, series: [], change: null },
    { label: "Pending Evaluations", val: String(pendingInspsCount), desc: "Awaiting inspection", color: "bg-amber-500/10 text-amber-600", mod: "inspections" as CMSModule, status: "pending", icon: ClipboardList, series: dailyCounts(inspections), change: periodChange(inspections) },
    { label: "Inventory Value", val: `₹${(inventoryValue / 100000).toFixed(1)}L`, desc: `${cars.length} cars in catalog`, color: "bg-sky-500/10 text-sky-600", mod: "cars" as CMSModule, status: "all", icon: Car, series: carSeries, change: periodChange(cars) },
    { label: "Customer Leads", val: String(leads.length), desc: "Open CRM desk enquiries", color: "bg-emerald-500/10 text-emerald-600", mod: "dashboard" as CMSModule, status: "all", icon: Users, series: dailyCounts(leads), change: periodChange(leads) },
    { label: "Cars Ready to Sell", val: String(readyCarsCount), desc: pendingCarsCount > 0 ? `${pendingCarsCount} pending · ${soldCount} sold` : `${soldCount} sold this cycle`, color: pendingCarsCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600", mod: "cars" as CMSModule, status: pendingCarsCount > 0 ? "pending" : "all", icon: CheckCircle2, series: carSeries, change: periodChange(cars) },
    { label: "Registered Users", val: String(users.length), desc: `${users.filter((u) => u.role === "Dealer").length} dealers · ${users.filter((u) => u.role === "Sales Associate").length} sales reps`, color: "bg-violet-500/10 text-violet-600", mod: "users" as CMSModule, status: "all", icon: UserCheck, series: dailyCounts(users), change: periodChange(users) },
    { label: "Unread Alerts", val: String(totalUnreadAlerts), desc: "Notification ledger", color: "bg-orange-500/10 text-orange-600", mod: "notifications" as CMSModule, status: "all", icon: Bell, series: dailyCounts(notifications), change: periodChange(notifications) },
    { label: "Live Pages", val: String(pages.length), desc: `Expenses logged: ₹${totalExpensesLogged.toLocaleString()}`, color: "bg-teal-500/10 text-teal-600", mod: "pages" as CMSModule, status: "all", icon: BookOpen, series: [], change: null }
  ];

  const quickActions = [
    { label: "Add New Car", icon: Plus, mod: "cars" as CMSModule, status: "all", tone: "bg-[#2E7D32] text-white hover:bg-[#25632a]" },
    { label: "Approve Pending", icon: CheckCircle2, mod: "cars" as CMSModule, status: "pending", tone: "bg-[#ff5a07] text-white hover:bg-[#e04e00]" },
    { label: "Live Auctions", icon: Gavel, mod: "auctions" as CMSModule, status: "live", tone: "bg-indigo-600 text-white hover:bg-indigo-700" },
    { label: "Reports & Analytics", icon: TrendingUp, mod: "reports" as CMSModule, status: "all", tone: "bg-slate-800 text-white hover:bg-slate-700" }
  ];

  return (
    <div className="space-y-4">
      {/* Quick actions strip */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
          Quick Actions
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.mod, action.status)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs cursor-pointer transition-all hover:opacity-90 ${action.tone}`}
            >
              <action.icon className="h-3.5 w-3.5" /> {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card, i) => (
          <button
            key={i}
            onClick={() => onNavigate(card.mod, card.status)}
            className="group p-4 rounded-2xl border bg-white border-slate-200/80 shadow-xs cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 text-left flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </span>
              {card.change !== null && <TrendChip change={card.change} />}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{card.label}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5 leading-none">{card.val}</p>
            </div>
            <div className="flex items-end justify-between gap-2 mt-auto">
              <p className="text-[10px] text-slate-400 font-medium truncate">{card.desc}</p>
              {card.series.length > 0 && (
                <Sparkline data={card.series} color={card.change !== null && card.change > 0 ? "#16a34a" : card.change !== null && card.change < 0 ? "#e11d48" : "#2E7D32"} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Sparse data hint */}
      {cars.length === 0 && leads.length === 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-amber-800 flex items-center gap-2">
          <Bell className="h-4 w-4 shrink-0" />
          Fresh installation — no records yet. Use "Add New Record" in any module or the quick actions above to seed data.
        </div>
      )}
    </div>
  );
}