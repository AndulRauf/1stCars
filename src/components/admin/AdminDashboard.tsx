import * as React from "react";
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

  const activeAuctionsCount = auctions.filter((a) => a.status === "active").length;
  const pendingInspsCount = inspections.filter((i) => i.status === "pending").length;
  const totalExpensesLogged = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalUnreadAlerts = notifications.filter((n) => !n.is_read).length;

  const kpiCards = [
    { label: "Active Auctions", val: activeAuctionsCount, desc: "Dealer bidding open", color: "bg-indigo-50 border-indigo-200 text-indigo-700", mod: "auctions" as CMSModule, status: "active" },
    { label: "Pending evaluations", val: pendingInspsCount, desc: "Awaiting inspection", color: "bg-amber-50 border-amber-200 text-amber-700", mod: "inspections" as CMSModule, status: "pending" },
    { label: "Logged Expenses", val: `₹${totalExpensesLogged.toLocaleString()}`, desc: "Ledger operating debit", color: "bg-rose-50 border-rose-200 text-rose-700", mod: "expenses" as CMSModule, status: "all" },
    { label: "Customer Leads", val: leads.length, desc: "Open CRM desk enquiries", color: "bg-emerald-50 border-emerald-200 text-emerald-700", mod: "dashboard" as CMSModule, status: "all" },
    { label: "Cars in Inventory", val: cars.length, desc: "Published catalog", color: "bg-sky-50 border-sky-200 text-sky-700", mod: "cars" as CMSModule, status: "all" },
    { label: "Registered Users", val: users.length, desc: "Total profiles", color: "bg-violet-50 border-violet-200 text-violet-700", mod: "users" as CMSModule, status: "all" },
    { label: "Unread Alerts", val: totalUnreadAlerts, desc: "Notification ledger", color: "bg-orange-50 border-orange-200 text-orange-700", mod: "notifications" as CMSModule, status: "all" },
    { label: "Live Pages", val: pages.length, desc: "Custom + footer pages", color: "bg-teal-50 border-teal-200 text-teal-700", mod: "pages" as CMSModule, status: "all" }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.slice(0, 4).map((card, i) => (
          <button
            key={i}
            onClick={() => onNavigate(card.mod, card.status)}
            className={`p-5 rounded-2xl border text-xs font-semibold flex flex-col justify-between shadow-xs cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md hover:opacity-95 text-left ${card.color}`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="text-2xl font-black mt-2 leading-none">{card.val}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{card.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.slice(4).map((card, i) => (
          <button
            key={i}
            onClick={() => onNavigate(card.mod, card.status)}
            className={`p-5 rounded-2xl border text-xs font-semibold flex flex-col justify-between shadow-xs cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md hover:opacity-95 text-left ${card.color}`}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="text-2xl font-black mt-2 leading-none">{card.val}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
