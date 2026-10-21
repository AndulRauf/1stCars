-- ============================================================
-- 1stCars — FIX: Test Drive / Buy-Now submit fails with
--   "new row violates row-level security policy for table
--    sales_notifications"
-- File: public/fix_testdrive_rls_returning.sql
--
-- ROOT CAUSE (live-site failure 10-Oct-2026, BookingModal)
--   anon has INSERT WITH CHECK (true) on sales_notifications but NO
--   SELECT policy (lead PII must stay staff-only). The app inserted with
--   `.insert([...]).select()` (= INSERT ... RETURNING), and PostgreSQL
--   evaluates RETURNING rows against the SELECT policies — so a perfectly
--   allowed INSERT was rejected with an RLS violation for every anonymous
--   visitor. Signed-in buyers with a SELECT path were unaffected, which is
--   why it looked intermittent.
--
-- FIX (idempotent — safe to re-run in the Supabase SQL Editor)
--   1. Re-assert the visitor INSERT policy + anon INSERT grant (repairs
--      databases where sales_crm_phase1.sql was run but schema.sql's
--      visitor policy was later dropped).
--   2. submit_sales_lead(jsonb) SECURITY DEFINER RPC: inserts a lead
--      bypassing RLS and returns the new id. Granted to anon +
--      authenticated. This is the canonical server-side path — it can
--      never hit the INSERT...RETURNING trap no matter how policies evolve.
--      (The frontend already retries as a bare INSERT without `.select()`,
--      so live bookings recover with ZERO sql changes; run this file to
--      harden the backend and enable the RPC path.)
--
-- NOTE: we deliberately do NOT add an anon SELECT policy — lead rows
-- contain customer name/mobile PII and must stay staff-only.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Visitor INSERT policy + grant (repair if missing/dropped)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Visitors submit leads" ON public.sales_notifications;
CREATE POLICY "Visitors submit leads" ON public.sales_notifications
  FOR INSERT
  WITH CHECK (true);

GRANT INSERT ON public.sales_notifications TO anon;

-- ------------------------------------------------------------
-- 2. Canonical RPC: submit a sales lead bypassing RLS
--    (SECURITY DEFINER runs as the table owner, so no policy — not
--    even the missing anon SELECT — can reject the insert.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_sales_lead(p_lead jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.sales_notifications (
    name, mobile, city,
    preferred_date, preferred_time,
    car_id, car_brand, car_model,
    type, status, notes
  ) VALUES (
    NULLIF(trim(COALESCE(p_lead->>'name', '')), ''),
    NULLIF(trim(COALESCE(p_lead->>'mobile', '')), ''),
    NULLIF(trim(COALESCE(p_lead->>'city', 'Surat')), ''),
    NULLIF(COALESCE(p_lead->>'preferred_date', CURRENT_DATE::text), '')::date,
    NULLIF(trim(COALESCE(p_lead->>'preferred_time', '11:00 AM - 01:00 PM')), ''),
    NULLIF(trim(COALESCE(p_lead->>'car_id', '')), ''),
    NULLIF(trim(COALESCE(p_lead->>'car_brand', '1stCars')), ''),
    NULLIF(trim(COALESCE(p_lead->>'car_model', 'Selection')), ''),
    NULLIF(trim(COALESCE(p_lead->>'type', 'test_drive')), ''),
    NULLIF(trim(COALESCE(p_lead->>'status', 'pending')), ''),
    p_lead->>'notes'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_sales_lead(jsonb) TO anon, authenticated;

-- Let PostgREST pick up the new function immediately.
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- VERIFY AFTER RUNNING (paste into a fresh SQL query):
--   SELECT policyname, roles, cmd FROM pg_policies
--    WHERE tablename = 'sales_notifications' AND cmd = 'INSERT';
--   SELECT proname FROM pg_proc WHERE proname = 'submit_sales_lead';
-- Smoke test (anonymous-style insert via RPC):
--   SELECT public.submit_sales_lead('{"name":"RLS Check","mobile":"9000000099","city":"Surat","car_brand":"Honda","car_model":"City","type":"test_drive"}'::jsonb);
--   -- returns a uuid; then ROLLBACK or delete that test row:
--   -- DELETE FROM public.sales_notifications WHERE mobile = '9000000099';
-- ------------------------------------------------------------
