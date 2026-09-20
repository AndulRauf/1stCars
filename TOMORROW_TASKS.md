# Tomorrow Tasks — Handoff Note

Say "hi" tomorrow and I will read this file and remind you of these tasks.

## Status of today (all pushed, working tree clean)
- Vertical sidebar Dashboard Hub redesign -> commit `744f213` (pushed)
- Seller dashboard polish (offers vs auctions clarity, status labels, en-IN, icon cleanup) -> commit `ee4f1b9` (pushed)
- Buyer dashboard overhaul (Overview hub, image cards, deep-linked Details, price *80 bug fixed, cancel-test-drive confirmation + history, menu badges, en-IN, MapPin header) -> commit `042b815` (pushed)
- Verified here and now: `npm.cmd run lint` clean, `npm.cmd test` 26/26 pass.
- Note: use `npm.cmd` (plain `npm` fails via PowerShell policy). Never touch the live DB; only publishable anon key available (no service key).

## URGENT pending task — verify / apply SQL on the live Supabase
Code is clean; the real risk is that `/public` SQL may not be applied to the live DB.
Tests run against the local mock client, so they cannot catch a missing migration.
Run these in the Supabase SQL editor, in order:

1. `refine_preflight_check.sql`  — read-only diagnostic; tells you what's missing. START HERE.
2. `schema.sql`                 — base tables
3. `saved_cars.sql`             — buyer RLS (bookings/cancel)
4. `add_profiles_approval_columns.sql`
5. `add_dealer_applications.sql`  — dealer KYC
6. `add_career_applications.sql`  — careers form
7. `add_sales_notifications_assignment.sql`  — must run BEFORE phase 1
8. `sales_crm_phase1.sql`       — test_drives auto-creation trigger + lead rules
9. `automation_schema.sql` then `automation_phase2.sql`  — follow-ups/audit/tasks
10. `auction_engine.sql`        — auctions tables/triggers
11. `fix_booking_audit_fk.sql`, `fix_inspections_insert.sql`, `fix_admin_profile_delete_rls.sql`, `fix_launch_security_storage_profiles.sql`, `refine_supabase_v2.sql`

Optional seeds (demo data only, skip on production):
`seed_faq.sql`, `seed_crm_demo.sql`, `seed_auction_flow.sql`

Why urgent: unapplied RLS means real-user inserts fail silently; unapplied triggers means
admin/Sales "Test Drives" + follow-ups/audit tabs stay empty.

## Other open flags (lower priority)
- Dual dealer record: KYC uses `dealer_applications`; admin "Dealers" manages separate `dealers` table. Confirm admin approval updates the side the auction-eligibility gate reads.
- CMS reads some tables that only seed/admin writes: `purchases`, `sell_requests`, `park_sell`, `dealer_bids`, `inspection_reports` — confirm empty counts are intentional.

## Offer not yet accepted
- Add a run-order comment header at top of `refine_preflight_check.sql` (asked, user deferred to tomorrow).