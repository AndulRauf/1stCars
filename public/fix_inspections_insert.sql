-- ============================================================
-- 1stCars — Targeted fix for the "Sell Car" form submission
-- "Failed to register your inspection ... blocked / out of date"
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times) and fully
-- self-contained (does not depend on the rest of schema.sql).
-- ============================================================

-- 0) Helper the RLS policies below rely on. Defined here so this
--    file works even on a database that never ran the full schema.
--    SECURITY DEFINER lets it read profiles regardless of the caller.
--    Note: a `role::text` comparison is used in the policies below so it
--    works whether this returns TEXT or the `user_role` enum.
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


-- 1) Add the denormalized columns the Sell Car form writes to.
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_name   TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_mobile TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_email  TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3,1);
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS notes         TEXT;

-- 2) The public form is an anonymous lead: seller_id may be NULL.
ALTER TABLE public.inspections ALTER COLUMN seller_id DROP NOT NULL;

-- 3) Make sure RLS is enabled.
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- 4) Drop any old/conflicting INSERT policies so ours take effect cleanly.
DROP POLICY IF EXISTS "Staff creates inspections" ON public.inspections;
DROP POLICY IF EXISTS "Visitors submit inspection requests" ON public.inspections;

-- 5) Allow anyone (anon OR signed-in) to submit a PENDING inspection.
--    This single permissive policy is what the Sell Car form needs.
CREATE POLICY "Visitors submit inspection requests"
  ON public.inspections FOR INSERT
  WITH CHECK (status = 'pending');

-- 6) Let signed-in Sellers/Staff create inspections of any status too.
CREATE POLICY "Staff creates inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Seller'));

-- 7) Allow reading rows back (needed for insert().select()) — sellers see
--    their own; staff/inspectors see all. Without a SELECT policy the
--    RETURNING clause of an insert is filtered out and can error.
DROP POLICY IF EXISTS "Sellers read own inspections" ON public.inspections;
CREATE POLICY "Sellers read own inspections"
  ON public.inspections FOR SELECT
  USING (
    seller_id IS NOT DISTINCT FROM auth.uid()
    OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector')
  );

-- 8) Table-level grants. Without these, inserts fail with
--    "permission denied for table inspections" regardless of RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT INSERT, SELECT ON public.inspections TO anon;

-- 9) Force PostgREST to reload its schema cache so the new columns are
--    recognised immediately (fixes "could not find column ... schema cache").
NOTIFY pgrst, 'reload schema';

-- Done. Hard-refresh the site (Ctrl/Cmd + Shift + R) and submit again.
