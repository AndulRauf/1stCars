import * as React from "react";
import { X, Plus, Gavel, Rocket, CalendarClock, PlayCircle, StopCircle, Ban, CheckCircle2, XCircle, Users, Search, RefreshCw, ClipboardList, Database, Cpu, Clock, Car } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { toast } from "@/src/lib/toast";
import { supabase } from "@/src/lib/supabaseClient";
import {
  auctionService,
  AuctionRecord,
  AuctionBidRecord,
  AuctionPaymentRecord,
  AuctionEligibilityRecord,
  AuctionActor,
  AUCTION_OPEN_STATES,
  AUCTION_STATUS_LABELS
} from "@/src/lib/auctions";
import { automationService } from "@/src/lib/automation";
import { formatINR, formatDateTime, AuctionStatusBadge, Stat } from "./AuctionBits";

interface AdminAuctionsProps {
  currentUser: { id: string; name?: string; role: string };
  onReloadAllData?: () => void;
}

interface DealerRow {
  id: string;
  name: string;
  mobile?: string;
  city?: string;
  is_verified?: boolean;
  is_approved?: boolean;
}

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string): string => (v ? new Date(v).toISOString() : "");

export function AdminAuctions({ currentUser, onReloadAllData }: AdminAuctionsProps) {
  const actor: AuctionActor = { userId: currentUser.id, role: currentUser.role };
  const [auctions, setAuctions] = React.useState<AuctionRecord[]>([]);
  const [cars, setCars] = React.useState<any[]>([]);
  const [inspections, setInspections] = React.useState<any[]>([]);
  const [dealers, setDealers] = React.useState<DealerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    inspection_id: "",
    car_id: "",
    starting_bid: "",
    reserve_price: "",
    minimum_increment: "5000",
    starts_at: "",
    ends_at: "",
    extension_seconds: "120",
    max_extension_count: "5",
    eligible: {} as Record<string, boolean>
  });

  const [detail, setDetail] = React.useState<AuctionRecord | null>(null);
  const [detailTab, setDetailTab] = React.useState<"bids" | "dealers" | "events" | "audit" | "payment">("bids");
  const [bids, setBids] = React.useState<AuctionBidRecord[]>([]);
  const [eligRows, setEligRows] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<AuctionPaymentRecord[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [audit, setAudit] = React.useState<any[]>([]);

  const [scheduleTarget, setScheduleTarget] = React.useState<AuctionRecord | null>(null);
  const [scheduleForm, setScheduleForm] = React.useState({ starts_at: "", ends_at: "" });
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{ auction: AuctionRecord; kind: "cancel" | "reject" } | null>(null);
  const [confirmReason, setConfirmReason] = React.useState("");

  const [testRunning, setTestRunning] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [auctionList, carData, inspData, dealerData] = await Promise.all([
        auctionService.listAuctions(actor),
        (supabase as any).from("cars").select("*"),
        (supabase as any).from("inspections").select("*"),
        (supabase as any).from("profiles").select("*").eq("role", "Dealer")
      ]);
      setAuctions(auctionList);
      setCars(carData.data || []);
      setInspections(inspData.data || []);
      setDealers((dealerData.data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        mobile: d.mobile,
        city: d.city,
        is_verified: d.is_verified,
        is_approved: d.is_approved
      })));
    } finally {
      setLoading(false);
    }
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
    setDetailTab("bids");
    setBids([]);
    setEligRows([]);
    setPayments([]);
    setEvents([]);
    setAudit([]);
    (async () => {
      const [b, e, ev, au, p] = await Promise.all([
        auctionService.getBids(detail.id),
        auctionService.getEligibleDealers(detail.id),
        automationService.getEvents(400),
        automationService.getAudit(400),
        auctionService.getPayments(detail.id)
      ]);
      setBids(b);
      setEligRows(e);
      setEvents(ev.filter((x) => x.source_id === detail.id || (x.source_table === "auction_bids" && String(x.payload?.auction_id) === detail.id) || x.source_table === "auctions"));
      setAudit(au.filter((x) => x.entity_id === detail.id));
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
      city: insp?.city ?? car?.city,
      score: insp?.overall_score ?? car?.overall_score,
      seller_name: insp?.seller_name || (a.seller_id ? "Seller" : "—")
    };
  };

  const dealerName = (id: string | null | undefined) => {
    if (!id) return "—";
    return dealers.find((d) => d.id === id)?.name || id;
  };

  const run = async (id: string, fn: () => Promise<any>, successMsg: string) => {
    setActionBusy(id);
    try {
      await fn();
      toast.success(successMsg);
      await reload();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(null);
    }
  };

  const openCreate = () => {
    const eligible: Record<string, boolean> = {};
    dealers.forEach((d) => (eligible[d.id] = true));
    const firstInsp = inspections.find((i) => i.overall_score != null && i.status !== "auctioned");
    setCreateForm({
      inspection_id: firstInsp?.id || "",
      car_id: cars.find((c) => ["available", "listed", "ready_for_sale", "inspection_completed"].includes(c.status))?.id || "",
      starting_bid: firstInsp ? String(Math.max(100000, Math.round((Number(firstInsp.km_driven) / 200) * 100))) : "",
      reserve_price: "",
      minimum_increment: "5000",
      starts_at: toLocalInput(new Date(Date.now() + 600000).toISOString()),
      ends_at: toLocalInput(new Date(Date.now() + 86400000).toISOString()),
      extension_seconds: "120",
      max_extension_count: "5",
      eligible
    });
    setShowCreate(true);
  };

  const submitCreate = async () => {
    if (!createForm.inspection_id) {
      toast.error("Select a certified inspection");
      return;
    }
    setCreating(true);
    try {
      await auctionService.createAuction(actor, {
        // Empty car selection is fine — the engine auto-creates/lists a vehicle
        // record from the inspection (ensureCarForInspection), mirroring the
        // inspector auto-launch path.
        car_id: createForm.car_id || null,
        inspection_id: createForm.inspection_id,
        starting_bid: Number(createForm.starting_bid) || 100000,
        reserve_price: Number(createForm.reserve_price) || 0,
        minimum_increment: Number(createForm.minimum_increment) || 5000,
        starts_at: fromLocalInput(createForm.starts_at) || undefined,
        ends_at: fromLocalInput(createForm.ends_at) || undefined,
        extension_seconds: Number(createForm.extension_seconds) || 120,
        max_extension_count: Number(createForm.max_extension_count) || 5,
        eligible_dealer_ids: Object.keys(createForm.eligible).filter((k) => createForm.eligible[k])
      });
      toast.success("Auction created in DRAFT. Publish, schedule and start it to go live.");
      setShowCreate(false);
      await reload();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const startCreateFromCar = (inspectionId: string) => {
    const insp = inspections.find((i) => i.id === inspectionId);
    if (!insp) return;
    const matched = cars.find((c) => c.city === insp.city && ["available", "listed", "ready_for_sale", "inspection_completed"].includes(c.status));
    setCreateForm((f) => ({
      ...f,
      inspection_id: inspectionId,
      car_id: matched?.id || f.car_id,
      starting_bid: String(Math.max(100000, Math.round((Number(insp.km_driven) / 200) * 100)))
    }));
  };

  const openSchedule = (a: AuctionRecord) => {
    setScheduleTarget(a);
    setScheduleForm({ starts_at: toLocalInput(a.starts_at || new Date().toISOString()), ends_at: toLocalInput(a.ends_at || new Date(Date.now() + 86400000).toISOString()) });
  };

  const submitSchedule = async () => {
    if (!scheduleTarget) return;
    const starts = fromLocalInput(scheduleForm.starts_at);
    const ends = fromLocalInput(scheduleForm.ends_at);
    if (!starts || !ends || new Date(ends) <= new Date(starts)) {
      toast.error("Schedule a valid start/end window");
      return;
    }
    await run(scheduleTarget.id, () => auctionService.scheduleAuction(actor, scheduleTarget.id, starts, ends), "Auction scheduled");
    setScheduleTarget(null);
  };

  const submitDecision = async (a: AuctionRecord, decision: "ACCEPT" | "REJECT") => {
    if (decision === "REJECT") {
      setConfirm({ auction: a, kind: "reject" });
      setConfirmReason("");
      return;
    }
    await run(a.id, () => auctionService.adminDecision(actor, a.id, decision, undefined),
      "Auction result accepted — payment task created");
    setDetail(null);
  };

  const confirmAction = async () => {
    if (!confirm) return;
    const { auction, kind } = confirm;
    if (kind === "cancel") {
      await run(auction.id, () => auctionService.cancelAuction(actor, auction.id, confirmReason.trim() || "Cancelled from Admin Auctions"),
        "Auction cancelled — vehicle released");
    } else {
      if (!confirmReason.trim()) {
        toast.error("Provide a reason for rejection");
        return;
      }
      await run(auction.id, () => auctionService.adminDecision(actor, auction.id, "REJECT", confirmReason.trim()),
        "Auction result rejected — vehicle released");
      setDetail(null);
    }
    setConfirm(null);
    setConfirmReason("");
  };

  const toggleEligible = (dealerId: string) => {
    setCreateForm((f) => ({ ...f, eligible: { ...f.eligible, [dealerId]: !f.eligible[dealerId] } }));
  };

  const addMoreDealers = async () => {
    if (!detail) return;
    const selected = Object.keys(createForm.eligible).filter((k) => createForm.eligible[k]);
    await run(detail.id, () => auctionService.setEligibleDealers(actor, detail.id, selected), "Eligible dealer pool updated");
  };

  const runMaintenance = async () => {
    setTestRunning(true);
    try {
      const res = await auctionService.runMaintenance();
      toast.success(`Maintenance pass: ${res.started} started, ${res.closed} closed`);
      await reload();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTestRunning(false);
    }
  };

  const launchDemo = async () => {
    setTestRunning(true);
    try {
      // Same gate as the create form: any scored inspection works (prefer one
      // that is not already auctioned). The car is optional — the engine
      // auto-creates a vehicle record from the inspection when omitted.
      const insp = inspections.find((i) => i.overall_score != null && i.status !== "auctioned")
        || inspections.find((i) => i.overall_score != null);
      const openStatuses = ["available", "listed", "ready_for_sale", "inspection_completed"];
      const car = cars.find((c) => openStatuses.includes(c.status) && insp != null && (c.id === insp.car_id || (c.brand === insp.brand && c.model === insp.model)))
        || cars.find((c) => openStatuses.includes(c.status));
      if (!insp) {
        toast.error("No certified inspection available — click \"Upload Demo Car\" below first");
        return;
      }
      const created = await auctionService.createAuction(actor, {
        car_id: car?.id || null,
        inspection_id: insp.id,
        starting_bid: Math.max(100000, Math.round((Number(insp.km_driven) / 200) * 100)),
        reserve_price: 0,
        minimum_increment: 5000,
        starts_at: new Date(Date.now() + 120000).toISOString(),
        ends_at: new Date(Date.now() + 720000).toISOString(),
        eligible_dealer_ids: dealers.map((d) => d.id)
      });
      await auctionService.publishAuction(actor, created.id);
      await auctionService.scheduleAuction(actor, created.id,
        new Date(Date.now() + 120000).toISOString(),
        new Date(Date.now() + 720000).toISOString());
      await auctionService.startAuction(actor, created.id);
      toast.success("Demo auction created, scheduled and launched LIVE");
      await reload();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTestRunning(false);
    }
  };

  // Seeds one demo car + certified inspection (idempotent) so the
  // "Launch New Auction" Certified Inspection menu is never empty on a fresh
  // database. See auctionService.seedDemoInspection.
  const seedDemoCar = async () => {
    setTestRunning(true);
    try {
      const res = await auctionService.seedDemoInspection(actor);
      toast.success(res.created
        ? "Demo car uploaded: Toyota Fortuner 2022 with a certified inspection — ready to auction"
        : "Demo car already exists — reusing the seeded Toyota Fortuner inspection");
      await reload();
      if (onReloadAllData) onReloadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTestRunning(false);
    }
  };

  const filtered = auctions.filter((a) => {
    const v = vehicleOf(a);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      v.title.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    live: auctions.filter((a) => AUCTION_OPEN_STATES.includes(a.status)).length,
    review: auctions.filter((a) => a.status === "SELLER_REVIEW" || a.status === "CLOSED").length,
    draft: auctions.filter((a) => a.status === "DRAFT" || a.status === "READY" || a.status === "SCHEDULED").length,
    total: auctions.length
  };

  // Auction-eligible inspections — aligned with the engine gate in
  // auction_create_auction (overall_score IS NOT NULL). The old UI also
  // required status completed/offered/auctioned/published, which silently hid
  // inspections the engine accepts (e.g. admin-scored reports still marked
  // "assigned"). Already-auctioned inspections stay listed but disabled.
  const availableInspections = inspections.filter((i) => i.overall_score != null);
  const availableCars = cars.filter((c) => ["available", "listed", "ready_for_sale", "inspection_completed"].includes(c.status));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#ff5a07]" /> Dealer Auction Engine
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {auctionService.supportsRpc() ? "Supabase RPC engine · atomic bidding, anti-sniping, RLS" : "Local demo engine · mirrors the production RPC logic"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={reload} variant="outline" className="h-9 px-4 text-[10px]">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button onClick={openCreate} className="bg-[#2E7D32] hover:bg-[#25632a] text-white text-[10px] font-black uppercase h-9 px-4 rounded-xl">
            <Plus className="h-3.5 w-3.5" /> New Auction
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Live Bidding" value={stats.live} tone={stats.live > 0 ? "good" : "default"} />
        <Stat label="Awaiting Decision" value={stats.review} tone={stats.review > 0 ? "highlight" : "default"} />
        <Stat label="Draft / Scheduled" value={stats.draft} />
        <Stat label="Total Auctions" value={stats.total} />
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vehicle, city or auction id..."
              className="w-full h-10 pl-9 pr-4 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#2E7D32]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="md:w-56 h-10 border border-slate-200 bg-white rounded-xl text-xs font-bold px-3 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {Object.keys(AUCTION_STATUS_LABELS).map((s) => (
              <option key={s} value={s}>{AUCTION_STATUS_LABELS[s as keyof typeof AUCTION_STATUS_LABELS]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auction list */}
      <div className="space-y-3">
        {loading && auctions.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-slate-200 rounded-3xl bg-white">
            <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">Loading auction engine...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-slate-200 rounded-3xl bg-white">
            <Gavel className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">No auctions match. Create one to launch the dealer bidding arena.</p>
          </div>
        ) : (
          filtered.map((a) => {
            const v = vehicleOf(a);
            return (
              <div key={a.id} className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AuctionStatusBadge status={a.status} />
                      <span className="text-[9px] font-mono text-slate-400">#{a.id.slice(0, 8)}</span>
                      {a.extension_count > 0 && (
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">+{a.extension_count} EXT</span>
                      )}
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-1.5 truncate">
                      {v.year} {v.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {v.km_driven ? `${v.km_driven.toLocaleString()} KM` : ""} • {v.fuel} • {v.transmission} • {v.city}
                      {v.score != null && <span className="text-[#2E7D32]"> • 1stMark {v.score}/10</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Seller: {v.seller_name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:w-72">
                    <div className="bg-white border border-slate-100 rounded-xl p-2.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start</p>
                      <p className="text-xs font-black text-slate-800">{formatINR(a.starting_bid)}</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                      <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest">High Bid</p>
                      <p className="text-xs font-black text-[#2E7D32]">{formatINR(a.current_highest_bid)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:w-64 justify-start md:justify-end">
                    {a.status === "DRAFT" && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-[9px]" onClick={() => run(a.id, () => auctionService.publishAuction(actor, a.id), "Auction published (READY)")} disabled={actionBusy === a.id}>
                          <Rocket className="h-3 w-3" /> Publish
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-[9px]" onClick={() => openSchedule(a)}>
                          <CalendarClock className="h-3 w-3" /> Schedule
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-[9px] text-rose-600" onClick={() => { setConfirm({ auction: a, kind: "cancel" }); setConfirmReason(""); }}>
                          <Ban className="h-3 w-3" /> Cancel
                        </Button>
                      </>
                    )}
                    {a.status === "READY" && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-[9px]" onClick={() => openSchedule(a)}>
                          <CalendarClock className="h-3 w-3" /> Schedule
                        </Button>
                        <Button size="sm" className="h-8 px-3 text-[9px] bg-[#2E7D32]" onClick={() => run(a.id, () => auctionService.startAuction(actor, a.id), "Auction started — LIVE")} disabled={actionBusy === a.id}>
                          <PlayCircle className="h-3 w-3" /> Start Now
                        </Button>
                      </>
                    )}
                    {a.status === "SCHEDULED" && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-[9px]" onClick={() => openSchedule(a)}>
                          <CalendarClock className="h-3 w-3" /> Reschedule
                        </Button>
                        <Button size="sm" className="h-8 px-3 text-[9px] bg-[#2E7D32]" onClick={() => run(a.id, () => auctionService.startAuction(actor, a.id), "Auction started — LIVE")} disabled={actionBusy === a.id}>
                          <PlayCircle className="h-3 w-3" /> Start Now
                        </Button>
                      </>
                    )}
                    {AUCTION_OPEN_STATES.includes(a.status) && (
                      <Button size="sm" variant="outline" className="h-8 px-3 text-[9px] text-amber-700" onClick={() => run(a.id, () => auctionService.adminClose(actor, a.id), "Auction closed by staff")} disabled={actionBusy === a.id}>
                        <StopCircle className="h-3 w-3" /> Close Now
                      </Button>
                    )}
                    {(a.status === "SELLER_REVIEW" || a.status === "CLOSED") && (
                      <>
                        <Button size="sm" className="h-8 px-3 text-[9px] bg-[#2E7D32]" onClick={() => submitDecision(a, "ACCEPT")} disabled={actionBusy === a.id}>
                          <CheckCircle2 className="h-3 w-3" /> Accept Result
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 px-3 text-[9px]" onClick={() => { setConfirm({ auction: a, kind: "reject" }); setConfirmReason(""); }} disabled={actionBusy === a.id}>
                          <XCircle className="h-3 w-3" /> Reject Result
                        </Button>
                      </>
                    )}
                    {(a.status === "DRAFT" || a.status === "READY" || a.status === "SCHEDULED" || AUCTION_OPEN_STATES.includes(a.status)) && (
                      <Button size="sm" variant="destructive" className="h-8 px-3 text-[9px]" onClick={() => { setConfirm({ auction: a, kind: "cancel" }); setConfirmReason(""); }} disabled={actionBusy === a.id}>
                        <Ban className="h-3 w-3" /> Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 px-3 text-[9px]" onClick={() => setDetail(a)}>
                      <ClipboardList className="h-3 w-3" /> Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Test Mode */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <h4 className="font-black text-sm uppercase tracking-wider">Engine Test Mode</h4>
        </div>
        <p className="text-[10px] text-slate-400 font-bold mb-4">
          Drive the full auction lifecycle from this dashboard — create, publish, schedule, start, bid, close, decide.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={runMaintenance} disabled={testRunning} className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-4 text-[10px]">
            <Database className="h-3.5 w-3.5" /> Run Auto-Manage Pass
          </Button>
          <Button size="sm" onClick={seedDemoCar} disabled={testRunning} variant="outline" className="text-white border-white/20 hover:bg-white/10 h-9 px-4 text-[10px]">
            <Car className="h-3.5 w-3.5" /> Upload Demo Car
          </Button>
          <Button size="sm" onClick={launchDemo} disabled={testRunning} variant="outline" className="text-white border-white/20 hover:bg-white/10 h-9 px-4 text-[10px]">
            <Rocket className="h-3.5 w-3.5" /> Create & Launch Demo Auction
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-slate-400">
            Auto-manage starts SCHEDULED auctions at their start time and closes LIVE auctions at their end time.
          </span>
        </div>
      </div>

      {/* ============ CREATE MODAL ============ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Launch New Auction</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Create a DRAFT, then publish → schedule → start</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Certified Inspection</label>
                <select
                  value={createForm.inspection_id}
                  onChange={(e) => startCreateFromCar(e.target.value)}
                  className="mt-1 w-full h-10 border border-slate-200 rounded-xl text-xs font-semibold px-3 outline-none"
                >
                  <option value="">Select certified inspection...</option>
                  {availableInspections.map((i) => (
                    <option key={i.id} value={i.id} disabled={i.status === "auctioned"}>
                      {i.brand} {i.model} ({i.year}) • {i.city} • 1stMark {i.overall_score}/10{i.status === "auctioned" ? " • already auctioned" : ""}
                    </option>
                  ))}
                </select>
                {availableInspections.length === 0 && (
                  <p className="mt-2 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    No certified inspections yet — an Inspector must upload a 120-Point report first. Quick start: click "Upload Demo Car" in Engine Test Mode below.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vehicle (available inventory)</label>
                <select
                  value={createForm.car_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, car_id: e.target.value }))}
                  className="mt-1 w-full h-10 border border-slate-200 rounded-xl text-xs font-semibold px-3 outline-none"
                >
                  <option value="">Auto-create from inspection...</option>
                  {availableCars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.year}) • {c.city} • {c.km_driven ? `${c.km_driven.toLocaleString()} km` : ""}
                    </option>
                  ))}
                </select>
                {availableCars.length === 0 && (
                  <p className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    No available vehicles — leaving this empty auto-lists a vehicle record from the selected inspection.
                  </p>
                )}
              </div>

              <Input label="Starting Bid (₹)" type="number" value={createForm.starting_bid} onChange={(e) => setCreateForm((f) => ({ ...f, starting_bid: e.target.value }))} />
              <Input label="Reserve Price (₹) — 0 = no reserve" type="number" value={createForm.reserve_price} onChange={(e) => setCreateForm((f) => ({ ...f, reserve_price: e.target.value }))} />
              <Input label="Minimum Increment (₹)" type="number" value={createForm.minimum_increment} onChange={(e) => setCreateForm((f) => ({ ...f, minimum_increment: e.target.value }))} />
              <Input label="Anti-Sniping Window (seconds)" type="number" value={createForm.extension_seconds} onChange={(e) => setCreateForm((f) => ({ ...f, extension_seconds: e.target.value }))} />
              <Input label="Max Extensions" type="number" value={createForm.max_extension_count} onChange={(e) => setCreateForm((f) => ({ ...f, max_extension_count: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <Input label="Starts At" type="datetime-local" value={createForm.starts_at} onChange={(e) => setCreateForm((f) => ({ ...f, starts_at: e.target.value }))} />
                <Input label="Ends At" type="datetime-local" value={createForm.ends_at} onChange={(e) => setCreateForm((f) => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Eligible Dealers</label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {dealers.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-bold">No dealer profiles yet. Register dealers first.</p>
                )}
                {dealers.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={!!createForm.eligible[d.id]} onChange={() => toggleEligible(d.id)} className="accent-[#2E7D32]" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{d.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{d.city} {d.is_verified === false && "• Pending verification"}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="h-9 px-4 text-[10px]">Cancel</Button>
              <Button onClick={submitCreate} disabled={creating} className="bg-[#2E7D32] hover:bg-[#25632a] text-white h-9 px-5 text-[10px]">
                {creating ? "Creating..." : "Create Auction"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============ SCHEDULE MODAL ============ */}
      {scheduleTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">Schedule Auction</h3>
                <p className="text-[10px] text-slate-400 font-bold">{vehicleOf(scheduleTarget).title}</p>
              </div>
              <button onClick={() => setScheduleTarget(null)} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Starts At" type="datetime-local" value={scheduleForm.starts_at} onChange={(e) => setScheduleForm((f) => ({ ...f, starts_at: e.target.value }))} />
              <Input label="Ends At" type="datetime-local" value={scheduleForm.ends_at} onChange={(e) => setScheduleForm((f) => ({ ...f, ends_at: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setScheduleTarget(null)} className="h-9 px-4 text-[10px]">Cancel</Button>
              <Button onClick={submitSchedule} className="bg-[#2E7D32] hover:bg-[#25632a] text-white h-9 px-5 text-[10px]">Save Schedule</Button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CONFIRM MODAL (cancel / reject) ============ */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-wider">
                  {confirm.kind === "cancel" ? "Cancel Auction" : "Reject Result"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">{vehicleOf(confirm.auction).title} • #{confirm.auction.id}</p>
              </div>
              <button onClick={() => { setConfirm(null); setConfirmReason(""); }} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Input
                label={confirm.kind === "cancel" ? "Cancellation Reason (optional)" : "Rejection Reason (required)"}
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                placeholder={confirm.kind === "cancel" ? "e.g. Vehicle not deliverable" : "e.g. Payment not received from winner"}
              />
              <p className="text-[9px] text-slate-400 font-semibold">
                {confirm.kind === "cancel"
                  ? "The vehicle will be released back to the seller and active bids will be invalidated."
                  : "The auction result will be overturned and the vehicle released back to the seller."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setConfirm(null); setConfirmReason(""); }} className="h-9 px-4 text-[10px]">Keep</Button>
              <Button variant="destructive" size="sm" onClick={confirmAction} disabled={actionBusy === confirm.auction.id} className="h-9 px-5 text-[10px]">
                {actionBusy === confirm.auction.id ? "Working..." : confirm.kind === "cancel" ? "Cancel Auction" : "Reject Result"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-6 space-y-5 shadow-2xl my-8">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Starting Bid" value={formatINR(detail.starting_bid)} />
              <Stat label="High Bid" value={formatINR(detail.current_highest_bid)} tone={detail.current_highest_bid != null ? "good" : "default"} />
              <Stat label="Reserve" value={formatINR(detail.reserve_price)} tone={detail.reserve_price > 0 ? "highlight" : "default"} />
              <Stat label="Increment" value={formatINR(detail.minimum_increment)} />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(["bids", "dealers", "events", "audit", "payment"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDetailTab(t)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${detailTab === t ? "bg-[#ff5a07] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {detailTab === "bids" && (
              <div className="max-h-80 overflow-y-auto">
                {bids.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">No bids placed yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Dealer</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Time</th>
                        <th className="pb-2">Idempotency Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bids.map((b) => (
                        <tr key={b.id} className="text-xs font-semibold text-slate-700">
                          <td className="py-2.5 font-black tabular-nums">₹{b.amount.toLocaleString("en-IN")}</td>
                          <td className="py-2.5">{dealerName(b.dealer_id)}</td>
                          <td className="py-2.5">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${b.status === "WINNING" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{b.status}</span>
                          </td>
                          <td className="py-2.5 text-[10px] text-slate-400">{formatDateTime(b.created_at)}</td>
                          <td className="py-2.5 text-[9px] font-mono text-slate-400 truncate max-w-36">{b.client_request_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {detailTab === "dealers" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                  {eligRows.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 p-3 border border-slate-100 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{e.dealer_name || e.dealer_id}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{e.city} • {e.mobile || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${e.status === "BIDDED" ? "bg-emerald-50 text-emerald-700" : e.status === "DISQUALIFIED" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-700"}`}>
                          {e.status}
                        </span>
                        {e.status !== "BIDDED" && (
                          <button
                            onClick={() => run(detail.id, () => auctionService.disqualifyDealer(actor, detail.id, e.dealer_id), "Dealer disqualified")}
                            className="text-[9px] font-black text-rose-600 hover:underline cursor-pointer"
                          >
                            Disqualify
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Add / enable eligible dealers</label>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {dealers.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={!!createForm.eligible[d.id]} onChange={() => toggleEligible(d.id)} className="accent-[#2E7D32]" />
                        <span className="text-xs font-bold text-slate-700 truncate">{d.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button onClick={addMoreDealers} size="sm" className="mt-3 bg-[#2E7D32] text-white h-8 px-4 text-[10px]">
                    <Users className="h-3 w-3" /> Update Pool
                  </Button>
                </div>
              </div>
            )}

            {detailTab === "events" && (
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">No automation events recorded.</p>
                ) : (
                  events.slice(0, 60).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-800">{ev.event_type}</p>
                        <p className="text-[9px] font-mono text-slate-400 truncate">{ev.action_key}</p>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${ev.status === "processed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {ev.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "audit" && (
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {audit.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">No audit trail entries.</p>
                ) : (
                  audit.slice(0, 60).map((x) => (
                    <div key={x.id} className="p-2.5 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-slate-800">{x.action}</p>
                        <span className="text-[9px] text-slate-400 font-mono">{formatDateTime(x.created_at)}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold">
                        {x.old_status} → {x.new_status} {x.reason ? `• ${x.reason}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === "payment" && (
              <div className="max-h-80 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">No payment record yet — created when the seller accepts.</p>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="p-3.5 border border-slate-100 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-800">₹{p.amount.toLocaleString("en-IN")} · {dealerName(p.winner_dealer_id)}</p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">{p.status}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold">Reference: {p.reference || "—"} • Method: {p.method || "—"}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
