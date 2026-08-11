import * as React from "react";
import { cn } from "@/src/lib/utils";
import { AuctionStatus, AUCTION_STATUS_LABELS } from "@/src/lib/auctions";

export function formatINR(n: number | null | undefined): string {
  return n == null ? "—" : `₹${n.toLocaleString("en-IN")}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function AuctionStatusBadge({
  status,
  className
}: {
  status: AuctionStatus | string;
  className?: string;
}) {
  const tones: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
    READY: "bg-amber-50 text-amber-700 border-amber-200",
    SCHEDULED: "bg-sky-50 text-sky-700 border-sky-200",
    LIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    EXTENDED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    CLOSING: "bg-amber-100 text-amber-800 border-amber-300",
    CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
    SELLER_REVIEW: "bg-violet-50 text-violet-700 border-violet-200",
    ACCEPTED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    EXPIRED: "bg-slate-100 text-slate-400 border-slate-200",
    CANCELLED: "bg-rose-50 text-rose-600 border-rose-200"
  };
  const label = AUCTION_STATUS_LABELS[status as AuctionStatus] || status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap",
        tones[status] || "bg-slate-100 text-slate-500 border-slate-200",
        status === "LIVE" && "animate-pulse",
        className
      )}
    >
      {status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {label}
    </span>
  );
}

export function AuctionCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const calc = () => Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  const [left, setLeft] = React.useState<number>(calc);

  React.useEffect(() => {
    setLeft(calc());
    const t = window.setInterval(() => setLeft(calc()), 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const urgent = left > 0 && left <= 300;

  if (left <= 0) {
    return <span className={cn("font-mono text-xs font-black text-slate-400", className)}>Ended</span>;
  }
  return (
    <span
      className={cn(
        "font-mono text-xs font-black tabular-nums",
        urgent ? "text-rose-600" : "text-slate-600",
        className
      )}
    >
      {h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}

export function Stat({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "bad" | "highlight";
}) {
  const tones = {
    default: "text-slate-800",
    good: "text-[#2E7D32]",
    bad: "text-rose-600",
    highlight: "text-[#ff5a07]"
  };
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
        {label}
      </p>
      <p className={cn("text-base font-black mt-1.5 tabular-nums", tones[tone])}>{value}</p>
    </div>
  );
}
