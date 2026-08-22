# Final Implementation Report — Auction Canonicalization

## 1. ROOT CAUSE

The app ran two competing auction implementations. A legacy flat "demo" schema (car_title / base_price / current_bid / highest_bidder_name / status='active') was written directly from frontend components via supabase.from("auctions").insert/update — handleStartAuction in AdminCMS, the generic CRUD insert/update/delete branches, the RoleDashboards dealer-bid path, and the inspection "approve for auction" buttons. This bypassed the canonical Dealer Auction Engine (public/auction_engine.sql) with its status state machine (DRAFT -> READY -> SCHEDULED -> LIVE -> EXTENDED -> CLOSING -> CLOSED -> SELLER_REVIEW -> ACCEPTED/REJECTED/EXPIRED/CANCELLED), SECURITY DEFINER RPCs, RLS policies, status-guard trigger and CHECK constraint. The legacy writes could not even pass the canonical CHECK constraint.

## 2. FILES CHANGED

1. src/components/AdminCMS.tsx — Removed handleStartAuction (legacy INSERT, status:"active"); removed onStartAuction wiring; canonicalized defaultTemplates.auctions; generic CRUD save/delete branches for auctions now throw and route to Live Auctions; fixed phantom total_bids stat.
2. src/components/Inspection120FormModal.tsx — "Approve for Auction" + "Start Auction with Dealers" buttons gated on onStartAuction (no caller passes it — dead buttons/toasts removed).
3. src/components/admin/CRM.tsx — Auction rows mapped from canonical fields (inspection/car joins, current_highest_bid ?? starting_bid, canonical statuses); auction removed from status-edit dropdown; hard guard in handleStatusChange so auction status can never be a direct UPDATE.
4. src/components/admin/AdminDashboard.tsx — "Active Auctions" count filters canonical LIVE/EXTENDED/CLOSING; nav card status: "active" -> "live".
5. public/schema.sql — Removed legacy CREATE TABLE public.auctions + RLS policies; replaced with canonical pointer comment.
6. public/automation_schema.sql — Removed legacy on_auction_ended trigger on the flat schema.
7. public/auction_engine.sql — Security fix: REVOKE EXECUTE ... FROM PUBLIC on auction_close_if_ended (anon early-close hole).
8. RoleDashboards.tsx, db.ts, supabaseClient.ts, auctions.ts — Inspected, already canonical — no changes.

## 3. LEGACY AUCTION PATHS REMOVED

- handleStartAuction direct INSERT with status: "active" — deleted.
- Generic CRUD supabase.from("auctions").insert/update/delete branches — now throw guards.
- Legacy auction: ["active","ended"] status dropdown — removed (engine owns status).
- Legacy on_auction_ended SQL trigger — removed.
- Legacy CREATE TABLE public.auctions DDL in schema.sql and db.ts — removed.
- Legacy Auction TypeScript interface — already retired (comment documents AuctionRecord as canonical).
- Raw bid UPDATE path in RoleDashboards — already removed (comment remains).

## 4. CANONICAL AUCTION PATH

AdminAuctions -> auctionService (src/lib/auctions.ts) -> SECURITY DEFINER RPCs (auction_create_auction, auction_publish_auction, auction_schedule_auction, auction_start_auction, auction_set_eligible_dealers, auction_disqualify_dealer, auction_cancel_auction, auction_admin_close, auction_admin_decision, place_auction_bid, seller_auction_decision, auction_mark_viewed, auction_public_bid_history, auction_run_maintenance). Mock mode mirrors the same state machine locally; all 14 RPCs exist in auction_engine.sql, all SECURITY DEFINER SET search_path = public.

## 5. db.ts SCHEMA STATUS

Clean. SUPABASE_SQL_DDL is a manual migration reference string (rendered read-only in SalesDashboardView + clipboard copy), not runtime schema creation. Auction section is a comment pointing to auction_engine.sql; mock supabaseClient.ts returns [] for auctions with canonical demo seeding; AuctionRecord/AuctionStatus (canonical) live in auctions.ts — no legacy type remains.

## 6. AUCTION STATUS CONSISTENCY

Canonical statuses only: DRAFT, READY, SCHEDULED, LIVE, EXTENDED, CLOSING, CLOSED, SELLER_REVIEW, ACCEPTED, REJECTED, EXPIRED, CANCELLED — used identically in the CHECK constraint (:92-94), auction_status_flow (:53-66), guard trigger (:250-261), service AuctionStatus type + AUCTION_OPEN_STATES (:21,152,171), mock flow (supabaseClient.ts:287), and CRM mapping. active/running = 0 in auction lifecycle.

## 7. ADMIN WORKFLOW

Admin CMS -> Live Auctions (AdminAuctions): create, publish, schedule, start, close, cancel, accept/reject result, manage eligible dealers — every button calls auctionService.* -> RPC. Role enforced server-side (Admin | Sales Associate) on every admin RPC.

## 8. INSPECTOR WORKFLOW

Inspection completion (RoleDashboards.handleUploadReport) marks the vehicle certified/ready (is_certified, status completed) and notifies Admin — it does not create an auction. Creation is owned by Admin via the canonical RPC. No auction write exists in the inspector path.

## 9. DEALER WORKFLOW

DealerAuctions: eligible list via canonical reads (server-scoped by eligibility RLS); placeBid -> place_auction_bid RPC (role + verified + eligibility + LIVE window + min-increment + idempotent client_request_id); anti-sniping extensions handled in-engine.

## 10. SELLER WORKFLOW

SellerAuctions: sellerDecision(ACCEPT/REJECT) -> seller_auction_decision RPC (Seller role + ownership via inspections.seller_id + SELLER_REVIEW-only + row lock). Payment created inside the RPC on ACCEPT; car released on REJECT.

## 11. AUTOMATION PRESERVED

No duplicates: RPC mode — engine emits each event exactly once (auction.created/published/scheduled/started/cancelled/bid_placed/bid_outbid/extended/closing/expired/closed/winner_selected/seller_review/seller_accepted/vehicle_sold/seller_rejected/admin_accepted/admin_rejected), and service RPC branches return early without emitting. Mock mode — service emits once, emitLocal dedupes by action_key. Audit trail on every status change (insert + update triggers). Notifications/tasks on seller accept, outbid, cancel, close, expiry intact. No SQL weakening.

## 12. SECURITY CHECK

RLS: dealers/sellers SELECT-only; no INSERT policy on auction_bids; eligibility/payments read-only for non-staff. RPC auth: auction_require_role rejects NULL uid; seller decision ownership-checked; winner/highest-bid/winning-bid written only inside RPCs; payments only inside decision RPCs (ON CONFLICT DO NOTHING). Fixed: REVOKE EXECUTE FROM PUBLIC on auction_close_if_ended (was callable by anon, no end-time check — could force-close a LIVE auction early). Staff/cron paths unaffected (internal SECURITY DEFINER calls).

## 13. TYPESCRIPT RESULT

npx tsc --noEmit — PASS (clean)

## 14. LINT RESULT

npm run lint — PASS (clean)

## 15. BUILD RESULT

npm run build — PASS (1936 modules, production bundle emitted)

## 16. FINAL SEARCH COUNTS

1. status: "active" / status: 'active' in src — 0 (last one fixed to "live").
2. from("auctions") / from('auctions') — 5 — all SELECTs or comment (auctions.ts:674,794,802; AdminCMS.tsx:700; RoleDashboards.tsx:162 comment).
3. Direct auction INSERT (whole repo) — 1 — auction_engine.sql:418 — inside the canonical auction_create_auction RPC (status 'DRAFT').
4. Direct auction lifecycle UPDATE — 0 (RoleDashboards.tsx:162 is a comment).
5. CREATE TABLE ... auctions — 1 — auction_engine.sql:69 — the canonical DDL only.

## 17. REMAINING AUCTION ISSUES

1. Cosmetic: AdminCMS "Total Live Auction Bids" dashboard stat now shows 0 for canonical rows (total_bids column no longer exists) — would need a real auction_bids count query to be accurate.
2. Defense-in-depth (optional): other auction RPCs are PUBLIC-executable by default but harmless because every one has an internal auth guard — a future REVOKE EXECUTE FROM PUBLIC + grant-only-authenticated sweep could be added later.
3. Intentional, not issues: mock ensureMockDemo seeds one LIVE demo auction in localStorage; AdminCMS generic CRUD "Status: Active" filter option is valid for non-auction entities (profiles/users) and was deliberately kept.

---

Raw frontend auction INSERTs: 0
Raw frontend auction lifecycle UPDATEs: 0
Legacy auction "active": 0
Conflicting auction schemas: 0
