/**
 * 1stCars Dealer Auction Engine — client service.
 *
 * Talks to the auction engine in public/auction_engine.sql:
 *   - Real Supabase  -> SECURITY DEFINER RPCs (place_auction_bid, start/close/
 *                       cancel, seller_decision, bid history, maintenance).
 *   - Mock DB        -> a faithful local engine that mirrors the same
 *                       validations, status transitions, anti-sniping
 *                       extension logic and automation events so the whole
 *                       auction flow can be demoed without a database.
 */
import * as React from "react";
import { supabase } from "./supabaseClient";
import { notificationService } from "./notifications";
import { automationService } from "./automation";

// ============================================================
// TYPES
// ============================================================

export type AuctionStatus =
  | "DRAFT"
  | "READY"
  | "SCHEDULED"
  | "LIVE"
  | "EXTENDED"
  | "CLOSING"
  | "CLOSED"
  | "SELLER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export interface AuctionRecord {
  id: string;
  car_id: string | null;
  inspection_id: string | null;
  seller_id: string | null;
  status: AuctionStatus;
  starting_bid: number;
  reserve_price: number;
  current_highest_bid: number | null;
  minimum_increment: number;
  starts_at: string;
  ends_at: string;
  extension_seconds: number;
  max_extension_count: number;
  extension_count: number;
  winner_dealer_id: string | null;
  winning_bid_id: string | null;
  closed_at: string | null;
  ended_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionBidRecord {
  id: string;
  auction_id: string;
  dealer_id: string;
  amount: number;
  status: "WINNING" | "OUTBID" | "CANCELLED" | "REJECTED";
  client_request_id?: string | null;
  is_auto_extension?: boolean;
  created_at: string;
}

export interface AuctionEligibilityRecord {
  id: string;
  auction_id: string;
  dealer_id: string;
  status: "INVITED" | "ELIGIBLE" | "VIEWED" | "BIDDED" | "DISQUALIFIED";
  invited_at?: string;
  eligible_at?: string | null;
  viewed_at?: string | null;
  last_bid_at?: string | null;
}

export interface AuctionPaymentRecord {
  id: string;
  auction_id: string;
  winner_dealer_id: string | null;
  bid_id: string | null;
  amount: number;
  status: "PENDING" | "IN_PROGRESS" | "RECEIVED" | "FAILED" | "REFUNDED";
  method?: string | null;
  reference?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidHistoryEntry {
  amount: number;
  status: string;
  is_mine?: boolean;
  rank?: number;
  dealer_id?: string;
  bid_id?: string;
  created_at: string;
}

export interface BidResult {
  success: boolean;
  duplicate?: boolean;
  bid_id?: string;
  amount?: number;
  new_highest_bid?: number;
  new_end_time?: string;
  auction_status?: AuctionStatus;
  extended?: boolean;
  error?: string;
}

export interface AuctionActor {
  userId: string;
  role: string;
}

export interface CreateAuctionInput {
  car_id: string;
  inspection_id: string;
  starting_bid: number;
  reserve_price?: number;
  minimum_increment?: number;
  starts_at?: string;
  ends_at?: string;
  extension_seconds?: number;
  max_extension_count?: number;
  eligible_dealer_ids?: string[];
}

export interface EligibleDealerRow {
  id: string;
  auction_id: string;
  dealer_id: string;
  status: string;
  dealer_name?: string;
  mobile?: string;
  city?: string;
  is_verified?: boolean;
  is_approved?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

export const AUCTION_STATUSES: AuctionStatus[] = [
  "DRAFT", "READY", "SCHEDULED", "LIVE", "EXTENDED", "CLOSING",
  "CLOSED", "SELLER_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"
];

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  EXTENDED: "Extended",
  CLOSING: "Closing",
  CLOSED: "Closed",
  SELLER_REVIEW: "Seller Review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled"
};

export const AUCTION_OPEN_STATES: AuctionStatus[] = ["LIVE", "EXTENDED"];
export const AUCTION_TERMINAL_STATES: AuctionStatus[] = ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"];

// Same map as public.auction_status_flow.
const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ["DRAFT", "READY", "SCHEDULED", "CANCELLED"],
  READY: ["READY", "SCHEDULED", "LIVE", "CANCELLED"],
  SCHEDULED: ["SCHEDULED", "LIVE", "CANCELLED", "DRAFT"],
  LIVE: ["LIVE", "EXTENDED", "CLOSING", "CANCELLED"],
  EXTENDED: ["EXTENDED", "CLOSING", "CANCELLED"],
  CLOSING: ["CLOSING", "CLOSED", "SELLER_REVIEW", "EXPIRED", "CANCELLED"],
  CLOSED: ["SELLER_REVIEW", "ACCEPTED", "REJECTED"],
  SELLER_REVIEW: ["SELLER_REVIEW", "ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["ACCEPTED"],
  REJECTED: ["REJECTED"],
  EXPIRED: ["EXPIRED"],
  CANCELLED: ["CANCELLED"]
};

// ============================================================
// HELPERS
// ============================================================

function rpcSupported(): boolean {
  try {
    return typeof (supabase as any)?.rpc === "function";
  } catch {
    return false;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newClientRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function nextMinBid(a: AuctionRecord): number {
  return a.current_highest_bid == null ? a.starting_bid : a.current_highest_bid + a.minimum_increment;
}

export function secondsLeft(a: AuctionRecord): number {
  return Math.max(0, Math.floor((new Date(a.ends_at).getTime() - Date.now()) / 1000));
}

export function isOpen(a: AuctionRecord): boolean {
  return AUCTION_OPEN_STATES.includes(a.status);
}

function assertTransition(from: string, to: string): void {
  const allowed = STATUS_FLOW[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid auction status transition: ${from} -> ${to}`);
  }
}

function looksLikeLegacy(row: any): boolean {
  return !!row && "car_title" in row && !("starting_bid" in row);
}

function sortRows(rows: any[]): any[] {
  return [...rows].sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
}

async function readTable<T = any>(table: string): Promise<T[]> {
  const { data } = await (supabase as any).from(table).select("*");
  return (data || []) as T[];
}

async function writeTable(table: string, rows: any[]): Promise<void> {
  await (supabase as any).from(table).delete().neq("id", "__never__");
  if (rows.length > 0) {
    await (supabase as any).from(table).insert(rows);
  }
}

export function isVerifiedDealer(p: any): boolean {
  return !!p && p.role === "Dealer" && p.is_verified !== false && p.is_approved !== false;
}

// ============================================================
// MOCK / LOCAL ENGINE
// ============================================================

async function localListAuctions(actor: AuctionActor | null): Promise<AuctionRecord[]> {
  const all = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r)) as AuctionRecord[];
  const sorted = [...all].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (!actor) return sorted;
  if (actor.role === "Admin" || actor.role === "Sales Associate" || actor.role === "Inspector") {
    return sorted;
  }
  if (actor.role === "Dealer") {
    const elig = await readTable("auction_dealer_eligibility");
    const mine = new Set(
      elig.filter((e: any) => e.dealer_id === actor.userId).map((e: any) => e.auction_id)
    );
    return sorted.filter((a) => mine.has(a.id));
  }
  if (actor.role === "Seller") {
    return sorted.filter((a) => a.seller_id === actor.userId);
  }
  return [];
}

async function localCreateAuction(actor: AuctionActor, input: CreateAuctionInput): Promise<AuctionRecord> {
  if (actor.role !== "Admin" && actor.role !== "Sales Associate") {
    throw new Error("Not authorized to create auctions");
  }
  const { data: cars } = await (supabase as any).from("cars").select("*").eq("id", input.car_id);
  const car = cars?.[0];
  if (!car) throw new Error("Car not found");
  if (!["available", "listed", "ready_for_sale", "inspection_completed"].includes(car.status)) {
    throw new Error("Car is not available for auction");
  }
  const { data: insps } = await (supabase as any).from("inspections").select("*").eq("id", input.inspection_id);
  const insp = insps?.[0];
  if (!insp) throw new Error("Inspection not found");
  if (!insp.seller_id) throw new Error("Inspection has no seller");
  if (insp.overall_score == null) throw new Error("Inspection must be completed before auction");

  const starts = input.starts_at ? new Date(input.starts_at) : new Date();
  const ends = input.ends_at ? new Date(input.ends_at) : new Date(Date.now() + 86400000);
  if (ends.getTime() <= starts.getTime()) throw new Error("ends_at must be after starts_at");
  if (!input.starting_bid || input.starting_bid <= 0) throw new Error("starting_bid must be positive");

  const row: AuctionRecord = {
    id: newId("auc"),
    car_id: input.car_id,
    inspection_id: input.inspection_id,
    seller_id: insp.seller_id,
    status: "DRAFT",
    starting_bid: Math.round(input.starting_bid),
    reserve_price: Math.round(input.reserve_price || 0),
    current_highest_bid: null,
    minimum_increment: Math.round(input.minimum_increment || 5000),
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    extension_seconds: input.extension_seconds || 120,
    max_extension_count: input.max_extension_count ?? 5,
    extension_count: 0,
    winner_dealer_id: null,
    winning_bid_id: null,
    closed_at: null,
    ended_reason: null,
    created_by: actor.userId,
    created_at: nowIso(),
    updated_at: nowIso()
  };
  const auctions = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r));
  auctions.push(row);
  await writeTable("auctions", auctions);

  const elig = await readTable("auction_dealer_eligibility");
  const { data: dealers } = await (supabase as any).from("profiles").select("*").eq("role", "Dealer");
  for (const dId of input.eligible_dealer_ids || []) {
    const d = (dealers || []).find((x: any) => x.id === dId);
    if (!d) continue;
    elig.push({
      id: newId("elig"),
      auction_id: row.id,
      dealer_id: dId,
      status: "INVITED",
      invited_at: nowIso(),
      eligible_at: null,
      viewed_at: null,
      last_bid_at: null
    });
  }
  await writeTable("auction_dealer_eligibility", elig);

  await automationService.emitEvent({
    type: "auction.created",
    sourceTable: "auctions",
    sourceId: row.id,
    payload: { auction_id: row.id, car_id: row.car_id, inspection_id: row.inspection_id, status: "DRAFT" }
  });
  return row;
}

async function localTransition(
  id: string,
  to: AuctionStatus,
  patch: Partial<AuctionRecord> = {},
  reason?: string
): Promise<AuctionRecord | null> {
  const auctions = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r));
  const idx = auctions.findIndex((a: any) => a.id === id);
  if (idx < 0) throw new Error("Auction not found");
  const current = auctions[idx] as AuctionRecord;
  assertTransition(current.status, to);
  const updated: AuctionRecord = {
    ...current,
    ...patch,
    status: to,
    updated_at: nowIso(),
    closed_at: to === "CANCELLED" || to === "EXPIRED" || to === "SELLER_REVIEW" || to === "ACCEPTED" || to === "REJECTED" ? patch.closed_at || nowIso() : current.closed_at,
    ended_reason: reason || current.ended_reason
  };
  auctions[idx] = updated;
  await writeTable("auctions", auctions);
  return updated;
}

async function localPlaceBid(actor: AuctionActor, auctionId: string, amount: number, clientRequestId: string): Promise<BidResult> {
  if (actor.role !== "Dealer") throw new Error("Only dealers can place bids");
  const { data: profs } = await (supabase as any).from("profiles").select("*").eq("id", actor.userId);
  const me = profs?.[0];
  if (!isVerifiedDealer(me)) throw new Error("Dealer account is not verified for auction participation");
  if (!amount || amount <= 0) throw new Error("Bid amount must be positive");
  if (!clientRequestId) throw new Error("client_request_id is required");

  const bids = await readTable<AuctionBidRecord>("auction_bids");
  const existing = bids.find((b) => b.auction_id === auctionId && b.client_request_id === clientRequestId);
  if (existing) {
    return { success: true, duplicate: true, bid_id: existing.id, amount: existing.amount };
  }

  const auctions = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r)) as AuctionRecord[];
  const idx = auctions.findIndex((a) => a.id === auctionId);
  if (idx < 0) throw new Error("Auction not found");
  const a = auctions[idx];

  if (!AUCTION_OPEN_STATES.includes(a.status)) throw new Error(`Auction is not open for bidding (${a.status})`);
  const now = Date.now();
  if (now < new Date(a.starts_at).getTime()) throw new Error("Auction has not started yet");
  if (now >= new Date(a.ends_at).getTime()) throw new Error("Auction has ended");

  const elig = await readTable<AuctionEligibilityRecord>("auction_dealer_eligibility");
  const myElig = elig.find((e) => e.auction_id === auctionId && e.dealer_id === actor.userId);
  if (!myElig || !["ELIGIBLE", "VIEWED", "BIDDED"].includes(myElig.status)) {
    throw new Error("Dealer is not eligible to bid on this auction");
  }

  const minNext = nextMinBid(a);
  if (amount < minNext) {
    throw new Error(`Bid must be at least ₹${minNext.toLocaleString("en-IN")} (current high + increment)`);
  }

  const prev = [...bids].filter((b) => b.auction_id === auctionId && b.status === "WINNING").sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];

  const bid: AuctionBidRecord = {
    id: newId("bid"),
    auction_id: auctionId,
    dealer_id: actor.userId,
    amount,
    status: "WINNING",
    client_request_id: clientRequestId,
    is_auto_extension: false,
    created_at: nowIso()
  };
  bids.push(bid);
  for (const b of bids) {
    if (b.id === prev?.id) b.status = "OUTBID";
  }
  await writeTable("auction_bids", bids);

  let extended = false;
  let newEnds = a.ends_at;
  const msLeft = new Date(a.ends_at).getTime() - now;
  if (msLeft <= (a.extension_seconds || 120) * 1000 && (a.extension_count || 0) < (a.max_extension_count ?? 5)) {
    newEnds = new Date(new Date(a.ends_at).getTime() + (a.extension_seconds || 120) * 1000).toISOString();
    extended = true;
  }

  const updated: AuctionRecord = {
    ...a,
    current_highest_bid: amount,
    winner_dealer_id: actor.userId,
    winning_bid_id: bid.id,
    extension_count: extended ? (a.extension_count || 0) + 1 : a.extension_count,
    ends_at: newEnds,
    status: extended ? "EXTENDED" : a.status,
    updated_at: nowIso()
  };
  auctions[idx] = updated;
  await writeTable("auctions", auctions);

  for (const e of elig) {
    if (e.id === myElig.id) {
      e.status = "BIDDED";
      e.last_bid_at = nowIso();
      e.viewed_at = e.viewed_at || nowIso();
    }
  }
  await writeTable("auction_dealer_eligibility", elig);

  await automationService.emitEvent({
    type: "auction.bid_placed",
    sourceTable: "auction_bids",
    sourceId: bid.id,
    payload: { auction_id: auctionId, bid_id: bid.id, amount, extended }
  });
  if (prev && prev.dealer_id !== actor.userId) {
    await notificationService.createNotification({
      recipientId: prev.dealer_id,
      title: "You have been outbid",
      message: `A higher bid of ₹${amount.toLocaleString("en-IN")} was placed on the auction you were winning.`,
      type: "alert",
      metadata: { auction_id: auctionId, amount }
    });
    await automationService.emitEvent({
      type: "auction.bid_outbid",
      sourceTable: "auction_bids",
      sourceId: `${prev.id}:${bid.id}`,
      payload: { auction_id: auctionId, outbid_bid_id: prev.id, new_amount: amount }
    });
  }
  if (extended) {
    await automationService.emitEvent({
      type: "auction.extended",
      sourceTable: "auctions",
      sourceId: `${auctionId}#ext${updated.extension_count}`,
      payload: { auction_id: auctionId, extension_count: updated.extension_count, new_ends_at: newEnds }
    });
  }

  return {
    success: true,
    bid_id: bid.id,
    amount,
    new_highest_bid: amount,
    new_end_time: newEnds,
    auction_status: updated.status,
    extended
  };
}

async function localCloseIfEnded(id: string): Promise<string> {
  const auctions = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r)) as AuctionRecord[];
  const idx = auctions.findIndex((a) => a.id === id);
  if (idx < 0) return "not_found";
  const a = auctions[idx];
  if (!["LIVE", "EXTENDED", "CLOSING"].includes(a.status)) return "not_closable";

  const bids = await readTable<AuctionBidRecord>("auction_bids");
  const winning = bids.filter((b) => b.auction_id === id && b.status === "WINNING").sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];

  const { data: inspRows } = await (supabase as any).from("inspections").select("*").eq("id", a.inspection_id);
  const insp = inspRows?.[0];
  const vehicle = insp ? `${insp.brand} ${insp.model}` : "Vehicle";

  if (!winning) {
    await localTransition(id, "EXPIRED", { closed_at: nowIso() }, "no_bids");
    if (a.car_id) {
      await (supabase as any).from("cars").update({ status: "available", updated_at: nowIso() }).eq("id", a.car_id);
    }
    await automationService.emitEvent({
      type: "auction.expired",
      sourceTable: "auctions",
      sourceId: id,
      payload: { auction_id: id, reason: "no_bids" }
    });
    return "expired";
  }

  await localTransition(id, "SELLER_REVIEW", { closed_at: nowIso() }, "time_elapsed");
  await automationService.emitEvent({ type: "auction.closed", sourceTable: "auctions", sourceId: id, payload: { auction_id: id, winner_amount: winning.amount } });
  await automationService.emitEvent({ type: "auction.winner_selected", sourceTable: "auctions", sourceId: `${id}:winner`, payload: { auction_id: id, amount: winning.amount } });

  if (a.seller_id) {
    await notificationService.createNotification({
      recipientId: a.seller_id,
      title: "Auction Result Ready",
      message: `Your vehicle auction ended with a highest bid of ₹${winning.amount.toLocaleString("en-IN")}. Review and accept or reject the result.`,
      type: "action",
      metadata: { auction_id: id, amount: winning.amount, vehicle }
    });
  }
  if (winning.dealer_id) {
    await notificationService.createNotification({
      recipientId: winning.dealer_id,
      title: "Auction Won",
      message: `Congratulations! You won the auction with the highest bid of ₹${winning.amount.toLocaleString("en-IN")}.`,
      type: "success",
      metadata: { auction_id: id, amount: winning.amount }
    });
  }
  await automationService.createTask({
    assigneeId: undefined,
    taskType: "auction_result_review",
    title: `Review auction result and follow up with seller`,
    description: `Auction #${id} closed at ₹${winning.amount.toLocaleString("en-IN")}. Get the seller to accept/reject, then route the winner to payment.`,
    priority: "high",
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    sourceTable: "auctions",
    sourceId: id
  });
  return "review";
}

async function localApplyDecision(
  actor: AuctionActor,
  id: string,
  decision: "ACCEPT" | "REJECT",
  reason?: string
): Promise<AuctionRecord | null> {
  const auctions = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r)) as AuctionRecord[];
  const a = auctions.find((x) => x.id === id);
  if (!a) throw new Error("Auction not found");

  if (actor.role === "Seller") {
    if (a.seller_id !== actor.userId) throw new Error("You can only decide on auctions for your own vehicles");
  } else if (actor.role !== "Admin" && actor.role !== "Sales Associate") {
    throw new Error("Not authorized");
  }
  if (actor.role === "Seller" && a.status !== "SELLER_REVIEW") {
    throw new Error(`Auction is not awaiting a seller decision (${a.status})`);
  }
  if (actor.role !== "Seller" && !["SELLER_REVIEW", "CLOSED"].includes(a.status)) {
    throw new Error(`Auction is not awaiting a decision (${a.status})`);
  }

  const bids = await readTable<AuctionBidRecord>("auction_bids");
  const winning = bids.find((b) => b.auction_id === id && b.status === "WINNING");
  const amount = winning?.amount || a.current_highest_bid || 0;

  if (decision === "ACCEPT") {
    const updated = await localTransition(id, "ACCEPTED", { closed_at: nowIso() }, actor.role === "Seller" ? "seller_accepted" : "admin_accepted");
    if (a.car_id) {
      await (supabase as any).from("cars").update({ status: "sold", updated_at: nowIso() }).eq("id", a.car_id);
    }
    const payments = await readTable<AuctionPaymentRecord>("auction_payments");
    if (!payments.some((p) => p.auction_id === id)) {
      payments.push({
        id: newId("pay"),
        auction_id: id,
        winner_dealer_id: a.winner_dealer_id,
        bid_id: winning?.id || null,
        amount,
        status: "PENDING",
        method: null,
        reference: null,
        paid_at: null,
        created_at: nowIso(),
        updated_at: nowIso()
      });
      await writeTable("auction_payments", payments);
    }
    if (a.winner_dealer_id) {
      await notificationService.createNotification({
        recipientId: a.winner_dealer_id,
        title: "Payment Required",
        message: `Auction result accepted. Pay ₹${amount.toLocaleString("en-IN")} to complete your purchase.`,
        type: "action",
        metadata: { auction_id: id, amount }
      });
    }
    await automationService.createTask({
      assigneeId: undefined,
      taskType: "dealer_payment",
      title: `Collect dealer payment for auction #${id}`,
      description: `Collect ₹${amount.toLocaleString("en-IN")} from the winning dealer, then initiate vehicle transfer.`,
      priority: "urgent",
      dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      sourceTable: "auctions",
      sourceId: id
    });
    await automationService.emitEvent({ type: "auction.seller_accepted", sourceTable: "auctions", sourceId: id, payload: { auction_id: id, amount } });
    await automationService.emitEvent({ type: "auction.vehicle_sold", sourceTable: "auctions", sourceId: `${id}:sold`, payload: { auction_id: id, car_id: a.car_id, amount } });
    return updated;
  }

  const updated = await localTransition(id, "REJECTED", { closed_at: nowIso() }, actor.role === "Seller" ? "seller_rejected" : "admin_rejected");
  if (a.car_id) {
    await (supabase as any).from("cars").update({ status: "available", updated_at: nowIso() }).eq("id", a.car_id);
  }
  if (a.winner_dealer_id) {
    await notificationService.createNotification({
      recipientId: a.winner_dealer_id,
      title: "Auction Result Rejected",
      message: "The auction result was not accepted. Your winning bid has been released.",
      type: "info",
      metadata: { auction_id: id }
    });
  }
  await automationService.emitEvent({ type: "auction.seller_rejected", sourceTable: "auctions", sourceId: id, payload: { auction_id: id, reason } });
  return updated;
}

async function localSellerDecision(actor: AuctionActor, id: string, decision: "ACCEPT" | "REJECT", reason?: string): Promise<AuctionRecord | null> {
  return localApplyDecision(actor, id, decision, reason);
}

async function localAdminDecision(actor: AuctionActor, id: string, decision: "ACCEPT" | "REJECT", reason?: string): Promise<AuctionRecord | null> {
  return localApplyDecision(actor, id, decision, reason);
}

// ============================================================
// DEMO SEEDING (mock mode only)
// ============================================================

const DEMO_FLAG = "1stcars_auction_demo_seeded";

async function ensureMockDemo(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(DEMO_FLAG) === "1") return;

  const { data: auctions } = await (supabase as any).from("auctions").select("*");
  const hasAny = (auctions || []).some((r: any) => !looksLikeLegacy(r));
  if (!hasAny) {
    // Promote the seeded inspection/car into a completed, auction-ready state.
    await (supabase as any).from("inspections").update({
      status: "completed",
      overall_score: 9.4,
      is_certified: true
    }).eq("id", "insp-2");
    await (supabase as any).from("cars").update({
      status: "listed",
      updated_at: nowIso()
    }).eq("id", "car-2");

    const demo: AuctionRecord = {
      id: "auc-demo-1",
      car_id: "car-2",
      inspection_id: "insp-2",
      seller_id: "u-seller",
      status: "LIVE",
      starting_bid: 12000000,
      reserve_price: 16500000,
      current_highest_bid: 12450000,
      minimum_increment: 150000,
      starts_at: new Date(Date.now() - 3600000).toISOString(),
      ends_at: new Date(Date.now() + 3600000 * 3).toISOString(),
      extension_seconds: 120,
      max_extension_count: 5,
      extension_count: 0,
      winner_dealer_id: "u-dealer",
      winning_bid_id: "bid-demo-2",
      closed_at: null,
      ended_reason: null,
      created_by: "u-admin",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    };
    const existing = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r));
    existing.push(demo);
    await writeTable("auctions", existing);

    const bids: AuctionBidRecord[] = [
      {
        id: "bid-demo-1",
        auction_id: "auc-demo-1",
        dealer_id: "u-dealer2",
        amount: 12300000,
        status: "OUTBID",
        client_request_id: "demo-bid-1",
        is_auto_extension: false,
        created_at: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: "bid-demo-2",
        auction_id: "auc-demo-1",
        dealer_id: "u-dealer",
        amount: 12450000,
        status: "WINNING",
        client_request_id: "demo-bid-2",
        is_auto_extension: false,
        created_at: new Date(Date.now() - 600000).toISOString()
      }
    ];
    await writeTable("auction_bids", bids);

    const eligRows = await readTable("auction_dealer_eligibility");
    eligRows.push(
      {
        id: "elig-demo-1",
        auction_id: "auc-demo-1",
        dealer_id: "u-dealer",
        status: "BIDDED",
        invited_at: new Date(Date.now() - 86400000).toISOString(),
        eligible_at: new Date(Date.now() - 80000000).toISOString(),
        viewed_at: new Date(Date.now() - 1800000).toISOString(),
        last_bid_at: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: "elig-demo-2",
        auction_id: "auc-demo-1",
        dealer_id: "u-dealer2",
        status: "BIDDED",
        invited_at: new Date(Date.now() - 86400000).toISOString(),
        eligible_at: new Date(Date.now() - 80000000).toISOString(),
        viewed_at: new Date(Date.now() - 1700000).toISOString(),
        last_bid_at: new Date(Date.now() - 900000).toISOString()
      }
    );
    await writeTable("auction_dealer_eligibility", eligRows);
  }

  window.localStorage.setItem(DEMO_FLAG, "1");
}

// ============================================================
// SERVICE
// ============================================================

export const auctionService = {
  supportsRpc: rpcSupported,

  async ensureDemo(): Promise<void> {
    if (!rpcSupported()) await ensureMockDemo();
  },

  async fetchActor(): Promise<AuctionActor | null> {
    try {
      const res = await (supabase as any).auth.getUser();
      const uid = res?.data?.user?.id ?? res?.data?.user ?? null;
      if (!uid) return null;
      const { data } = await (supabase as any).from("profiles").select("*").eq("id", uid).maybeSingle();
      if (!data) return { userId: uid, role: "Buyer" };
      return { userId: uid, role: data.role || "Buyer" };
    } catch {
      return null;
    }
  },

  async listAuctions(actor?: AuctionActor | null): Promise<AuctionRecord[]> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).from("auctions").select("*").order("created_at", { ascending: false });
      if (!error && data) return data as AuctionRecord[];
    }
    return localListAuctions(actor || null);
  },

  async getAuction(id: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).from("auctions").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data as AuctionRecord;
    }
    const rows = (await readTable("auctions")).filter((r: any) => !looksLikeLegacy(r)) as AuctionRecord[];
    return rows.find((a) => a.id === id) || null;
  },

  async getBids(auctionId: string): Promise<AuctionBidRecord[]> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).from("auction_bids").select("*").eq("auction_id", auctionId).order("created_at", { ascending: false });
      if (!error && data) return data as AuctionBidRecord[];
    }
    const bids = await readTable<AuctionBidRecord>("auction_bids");
    return bids.filter((b) => b.auction_id === auctionId).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  },

  async getBidHistory(auctionId: string): Promise<BidHistoryEntry[]> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_public_bid_history", { p_auction_id: auctionId });
      if (!error && data) return Array.isArray(data) ? data : (data?.history || []);
    }
    // Local masked history: amounts + timing, never dealer identity unless staff.
    const actor = await this.fetchActor();
    const bids = await this.getBids(auctionId);
    const isStaff = !!actor && ["Admin", "Sales Associate", "Inspector"].includes(actor.role);
    const sorted = [...bids].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
    return sorted.map((b) => ({
      amount: b.amount,
      status: b.status,
      is_mine: !isStaff ? b.dealer_id === actor?.userId : undefined,
      dealer_id: isStaff ? b.dealer_id : undefined,
      bid_id: isStaff ? b.id : undefined,
      rank: sorted.filter((o) => o.amount >= b.amount).length,
      created_at: b.created_at
    }));
  },

  async getEligibleDealers(auctionId: string): Promise<EligibleDealerRow[]> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any)
        .from("auction_dealer_eligibility")
        .select("id, auction_id, dealer_id, status, invited_at, eligible_at, viewed_at, last_bid_at, profiles!auction_dealer_eligibility_dealer_id_fkey(name, mobile, city, is_verified, is_approved)")
        .eq("auction_id", auctionId);
      if (!error && data) {
        return (data as any[]).map((r) => ({
          id: r.id,
          auction_id: r.auction_id,
          dealer_id: r.dealer_id,
          status: r.status,
          dealer_name: r.profiles?.name,
          mobile: r.profiles?.mobile,
          city: r.profiles?.city,
          is_verified: r.profiles?.is_verified,
          is_approved: r.profiles?.is_approved
        }));
      }
    }
    const elig = await readTable<AuctionEligibilityRecord>("auction_dealer_eligibility");
    const { data: profs } = await (supabase as any).from("profiles").select("*").eq("role", "Dealer");
    return elig
      .filter((e) => e.auction_id === auctionId)
      .map((e) => {
        const p = (profs || []).find((x: any) => x.id === e.dealer_id);
        return {
          id: e.id,
          auction_id: e.auction_id,
          dealer_id: e.dealer_id,
          status: e.status,
          dealer_name: p?.name,
          mobile: p?.mobile,
          city: p?.city,
          is_verified: p?.is_verified,
          is_approved: p?.is_approved
        };
      });
  },

  async getPayments(auctionId: string): Promise<AuctionPaymentRecord[]> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).from("auction_payments").select("*").eq("auction_id", auctionId);
      if (!error && data) return data as AuctionPaymentRecord[];
    }
    const payments = await readTable<AuctionPaymentRecord>("auction_payments");
    return payments.filter((p) => p.auction_id === auctionId);
  },

  async createAuction(actor: AuctionActor, input: CreateAuctionInput): Promise<AuctionRecord> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_create_auction", {
        p_car_id: input.car_id,
        p_inspection_id: input.inspection_id,
        p_starting_bid: input.starting_bid,
        p_reserve_price: input.reserve_price || 0,
        p_minimum_increment: input.minimum_increment || 5000,
        p_starts_at: input.starts_at || null,
        p_ends_at: input.ends_at || null,
        p_extension_seconds: input.extension_seconds || 120,
        p_max_extension_count: input.max_extension_count ?? 5,
        p_eligible_dealer_ids: input.eligible_dealer_ids || []
      });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    return localCreateAuction(actor, input);
  },

  async publishAuction(actor: AuctionActor, id: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_publish_auction", { p_auction_id: id });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    const updated = await localTransition(id, "READY");
    await automationService.emitEvent({ type: "auction.published", sourceTable: "auctions", sourceId: id, payload: { auction_id: id } });
    return updated;
  },

  async scheduleAuction(actor: AuctionActor, id: string, startsAt: string, endsAt: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_schedule_auction", { p_auction_id: id, p_starts_at: startsAt, p_ends_at: endsAt });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) throw new Error("ends_at must be after starts_at");
    const updated = await localTransition(id, "SCHEDULED", { starts_at: startsAt, ends_at: endsAt, extension_count: 0 });
    await automationService.emitEvent({ type: "auction.scheduled", sourceTable: "auctions", sourceId: id, payload: { auction_id: id, starts_at: startsAt, ends_at: endsAt } });
    return updated;
  },

  async startAuction(actor: AuctionActor, id: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_start_auction", { p_auction_id: id });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    const a = (await this.listAuctions(actor)).find((x) => x.id === id);
    if (!a) throw new Error("Auction not found");
    if (!["READY", "SCHEDULED"].includes(a.status)) throw new Error(`Auction not startable from ${a.status}`);
    const updated = await localTransition(id, "LIVE");
    if (updated?.car_id) {
      await (supabase as any).from("cars").update({ status: "bidding", updated_at: nowIso() }).eq("id", updated.car_id);
    }
    await automationService.emitEvent({ type: "auction.started", sourceTable: "auctions", sourceId: id, payload: { auction_id: id, starts_at: updated?.starts_at, ends_at: updated?.ends_at } });
    return updated;
  },

  async setEligibleDealers(actor: AuctionActor, id: string, dealerIds: string[]): Promise<number> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_set_eligible_dealers", { p_auction_id: id, p_dealer_ids: dealerIds });
      if (error) throw new Error(error.message);
      return Number(data || 0);
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    const elig = await readTable<AuctionEligibilityRecord>("auction_dealer_eligibility");
    const { data: dealers } = await (supabase as any).from("profiles").select("*").eq("role", "Dealer");
    let count = 0;
    for (const dId of dealerIds) {
      const d = (dealers || []).find((x: any) => x.id === dId);
      if (!d) continue;
      const existing = elig.find((e) => e.auction_id === id && e.dealer_id === dId);
      if (existing) {
        if (["INVITED", "ELIGIBLE"].includes(existing.status)) {
          existing.status = "ELIGIBLE";
          existing.eligible_at = existing.eligible_at || nowIso();
        }
      } else {
        elig.push({ id: newId("elig"), auction_id: id, dealer_id: dId, status: "ELIGIBLE", invited_at: nowIso(), eligible_at: nowIso(), viewed_at: null, last_bid_at: null });
      }
      count += 1;
    }
    await writeTable("auction_dealer_eligibility", elig);
    return count;
  },

  async disqualifyDealer(actor: AuctionActor, id: string, dealerId: string): Promise<void> {
    if (rpcSupported()) {
      const { error } = await (supabase as any).rpc("auction_disqualify_dealer", { p_auction_id: id, p_dealer_id: dealerId });
      if (error) throw new Error(error.message);
      return;
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    const elig = await readTable<AuctionEligibilityRecord>("auction_dealer_eligibility");
    for (const e of elig) {
      if (e.auction_id === id && e.dealer_id === dealerId && e.status !== "BIDDED") e.status = "DISQUALIFIED";
    }
    await writeTable("auction_dealer_eligibility", elig);
  },

  async cancelAuction(actor: AuctionActor, id: string, reason?: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_cancel_auction", { p_auction_id: id, p_reason: reason || "Cancelled by staff" });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    const a = (await this.listAuctions(actor)).find((x) => x.id === id);
    if (!a) throw new Error("Auction not found");
    const wasOpen = AUCTION_OPEN_STATES.includes(a.status);
    const updated = await localTransition(id, "CANCELLED", {}, reason || "Cancelled by staff");
    if (updated?.car_id) {
      await (supabase as any).from("cars").update({ status: "available", updated_at: nowIso() }).eq("id", updated.car_id);
    }
    await automationService.emitEvent({ type: "auction.cancelled", sourceTable: "auctions", sourceId: id, payload: { auction_id: id, reason, previous_status: a.status } });
    if (wasOpen) {
      const elig = await this.getEligibleDealers(id);
      for (const e of elig) {
        if (["ELIGIBLE", "VIEWED", "BIDDED"].includes(e.status)) {
          await notificationService.createNotification({
            recipientId: e.dealer_id,
            title: "Auction Cancelled",
            message: "An auction you were participating in was cancelled. No charges apply.",
            type: "alert",
            metadata: { auction_id: id }
          });
        }
      }
    }
    return updated;
  },

  async adminClose(actor: AuctionActor, id: string, reason?: string): Promise<string> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_admin_close", { p_auction_id: id, p_reason: reason || "Closed by staff" });
      if (error) throw new Error(error.message);
      return String(data || "");
    }
    if (actor.role !== "Admin" && actor.role !== "Sales Associate") throw new Error("Not authorized");
    const a = (await this.listAuctions(actor)).find((x) => x.id === id);
    if (!a) throw new Error("Auction not found");
    if (AUCTION_OPEN_STATES.includes(a.status)) {
      return localCloseIfEnded(id);
    }
    if (["DRAFT", "READY", "SCHEDULED"].includes(a.status)) {
      await localTransition(id, "CANCELLED", {}, reason || "Closed by staff");
      if (a.car_id) {
        await (supabase as any).from("cars").update({ status: "available", updated_at: nowIso() }).eq("id", a.car_id);
      }
      return "cancelled";
    }
    throw new Error(`Auction cannot be closed from status ${a.status}`);
  },

  async adminDecision(actor: AuctionActor, id: string, decision: "ACCEPT" | "REJECT", reason?: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("auction_admin_decision", { p_auction_id: id, p_decision: decision, p_reason: reason || "Admin override" });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    return localAdminDecision(actor, id, decision, reason);
  },

  async sellerDecision(actor: AuctionActor, id: string, decision: "ACCEPT" | "REJECT", reason?: string): Promise<AuctionRecord | null> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("seller_auction_decision", { p_auction_id: id, p_decision: decision, p_reason: reason || null });
      if (error) throw new Error(error.message);
      return data as AuctionRecord;
    }
    return localSellerDecision(actor, id, decision, reason);
  },

  async placeBid(actor: AuctionActor, auctionId: string, amount: number, clientRequestId: string): Promise<BidResult> {
    if (rpcSupported()) {
      const { data, error } = await (supabase as any).rpc("place_auction_bid", {
        p_auction_id: auctionId,
        p_amount: amount,
        p_client_request_id: clientRequestId
      });
      if (error) return { success: false, error: error.message };
      return data as BidResult;
    }
    try {
      return await localPlaceBid(actor, auctionId, amount, clientRequestId);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async markViewed(actor: AuctionActor, auctionId: string): Promise<void> {
    if (rpcSupported()) {
      await (supabase as any).rpc("auction_mark_viewed", { p_auction_id: auctionId });
      return;
    }
    if (actor.role !== "Dealer") return;
    const elig = await readTable<AuctionEligibilityRecord>("auction_dealer_eligibility");
    for (const e of elig) {
      if (e.auction_id === auctionId && e.dealer_id === actor.userId && ["INVITED", "ELIGIBLE"].includes(e.status)) {
        e.status = "VIEWED";
        e.viewed_at = e.viewed_at || nowIso();
      }
    }
    await writeTable("auction_dealer_eligibility", elig);
  },

  async runMaintenance(): Promise<{ started: number; closed: number }> {
    if (rpcSupported()) {
      try {
        const { data, error } = await (supabase as any).rpc("auction_run_maintenance");
        if (!error && data) return { started: Number(data.started || 0), closed: Number(data.closed || 0) };
      } catch {
        // fall through to local pass
      }
    }
    const actor = await this.fetchActor();
    const auctions = await this.listAuctions(actor);
    let started = 0;
    let closed = 0;
    for (const a of auctions) {
      if (a.status === "SCHEDULED" && new Date(a.starts_at).getTime() <= Date.now()) {
        await this.startAuction(actor || { userId: "system", role: "Admin" }, a.id);
        started += 1;
      } else if (["LIVE", "EXTENDED", "CLOSING"].includes(a.status) && new Date(a.ends_at).getTime() <= Date.now()) {
        const outcome = await localCloseIfEnded(a.id);
        if (outcome !== "not_closable" && outcome !== "not_found") closed += 1;
      }
    }
    return { started, closed };
  }
};

// ============================================================
// REALTIME HOOK
// ============================================================

export function useAuctionLive(auctionId: string | null | undefined): AuctionRecord | null {
  const [auction, setAuction] = React.useState<AuctionRecord | null>(null);

  React.useEffect(() => {
    if (!auctionId) return;
    let cancelled = false;
    let pollTimer: number | null = null;
    let channel: any = null;

    const refresh = async () => {
      const a = await auctionService.getAuction(auctionId);
      if (!cancelled) setAuction(a);
    };
    refresh();

    if (auctionService.supportsRpc()) {
      try {
        channel = (supabase as any)
          .channel(`auction-live-${auctionId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "auctions", filter: `id=eq.${auctionId}` },
            (payload: any) => {
              if (!cancelled) setAuction(payload.new as AuctionRecord);
            }
          )
          .subscribe();
      } catch {
        // fall back to polling
      }
    }

    if (!auctionService.supportsRpc()) {
      pollTimer = window.setInterval(refresh, 3000);
    }

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      if (channel) {
        try {
          (supabase as any).removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [auctionId]);

  return auction;
}
