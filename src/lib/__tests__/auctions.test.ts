import { describe, it, expect } from "vitest";
import {
  nextMinBid,
  secondsLeft,
  isOpen,
  newClientRequestId,
  AUCTION_OPEN_STATES,
  AUCTION_STATUS_LABELS
} from "../auctions";
import type { AuctionRecord } from "../auctions";

const base: AuctionRecord = {
  id: "a1",
  car_id: null,
  inspection_id: null,
  seller_id: null,
  status: "LIVE",
  starting_bid: 1000000,
  reserve_price: 0,
  current_highest_bid: null,
  minimum_increment: 50000,
  starts_at: new Date(Date.now() - 3600000).toISOString(),
  ends_at: new Date(Date.now() + 3600000).toISOString(),
  extension_seconds: 120,
  max_extension_count: 5,
  extension_count: 0,
  winner_dealer_id: null,
  winning_bid_id: null,
  closed_at: null,
  ended_reason: null,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe("auction helpers", () => {
  it("nextMinBid is the starting bid when no high bid exists", () => {
    expect(nextMinBid(base)).toBe(1000000);
  });

  it("nextMinBid adds the increment to the current high bid", () => {
    expect(nextMinBid({ ...base, current_highest_bid: 1500000 })).toBe(1550000);
  });

  it("secondsLeft returns 0 for ended auctions", () => {
    expect(secondsLeft({ ...base, ends_at: new Date(Date.now() - 1000).toISOString() })).toBe(0);
  });

  it("isOpen only for LIVE/EXTENDED", () => {
    expect(AUCTION_OPEN_STATES).toEqual(["LIVE", "EXTENDED"]);
    expect(isOpen(base)).toBe(true);
    expect(isOpen({ ...base, status: "SELLER_REVIEW" })).toBe(false);
    expect(isOpen({ ...base, status: "ACCEPTED" })).toBe(false);
  });

  it("every engine status has a human label", () => {
    for (const s of ["DRAFT", "READY", "SCHEDULED", "LIVE", "EXTENDED", "CLOSING", "SELLER_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"]) {
      expect(AUCTION_STATUS_LABELS[s as keyof typeof AUCTION_STATUS_LABELS]).toBeTruthy();
    }
  });

  it("client request ids are unique and url-safe", () => {
    const a = newClientRequestId();
    const b = newClientRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^req-[a-z0-9-]+$/);
  });
});
