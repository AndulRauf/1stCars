import * as React from "react";
import {
  Users, Phone, MapPin, Car, Gavel, FileText, ClipboardList, CheckCircle2,
  AlertCircle, Search, ArrowLeft, RefreshCw, MessageSquare, DollarSign,
  Sparkles, ShieldCheck, TrendingUp, UserCheck, ChevronRight, Activity,
  HandCoins, Store, X, Filter, BadgeCheck, Contact, LayoutGrid, Calendar,
  Rows3
} from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "@/src/lib/toast";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const INR = (n: any) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

const tAgo = (iso?: string) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
};

const fDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const normMobile = (m?: any) => String(m || "").replace(/\D/g, "");

const statusTone = (s?: string): "green" | "amber" | "rose" | "slate" | "indigo" => {
  const v = String(s || "").toLowerCase();
  if (["sold", "accepted", "resolved", "approved", "completed", "won", "verified"].includes(v)) return "green";
  if (["rejected", "cancelled", "expired", "lost", "failed"].includes(v)) return "rose";
  if (["pending", "assigned", "contacted", "active", "available", "offered", "reserved", "booked"].includes(v)) return "amber";
  if (["ended", "closed", "archived"].includes(v)) return "indigo";
  return "slate";
};

const toneBadge = (tone: string) => {
  const map: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200"
  };
  return map[tone] || map.slate;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CrmRecordKind =
  | "buyer_lead"
  | "seller_request"
  | "inspection"
  | "parked"
  | "offer"
  | "dealer_bid"
  | "auction"
  | "car"
  | "customer";

type Stage = "leads" | "inspection" | "valuation" | "bidding" | "deals";

const STAGES: { key: Stage; label: string; blurb: string; bar: string; dot: string }[] = [
  { key: "leads", label: "New Leads", blurb: "Enquiries & requests", bar: "bg-sky-500", dot: "bg-sky-500" },
  { key: "inspection", label: "Inspection", blurb: "Free home inspection", bar: "bg-indigo-500", dot: "bg-indigo-500" },
  { key: "valuation", label: "Valuation", blurb: "120-pt report ready", bar: "bg-amber-500", dot: "bg-amber-500" },
  { key: "bidding", label: "Bidding & Offers", blurb: "Dealer competition", bar: "bg-orange-500", dot: "bg-orange-500" },
  { key: "deals", label: "Closed Deals", blurb: "Won · resolved · sold", bar: "bg-emerald-500", dot: "bg-emerald-500" }
];

const KIND_META: Record<CrmRecordKind, { label: string; icon: any; chip: string }> = {
  buyer_lead: { label: "Buyer Leads", icon: MessageSquare, chip: "bg-sky-50 text-sky-700 border-sky-200" },
  seller_request: { label: "Sell Requests", icon: FileText, chip: "bg-teal-50 text-teal-700 border-teal-200" },
  inspection: { label: "Inspections", icon: ClipboardList, chip: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  parked: { label: "Parked Vehicles", icon: Store, chip: "bg-violet-50 text-violet-700 border-violet-200" },
  offer: { label: "Dealer Offers", icon: HandCoins, chip: "bg-orange-50 text-orange-700 border-orange-200" },
  dealer_bid: { label: "Dealer Bids", icon: Gavel, chip: "bg-rose-50 text-rose-700 border-rose-200" },
  auction: { label: "Auctions", icon: Gavel, chip: "bg-amber-50 text-amber-700 border-amber-200" },
  car: { label: "Inventory", icon: Car, chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  customer: { label: "Customers", icon: Users, chip: "bg-slate-100 text-slate-700 border-slate-200" }
};

interface CrmItem {
  kind: CrmRecordKind;
  id: string;
  record: any;
  stage: Stage;
  title: string;
  subtitle: string;
  city?: string;
  value?: number;
  ts?: string;
  status: string;
  ownerId?: string;
  mobile?: string;
  assignee?: string;
  assigneeId?: string;
  image?: string;
}

interface TimelineEvent {
  ts: string;
  text: string;
  tone: "green" | "amber" | "rose" | "indigo" | "slate";
}

interface CRMProps {
  profiles: any[];
  cars: any[];
  inspections: any[];
  auctions: any[];
  notifications: any[];
  salesLeads: any[];
  offers: any[];
  sellRequests: any[];
  inspectionReports: any[];
  dealerBids: any[];
  parkSell: any[];
  carImages: any[];
  currentUser?: any;
  onRefresh?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CRM({
  profiles, cars, inspections, auctions, notifications, salesLeads, offers,
  sellRequests, inspectionReports, dealerBids, parkSell, carImages,
  currentUser, onRefresh
}: CRMProps) {
  const [view, setView] = React.useState<"overview" | "pipeline">("overview");
  const [detail, setDetail] = React.useState<{ kind: CrmRecordKind; id: string } | null>(null);
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<CrmRecordKind | "all">("all");
  const [stageFilter, setStageFilter] = React.useState<Stage | "all">("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [saving, setSaving] = React.useState<{ table: string; id: string } | null>(null);

  const isAdmin = !currentUser || currentUser.role === "Admin";

  const profileById = (id?: string) => profiles.find((p) => p.id === id);
  const profileByMobile = (m?: any) => {
    const n = normMobile(m);
    if (!n) return undefined;
    return profiles.find((p) => normMobile(p.mobile) === n);
  };

  // -------------------------------------------------------------------------
  // Unified CRM record assembly (single source across existing tables)
  // -------------------------------------------------------------------------
  const items: CrmItem[] = React.useMemo(() => {
    const list: CrmItem[] = [];

    salesLeads.forEach((l) => {
      const p = profileByMobile(l.mobile);
      const sa = profileById(l.assigned_to);
      list.push({
        kind: "buyer_lead", id: l.id, record: l,
        stage: String(l.status || "").toLowerCase() === "resolved" ? "deals" : "leads",
        title: `${l.car_brand || ""} ${l.car_model || ""}`.trim() || "Buyer enquiry",
        subtitle: `${l.name || "Unknown"}${l.mobile ? " · " + l.mobile : ""}`,
        city: l.city, ts: l.created_at, status: l.status || "pending",
        ownerId: p?.id, mobile: l.mobile, assignee: sa?.name, assigneeId: l.assigned_to
      });
    });

    sellRequests.forEach((sr) => {
      const p = profileById(sr.seller_id);
      list.push({
        kind: "seller_request", id: sr.id, record: sr,
        stage: sr.status && sr.status !== "pending" ? "inspection" : "leads",
        title: `${sr.brand || ""} ${sr.model || ""}`.trim() || "Sell request",
        subtitle: p ? p.name : "Seller",
        city: sr.city, value: sr.expected_price, ts: sr.created_at,
        status: sr.status || "pending", ownerId: sr.seller_id, mobile: p?.mobile
      });
    });

    parkSell.forEach((ps) => {
      const p = profileById(ps.seller_id);
      const car = cars.find((c) => c.id === ps.car_id);
      list.push({
        kind: "parked", id: ps.id, record: ps,
        stage: ps.status && ps.status !== "pending" ? "inspection" : "leads",
        title: car ? `${car.brand || ""} ${car.model || ""}`.trim() || car.title : "Parked vehicle",
        subtitle: p ? p.name : "Seller",
        city: car?.city, value: car?.price, ts: ps.created_at,
        status: ps.status || "pending", ownerId: ps.seller_id, mobile: p?.mobile
      });
    });

    inspections.forEach((i) => {
      const p = profileById(i.seller_id);
      const insp = profileById(i.inspector_id);
      const st = String(i.status || "").toLowerCase();
      const stage: Stage = st === "sold" ? "deals" : st === "offered" ? "bidding" : st === "completed" ? "valuation" : "inspection";
      list.push({
        kind: "inspection", id: i.id, record: i, stage,
        title: `${i.brand || ""} ${i.model || ""}`.trim() || i.reg_number || "Inspection",
        subtitle: `${i.seller_name || p?.name || "Seller"}${i.reg_number ? " · " + i.reg_number : ""}`,
        city: i.city, ts: i.created_at, status: i.status || "pending",
        ownerId: i.seller_id, mobile: i.seller_mobile, assignee: insp?.name
      });
    });

    offers.forEach((o) => {
      const p = profileById(o.dealer_id);
      const insp = inspections.find((x) => x.id === o.inspection_id);
      list.push({
        kind: "offer", id: o.id, record: o,
        stage: o.status === "accepted" ? "deals" : o.status === "rejected" ? "deals" : "bidding",
        title: `${insp ? `${insp.brand || ""} ${insp.model || ""}`.trim() : "Inspection"} offer`,
        subtitle: o.dealer_name || p?.name || "Dealer",
        city: insp?.city, value: o.offer_amount, ts: o.created_at,
        status: o.status || "pending", ownerId: o.dealer_id
      });
    });

    dealerBids.forEach((b) => {
      const p = profileById(b.dealer_id);
      const insp = inspections.find((x) => x.id === b.inspection_id);
      list.push({
        kind: "dealer_bid", id: b.id, record: b,
        stage: b.status === "accepted" ? "deals" : b.status === "rejected" ? "deals" : "bidding",
        title: `${insp ? `${insp.brand || ""} ${insp.model || ""}`.trim() : "Inspection"} bid`,
        subtitle: p?.name || "Dealer",
        city: insp?.city, value: b.bid_amount, ts: b.created_at,
        status: b.status || "pending", ownerId: b.dealer_id
      });
    });

    auctions.forEach((a) => {
      // Canonical AuctionRecord (public/auction_engine.sql): vehicle identity
      // comes from the linked inspection/car, the money from starting_bid /
      // current_highest_bid, and the status from the canonical status machine.
      const insp = inspections.find((x) => x.id === a.inspection_id);
      const car = cars.find((x) => x.id === a.car_id);
      const s = String(a.status || "").toLowerCase();
      const title = insp
        ? `${insp.brand || ""} ${insp.model || ""}`.trim()
        : car
          ? `${car.brand || ""} ${car.model || ""}`.trim()
          : "Auction";
      list.push({
        kind: "auction", id: a.id, record: a,
        stage: ["accepted", "rejected", "expired", "cancelled"].includes(s) ? "deals" : "bidding",
        title,
        subtitle: a.current_highest_bid != null ? `High: ${INR(a.current_highest_bid)}` : "No bids yet",
        city: insp?.city || car?.city,
        value: a.current_highest_bid ?? a.starting_bid,
        ts: a.created_at,
        status: a.status || "DRAFT"
      });
    });

    cars.forEach((c) => {
      const s = String(c.status || "").toLowerCase();
      const stage: Stage = s === "sold" ? "deals" : s === "reserved" || s === "booked" ? "bidding" : "valuation";
      const img = carImages.find((im) => im.car_id === c.id && im.is_primary) || carImages.find((im) => im.car_id === c.id);
      list.push({
        kind: "car", id: c.id, record: c, stage,
        title: c.title || `${c.brand || ""} ${c.model || ""}`.trim(),
        subtitle: `${c.year || ""} · ${c.city || ""}`,
        city: c.city, value: c.price, ts: c.created_at,
        status: c.status || "available", ownerId: c.created_by, image: img?.image_url
      });
    });

    return list.sort((a, b) => (new Date(b.ts || 0).getTime()) - (new Date(a.ts || 0).getTime()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesLeads, sellRequests, parkSell, inspections, offers, dealerBids, auctions, cars, carImages, profiles]);

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------
  const cities = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.city) set.add(i.city); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (kindFilter !== "all" && i.kind !== kindFilter) return false;
      if (stageFilter !== "all" && i.stage !== stageFilter) return false;
      if (cityFilter !== "all" && (i.city || "") !== cityFilter) return false;
      if (assigneeFilter !== "all") {
        if (i.kind !== "buyer_lead") return false;
        if (assigneeFilter === "unassigned" ? Boolean(i.record?.assigned_to) : i.record?.assigned_to !== assigneeFilter) return false;
      }
      if (q) {
        const hay = [i.title, i.subtitle, i.city, i.status, i.mobile, i.assignee, i.record?.reg_number]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, kindFilter, stageFilter, cityFilter, assigneeFilter]);

  const stageCounts = React.useMemo(() => {
    const counts: Record<Stage, number> = { leads: 0, inspection: 0, valuation: 0, bidding: 0, deals: 0 };
    items.forEach((i) => { counts[i.stage] = (counts[i.stage] || 0) + 1; });
    return counts;
  }, [items]);

  const pipelineValue = React.useMemo(() => {
    return filtered
      .filter((i) => i.stage === "bidding" || i.stage === "valuation")
      .reduce((sum, i) => sum + (Number(i.value) || 0), 0);
  }, [filtered]);

  // -------------------------------------------------------------------------
  // Timeline (global activity feed + scoped record/customer history)
  // -------------------------------------------------------------------------
  const buildTimeline = (scope: { kind: CrmRecordKind; id: string } | null): TimelineEvent[] => {
    const ev: TimelineEvent[] = [];
    const push = (ts: string | undefined, text: string, tone: TimelineEvent["tone"]) => {
      if (ts) ev.push({ ts, text, tone });
    };

    if (!scope) {
      notifications.forEach((n) => push(n.created_at, `${n.title || "Alert"}${n.message ? " — " + n.message : ""}`, "slate"));
      return ev.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    }

    const { kind, id } = scope;

    if (kind === "customer") {
      const p = profiles.find((x) => x.id === id);
      if (!p) return [];
      push(p.created_at, `${p.name} joined as ${p.role || "customer"}`, "green");
      salesLeads
        .filter((l) => normMobile(l.mobile) === normMobile(p.mobile))
        .forEach((l) => push(l.created_at, `Buyer ${l.type || "enquiry"} for ${l.car_brand || ""} ${l.car_model || ""} (${l.status || "pending"})`, "amber"));
      inspections
        .filter((i) => i.seller_id === id || normMobile(i.seller_mobile) === normMobile(p.mobile))
        .forEach((i) => push(i.created_at, `Inspection booked for ${i.brand || ""} ${i.model || ""} (${i.status || "pending"})`, "indigo"));
      sellRequests
        .filter((sr) => sr.seller_id === id)
        .forEach((sr) => push(sr.created_at, `Sell request for ${sr.brand || ""} ${sr.model || ""} (${sr.status || "pending"})`, "indigo"));
      parkSell
        .filter((ps) => ps.seller_id === id)
        .forEach((ps) => push(ps.created_at, `Parked a vehicle for sale (${ps.status || "pending"})`, "indigo"));
      cars
        .filter((c) => c.created_by === id)
        .forEach((c) => push(c.created_at, `Listed ${c.title || "car"} in inventory (${c.status || "available"})`, "slate"));
      offers
        .filter((o) => o.dealer_id === id)
        .forEach((o) => push(o.created_at, `Placed offer ${INR(o.offer_amount)} (${o.status || "pending"})`, "rose"));
      dealerBids
        .filter((b) => b.dealer_id === id)
        .forEach((b) => push(b.created_at, `Placed dealer bid ${INR(b.bid_amount)} (${b.status || "pending"})`, "rose"));
      return ev.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    }

    const item = items.find((i) => i.kind === kind && i.id === id);
    if (!item) return [];
    push(item.ts, `${KIND_META[kind].label.replace(/s$/, "")} created`, "slate");

    if (kind === "inspection") {
      inspectionReports
        .filter((r) => r.inspection_id === id)
        .forEach((r) => push(r.created_at, `120-pt inspection report completed · score ${r.overall_score != null ? r.overall_score + "/10" : "—"}`, "green"));
      offers
        .filter((o) => o.inspection_id === id)
        .forEach((o) => push(o.created_at, `Offer ${INR(o.offer_amount)} from ${o.dealer_name || "dealer"} (${o.status || "pending"})`, "rose"));
      dealerBids
        .filter((b) => b.inspection_id === id)
        .forEach((b) => push(b.created_at, `Dealer bid ${INR(b.bid_amount)} (${b.status || "pending"})`, "rose"));
    }
    if (kind === "car") {
      carImages
        .filter((im) => im.car_id === id)
        .forEach((im) => push(im.created_at, `Photo ${im.is_primary ? "(primary) " : ""}added to gallery`, "slate"));
      salesLeads
        .filter((l) => l.car_id === id)
        .forEach((l) => push(l.created_at, `${l.type || "Enquiry"} by ${l.name || "customer"} (${l.status || "pending"})`, "amber"));
    }

    return ev.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  };

  // -------------------------------------------------------------------------
  // Status writes (stored in the existing business tables — n8n/analytics ready)
  // -------------------------------------------------------------------------
  const updateRow = async (table: string, id: string, patch: Record<string, any>, label: string) => {
    setSaving({ table, id });
    try {
      const { error } = await supabase.from(table).update(patch).eq("id", id);
      if (error) {
        toast.error(`Could not update ${label}: ${error.message || "RLS/check constraint"}`);
        return false;
      }
      toast.success(`${label} updated`);
      if (onRefresh) onRefresh();
      return true;
    } catch (e: any) {
      toast.error(`Update failed: ${e?.message || String(e)}`);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const statusOptions: Record<CrmRecordKind, string[]> = {
    buyer_lead: ["pending", "contacted", "resolved"],
    seller_request: ["pending", "approved", "rejected", "completed"],
    inspection: ["pending", "assigned", "completed", "offered", "sold"],
    parked: ["pending", "approved", "rejected", "completed"],
    offer: ["pending", "accepted", "rejected"],
    dealer_bid: ["pending", "accepted", "rejected"],
    // Auction status is owned by the engine's state machine (RPCs + status
    // guard trigger) — never edited from the CRM dropdown.
    auction: [],
    car: ["available", "reserved", "sold"],
    customer: []
  };

  const statusTable: Record<CrmRecordKind, string> = {
    buyer_lead: "sales_notifications",
    seller_request: "sell_requests",
    inspection: "inspections",
    parked: "park_sell",
    offer: "offers",
    dealer_bid: "dealer_bids",
    auction: "auctions",
    car: "cars",
    customer: "profiles"
  };

  const inspectors = React.useMemo(() => profiles.filter((p) => p.role === "Inspector"), [profiles]);
  const salesAssociates = React.useMemo(() => profiles.filter((p) => p.role === "Sales Associate"), [profiles]);

  const handleStatusChange = (item: CrmItem, next: string) => {
    if (item.kind === "auction") {
      toast.error("Auction status is owned by the Auction Engine state machine — change it from Admin CMS → Live Auctions.");
      return;
    }
    updateRow(statusTable[item.kind], item.id, { status: next }, KIND_META[item.kind].label);
  };

  const handleAssignInspector = (item: CrmItem, inspectorId: string) => {
    updateRow("inspections", item.id, { status: "assigned", inspector_id: inspectorId }, "Inspection");
  };

  const handleAssignSales = (item: CrmItem, salesId: string) => {
    updateRow("sales_notifications", item.id, { assigned_to: salesId || null }, "Lead");
  };

  const handleAcceptOffer = async (item: CrmItem) => {
    const ok = await updateRow("offers", item.id, { status: "accepted" }, "Offer");
    if (ok && item.record?.inspection_id) {
      await updateRow("inspections", item.record.inspection_id, { status: "sold" }, "Inspection");
    }
  };

  // -------------------------------------------------------------------------
  // Detail helpers
  // -------------------------------------------------------------------------
  const detailItem = detail ? items.find((i) => i.kind === detail.kind && i.id === detail.id) || null : null;
  const detailProfile = detail?.kind === "customer" ? profiles.find((p) => p.id === detail.id) || null : null;

  const fieldRows = (item: CrmItem): { label: string; value: string; icon?: any }[] => {
    const r = item.record;
    const rows: { label: string; value: string; icon?: any }[] = [];
    const add = (label: string, value: any, icon?: any) => {
      if (value === undefined || value === null || value === "") return;
      rows.push({ label, value: String(value), icon });
    };
    add("Customer", item.subtitle, Users);
    add("Mobile", item.mobile, Phone);
    add("City", item.city, MapPin);
    add("Status", item.status, Activity);
    add("Reg Number", r.reg_number, Car);
    add("Year", r.year);
    add("KM Driven", r.km_driven ? `${r.km_driven.toLocaleString("en-IN")} km` : undefined);
    add("Fuel", r.fuel);
    add("Transmission", r.transmission);
    add("Variant", r.variant);
    add("Value", item.value ? INR(item.value) : r.price ? INR(r.price) : r.offer_amount ? INR(r.offer_amount) : r.expected_price ? INR(r.expected_price) : r.bid_amount ? INR(r.bid_amount) : r.current_highest_bid ? INR(r.current_highest_bid) : r.current_bid ? INR(r.current_bid) : undefined, DollarSign);
    add("Preferred Date", r.preferred_date ? fDate(r.preferred_date) : undefined, Calendar);
    add("Preferred Time", r.preferred_time);
    add("Address", r.address);
    add("Score", r.overall_score != null ? `${r.overall_score}/10` : undefined, BadgeCheck);
    add(item.kind === "inspection" ? "Assigned Inspector" : "Assigned To", item.assignee, UserCheck);
    add("Notes", r.notes);
    return rows;
  };

  const customerRecords = (p: any): { kind: CrmRecordKind; id: string; text: string }[] => {
    const out: { kind: CrmRecordKind; id: string; text: string }[] = [];
    salesLeads.filter((l) => normMobile(l.mobile) === normMobile(p.mobile)).forEach((l) =>
      out.push({ kind: "buyer_lead", id: l.id, text: `${l.type || "Enquiry"} · ${l.car_brand || ""} ${l.car_model || ""} · ${l.status || "pending"}` }));
    sellRequests.filter((sr) => sr.seller_id === p.id).forEach((sr) =>
      out.push({ kind: "seller_request", id: sr.id, text: `${sr.brand || ""} ${sr.model || ""} · ${sr.status || "pending"}` }));
    inspections.filter((i) => i.seller_id === p.id || normMobile(i.seller_mobile) === normMobile(p.mobile)).forEach((i) =>
      out.push({ kind: "inspection", id: i.id, text: `${i.brand || ""} ${i.model || ""} · ${i.status || "pending"}` }));
    parkSell.filter((ps) => ps.seller_id === p.id).forEach((ps) =>
      out.push({ kind: "parked", id: ps.id, text: `Parked vehicle · ${ps.status || "pending"}` }));
    cars.filter((c) => c.created_by === p.id).forEach((c) =>
      out.push({ kind: "car", id: c.id, text: `${c.title || "car"} · ${c.status || "available"}` }));
    offers.filter((o) => o.dealer_id === p.id).forEach((o) =>
      out.push({ kind: "offer", id: o.id, text: `Offer ${INR(o.offer_amount)} · ${o.status || "pending"}` }));
    dealerBids.filter((b) => b.dealer_id === p.id).forEach((b) =>
      out.push({ kind: "dealer_bid", id: b.id, text: `Bid ${INR(b.bid_amount)} · ${b.status || "pending"}` }));
    return out;
  };

  const timeline = detail ? buildTimeline(detail) : buildTimeline(null);

  // -------------------------------------------------------------------------
  // Render pieces
  // -------------------------------------------------------------------------
  const statusSelect = (item: CrmItem) => {
    const opts = statusOptions[item.kind];
    if (!isAdmin || !opts.length) {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${toneBadge(statusTone(item.status))}`}>
          {item.status || "—"}
        </span>
      );
    }
    return (
      <select
        value={item.status}
        disabled={saving?.id === item.id && saving?.table === statusTable[item.kind]}
        onChange={(e) => handleStatusChange(item, e.target.value)}
        className={`text-[10px] font-black uppercase tracking-wider rounded-lg border px-2 py-1 outline-none cursor-pointer disabled:opacity-60 ${toneBadge(statusTone(item.status))}`}
      >
        {opts.map((o) => (
          <option key={o} value={o} className="text-slate-800">{o}</option>
        ))}
      </select>
    );
  };

  const card = (item: CrmItem) => {
    const meta = KIND_META[item.kind];
    const Icon = meta.icon;
    return (
      <button
        key={item.id}
        onClick={() => setDetail({ kind: item.kind, id: item.id })}
        className="w-full text-left bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-slate-200 transition group"
      >
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${meta.chip}`}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
          <span className="text-[9px] text-slate-400 font-bold">{tAgo(item.ts)}</span>
        </div>
        <h4 className="font-extrabold text-slate-900 text-sm mt-2 leading-snug truncate">{item.title}</h4>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{item.subtitle}</p>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5">
            {item.value != null && (
              <span className="text-[11px] font-black text-[#2E7D32]">{INR(item.value)}</span>
            )}
            {item.city && (
              <span className="text-[10px] text-slate-400 font-semibold inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{item.city}</span>
            )}
          </div>
          {statusSelect(item)}
        </div>
        {item.assignee && (
          <p className="text-[9px] text-indigo-600 font-bold mt-1.5 inline-flex items-center gap-1"><UserCheck className="h-3 w-3" /> {item.assignee}</p>
        )}
      </button>
    );
  };

  const filterBar = (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, car, mobile, reg number…"
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/10"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as any)}
          className="px-2.5 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 outline-none bg-white"
        >
          <option value="all">All types</option>
          {Object.keys(KIND_META).filter((k) => k !== "customer").map((k) => (
            <option key={k} value={k}>{KIND_META[k as CrmRecordKind].label}</option>
          ))}
        </select>
        {kindFilter === "buyer_lead" && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 outline-none bg-white"
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {salesAssociates.map((sa) => (
              <option key={sa.id} value={sa.id}>{sa.name}</option>
            ))}
          </select>
        )}
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-2.5 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 outline-none bg-white"
        >
          <option value="all">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );

  const stageChip = (key: Stage) => {
    const s = STAGES.find((x) => x.key === key)!;
    const active = stageFilter === key;
    return (
      <button
        key={key}
        onClick={() => { setStageFilter(active ? "all" : key); setView("pipeline"); }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider transition ${
          active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        {s.label}
        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? "bg-white/15" : "bg-slate-100"}`}>{stageCounts[key]}</span>
      </button>
    );
  };

  // -------------------------------------------------------------------------
  // Overview view
  // -------------------------------------------------------------------------
  const overview = (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {[
          { label: "New Leads", val: stageCounts.leads, desc: "Buyer + seller enquiries", tone: "bg-sky-50 border-sky-200 text-sky-700", mod: "leads" as Stage },
          { label: "Inspections", val: stageCounts.inspection + stageCounts.valuation, desc: "Booked → valued", tone: "bg-indigo-50 border-indigo-200 text-indigo-700", mod: "inspection" as Stage },
          { label: "Bidding", val: stageCounts.bidding, desc: "Offers, bids & auctions", tone: "bg-orange-50 border-orange-200 text-orange-700", mod: "bidding" as Stage },
          { label: "Closed Deals", val: stageCounts.deals, desc: "Sold & resolved", tone: "bg-emerald-50 border-emerald-200 text-emerald-700", mod: "deals" as Stage },
          { label: "Customers", val: profiles.length, desc: "Registered profiles", tone: "bg-violet-50 border-violet-200 text-violet-700", mod: "customer" },
          { label: "Inventory", val: cars.length, desc: "Cars in catalog", tone: "bg-amber-50 border-amber-200 text-amber-700", mod: "car" },
          { label: "Active Auctions", val: auctions.filter((a) => ["LIVE", "EXTENDED", "CLOSING"].includes(a.status)).length, desc: "Live dealer bidding", tone: "bg-rose-50 border-rose-200 text-rose-700", mod: "auction" },
          { label: "Pipeline Value", val: "₹" + pipelineValue.toLocaleString("en-IN"), desc: "Valuation + bidding", tone: "bg-emerald-50 border-emerald-200 text-emerald-700", mod: "bidding" }
        ].map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => {
              if (kpi.mod === "customer" || kpi.mod === "car" || kpi.mod === "auction") {
                setKindFilter(kpi.mod as CrmRecordKind);
                setStageFilter("all");
                setView("pipeline");
                return;
              }
              setStageFilter(kpi.mod as Stage);
              setKindFilter("all");
              setView("pipeline");
            }}
            className={`p-4 rounded-2xl border text-left transition hover:shadow-md ${kpi.tone}`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{kpi.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpi.val}</p>
            <p className="text-[10px] font-bold opacity-70 mt-0.5">{kpi.desc}</p>
          </button>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#2E7D32]" /> CRM Pipeline Funnel
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Lead → Inspection → Valuation → Bidding → Closed deal
            </p>
          </div>
          <button
            onClick={() => setView("pipeline")}
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#2E7D32] hover:text-[#25632a]"
          >
            Open pipeline <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          {STAGES.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => { setStageFilter(s.key); setKindFilter("all"); setView("pipeline"); }}
              className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-left hover:border-slate-200 hover:shadow-sm transition group"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600`}>
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {idx + 1}. {s.label}
                </span>
                <span className="text-lg font-black text-slate-900">{stageCounts[s.key]}</span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.bar} transition-all`} style={{ width: `${Math.min(100, (stageCounts[s.key] / Math.max(1, items.length)) * 100)}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 font-bold mt-1.5">{s.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#ff5a07]" /> Recent Activity
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live from Supabase</span>
          </div>
          <div className="space-y-3">
            {items.slice(0, 12).map((i) => (
              <button
                key={`act-${i.kind}-${i.id}`}
                onClick={() => setDetail({ kind: i.kind, id: i.id })}
                className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition text-left"
              >
                <span className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${KIND_META[i.kind].chip}`}>
                  {(() => { const I = KIND_META[i.kind].icon; return <I className="h-4 w-4" />; })()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{i.title}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{i.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] text-slate-400 font-bold">{tAgo(i.ts)}</span>
                  {i.value != null && <span className="text-[10px] font-black text-[#2E7D32]">{INR(i.value)}</span>}
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <Sparkles className="h-8 w-8 mb-2" />
                <p className="text-xs font-bold">No activity yet</p>
                <p className="text-[10px]">Buyer/seller enquiries, inspections and bids will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Customers snapshot */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2E7D32]" /> Customers
            </h3>
            <button onClick={() => { setKindFilter("customer"); setView("pipeline"); }} className="text-[10px] font-black uppercase tracking-wider text-[#2E7D32] hover:text-[#25632a] inline-flex items-center gap-1">
              All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {profiles.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => setDetail({ kind: "customer", id: p.id })}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition text-left"
              >
                <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#2E7D32] to-[#4CAF50] text-white text-xs font-black flex items-center justify-center shrink-0">
                  {(p.name || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{p.role || "—"}{p.city ? " · " + p.city : ""}</p>
                </div>
                <span className="text-[9px] text-slate-400 font-bold">{tAgo(p.created_at)}</span>
              </button>
            ))}
            {profiles.length === 0 && (
              <p className="text-center text-[11px] text-slate-400 font-bold py-8">No customer profiles yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Pipeline view
  // -------------------------------------------------------------------------
  const grouped = STAGES.map((s) => ({ stage: s, rows: filtered.filter((i) => i.stage === s.key) }));
  const stageVisible = stageFilter !== "all";
  const customerRows = kindFilter === "customer" ? profiles : [];
  const pipeline = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map((s) => stageChip(s.key))}
      </div>

      {kindFilter === "customer" ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2E7D32]" /> Customers & Contacts
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {customerRows.length} registered profiles · click any customer for the 360° journey
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {customerRows.map((p) => {
              const linked = customerRecords(p);
              const total = linked.reduce((s, r) => {
                const it = items.find((i) => i.kind === r.kind && i.id === r.id);
                return s + (Number(it?.value) || 0);
              }, 0);
              return (
                <button
                  key={p.id}
                  onClick={() => setDetail({ kind: "customer", id: p.id })}
                  className="w-full text-left bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-slate-200 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${toneBadge(statusTone(p.role))}`}>
                      <Users className="h-3 w-3" /> {p.role || "Customer"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{tAgo(p.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#2E7D32] to-[#4CAF50] text-white text-sm font-black flex items-center justify-center shrink-0">
                      {(p.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug truncate">{p.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{p.email || p.mobile || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[11px] font-black text-[#2E7D32]">{INR(total)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{linked.length} records{p.city ? " · " + p.city : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {customerRows.length === 0 && (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-xs font-bold">No customer profiles yet</p>
              <p className="text-[10px]">Sign-ups and role registrations appear here.</p>
            </div>
          )}
        </div>
      ) : stageVisible ? (
        <div>
          {(() => {
            const s = STAGES.find((x) => x.key === stageFilter)!;
            const rows = filtered.filter((i) => i.stage === stageFilter);
            return (
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} /> {s.label}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{rows.length} records · {s.blurb}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {rows.map(card)}
                </div>
                {rows.length === 0 && (
                  <div className="flex flex-col items-center py-12 text-slate-400">
                    <CheckCircle2 className="h-8 w-8 mb-2" />
                    <p className="text-xs font-bold">Nothing in this stage</p>
                    <p className="text-[10px]">Adjust the filters or create new enquiries from the site.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
          {grouped.map(({ stage, rows }) => (
            <div key={stage.key} className="bg-white border border-slate-100 rounded-3xl p-3 shadow-sm">
              <div className={`rounded-xl p-2.5 ${stage.key === "leads" ? "bg-sky-50" : stage.key === "inspection" ? "bg-indigo-50" : stage.key === "valuation" ? "bg-amber-50" : stage.key === "bidding" ? "bg-orange-50" : "bg-emerald-50"} mb-3`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${stage.dot}`} /> {stage.label}
                  </h4>
                  <span className="text-xs font-black text-slate-900">{rows.length}</span>
                </div>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5">{stage.blurb}</p>
              </div>
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {rows.map(card)}
                {rows.length === 0 && (
                  <p className="text-center text-[10px] text-slate-400 font-bold py-4">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // -------------------------------------------------------------------------
  // Detail view
  // -------------------------------------------------------------------------
  const renderDetail = () => {
    if (!detail) return null;

    if (detail.kind === "customer" && detailProfile) {
      const p = detailProfile;
      const records = customerRecords(p);
      const tline = timeline;
      return (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <span className="h-14 w-14 rounded-full bg-gradient-to-br from-[#2E7D32] to-[#4CAF50] text-white text-xl font-black flex items-center justify-center">
                {(p.name || "?").slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  {p.name}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${toneBadge(statusTone(p.role))}`}>{p.role || "Customer"}</span>
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-3 flex-wrap">
                  {p.email && <span>{p.email}</span>}
                  {p.mobile && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.mobile}</span>}
                  {p.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>}
                </p>
              </div>
            </div>
            <Button onClick={() => setDetail(null)} variant="ghost" className="text-xs">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Joined", val: fDate(p.created_at) },
              { label: "Approved", val: p.is_approved ? "Yes" : "No" },
              { label: "Records", val: records.length },
              { label: "Total Value", val: "₹" + records.reduce((s, r) => {
                  const it = items.find((i) => i.kind === r.kind && i.id === r.id);
                  return s + (Number(it?.value) || 0);
                }, 0).toLocaleString("en-IN") }
            ].map((k) => (
              <div key={k.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{k.label}</p>
                <p className="text-sm font-black text-slate-900 mt-1">{k.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                <Contact className="h-4 w-4 text-[#2E7D32]" /> Journey & Records ({records.length})
              </h4>
              {records.length === 0 && (
                <p className="text-[11px] text-slate-400 font-bold py-4">No linked records found for this customer yet.</p>
              )}
              <div className="space-y-2">
                {records.map((r) => {
                  const meta = KIND_META[r.kind];
                  const I = meta.icon;
                  return (
                    <button
                      key={`${r.kind}-${r.id}`}
                      onClick={() => setDetail({ kind: r.kind, id: r.id })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition text-left"
                    >
                      <span className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 ${meta.chip}`}><I className="h-4 w-4" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{meta.label}</p>
                        <p className="text-xs font-bold text-slate-800 truncate">{r.text}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#ff5a07]" /> Activity Timeline
              </h4>
              <Timeline events={tline} />
            </div>
          </div>
        </div>
      );
    }

    if (!detailItem) {
      return (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-500">Record not found in current data.</p>
          <Button onClick={() => setDetail(null)} variant="ghost" className="mt-3 text-xs">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      );
    }

    const item = detailItem;
    const meta = KIND_META[item.kind];
    const I = meta.icon;
    const rows = fieldRows(item);
    const tline = buildTimeline(detail);

    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <span className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 ${meta.chip}`}><I className="h-6 w-6" /></span>
            <div>
              <h2 className="font-black text-lg text-slate-900 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                {item.title}
                {statusSelect(item)}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{item.subtitle}{item.city ? " · " + item.city : ""}</p>
            </div>
          </div>
          <Button onClick={() => setDetail(null)} variant="ghost" className="text-xs">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {item.image && (
          <img src={item.image} alt={item.title} className="w-full max-h-56 object-cover rounded-2xl border border-slate-100" />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#2E7D32]" /> Record Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {rows.map((r) => (
                <div key={r.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    {r.icon && <r.icon className="h-3 w-3" />} {r.label}
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-1 break-words">{r.value}</p>
                </div>
              ))}
              {rows.length === 0 && <p className="text-[11px] text-slate-400 font-bold">No fields available.</p>}
            </div>

            {/* Actions */}
            {isAdmin && (
              <div className="mt-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#ff5a07]" /> Actions
                </h4>
                <div className="space-y-2.5">
                  {item.kind === "buyer_lead" && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assign Sales Associate</label>
                        <select
                          value={item.record?.assigned_to || ""}
                          disabled={saving?.table === "sales_notifications"}
                          onChange={(e) => e.target.value && handleAssignSales(item, e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-white disabled:opacity-60"
                        >
                          <option value="">— Unassigned —</option>
                          {salesAssociates.map((x) => (
                            <option key={x.id} value={x.id}>{x.name}{x.city ? ` (${x.city})` : ""}</option>
                          ))}
                        </select>
                      </div>
                      {item.record?.assigned_to && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={saving?.table === "sales_notifications"}
                          onClick={() => handleAssignSales(item, "")}
                        >
                          <UserCheck className="h-4 w-4 mr-1" /> Unassign
                        </Button>
                      )}
                    </>
                  )}
                  {item.kind === "inspection" && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Assign Inspector</label>
                      <select
                        value={item.record?.inspector_id || ""}
                        disabled={saving?.table === "inspections"}
                        onChange={(e) => e.target.value && handleAssignInspector(item, e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none bg-white disabled:opacity-60"
                      >
                        <option value="">— Select inspector —</option>
                        {inspectors.map((x) => (
                          <option key={x.id} value={x.id}>{x.name}{x.city ? ` (${x.city})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {item.kind === "inspection" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving?.table === "inspections"}
                      onClick={() => updateRow("inspections", item.id, { status: "assigned" }, "Inspection")}
                    >
                      <UserCheck className="h-4 w-4 mr-1" /> Mark Assigned
                    </Button>
                  )}
                  {item.kind === "inspection" && inspectors.length === 0 && (
                    <p className="text-[10px] text-slate-400 font-bold">No Inspector profiles exist yet — add one under People & Access → Inspectors.</p>
                  )}
                  {item.kind === "offer" && item.record?.inspection_id && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={saving?.table === "offers"}
                      onClick={handleAcceptOffer}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Accept Offer & Mark Sold
                    </Button>
                  )}
                  {item.kind === "car" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving?.table === "cars"}
                      onClick={() => updateRow("cars", item.id, { status: "sold" }, "Inventory")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark as Sold
                    </Button>
                  )}
                  <p className="text-[9px] text-slate-400 font-bold">Changes are written straight to the existing Supabase tables — analytics and n8n webhooks pick them up automatically.</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#ff5a07]" /> Activity Timeline
            </h4>
            <Timeline events={tline} />
            {salesAssociates.length > 0 && (
              <p className="text-[10px] text-slate-400 font-bold mt-4 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> {salesAssociates.length} sales associate{ salesAssociates.length > 1 ? "s" : "" } available to assign
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Timeline = ({ events }: { events: TimelineEvent[] }) => (
    <div className="space-y-3">
      {events.length === 0 && <p className="text-[11px] text-slate-400 font-bold py-4">No events recorded.</p>}
      {events.map((e, idx) => {
        const dot = e.tone === "green" ? "bg-emerald-500" : e.tone === "rose" ? "bg-rose-500" : e.tone === "amber" ? "bg-amber-500" : e.tone === "indigo" ? "bg-indigo-500" : "bg-slate-400";
        return (
          <div key={idx} className="relative pl-5">
            {idx < events.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-slate-200" />}
            <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${dot} ring-2 ring-white`} />
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-slate-700 leading-snug">{e.text}</p>
              <span className="text-[9px] text-slate-400 font-bold shrink-0 pt-0.5">{tAgo(e.ts)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0f2f16] via-[#1b4d26] to-[#2E7D32] rounded-3xl p-5 md:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black uppercase tracking-wider text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#ffb81e]" /> Customer Relationship Center
          </h2>
          <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
            Unified view across buyers, sellers, inspections, dealer bids & inventory — powered by the existing Supabase tables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/10 border border-white/15 rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setView("overview")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${view === "overview" ? "bg-white text-slate-900" : "text-white hover:bg-white/10"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Overview
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${view === "pipeline" ? "bg-white text-slate-900" : "text-white hover:bg-white/10"}`}
            >
              <Rows3 className="h-3.5 w-3.5" /> Pipeline
            </button>
          </div>
          <Button
            onClick={() => onRefresh?.()}
            variant="ghost"
            className="bg-white/10 border border-white/15 text-white hover:bg-white/20 text-[10px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${saving ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {detail ? (
        renderDetail()
      ) : (
        <>
          {filterBar}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <BadgeCheck className="h-3 w-3" /> {filtered.length} records across {items.length > 0 ? new Set(items.map((i) => i.kind)).size : 0} sources
            </span>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <AlertCircle className="h-3 w-3" /> Read-only view
              </span>
            )}
          </div>
          {view === "overview" ? overview : pipeline}
        </>
      )}
    </div>
  );
}

function Button({ children, ...rest }: any) {
  const base = "inline-flex items-center justify-center rounded-xl font-black uppercase tracking-wider h-10 px-4 text-[11px] transition";
  const variant = rest.variant === "outline" ? "border border-slate-200 text-slate-700 hover:border-slate-300 bg-white" : rest.variant === "ghost" ? "text-slate-600 hover:bg-slate-100" : rest.variant === "primary" ? "bg-[#2E7D32] hover:bg-[#25632a] text-white" : "bg-[#2E7D32] hover:bg-[#25632a] text-white";
  const size = rest.size === "sm" ? "h-8 px-3 text-[10px]" : "";
  return (
    <button {...rest} className={`${base} ${variant} ${size} ${rest.className || ""}`}>
      {children}
    </button>
  );
}
