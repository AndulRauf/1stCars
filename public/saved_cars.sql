-- 1stCars — Buyer "Saved Cars" wishlist persistence
-- File: public/saved_cars.sql
--
-- Adds the table that lets a signed-in buyer's wishlist survive refresh and
-- re-login on ANY device (Supabase is the source of truth; localStorage is
-- only the instant UI cache). Also grants buyers read + self-cancel access to
-- THEIR OWN sales_notifications rows so the Buyer Dashboard can list the
-- test-drive / buy-now bookings they submitted across devices.
--
-- All statements are idempotent and safe to re-run in the Supabase SQL Editor.

-- 1. SAVED CARS TABLE
CREATE TABLE IF NOT EXISTS public.saved_cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  car_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT saved_cars_user_car_unique UNIQUE (user_id, car_id)
);

CREATE INDEX IF NOT EXISTS saved_cars_user_idx ON public.saved_cars (user_id);

ALTER TABLE public.saved_cars ENABLE ROW LEVEL SECURITY;

-- Buyers can manage only their own wishlist.
DROP POLICY IF EXISTS "Buyers manage own saved cars" ON public.saved_cars;
CREATE POLICY "Buyers manage own saved cars" ON public.saved_cars
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. BUYERS READ OWN LEADS
-- sales_notifications rows keep the buyer's mobile verbatim from the booking
-- form; profiles.mobile is populated from the same input during auto sign-up,
-- so matching on mobile scopes a buyer to exactly the bookings they own.
-- (Staff keep full access via the existing "Staff manage leads" policy.)
-- NOTE: `public.sales_notifications.mobile` (schema-qualified) explicitly targets
-- the OUTER row — unqualified `mobile` inside the subquery would bind to the inner
-- `profiles.mobile` instead (or error ambiguous)and break the correlation.
DROP POLICY IF EXISTS "Buyers view own leads" ON public.sales_notifications;
CREATE POLICY "Buyers view own leads" ON public.sales_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.mobile IS NOT NULL AND p.mobile <> ''
        AND p.mobile = public.sales_notifications.mobile
    )
  );

-- 3. BUYERS CANCEL OWN TEST-DRIVE SLOTS
-- Policy expressions reference the table's columns by plain name — Postgres
-- evaluates USING against the EXISTING row and WITH CHECK against the NEW row,
-- so `NEW.`/`OLD.` row-variable syntax is NOT valid in policies; attempting it
-- triggers "missing FROM-clause entry for table new". USING keeps the stage guard
-- on the current status; WITH CHECK only allows flipping the status to 'cancelled'.
DROP POLICY IF EXISTS "Buyers cancel own leads" ON public.sales_notifications;
CREATE POLICY "Buyers cancel own leads" ON public.sales_notifications
  FOR UPDATE
  USING (
    status IN ('pending', 'new', 'contacted', 'appointment', 'test_drive')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.mobile IS NOT NULL AND p.mobile <> ''
        AND p.mobile = public.sales_notifications.mobile
    )
  )
  WITH CHECK (
    status = 'cancelled'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.mobile IS NOT NULL AND p.mobile <> ''
        AND p.mobile = public.sales_notifications.mobile
    )
  );