-- ============================================================
-- 1stCars — Sell Car lead hardening (backward-compatible)
-- Date: 2026-10-12
--
-- What this does (all idempotent, safe to run multiple times):
--  1. Ensures the optional columns the Sell Car form writes exist.
--  2. Adds a NON-UNIQUE composite index to speed up duplicate-lead
--     lookups (mobile + brand + model + status + created_at).
--     NOTE: intentionally NOT a UNIQUE index — existing duplicates and
--     business rules (same seller, second car of same model) must be
--     reviewed before any uniqueness is enforced.
--  3. Reloads the PostgREST schema cache.
--
-- What this does NOT do:
--  - No NOT NULL changes (partial-lead rows still insert fine).
--  - No RLS changes (existing "Visitors submit inspection requests"
--    and "Sellers read/update own inspections" policies untouched).
--  - No data deletion or backfill (historic km_driven=35000 rows are
--    left as-is; treat them as "unknown" in reports).
--
-- How to apply (staging first, NEVER blindly on production):
--   Supabase Dashboard -> SQL Editor -> New query -> paste this file
--   -> Run. Then hard-refresh the site (Ctrl/Cmd+Shift+R).
-- ============================================================

ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_name   TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_mobile TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_email  TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3,1);
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS notes         TEXT;

-- Best-effort duplicate lookup index (non-unique by design).
CREATE INDEX IF NOT EXISTS inspections_seller_dup_lookup_idx
  ON public.inspections (seller_mobile, brand, model, status, created_at DESC);

-- Let PostgREST pick up the columns immediately.
NOTIFY pgrst, 'reload schema';
