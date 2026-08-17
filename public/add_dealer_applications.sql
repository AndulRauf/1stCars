-- ============================================================
-- 1stCars — Dealer KYC applications
--
-- Created for the dealer-registration flow in AuthModal: a dealer
-- signs up via supabase.auth.signUp, then their KYC details are
-- persisted here for the Admin review queue.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dealer_applications (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name               TEXT NOT NULL,
  dealership_name    TEXT NOT NULL,
  email              TEXT,
  mobile             TEXT,
  city               TEXT,
  status             TEXT DEFAULT 'pending_approval' NOT NULL
                     CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  visiting_card_url  TEXT,
  aadhar_card_url    TEXT,
  reviewed_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS dealer_applications_status_idx ON public.dealer_applications (status);
CREATE INDEX IF NOT EXISTS dealer_applications_user_idx ON public.dealer_applications (user_id);

ALTER TABLE public.dealer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dealers insert own applications" ON public.dealer_applications;
CREATE POLICY "Dealers insert own applications" ON public.dealer_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Dealers read own applications" ON public.dealer_applications;
CREATE POLICY "Dealers read own applications" ON public.dealer_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff read dealer applications" ON public.dealer_applications;
CREATE POLICY "Staff read dealer applications" ON public.dealer_applications
  FOR SELECT USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

DROP POLICY IF EXISTS "Admin reviews dealer applications" ON public.dealer_applications;
CREATE POLICY "Admin reviews dealer applications" ON public.dealer_applications
  FOR UPDATE USING (public.get_auth_user_role() = 'Admin'::public.user_role)
  WITH CHECK (public.get_auth_user_role() = 'Admin'::public.user_role);

GRANT SELECT, INSERT ON public.dealer_applications TO authenticated;
