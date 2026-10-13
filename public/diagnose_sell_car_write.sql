-- ============================================================
-- 1stCars — READ-ONLY diagnosis for the Sell Car form error:
-- "Failed to register your inspection ... live database is out of date"
--
-- This file WRITES NOTHING. Run it in the Supabase Dashboard:
--   SQL Editor → New query → paste → Run
-- and share the result rows. They show exactly which piece the live
-- database is missing (columns / RLS policies / grants).
--
-- IMPORTANT: run it in the SAME Supabase project your site uses
-- (the URL in your production VITE_SUPABASE_URL).
-- ============================================================

-- 1) Which of the columns the Sell Car form writes exist?
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inspections'
  AND column_name IN (
    'seller_id', 'seller_name', 'seller_mobile', 'seller_email',
    'overall_score', 'notes', 'reg_number', 'brand', 'model',
    'variant', 'fuel', 'transmission', 'year', 'km_driven',
    'city', 'address', 'preferred_date', 'preferred_time', 'status'
  )
ORDER BY column_name;

-- 2) Is RLS enabled on inspections?
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class WHERE relname = 'inspections';

-- 3) Which RLS policies exist on inspections?
--    The form needs "Visitors submit inspection requests" (INSERT).
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'inspections'
ORDER BY policyname;

-- 4) Do anon / authenticated roles have table grants on inspections?
--    The form needs anon = INSERT (+ SELECT).
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'inspections'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
