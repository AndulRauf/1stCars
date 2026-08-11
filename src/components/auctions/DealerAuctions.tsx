import * as React from "react";
import { Gavel, RefreshCw, ClipboardList, Timer, Trophy, TrendingUp, Search, CheckCircle2, Wallet, X, History, Lock } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import {
  auctionService,
  AuctionRecord,
  AuctionPaymentRecord,
  AuctionActor,
  newClientRequestId,
  nextMinBid,
  AUCTION_OPEN_STATES,
  AUCTION_TERMINAL_STATES
} from "@/src/lib/auctions";
import { formatINR, formatDateTime, AuctionStatusBadge, AuctionCountdown, Stat } from "./AuctionBits";

interface DealerAuctionsProps {
  currentUser: { id: string; name?: string; role: string };
}

const OPEN_FILTER = "open";
const UPCOMING_FILTER = "upcoming";
const HISTORY_FILTER = "history";
const WON_FILTER = "won";

export function DealerAuctions({ currentUser }: DealerAuctionsProps) {
  const actor: AuctionActor = { userId: currentUser.id, role: currentUser.role };
  const [auctions, setAuctions] = React.useState<AuctionRecord[]>([]);
  const [cars, setCars] = React.useState<any[]>([]);
  const [inspections, setInspections] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<string>(OPEN_FILTER);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [detail, setDetail] = React.useState<AuctionRecord | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<AuctionPaymentRecord[]>([]);

  const [bidAmounts, setBidAmounts] = React.useState<Record<string, string>>({});
  const [bidBusy, setBidBusy] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [auctionList, carData, inspData] = await Promise.all([
        auctionService.listAuctions(actor),
        (supabase as any).from("cars").select("*"),
        (supabase as any).from("inspections").select("*")
      ]);
      setAuctions(auctionList);
      setCars(carData.data || []);
      setInspections(inspData.data || []);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor.userId, actor.role]);

  React.useEffect(() => {
    (async () => {
      await auctionService.ensureDemo();
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const hasOpen = auctions.some((a) => AUCTION_OPEN_STATES.includes(a.status));
    if (!hasOpen) return;
    const t = window.setInterval(() => reload(), 8000);
    return () => window.clearInterval(t);
  }, [auctions, reload]);

  React.useEffect(() => {
    if (!detail) return;
    (async () => {
      const [h, p] = await Promise.all([
        auctionService.getBidHistory(detail.id),
        auctionService.getPayments(detail.id)
      ]);
      setHistory(h);
      setPayments(p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id]);

  const vehicleOf = (a: AuctionRecord) => {
    const insp = inspections.find((i) => i.id === a.inspection_id);
    const car = cars.find((c) => c.id === a.car_id);
    return {
      title: insp ? `${insp.brand} ${insp.model}` : car ? `${car.brand} ${car.model}` : "Vehicle",
      year: insp?.year ?? car?.year,
      km_driven: insp?.km_driven ?? car?.km_driven,
      fuel: insp?.fuel ?? car?.fuel,
      transmission: insp?.transmission ?? car?.transmission,
      city: insp?.city ?? car?.city
    };
  };

  const openDetail = async (a: AuctionRecord) => {
    setDetail(a);
    if (AUCTION_OPEN_STATES.includes(a.status)) {
      await auctionService.markViewed(actor, a.id);
    }
  };

  const placeBid = async (a: AuctionRecord) => {
    const raw = (bidAmounts[a.id] || "").replace(/,/g, "").trim();
    const amount = Number(raw);
    if (!amount || isNaN(amount)) {
      toast.error("Enter a valid bid amount");
      return;
    }
    const min = nextMinBid(a);
    if (amount < min) {
      toast.error(`Minimum next bid is ${formatINR(min)}`);
      return;
    }
    setBidBusy(a.id);
    try {
      const result = await auctionService.placeBid(actor, a.id, amount, newClientRequestId());
      if (!result.success) {
        toast.error(result.error || "Bid failed");
        return;
      }
      toast.success(
        result.extended
          ? `Bid placed — auction extended due to last-minute bidding`
          : `Bid of ${formatINR(result.amount)} placed successfully`
      );
      setBidAmounts((m) => ({ ...m, [a.id]: "" }));
      await reload();
      if (detail?.id === a.id) {
        setHistory(await auctionService.getBidHistory(a.id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBidBusy(null);
    }
  };

  const stats = {
    open: auctions.filter((a) => AUCTION_OPEN_STATES.includes(a.status)).length,
    upcoming: auctions.filter((a) => a.status === "SCHEDULED" || a.status === "READY").length,
    won: auctions.filter((a) => a.status === "ACCEPTED" && a.winner_dealer_id === actor.userId).length,
    history: auctions.filter((a) => AUCTION_TERMINAL_STATES.includes(a.status)).length
  };

  const filtered = auctions.filter((a) => {
    if (filter === OPEN_FILTER && !AUCTION_OPEN_STATES.includes(a.status)) return false;
    if (filter === UPCOMING_FILTER && !["SCHEDULED", "READY"].includes(a.status)) return false;
    if (filter === WON_FILTER && !(a.status === "ACCEPTED" && a.winner_dealer_id === actor.userId)) return false;
    if (filter === HISTORY_FILTER && !AUCTION_TERMINAL_STATES.includes(a.status)) return false;
    const v = vehicleOf(a);
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${v.title} ${v.year} ${a.id}`.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white border border-[#2E7D32]/10 rounded-3xl p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#ff5a07]" /> Dealer Bidding Arena
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Compete with certified dealerships on freshly inspected vehicles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload} className="h-8 text-[10px] font-black uppercase tracking-wider rounded-xl" disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Live Now" value={stats.open} tone={stats.open > 0 ? "good" : "default"} />
        <Stat label="Upcoming" value={stats.upcoming} />
        <Stat label="Won" value={stats.won} tone="highlight" />
        <Stat label="In History" value={stats.history} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: OPEN_FILTER, label: "Live Now", icon: Timer },
          { id: UPCOMING_FILTER, label: "Upcoming", icon: Lock },
          { id: WON_FILTER, label: "Won / Paid", icon: Trophy },
          { id: HISTORY_FILTER, label: "History", icon: History }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
              filter === t.id
                ? "bg-[#2E7D32] text-white border-[#2E7D32]"
                : "bg-white text-slate-500 border-slate-200 hover:border-[#2E7D32]/40 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
        <div className="relative ml-auto w-full md:w-60">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your auctions..."
            className="w-full h-9 pl-9 pr-3 text-[11px] font-bold border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#2E7D32]"
          />
        </div>
      </div>

      {/* Auction cards */}
      {loading && auctions.length === 0 ? (
        <div className="text-center py-12 text-xs font-bold text-slate-400">Loading auctions…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
          <Gavel className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-bold">
            {filter === OPEN_FILTER ? "No live auctions for your dealership right now." :
             filter === UPCOMING_FILTER ? "No upcoming auctions scheduled." :
             filter === WON_FILTER ? "You haven't won any auctions yet." :
             "No auction history yet."}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">You'll be invited automatically when you're eligible for a sale.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((a) => {
            const v = vehicleOf(a);
            const isOpen = AUCTION_OPEN_STATES.includes(a.status);
            const minNext = nextMinBid(a);
            return (
              <div key={a.id} className="border border-slate-100 hover:border-[#2E7D32]/30 rounded-2xl p-5 bg-[#FAF9F6] space-y-4 shadow-sm transition-all">
                <div className="flex items-center justify-between gap-2">
                  <AuctionStatusBadge status={a.status} />
                  {isOpen ? (
                    <span className="text-[9px] font-mono text-slate-400">
                      Ends in <AuctionCountdown endsAt={a.ends_at} />
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-400">{formatDateTime(a.starts_at)} → {formatDateTime(a.ends_at)}</span>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-base">{v.year} {v.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {v.city} • {v.km_driven?.toLocaleString() || "—"} KM • {v.fuel} • {v.transmission}
                  </p>
                </div>

                <div className="h-px bg-slate-200/50" />

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Starting</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{formatINR(a.starting_bid)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl col-span-2">
                    <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest leading-none">Current High Bid</p>
                    <p className="text-sm font-black text-[#2E7D32] mt-1">{formatINR(a.current_highest_bid)}</p>
                  </div>
                </div>

                {isOpen && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                    <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Your next minimum bid</p>
                    <p className="text-sm font-black text-indigo-900 mt-0.5">{formatINR(minNext)}</p>
                  </div>
                )}

                {a.status === "ACCEPTED" && a.winner_dealer_id === actor.userId && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black text-emerald-800 flex items-center gap-1.5">
                      <Trophy className="h-4 w-4" /> You won this auction
                    </p>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-[9px] rounded-lg" onClick={() => openDetail(a)}>
                      <Wallet className="h-3 w-3" /> Payment
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1 text-[10px] font-black uppercase tracking-wider rounded-xl"
                    onClick={() => openDetail(a)}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Details & History
                  </Button>
                  {isOpen && (
                    <>
                      <Input
                        placeholder={`₹ Min ${minNext.toLocaleString("en-IN")}`}
                        type="number"
                        value={bidAmounts[a.id] || ""}
                        onChange={(e) => setBidAmounts((m) => ({ ...m, [a.id]: e.target.value }))}
                        className="h-9 text-[11px] rounded-xl flex-1 bg-white"
                      />
                      <Button
                        size="sm"
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl bg-[#2E7D32] hover:bg-[#25632a] text-white"
                        onClick={() => placeBid(a)}
                        disabled={bidBusy === a.id}
                      >
                        <TrendingUp className="h-3.5 w-3.5" /> {bidBusy === a.id ? "Placing…" : "Bid"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AuctionStatusBadge status={detail.status} />
                  <span className="text-[9px] font-mono text-slate-400">#{detail.id}</span>
                </div>
                <h3 className="font-black text-xl text-slate-900 mt-1.5">{vehicleOf(detail).year} {vehicleOf(detail).title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {vehicleOf(detail).city} • {formatDateTime(detail.starts_at)} → {formatDateTime(detail.ends_at)}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer self-start">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Starting</p>
                <p className="text-sm font-black text-slate-800 mt-1">{formatINR(detail.starting_bid)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest leading-none">High Bid</p>
                <p className="text-sm font-black text-[#2E7D32] mt-1">{formatINR(detail.current_highest_bid)}</p>
              </div>
              <div className="bg-white border border-slate-100 p-3 rounded-xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Reserve</p>
                <p className="text-sm font-black text-slate-800 mt-1">{formatINR(detail.reserve_price)}</p>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payments</p>
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-[#FAF9F6]">
                    <div>
                      <p className="text-[10px] font-black text-slate-800 flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5 text-[#2E7D32]" /> {formatINR(p.amount)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">{p.method || "—"} • {p.reference || ""}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                      p.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      p.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Bid History (masked)</p>
              {history.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-500 font-bold">No bids placed yet — be the first!</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {history.map((h, i) => (
                    <div key={h.bid_id || i} className={`flex items-center justify-between border rounded-xl px-3 py-2 ${
                      h.is_mine ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">#{h.rank}</span>
                        <span className="text-[11px] font-black text-slate-800">{formatINR(h.amount)}</span>
                        {h.is_mine && <CheckCircle2 className="h-3.5 w-3.5 text-[#2E7D32]" />}
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400">{formatDateTime(h.created_at)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{h.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)} className="h-9 px-4 text-[10px]">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
