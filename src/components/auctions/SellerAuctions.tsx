import * as React from "react";
import { Gavel, RefreshCw, ClipboardList, CheckCircle2, XCircle, Trophy, Wallet, X, Search, DollarSign, History, AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import {
  auctionService,
  AuctionRecord,
  AuctionPaymentRecord,
  AuctionActor,
  AUCTION_OPEN_STATES,
  AUCTION_TERMINAL_STATES
} from "@/src/lib/auctions";
import { formatINR, formatDateTime, AuctionStatusBadge, Stat } from "./AuctionBits";

interface SellerAuctionsProps {
  currentUser: { id: string; name?: string; role: string };
}

const REVIEW_FILTER = "review";
const LIVE_FILTER = "live";
const SETTLED_FILTER = "settled";

export function SellerAuctions({ currentUser }: SellerAuctionsProps) {
  const actor: AuctionActor = { userId: currentUser.id, role: currentUser.role };
  const [auctions, setAuctions] = React.useState<AuctionRecord[]>([]);
  const [cars, setCars] = React.useState<any[]>([]);
  const [inspections, setInspections] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<string>(REVIEW_FILTER);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [detail, setDetail] = React.useState<AuctionRecord | null>(null);
  const [payments, setPayments] = React.useState<AuctionPaymentRecord[]>([]);

  const [confirm, setConfirm] = React.useState<{ auction: AuctionRecord; kind: "accept" | "reject" } | null>(null);
  const [confirmReason, setConfirmReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

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
    if (!detail) return;
    (async () => {
      setPayments(await auctionService.getPayments(detail.id));
    })();
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

  const decide = async () => {
    if (!confirm) return;
    const { auction, kind } = confirm;
    if (kind === "reject" && !confirmReason.trim()) {
      toast.error("Provide a reason for rejecting the auction result");
      return;
    }
    setBusy(true);
    try {
      await auctionService.sellerDecision(actor, auction.id, kind === "accept" ? "ACCEPT" : "REJECT", confirmReason.trim() || undefined);
      toast.success(kind === "accept" ? "Result accepted — the winning dealer has been routed to payment" : "Result rejected — the vehicle is now released to you");
      await reload();
      if (detail?.id === auction.id) setDetail(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setConfirm(null);
      setConfirmReason("");
    }
  };

  const stats = {
    review: auctions.filter((a) => a.status === "SELLER_REVIEW").length,
    live: auctions.filter((a) => AUCTION_OPEN_STATES.includes(a.status)).length,
    settled: auctions.filter((a) => AUCTION_TERMINAL_STATES.includes(a.status)).length,
    total: auctions.length
  };

  const filtered = auctions.filter((a) => {
    if (filter === REVIEW_FILTER && a.status !== "SELLER_REVIEW") return false;
    if (filter === LIVE_FILTER && !AUCTION_OPEN_STATES.includes(a.status)) return false;
    if (filter === SETTLED_FILTER && !AUCTION_TERMINAL_STATES.includes(a.status)) return false;
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
            <Gavel className="h-5 w-5 text-[#ff5a07]" /> My Car Auctions
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Track your vehicles through live dealer bidding and settle results.</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="h-8 text-[10px] font-black uppercase tracking-wider rounded-xl" disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Awaiting Your Decision" value={stats.review} tone={stats.review > 0 ? "bad" : "default"} />
        <Stat label="Live Now" value={stats.live} tone={stats.live > 0 ? "good" : "default"} />
        <Stat label="Settled" value={stats.settled} />
        <Stat label="Total Auctions" value={stats.total} tone="highlight" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: REVIEW_FILTER, label: "Needs Decision", icon: ClipboardList },
          { id: LIVE_FILTER, label: "Live", icon: Gavel },
          { id: SETTLED_FILTER, label: "Settled", icon: History }
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
            placeholder="Search your vehicles..."
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
            {filter === REVIEW_FILTER ? "No auction results awaiting your decision." :
             filter === LIVE_FILTER ? "None of your vehicles are in live bidding right now." :
             "No settled auctions yet."}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed inspections enter dealer live bidding automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((a) => {
            const v = vehicleOf(a);
            const isReview = a.status === "SELLER_REVIEW";
            const isSettled = AUCTION_TERMINAL_STATES.includes(a.status);
            return (
              <div key={a.id} className="border border-slate-100 hover:border-[#2E7D32]/30 rounded-2xl p-5 bg-[#FAF9F6] space-y-4 shadow-sm transition-all">
                <div className="flex items-center justify-between gap-2">
                  <AuctionStatusBadge status={a.status} />
                  <span className="text-[9px] font-mono text-slate-400">#{a.id.substring(0, 8)}</span>
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-base">{v.year} {v.title}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {v.city} • {v.km_driven?.toLocaleString() || "—"} KM • {v.fuel} • {v.transmission}
                  </p>
                </div>

                <div className="h-px bg-slate-200/50" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white border border-slate-100 p-2.5 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Starting</p>
                    <p className="text-sm font-black text-slate-800 mt-1">{formatINR(a.starting_bid)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                    <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest leading-none">Final / High Bid</p>
                    <p className="text-sm font-black text-[#2E7D32] mt-1">{formatINR(a.current_highest_bid)}</p>
                  </div>
                </div>

                {isReview && (
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-violet-600 shrink-0" />
                    <p className="text-[10px] font-bold text-violet-800">
                      The auction closed at <strong>{formatINR(a.current_highest_bid)}</strong>. Accept to proceed with the sale, or reject to keep your vehicle.
                    </p>
                  </div>
                )}

                {isSettled && a.status === "ACCEPTED" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-800">
                      Sale settled at <strong>{formatINR(a.current_highest_bid)}</strong> — the winning dealer is completing payment.
                    </p>
                  </div>
                )}
                {isSettled && a.status === "REJECTED" && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <p className="text-[10px] font-bold text-rose-800">
                      Result rejected{a.ended_reason ? ` — ${a.ended_reason}` : ""}. Your vehicle has been released.
                    </p>
                  </div>
                )}
                {isSettled && a.status === "EXPIRED" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-600">Auction expired without a confirmed sale.</p>
                  </div>
                )}
                {isSettled && a.status === "CANCELLED" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-600">Auction cancelled — vehicle released.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9 flex-1 text-[10px] font-black uppercase tracking-wider rounded-xl" onClick={() => setDetail(a)}>
                    <ClipboardList className="h-3.5 w-3.5" /> Details
                  </Button>
                  {isReview && (
                    <>
                      <Button
                        size="sm"
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl bg-[#2E7D32] hover:bg-[#25632a] text-white"
                        onClick={() => { setConfirm({ auction: a, kind: "accept" }); setConfirmReason(""); }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl"
                        onClick={() => { setConfirm({ auction: a, kind: "reject" }); setConfirmReason(""); }}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ DECISION MODAL ============ */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">
                  {confirm.kind === "accept" ? "Accept Auction Result" : "Reject Auction Result"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">{vehicleOf(confirm.auction).title} • #{confirm.auction.id.substring(0, 8)}</p>
              </div>
              <button onClick={() => { setConfirm(null); setConfirmReason(""); }} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {confirm.kind === "accept" ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800">
                  You'll sell at <strong>{formatINR(confirm.auction.current_highest_bid)}</strong> and the winning dealer will be routed to payment.
                </div>
              ) : (
                <Input
                  label="Rejection Reason (required)"
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  placeholder="e.g. Price too low, changed my mind"
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setConfirm(null); setConfirmReason(""); }} className="h-9 px-4 text-[10px]">Keep</Button>
              <Button
                size="sm"
                onClick={decide}
                disabled={busy}
                variant={confirm.kind === "accept" ? "primary" : "destructive"}
                className={confirm.kind === "accept" ? "h-9 px-5 text-[10px] bg-[#2E7D32] hover:bg-[#25632a] text-white" : "h-9 px-5 text-[10px]"}
              >
                {busy ? "Working…" : confirm.kind === "accept" ? "Confirm Sale" : "Reject Result"}
              </Button>
            </div>
          </div>
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

            <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div>
                <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Winning Dealer</p>
                <p className="text-sm font-black text-indigo-900 mt-0.5">{detail.winner_dealer_id ? `Dealer #${detail.winner_dealer_id.substring(0, 8)}` : "No confirmed winner yet"}</p>
              </div>
              <Wallet className="h-5 w-5 text-indigo-400" />
            </div>

            {payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dealer Payments</p>
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-[#FAF9F6]">
                    <div>
                      <p className="text-[10px] font-black text-slate-800 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-[#2E7D32]" /> {formatINR(p.amount)}
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

            {detail.status === "SELLER_REVIEW" && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  className="h-9 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl bg-[#2E7D32] hover:bg-[#25632a] text-white"
                  onClick={() => { setConfirm({ auction: detail, kind: "accept" }); setConfirmReason(""); }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accept Result
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 px-4 text-[10px] font-black uppercase tracking-wider rounded-xl"
                  onClick={() => { setConfirm({ auction: detail, kind: "reject" }); setConfirmReason(""); }}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject Result
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)} className="h-9 px-4 text-[10px]">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
