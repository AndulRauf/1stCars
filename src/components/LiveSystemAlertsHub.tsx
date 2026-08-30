import * as React from "react";
import {
  BellRing, Search, X, Maximize2, Minimize2, CheckCheck, RefreshCw,
  Info, AlertTriangle, CheckCircle2, Zap, Inbox, ArrowRight, Clock, ShieldAlert
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Notification } from "@/src/lib/notifications";

type ReadFilter = "all" | "unread" | "read";
type KindFilter = Notification["type"] | "all";

const READ_FILTERS: { id: ReadFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" }
];

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All Types" },
  { id: "alert", label: "Alerts" },
  { id: "action", label: "Action" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" }
];

const KIND_META: Record<
  Notification["type"],
  { label: string; icon: any; lightCard: string; chip: string; dot: string }
> = {
  info: {
    label: "Info",
    icon: Info,
    lightCard: "border-sky-200/70 bg-sky-50/50",
    chip: "bg-sky-100 text-sky-700 border border-sky-200",
    dot: "bg-sky-500"
  },
  alert: {
    label: "Alert",
    icon: AlertTriangle,
    lightCard: "border-rose-200/80 bg-rose-50/50",
    chip: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500"
  },
  action: {
    label: "Action",
    icon: Zap,
    lightCard: "border-indigo-200/80 bg-indigo-50/50",
    chip: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-500"
  },
  success: {
    label: "Success",
    icon: CheckCircle2,
    lightCard: "border-emerald-200/80 bg-emerald-50/50",
    chip: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500"
  }
};

function fmtRelative(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtStamp(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface LiveSystemAlertsHubProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh?: () => void;
  roleName?: string;
}
function AlertCard({
  notification: n,
  onMarkRead,
  dark = false
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  dark?: boolean;
}) {
  const meta = KIND_META[n.type] || KIND_META.info;
  const Icon = meta.icon;

  if (dark) {
    return (
      <article
        className={cn(
          "relative flex flex-col gap-2.5 rounded-3xl border p-4 transition-all duration-200 group",
          !n.is_read
            ? "border-[#2E7D32]/50 bg-[#2E7D32]/10 shadow-lg shadow-black/20"
            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("shrink-0 rounded-xl p-2 border", meta.chip)}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">{fmtRelative(n.created_at)}</span>
          {!n.is_read && <span className={cn("h-2 w-2 rounded-full animate-pulse shrink-0 mt-1.5", meta.dot)} />}
        </div>
        <h4 className={cn("font-black text-sm leading-snug tracking-tight", n.is_read ? "text-slate-300" : "text-white")}>
          {n.title}
        </h4>
        <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">{n.message}</p>
        <div className="mt-auto pt-2 flex items-center justify-between gap-2 border-t border-white/5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{meta.label}</span>
          {!n.is_read && (
            <button
              onClick={() => onMarkRead(n.id)}
              className="text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <CheckCheck className="h-3 w-3" /> Mark read
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border p-3.5 transition-all duration-200 group",
        meta.lightCard,
        n.is_read ? "opacity-80" : "shadow-xs"
      )}
    >
      {!n.is_read && <span className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-full bg-[#2E7D32]" />}
      <div className="flex items-start justify-between gap-2">
        <span className={cn("shrink-0 rounded-lg p-1.5", meta.chip)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">{fmtRelative(n.created_at)}</span>
        {!n.is_read && <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse shrink-0 mt-1", meta.dot)} />}
      </div>
      <h4 className={cn("font-black text-xs leading-snug tracking-tight", n.is_read ? "text-slate-500" : "text-slate-900")}>
        {n.title}
      </h4>
      <p className="text-[11px] font-semibold text-slate-600 leading-relaxed line-clamp-3">{n.message}</p>
      <div className="mt-auto pt-1 flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{meta.label}</span>
        {!n.is_read && (
          <button
            onClick={() => onMarkRead(n.id)}
            className="text-[9px] font-black uppercase tracking-wider text-[#2E7D32] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3 w-3" /> Mark read
          </button>
        )}
      </div>
    </article>
  );
}
export function LiveSystemAlertsHub({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  roleName
}: LiveSystemAlertsHubProps) {
  const [fullScreen, setFullScreen] = React.useState(false);
  const [readFilter, setReadFilter] = React.useState<ReadFilter>("all");
  const [kindFilter, setKindFilter] = React.useState<KindFilter>("all");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      if (readFilter === "unread" && n.is_read) return false;
      if (readFilter === "read" && !n.is_read) return false;
      if (kindFilter !== "all" && n.type !== kindFilter) return false;
      if (q && !(`${n.title} ${n.message}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [notifications, readFilter, kindFilter, query]);

  React.useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullScreen]);
const totalAlerts = notifications.filter((n) => n.type === "alert").length;
  const actionNeeded = notifications.filter((n) => n.type === "action" && !n.is_read).length;
  const summaryLine = unreadCount > 0
    ? `${unreadCount} unread · ${notifications.length} total · ${actionNeeded} need action`
    : `${notifications.length} total · ${totalAlerts} critical · nothing pending`;

  return (
    <>
      {/* ============ EMBEDDED DASHBOARD MODE ============ */}
      <section className="bg-white border border-[#2E7D32]/15 rounded-3xl shadow-xs overflow-hidden">
        {/* Header */}
        <header className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0 h-11 w-11 rounded-2xl bg-[#2E7D32]/10 border border-[#2E7D32]/20 flex items-center justify-center">
              <BellRing className="h-5 w-5 text-[#2E7D32]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Live System Alerts Hub</h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                {roleName ? `${roleName} workspace` : "System feed"} · {summaryLine}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                title="Mark all as read"
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[#2E7D32]/25 bg-[#2E7D32]/5 text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={() => setFullScreen(true)}
              title="Open full-screen alerts hub"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-[#2E7D32]/40 hover:text-[#2E7D32] text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Full Screen
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-50">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {READ_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setReadFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap",
                  readFilter === f.id
                    ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search alerts..."
              className="w-full bg-[#FAF9F6] border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition-all font-medium"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
{/* Feed */}
        <div className="px-4 sm:px-6 py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
              <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2.5" />
              <p className="text-[11px] text-slate-400 font-bold">No alerts match the current filters.</p>
              {query || readFilter !== "all" || kindFilter !== "all" ? (
                <button
                  onClick={() => { setQuery(""); setReadFilter("all"); setKindFilter("all"); }}
                  className="mt-2 text-[10px] font-black text-[#2E7D32] uppercase tracking-wider hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1.5 pb-1">
              {filtered.map((n) => (
                <AlertCard key={n.id} notification={n} onMarkRead={onMarkRead} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-4 sm:px-6 pb-4 flex items-center justify-between gap-3 border-t border-slate-50 pt-3">
          <p className="text-[10px] text-slate-400 font-bold">
            {filtered.length} shown · {notifications.length} total · <span className="text-rose-500 font-black">{totalAlerts} critical</span>
          </p>
          <button
            onClick={() => setFullScreen(true)}
            className="inline-flex items-center gap-1 text-[10px] font-black text-[#2E7D32] hover:underline uppercase tracking-wider cursor-pointer"
          >
            Open alerts command center <ArrowRight className="h-3 w-3" />
          </button>
        </footer>
      </section>
{/* ============ FULL-SCREEN COMMAND CENTER ============ */}
      {fullScreen && (
        <div className="fixed inset-0 z-[100] bg-[#0C1510] overflow-hidden flex flex-col animate-in fade-in duration-200">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#2E7D32]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-48 -left-32 h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(46,125,50,0.10),transparent_55%)]" />

          {/* Top bar */}
          <header className="relative z-10 px-4 sm:px-6 lg:px-10 pt-5 pb-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setFullScreen(false)}
                title="Exit full screen (Esc)"
                className="shrink-0 h-10 w-10 rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:bg-[#2E7D32] hover:text-white hover:border-[#2E7D32] transition-all cursor-pointer flex items-center justify-center"
              >
                <Minimize2 className="h-4.5 w-4.5" />
              </button>
              <div className="shrink-0 h-12 w-12 rounded-2xl bg-[#2E7D32] text-white flex items-center justify-center shadow-lg shadow-[#2E7D32]/40">
                <BellRing className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-white text-base sm:text-xl uppercase tracking-wider flex items-center gap-2.5">
                  Live System Alerts Hub
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-widest">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate mt-0.5">
                  {roleName ? `${roleName} workspace` : "System feed"} · realtime notifications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              )}
              <button
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-[#2E7D32]/50 bg-[#2E7D32] text-white hover:bg-[#2E7D32]/90 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
              <button
                onClick={() => setFullScreen(false)}
                title="Close full-screen"
                className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:bg-rose-600/80 hover:border-rose-500/40 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Exit
              </button>
            </div>
          </header>

          {/* Stat strip */}
          <section className="relative z-10 px-4 sm:px-6 lg:px-10 pt-4 pb-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Alerts", val: notifications.length, icon: BellRing, tint: "text-slate-200" },
              { label: "Unread", val: unreadCount, icon: ShieldAlert, tint: "text-amber-400" },
              { label: "Critical", val: totalAlerts, icon: AlertTriangle, tint: "text-rose-400" },
              { label: "Action Needed", val: actionNeeded, icon: Zap, tint: "text-indigo-400" }
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 flex items-center gap-3">
                <div className="shrink-0 h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <s.icon className={`h-4 w-4 ${s.tint}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-black text-white leading-none">{s.val}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">{s.label}</div>
                </div>
              </div>
            ))}
          </section>
{/* Toolbar */}
          <section className="relative z-10 px-4 sm:px-6 lg:px-10 pt-4 pb-3 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-white/5">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search system alerts..."
                className="w-full h-11 bg-white/[0.06] border border-white/15 rounded-xl pl-10 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32]/60 transition-all font-medium"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {KIND_FILTERS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKindFilter(k.id as KindFilter)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap",
                    kindFilter === k.id
                      ? "bg-[#2E7D32] text-white border-[#2E7D32] shadow-sm"
                      : "bg-white/[0.05] text-slate-400 border-white/10 hover:bg-white/10"
                  )}
                >
                  {k.label}
                  {k.id === "alert" && totalAlerts > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-rose-500/30 text-rose-300 text-[8px]">{totalAlerts}</span>
                  )}
                  {k.id === "action" && actionNeeded > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 text-[8px]">{actionNeeded}</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Feed */}
          <main className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pt-5 pb-10 scrollbar-thin scrollbar-thumb-[#2E7D32]/40">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {filtered.length} of {notifications.length} alerts
                {kindFilter !== "all" && <span className="text-slate-400"> · type: {kindFilter}</span>}
              </p>
              <div className="flex items-center gap-1.5">
                {READ_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setReadFilter(f.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                      readFilter === f.id
                        ? "bg-white/10 text-white border-white/20"
                        : "text-slate-500 border-white/10 bg-white/[0.03] hover:bg-white/[0.08]"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl">
                <Inbox className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-bold">No alerts match the current filters.</p>
                <p className="text-[11px] text-slate-500 mt-1">Try adjusting the search or filter chips.</p>
                {query || readFilter !== "all" || kindFilter !== "all" ? (
                  <button
                    onClick={() => { setQuery(""); setReadFilter("all"); setKindFilter("all"); }}
                    className="mt-4 px-4 py-2 rounded-xl border border-[#2E7D32]/50 text-emerald-300 text-[10px] font-black uppercase tracking-wider hover:bg-[#2E7D32]/20 transition-all cursor-pointer"
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start pb-6">
                {filtered.map((n) => (
                  <AlertCard key={n.id} notification={n} onMarkRead={onMarkRead} dark />
                ))}
              </div>
            )}
          </main>

          {/* Footer hint */}
          <footer className="relative z-10 px-4 sm:px-6 lg:px-10 py-3 border-t border-white/10 flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Press{" "}
              <kbd className="px-1 py-0.5 rounded bg-white/10 border border-white/15 text-slate-300">Esc</kbd>{" "}
              to exit full screen
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {notifications.length > 0 ? fmtStamp(notifications[0].created_at) : "—"} · latest update
            </p>
          </footer>
        </div>
      )}
    </>
  );
}