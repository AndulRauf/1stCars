-- ====================================================
-- 1stCars - Grant table privileges to anon / authenticated
-- Fixes "permission denied for table inspections" (and every
-- other table) for signed-in users. RLS policies gate rows;
-- these grants gate table-level access.
-- Idempotent: safe to run repeatedly.
-- ====================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT ON public.sales_notifications TO anon;
