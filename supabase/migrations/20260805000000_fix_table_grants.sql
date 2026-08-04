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

-- anon may submit a pending inspection request (Sell Car lead form); the
-- "Visitors submit inspection requests" RLS policy gates it to status 'pending'.
GRANT INSERT, SELECT ON public.inspections TO anon;

-- Allow visitors (and sellers whose auto-created session failed) to submit a
-- pending inspection request. Staff still control every other operation.
DROP POLICY IF EXISTS "Visitors submit inspection requests" ON public.inspections;
CREATE POLICY "Visitors submit inspection requests" ON public.inspections
  FOR INSERT WITH CHECK (status = 'pending');
