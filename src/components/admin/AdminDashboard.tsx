import * as React from "react";
import { Activity, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
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
  isSeeding: boolean;
  onSeedDatabase: () => void;
  onNavigate: (mod: CMSModule, status?: string) => void;
}

interface FeedItem {
  text: string;
  category: string;
  ts: number;
}

const isCompletedAuction = (a: any) =>
  !["active", "live", "open", "pending"].includes(String(a.status || "").toLowerCase());

const monthKey = (date?: string) => (date ? String(date).slice(0, 7) : "");

const timeAgo = (ts: number) => {
  if (!ts) return "";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};

export function AdminDashboard({
  cars,
  users,
  auctions,
  inspections,
  notifications,
  pages,
  salesLeads,
  expenses,
  isSeeding,
  onSeedDatabase,
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

  // Real revenue vs expense, bucketed by month for the trailing 6 months.
  const chart = React.useMemo(() => {
    const revenueItems: { amount: number; key: string }[] = [];
    auctions
      .filter(isCompletedAuction)
      .forEach((a) => revenueItems.push({
        amount: Number(a.current_bid || a.base_price || 0),
        key: monthKey(a.sold_at || a.closed_at || a.created_at || a.updated_at)
      }));
    cars
      .filter((c) => String(c.status || "").toLowerCase() === "sold")
      .forEach((c) => revenueItems.push({
        amount: Number(c.price || c.selling_price || 0),
        key: monthKey(c.sold_at || c.updated_at || c.created_at)
      }));

    const expenseItems = expenses
      .filter((e) => Number(e.amount) > 0)
      .map((e) => ({ amount: Number(e.amount), key: monthKey(e.date) }));

    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en", { month: "short" })
      });
    }

    const bucket = (key: string, src: { amount: number; key: string }[]) =>
      src.filter((x) => x.key === key).reduce((sum, x) => sum + x.amount, 0);

    const rows = months.map((m) => ({
      label: m.label,
      rev: bucket(m.key, revenueItems),
      exp: bucket(m.key, expenseItems)
    }));

    const totalRev = revenueItems.reduce((s, x) => s + x.amount, 0);
    const totalExp = expenseItems.reduce((s, x) => s + x.amount, 0);
    const maxVal = Math.max(totalRev, totalExp, 1);
    return { rows, totalRev, totalExp, maxVal, empty: totalRev + totalExp === 0 };
  }, [auctions, cars, expenses]);

  // Real activity feed derived from actual records.
  const feed = React.useMemo(() => {
    const items: FeedItem[] = [];
    auctions.forEach((a) => {
      const status = String(a.status || "").toLowerCase();
      items.push({
        text: status === "active"
          ? `Live auction "${a.car_title || "Untitled"}" at ₹${Number(a.current_bid || a.base_price || 0).toLocaleString()} (${a.total_bids || 0} bids)`
          : `Auction "${a.car_title || "Untitled"}" ${status} at ₹${Number(a.current_bid || a.base_price || 0).toLocaleString()}`,
        category: "Auctions",
        ts: new Date(a.created_at || a.updated_at || 0).getTime()
      });
    });
    inspections.forEach((i) => items.push({
      text: `${i.brand || ""} ${i.model || ""} inspection ${i.status || "pending"}`,
      category: "Inspections",
      ts: new Date(i.updated_at || i.created_at || 0).getTime()
    }));
    leads.forEach((l) => items.push({
      text: `${l.type || "Lead"} from ${l.name || "a customer"}`,
      category: "CRM Leads",
      ts: new Date(l.created_at || 0).getTime()
    }));
    cars.forEach((c) => items.push({
      text: `${c.brand || ""} ${c.model || ""} (${c.year || ""}) added to inventory`,
      category: "Inventory",
      ts: new Date(c.created_at || c.updated_at || 0).getTime()
    }));
    notifications.forEach((n) => items.push({
      text: n.title || "New alert",
      category: "Alerts",
      ts: new Date(n.created_at || 0).getTime()
    }));
    return items
      .filter((x) => x.ts > 0)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6);
  }, [auctions, inspections, leads, cars, notifications]);

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-50 pb-2">
            Revenue vs Expense (Trailing 6 Months)
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Live from auctions, sold cars &amp; the expenses ledger
          </p>

          {chart.empty ? (
            <div className="py-10 text-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No financial data yet</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1.5">
                Close an auction or log an expense and the chart will populate with real figures.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {chart.rows.map((row, idx) => (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="text-slate-400 font-medium">
                      Rev: <strong className="text-emerald-600">₹{row.rev.toLocaleString()}</strong> • Exp: <strong className="text-rose-600">₹{row.exp.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div className="h-6 w-full bg-slate-50 rounded-lg overflow-hidden flex flex-col gap-0.5 justify-center px-1">
                    <div style={{ width: `${(row.rev / chart.maxVal) * 100}%` }} className="h-2 bg-emerald-600 rounded-full transition-all duration-500" />
                    <div style={{ width: `${(row.exp / chart.maxVal) * 100}%` }} className="h-1.5 bg-rose-500 rounded-full transition-all duration-500" />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Total Rev: <strong className="text-emerald-600">₹{chart.totalRev.toLocaleString()}</strong></span>
                <span>Total Exp: <strong className="text-rose-600">₹{chart.totalExp.toLocaleString()}</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-50 pb-2">
              Recent Activity
            </h3>
            {feed.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No activity yet</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1.5">
                  Live records (auctions, inspections, leads, cars) will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {feed.map((act, i) => (
                  <div key={i} className="text-[11px] font-semibold text-slate-600 border-b border-slate-50 pb-2 flex gap-2 items-start">
                    <Activity className="h-3.5 w-3.5 text-[#2E7D32] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-800 leading-tight">{act.text}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{act.category} • {timeAgo(act.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <Button
              onClick={onSeedDatabase}
              disabled={isSeeding}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              <Sparkles className={`h-4 w-4 ${isSeeding ? "animate-spin" : ""}`} />
              {isSeeding ? "Seeding Database..." : "Seed Supabase / Mock Data"}
            </Button>
            <p className="text-[9px] text-center text-slate-400 font-semibold uppercase tracking-wider">
              Inserts 20 demo cars, 10 brands, 50 models, &amp; 10 cities
            </p>
          </div>

          <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-slate-100 mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Encrypted secure session with Supabase live engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
