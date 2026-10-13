-- ============================================================
-- 1stCars — Sell Car lead hardening (backward-compatible)
-- Date: 2026-10-12 (updated: 2026-10-13 — now includes the RLS fix)
--
-- What this does (all idempotent, safe to run multiple times):
--  1. Ensures the optional columns the Sell Car form writes exist
--     (seller_name / seller_mobile / seller_email / overall_score / notes).
--  2. Allows anonymous Sell Car leads: seller_id may be NULL.
--  3. Ensures the RLS policies the form depends on exist:
--       "Visitors submit inspection requests" (anon + signed-in INSERT
--       gated to status = 'pending')
--       "Staff creates inspections" (signed-in Admin / Sales Associate /
--       Seller INSERT of any status)
--       "Sellers read own inspections" (SELECT, incl. email/mobile match
--       so the post-sign-in backfill can read anonymous rows)
--       "Sellers update own inspections" (UPDATE for partial-lead promotion
--       + seller_id backfill)
--  4. Ensures the table-level grants exist (without these, inserts fail
--     with "permission denied for table inspections" regardless of RLS).
--  5. Adds a NON-UNIQUE composite index to speed up duplicate-lead
--     lookups (mobile + brand + model + status + created_at).
--     NOTE: intentionally NOT a UNIQUE index — existing duplicates and
--     business rules (same seller, second car of same model) must be
--     reviewed before any uniqueness is enforced.
--  6. Reloads the PostgREST schema cache.
--
-- What this does NOT do:
--  - No NOT NULL changes on the car columns (partial-lead rows still insert fine).
--  - No data deletion or backfill (historic km_driven=35000 rows are
--    left as-is; treat them as "unknown" in reports).
--
-- How to apply (staging first, NEVER blindly on production):
--   Supabase Dashboard -> SQL Editor -> New query -> paste this file
--   -> Run. Then hard-refresh the site (Ctrl/Cmd+Shift+R).
--
-- This is the same fix as public/fix_inspections_insert.sql (plus the
-- duplicate-lead index). Either file resolves the Sell Car form's
-- "live database is out of date" error.
--
-- NOTE on the client's bare-INSERT fallback (src/lib/sellCarSubmit.ts): the
-- final submit sends `INSERT ... RETURNING id` first. A signed-out visitor has
-- auth.uid() = NULL, so the anon role has NO SELECT visibility (every SELECT
-- policy needs auth.uid()), and Postgres rejects the whole RETURNING statement
-- with `new row violates row-level security policy ... (42501)` EVEN WHEN this
-- INSERT policy + anon INSERT grant below are present. That specific error is
-- NOT a missing-policy signal — it is the RETURNING read-back. The client now
-- recovers by re-sending a BARE INSERT (no RETURNING), which needs no SELECT
-- policy. So if the form STILL fails after running this file, the error text
-- will be a bare-INSERT failure (e.g. a NOT NULL / CHECK violation) rather than
-- the 42501 RETURNING trap — use that to pinpoint the true remaining cause.
-- ============================================================

-- 0) Helper the RLS policies below rely on. Defined here so this
--    file works even on a database that never ran the full schema.
--    SECURITY DEFINER lets it read profiles regardless of the caller.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_auth_user_role' AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.get_auth_user_role()
      RETURNS text AS $body$
        SELECT role::text FROM public.profiles WHERE id = auth.uid();
      $body$ LANGUAGE sql SECURITY DEFINER;
    $fn$;
  END IF;
END $$;

-- 1) Optional columns the Sell Car form writes.
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_name   TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_mobile TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_email  TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3,1);
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS notes         TEXT;

-- 2) The public form is an anonymous lead: seller_id may be NULL.
ALTER TABLE public.inspections ALTER COLUMN seller_id DROP NOT NULL;

-- 3) Make sure RLS is enabled.
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- 4) Anonymous + signed-in visitors may submit a PENDING inspection.
DROP POLICY IF EXISTS "Staff creates inspections" ON public.inspections;
DROP POLICY IF EXISTS "Visitors submit inspection requests" ON public.inspections;
CREATE POLICY "Visitors submit inspection requests"
  ON public.inspections FOR INSERT
  WITH CHECK (status = 'pending');

-- 5) Signed-in Sellers/Staff may also create inspections of any status.
CREATE POLICY "Staff creates inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Seller'));

-- 6) Read-back (needed for insert().select()): sellers see their own,
--    staff/inspectors see all. Without a SELECT policy the RETURNING
--    clause of an insert is filtered out and can error.
DROP POLICY IF EXISTS "Sellers read own inspections" ON public.inspections;
CREATE POLICY "Sellers read own inspections" ON public.inspections FOR SELECT USING (
  auth.uid() = seller_id
  OR seller_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR seller_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
  OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector')
);

-- 7) Sellers may promote/update their own pending inspections (partial-lead
--    → full submission path, and the post-sign-in seller_id backfill).
DROP POLICY IF EXISTS "Sellers update own inspections" ON public.inspections;
CREATE POLICY "Sellers update own inspections" ON public.inspections FOR UPDATE
  USING (
    auth.uid() = seller_id
    OR seller_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR seller_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (status IN ('pending', 'partial'));

-- 8) Table-level grants. Without these, inserts fail with
--    "permission denied for table inspections" regardless of RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT INSERT, SELECT ON public.inspections TO anon;

-- 9) Best-effort duplicate lookup index (non-unique by design).
CREATE INDEX IF NOT EXISTS inspections_seller_dup_lookup_idx
  ON public.inspections (seller_mobile, brand, model, status, created_at DESC);

-- 10) Let PostgREST pick up the columns immediately.
NOTIFY pgrst, 'reload schema';
