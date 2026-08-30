import * as React from "react";
import {
  BellRing, ChevronDown, ChevronUp, CheckCheck,
  Info, AlertTriangle, CheckCircle2, Zap
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Notification } from "@/src/lib/notifications";

const KIND_META: Record<
  Notification["type"],
  { label: string; icon: any; chip: string; dot: string }
> = {
  info: {
    label: "Info",
    icon: Info,
    chip: "bg-sky-100 text-sky-700 border border-sky-200",
    dot: "bg-sky-500"
  },
  alert: {
    label: "Alert",
    icon: AlertTriangle,
    chip: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500"
  },
  action: {
    label: "Action",
    icon: Zap,
    chip: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    dot: "bg-indigo-500"
  },
  success: {
    label: "Success",
    icon: CheckCircle2,
    chip: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500"
  }
};

function fmtRelative(iso?: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

interface LiveSystemAlertsHubProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh?: () => void;
  roleName?: string;
}

const EXPAND_KEY = "1stcars_alerts_hub_expanded";
const MAX_VISIBLE = 4;
export function LiveSystemAlertsHub({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  roleName
}: LiveSystemAlertsHubProps) {
  // Compact, collapsible alert dock — collapsed by default so it NEVER covers
  // the dashboard. Preference persists per browser.
  const [expanded, setExpanded] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(EXPAND_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showAll, setShowAll] = React.useState(false);

  const toggle = () => {
    setExpanded((e) => {
      const next = !e;
      try {
        localStorage.setItem(EXPAND_KEY, next ? "1" : "0");
      } catch {
        /* non-fatal */
      }
      return next;
    });
  };

  const shown = showAll ? notifications : notifications.slice(0, MAX_VISIBLE);
  const hiddenCount = notifications.length - shown.length;

  return (
    <div className="bg-white border border-[#2E7D32]/15 rounded-2xl shadow-xs">
      {/* Header — one slim row, always visible */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
          title={expanded ? "Minimize alerts" : "Expand alerts"}
        >
          <span className="relative shrink-0 h-9 w-9 rounded-xl bg-[#2E7D32]/10 border border-[#2E7D32]/20 flex items-center justify-center">
            <BellRing className="h-4 w-4 text-[#2E7D32]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-black text-xs text-slate-900 uppercase tracking-wider truncate group-hover:text-[#2E7D32] transition-colors">
              Live System Alerts Hub
            </span>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {roleName ? `${roleName} · ` : ""}{unreadCount > 0 ? `${unreadCount} unread` : "all caught up"} · {notifications.length} total
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-[#2E7D32]/25 text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark read
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#2E7D32] hover:border-[#2E7D32]/40 flex items-center justify-center transition-all cursor-pointer"
            title={expanded ? "Minimize" : "Expand"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
{/* Expanded list — compact rows only, capped height */}
      {expanded && (
        <div className="border-t border-slate-100 max-h-64 overflow-y-auto">
          {shown.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No system alerts right now</p>
            </div>
          )}
          {shown.map((n) => {
            const meta = KIND_META[n.type] || KIND_META.info;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-2.5 px-4 py-2.5 border-b border-slate-50 last:border-b-0 transition-colors",
                  !n.is_read && "bg-[#2E7D32]/[0.04]"
                )}
              >
                <span className={cn("shrink-0 rounded-lg p-1.5 mt-0.5", meta.chip)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-black text-[11px] tracking-tight truncate", n.is_read ? "text-slate-500" : "text-slate-900")}>
                      {n.title}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">{fmtRelative(n.created_at)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug line-clamp-1 mt-0.5">{n.message}</p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    title="Dismiss"
                    className="shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-white border border-[#2E7D32]/25 text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" /> Dismiss
                  </button>
                )}
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="w-full px-4 py-2 text-center text-[9px] font-black uppercase tracking-wider text-[#2E7D32] hover:bg-[#2E7D32]/5 transition-colors cursor-pointer"
            >
              {showAll ? "Show fewer" : `Show ${hiddenCount} more…`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}