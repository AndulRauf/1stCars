import * as React from "react";
import { Database, ShieldCheck, Mail, Phone, Calendar, Clock, MapPin, Check, RefreshCw, Trash2, Award, Copy, CheckCircle2, Star, Plus } from "lucide-react";
import { SalesNotification, SUPABASE_SQL_DDL } from "@/src/lib/db";
import { supabase } from "@/src/lib/supabaseClient";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { cn } from "@/src/lib/utils";

interface SalesDashboardViewProps {
  onBackToInventory: () => void;
  currentUserId?: string | null;
}

export function SalesDashboardView({ onBackToInventory, currentUserId }: SalesDashboardViewProps) {
  const [notifications, setNotifications] = React.useState<SalesNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copiedSql, setCopiedSql] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<"all" | "pending" | "contacted" | "resolved">("all");

  // Fetch from our Supabase-ready mock storage
  const fetchNotifications = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("sales_notifications").select();
    if (data) {
      // Lead privacy rule: a logged-in Sales Associate only sees leads
      // auto-assigned to them (from cars THEY uploaded) plus the shared
      // unassigned pool — never leads assigned to another associate.
      const visible = currentUserId
        ? data.filter((l: any) => !l.assigned_to || l.assigned_to === currentUserId)
        : data;
      setNotifications(visible);
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  // Update Status Handlers
  const handleUpdateStatus = async (id: string, newStatus: "pending" | "contacted" | "resolved") => {
    await supabase.from("sales_notifications").update({ status: newStatus }).eq("id", id);
    fetchNotifications();
  };

  // Delete Lead
  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this lead from the database?")) {
      await supabase.from("sales_notifications").delete().eq("id", id);
      fetchNotifications();
    }
  };

  // SQL Copy to Clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_DDL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filtered list
  const filteredNotifications = React.useMemo(() => {
    if (activeFilter === "all") return notifications;
    return notifications.filter((n) => n.status === activeFilter);
  }, [notifications, activeFilter]);

  // Compute KPI metrics
  const stats = React.useMemo(() => {
    const total = notifications.length;
    const pending = notifications.filter((n) => n.status === "pending").length;
    const contacted = notifications.filter((n) => n.status === "contacted").length;
    const resolved = notifications.filter((n) => n.status === "resolved").length;
    return { total, pending, contacted, resolved };
  }, [notifications]);

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20 sm:pt-24 md:pt-28 pb-24 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-[#2E7D32] uppercase mb-1 flex items-center gap-1.5">
              <Database className="h-4 w-4" /> CRM Sales Desk Console
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
              Active Sales <span className="text-[#2E7D32]">Notifications</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Real-time workspace for Sales Associates to track premium test drives, inquiries, and booking leads logged in the database.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchNotifications}
              className="border-[#2E7D32]/10 text-slate-700 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-white"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button
              onClick={onBackToInventory}
              className="bg-[#2E7D32] hover:bg-[#25632a] text-white h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Browse Inventory
            </Button>
          </div>
        </div>

        {/* CRM KPI Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Leads", val: stats.total, color: "border-slate-100 bg-white" },
            { label: "Pending Review", val: stats.pending, color: "border-amber-200 bg-amber-50/40 text-amber-600" },
            { label: "In Discussion", val: stats.contacted, color: "border-blue-200 bg-blue-50/40 text-blue-600" },
            { label: "Acquired / Closed", val: stats.resolved, color: "border-emerald-200 bg-emerald-50/40 text-emerald-600" },
          ].map((stat, i) => (
            <div key={i} className={cn("border p-5 rounded-2xl flex flex-col justify-between shadow-sm", stat.color)}>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
              <span className="text-3xl font-black tracking-tight mt-1">{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Database Explorer Grid (Table / Card lists) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Records List (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Filter Toggle Headers */}
            <div className="bg-white border border-[#2E7D32]/10 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto shadow-sm">
              {[
                { id: "all", label: "All Database Leads" },
                { id: "pending", label: "Pending" },
                { id: "contacted", label: "Contacted" },
                { id: "resolved", label: "Resolved" },
              ].map((filterTab) => (
                <button
                  key={filterTab.id}
                  onClick={() => setActiveFilter(filterTab.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                    activeFilter === filterTab.id
                      ? "bg-[#2E7D32] text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {filterTab.label}
                </button>
              ))}
            </div>

            {/* Leads Listing Area */}
            {isLoading ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-xs">
                <RefreshCw className="h-8 w-8 text-[#2E7D32] animate-spin mx-auto mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Querying notifications table...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="space-y-4">
                {filteredNotifications.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "bg-white border rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row justify-between gap-5",
                      lead.status === "pending" && "border-amber-100 bg-amber-50/5",
                      lead.status === "contacted" && "border-blue-100 bg-blue-50/5",
                      lead.status === "resolved" && "border-emerald-100"
                    )}
                  >
                    {/* Record Details Column */}
                    <div className="space-y-3.5 flex-1 text-left">
                      
                      {/* Top status indicator row */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border-none text-white",
                          lead.type === "test_drive" ? "bg-[#2E7D32]" : lead.type === "buy_now" ? "bg-amber-600" : "bg-sky-600"
                        )}>
                          {lead.type.replace("_", " ")}
                        </Badge>

                        <Badge className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          lead.status === "pending" && "bg-amber-100 text-amber-700 border-amber-200",
                          lead.status === "contacted" && "bg-blue-100 text-blue-700 border-blue-200",
                          lead.status === "resolved" && "bg-emerald-100 text-emerald-700 border-emerald-200"
                        )}>
                          {lead.status}
                        </Badge>

                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {lead.id} • {new Date(lead.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Lead payload summary */}
                      <div>
                        <h4 className="font-black text-lg text-slate-900 tracking-tight">{lead.name}</h4>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
                          <MapPin className="h-3 w-3 text-slate-400" /> Lead Location: {lead.city}
                        </p>
                      </div>

                      {/* Contact metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                        <a href={`tel:${lead.mobile}`} className="flex items-center gap-2 hover:text-[#2E7D32]">
                          <Phone className="h-3.5 w-3.5 text-[#2E7D32]" />
                          <span>{lead.mobile}</span>
                        </a>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-[#2E7D32]" />
                          <span>Pref: {lead.preferred_date} ({lead.preferred_time})</span>
                        </div>
                      </div>

                      {/* Targeted vehicle segment */}
                      <div className="p-3 bg-[#FAF9F6] rounded-xl border border-slate-100 text-xs font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-[#2E7D32]" />
                          <span>Target Car: <strong className="text-slate-800">{lead.car_brand} {lead.car_model}</strong></span>
                        </div>
                      </div>

                      {lead.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          " {lead.notes} "
                        </p>
                      )}
                    </div>

                    {/* Active CRM status controls column */}
                    <div className="flex md:flex-col justify-end items-end gap-2 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                      
                      <div className="flex gap-1.5 w-full md:w-auto">
                        {lead.status !== "contacted" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(lead.id, "contacted")}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5"
                          >
                            Mark In Discussion
                          </Button>
                        )}
                        {lead.status !== "resolved" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(lead.id, "resolved")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider h-8 rounded-lg px-2.5"
                          >
                            ✔️ Mark Closed
                          </Button>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="border-rose-100 hover:bg-rose-50 text-rose-600 h-8 rounded-lg px-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-full md:w-auto justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Lead
                      </Button>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-16 text-center shadow-xs">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Database Empty or Solved</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  No active booking leads meet this criteria. Submit a new test drive booking from any car details screen to see it log here instantly!
                </p>
              </div>
            )}

          </div>

          {/* Developer SQL integration Guide (4 Columns) */}
          <div className="lg:col-span-4 bg-white border border-[#2E7D32]/10 rounded-3xl p-6 shadow-sm space-y-5 text-left">
            <div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-[#2E7D32]" /> Supabase DDL SQL
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This app uses an isolated database layout structure. Run the exact SQL script below in your Supabase SQL Editor to deploy the table instantly!
              </p>
            </div>

            <div className="h-px bg-slate-100" />

            {/* SQL DDL Snippet container */}
            <div className="relative">
              <pre className="text-[10px] font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl border border-slate-950 overflow-x-auto max-h-72 leading-relaxed whitespace-pre font-bold">
                {SUPABASE_SQL_DDL}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute right-3 top-3 p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer"
                title="Copy SQL code"
              >
                {copiedSql ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Integration checkmarks list */}
            <div className="p-4 bg-[#FAF9F6] border border-slate-100 rounded-xl space-y-2 text-xs font-bold text-slate-600">
              <p className="text-[10px] font-black text-[#2E7D32] uppercase tracking-widest">Supabase Setup Guide</p>
              <ul className="space-y-2 pt-1 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-[#2E7D32] font-black">1.</span>
                  <span>Install <code>@supabase/supabase-js</code> in project.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2E7D32] font-black">2.</span>
                  <span>Execute the SQL DDL above in your Supabase SQL Editor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2E7D32] font-black">3.</span>
                  <span>Update your env with <code>SUPABASE_URL</code> & <code>ANON_KEY</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2E7D32] font-black">4.</span>
                  <span>Swap out <code>supabaseMock</code> client for the live client!</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
