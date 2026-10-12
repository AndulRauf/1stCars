-- ============================================================
-- Diagnose: Admin dashboard shows "Live Supabase · 0 cars in DB"
-- and every KPI is 0 even though data should exist.
--
-- Run each block in the Supabase SQL Editor and read the notes.
-- The app fetches every table with the ANON key while logged in,
-- so the result of query #3 below is exactly what your admin sees.
-- ============================================================

-- 1) Are there actually rows in the core tables?
SELECT 'cars'       AS table_name, count(*) FROM public.cars
UNION ALL SELECT 'profiles',    count(*) FROM public.profiles
UNION ALL SELECT 'inspections', count(*) FROM public.inspections
UNION ALL SELECT 'auctions',    count(*) FROM public.auctions
UNION ALL SELECT 'pages',       count(*) FROM public.pages
UNION ALL SELECT 'brands',      count(*) FROM public.brands;
-- NOTE: If these counts are > 0 but the dashboard shows 0, the problem is
-- RLS (queries 2-4). If they are all 0, the database is genuinely empty
-- and you simply need to add records.

-- 2) List every account and its role. Find YOUR admin login here.
SELECT id, email, role, is_approved
FROM public.profiles
ORDER BY role, email;
-- NOTE: `get_auth_user_role()` reads the role of the row whose id =
-- auth.uid(). If your logged-in user's row is MISSING here, or its
-- `role` is not 'Admin', EVERY staff-gated SELECT policy returns 0 rows.

-- 3) Simulate exactly what the dashboard does: what does the anon key see?
--    (Run this while authenticated as your admin in a SQL editor that has a
--    JWT, or use the role in the query to preview the RLS decision.)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<PASTE-YOUR-AUTH-USER-UUID-HERE>';
SELECT count(*) AS visible_cars_as_authenticated FROM public.cars;
RESET ROLE;
-- NOTE: 0 here == the RLS SELECT policy on `cars` is denying your user.

-- 4) Confirm the RLS policies that gate the cars read exist and are enabled.
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('cars','profiles','pages','brands')
ORDER BY tablename, cmd;

-- 5) Confirm RLS is ON for these tables (rowsecurity = true).
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('cars','profiles','inspections','auctions','pages','brands')
ORDER BY relname;
-- NOTE: rls_enabled MUST be true. If a table shows false, its data is
-- world-readable (a security hole) — that is the opposite failure, so if you
-- see false where the dashboard is still empty, the cause is elsewhere.

-- ============================================================
-- FIX if your user's role is wrong / row is missing:
--   UPDATE public.profiles
--      SET role = 'Admin', is_approved = true
--    WHERE email = 'your-admin@email.com';
-- Then click "Reload Engine" on the dashboard (it calls loadCMSData again).
-- ============================================================
