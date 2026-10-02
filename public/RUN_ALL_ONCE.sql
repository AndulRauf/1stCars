-- ============================================================
-- 1stCars - RUN ALL AT ONCE (Supabase SQL Editor, 1 paste, 1 Run)
-- ------------------------------------------------------------
-- HOW TO USE:
--   1. Supabase Dashboard kholo -> SQL Editor -> New query
--   2. Is POORI file ka content copy karke paste karo -> Run dabao
--   3. Ek baar me saare tables + RLS policies + triggers apply ho jayenge
--
-- NOTES:
--   - Sab idempotent hai - dobara Run karna safe hai
--   - Seeds isme NAHI hain (production par demo data mat dalo)
--   - Pehle refine_preflight_check.sql (read-only) chala lo
--   - Baad me verify_aslam_easy.sql se verify karo
--   - Order fix hai, sections ko aage-peeche mat karo
--   - Generated: 2026-10-02 | Sections: 17 | Size: ~237 KB
--   - Fix 2026-10-02: enum/text cast (user_role=text error) repaired
-- ============================================================


-- ============================================================
-- SECTION 1/17: public/schema.sql
-- ============================================================
-- ----------------------------------------------------
-- 1stCars Supabase DDL Schema Migration
-- Production-Ready Schema, Triggers, & Row-Level Security
-- ----------------------------------------------------

-- 1. Custom User Roles Enum Types
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('Buyer', 'Seller', 'Dealer', 'Inspector', 'Sales Associate', 'Admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT,
  role public.user_role DEFAULT 'Buyer'::public.user_role NOT NULL,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. BRANDS TABLE
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_popular BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MODELS TABLE
CREATE TABLE IF NOT EXISTS public.models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  body_type TEXT, -- Sedan, SUV, Coupe, Convertible, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, name)
);

-- 5. CITIES TABLE
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin CMS extras for the Cities module (must be added to existing DBs too)
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS branch_manager TEXT;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS support_number TEXT;

-- 5b. FINANCE PARTNERS TABLE (Admin CMS "Finance" module)
CREATE TABLE IF NOT EXISTS public.finance_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rate TEXT,
  tenure_months TEXT,
  max_funding TEXT,
  approval_hours TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5c. EXPENSES / LEDGER TABLE (Admin CMS "Ledger" module)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  amount NUMERIC DEFAULT 0 NOT NULL,
  date TEXT,
  logged_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CARS TABLE (Premium Inventory List)
CREATE TABLE IF NOT EXISTS public.cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year INTEGER NOT NULL,
  price INTEGER NOT NULL,
  km_driven INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  owner_count INTEGER DEFAULT 1 NOT NULL,
  city TEXT NOT NULL,
  reg_number TEXT,
  color TEXT,
  insurance_type TEXT,
  overall_score NUMERIC(3,1),
  status TEXT DEFAULT 'available' NOT NULL, -- available, reserved, sold, bidding
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CAR IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.car_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SELL REQUESTS TABLE (Spinny-inspired intake)
CREATE TABLE IF NOT EXISTS public.sell_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  km_driven INTEGER NOT NULL,
  city TEXT NOT NULL,
  expected_price INTEGER,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, scheduled, completed, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sell_request_id UUID REFERENCES public.sell_requests(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  seller_mobile TEXT NOT NULL,
  seller_email TEXT,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reg_number TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  year INTEGER NOT NULL,
  km_driven INTEGER NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, assigned, completed, offered, sold
  overall_score NUMERIC(3,1),
  report_engine TEXT,
  report_brakes TEXT,
  report_electronics TEXT,
  report_exterior TEXT,
  report_interior TEXT,
  notes TEXT,
  report_120_json TEXT,
  report_150_json TEXT,
  is_certified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. INSPECTION REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.inspection_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE UNIQUE NOT NULL,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  overall_score NUMERIC(3,1) NOT NULL,
  report_engine TEXT NOT NULL,
  report_brakes TEXT NOT NULL,
  report_electronics TEXT NOT NULL,
  report_exterior TEXT NOT NULL,
  report_interior TEXT NOT NULL,
  report_suspension TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. DEALERS TABLE
CREATE TABLE IF NOT EXISTS public.dealers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  license_number TEXT,
  address TEXT,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. DEALER BIDS TABLE
CREATE TABLE IF NOT EXISTS public.dealer_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bid_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, accepted, rejected, outbid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. PARK & SELL TABLE (Consignment program)
CREATE TABLE IF NOT EXISTS public.park_sell (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  location_hub TEXT NOT NULL,
  pricing_expected INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, active, sold, returned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. TEST DRIVES TABLE
CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sales_associate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, scheduled, completed, cancelled
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. PURCHASES TABLE (Direct reservations and orders)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL UNIQUE NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  sales_associate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_paid INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending' NOT NULL, -- pending, completed, refunded
  payment_method TEXT,
  delivery_status TEXT DEFAULT 'pending' NOT NULL, -- pending, in_transit, delivered
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. NOTIFICATIONS TABLE (Central notification ledger)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' NOT NULL, -- info, alert, success, action
  is_read BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB, -- stores extra context like { car_id: "...", bid_id: "..." }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. FAQ TABLE
CREATE TABLE IF NOT EXISTS public.faq (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  category TEXT, -- general, buying, selling, financing
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ====================================================
-- AUTOMATIC PROFILE CREATION ON USER SIGNUP
-- ====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role public.user_role;
  resolved_email TEXT;
  resolved_name TEXT;
  resolved_mobile TEXT;
BEGIN
  requested_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'Buyer'::public.user_role
  );

  -- Phone-OTP signups (supabase.auth.signInWithOtp) create an auth user with
  -- `phone` but NO `email`. Derive a synthetic email + sensible defaults so
  -- the profile insert never fails on the nullable email column.
  resolved_email := coalesce(
    new.email,
    CASE WHEN new.phone IS NOT NULL
         THEN replace(new.phone, '+', '') || '@phone.1stcars.com'
         ELSE NULL END
  );
  resolved_name := coalesce(
    new.raw_user_meta_data->>'name',
    CASE WHEN new.email IS NOT NULL
         THEN split_part(new.email, '@', 1)
         WHEN new.phone IS NOT NULL
         THEN 'Customer ' || right(new.phone, 4)
         ELSE 'Customer' END
  );
  resolved_mobile := coalesce(new.raw_user_meta_data->>'mobile', new.phone);

  INSERT INTO public.profiles (id, name, email, mobile, role, city)
  VALUES (
    new.id,
    resolved_name,
    resolved_email,
    resolved_mobile,
    CASE
      -- Staff roles (Admin / Sales Associate / Inspector) are ONLY granted to
      -- pre-approved accounts. Everyone else may pick a public role
      -- (Buyer / Seller / Dealer); anything else silently falls back to Buyer.
      WHEN new.email IN (
        'sales@1stcars.com',
        'inspector@1stcars.com'
      ) THEN requested_role
      WHEN requested_role IN ('Buyer', 'Seller', 'Dealer') THEN requested_role
      ELSE 'Buyer'::public.user_role
    END,
    coalesce(new.raw_user_meta_data->>'city', 'Mumbai')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger linked to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ====================================================

-- Enable RLS on all 19 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.park_sell ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Help functions to check user roles easily
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Profiles Policies
-- Profiles hold PII (name/email/mobile/role): SELECT is for AUTHENTICATED
-- users only — anonymous visitors get nothing (anonymous buyer/seller
-- booking lead flows never read profiles while signed out). Admins keep
-- full control via "Admin manages all profiles" below.
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated profiles read" ON public.profiles;
CREATE POLICY "Authenticated profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users edit own profile" ON public.profiles;
CREATE POLICY "Users edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admin manages all profiles" ON public.profiles;
CREATE POLICY "Admin manages all profiles" ON public.profiles FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- Non-admins may NEVER change their own role / approval / email on the row
-- (the "Users edit own profile" policy would otherwise allow self-escalation
-- to Admin). Runs as a trigger checking the actor.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger AS $$
DECLARE
  actor_role public.user_role;
BEGIN
  IF auth.uid() = NEW.id
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
          OR NEW.email IS DISTINCT FROM OLD.email) THEN
    actor_role := public.get_auth_user_role();
    IF actor_role IS DISTINCT FROM 'Admin'::public.user_role THEN
      RAISE EXCEPTION 'Only an administrator may change role, approval status, or email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 2. Brands Policies
DROP POLICY IF EXISTS "Public read brands" ON public.brands;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages brands" ON public.brands;
CREATE POLICY "Admin manages brands" ON public.brands FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 3. Models Policies
DROP POLICY IF EXISTS "Public read models" ON public.models;
CREATE POLICY "Public read models" ON public.models FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages models" ON public.models;
CREATE POLICY "Admin manages models" ON public.models FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 4. Cities Policies
DROP POLICY IF EXISTS "Public read active cities" ON public.cities;
CREATE POLICY "Public read active cities" ON public.cities FOR SELECT USING (is_active = true OR public.get_auth_user_role() = 'Admin'::public.user_role);
DROP POLICY IF EXISTS "Admin manages cities" ON public.cities;
CREATE POLICY "Admin manages cities" ON public.cities FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 5. Cars Policies (Inventory)
DROP POLICY IF EXISTS "Anyone reads available/reserved cars" ON public.cars;
CREATE POLICY "Anyone reads available/reserved cars" ON public.cars FOR SELECT USING (status IN ('available', 'reserved', 'bidding') OR auth.uid() = created_by OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector'));
DROP POLICY IF EXISTS "Staff manages inventory" ON public.cars;
CREATE POLICY "Staff manages inventory" ON public.cars FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 6. Car Images Policies
DROP POLICY IF EXISTS "Anyone reads images" ON public.car_images;
CREATE POLICY "Anyone reads images" ON public.car_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manages images" ON public.car_images;
CREATE POLICY "Staff manages images" ON public.car_images FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 7. Sell Requests Policies
DROP POLICY IF EXISTS "Sellers manage own requests" ON public.sell_requests;
CREATE POLICY "Sellers manage own requests" ON public.sell_requests FOR ALL USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Staff reads/updates sell requests" ON public.sell_requests;
CREATE POLICY "Staff reads/updates sell requests" ON public.sell_requests FOR SELECT USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector'));

-- 8. Inspections Policies
DROP POLICY IF EXISTS "Sellers read own inspections" ON public.inspections;
-- Sellers may read their own inspections: (a) rows owned by their profile, (b) rows
-- submitted before the auto-created Seller account existed (matched by the mobile/email
-- the Sell Car form used), and (c) staff/inspectors see every row for the pipeline.
CREATE POLICY "Sellers read own inspections" ON public.inspections FOR SELECT USING (
  auth.uid() = seller_id
  OR seller_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR seller_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
  OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector')
);
DROP POLICY IF EXISTS "Inspectors view assigned" ON public.inspections;
CREATE POLICY "Inspectors view assigned" ON public.inspections FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() IN ('Admin', 'Sales Associate'));
DROP POLICY IF EXISTS "Staff creates inspections" ON public.inspections;
CREATE POLICY "Staff creates inspections" ON public.inspections FOR INSERT WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Seller'));
-- Sellers may promote/update their own pending inspections (partial-lead → full
-- submission path, and the post-sign-in seller_id backfill so the dashboard shows rows that
-- were submitted anonymously before their auto-created Seller account existed). Staff and
-- inspectors keep exclusive control over assigning/completing inspections.
DROP POLICY IF EXISTS "Sellers update own inspections" ON public.inspections;
CREATE POLICY "Sellers update own inspections" ON public.inspections FOR UPDATE
  USING (
    auth.uid() = seller_id
    OR seller_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR seller_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (status IN ('pending', 'partial'));
-- The public Sell Car form is an anonymous lead submission (the mobile OTP is
-- a client-side mock), so the auto-created Seller sign-in may not always yield
-- a session. Allow visitors to submit a PENDING inspection request the same way
-- they can submit a sales lead; staff still control every other operation.
DROP POLICY IF EXISTS "Visitors submit inspection requests" ON public.inspections;
CREATE POLICY "Visitors submit inspection requests" ON public.inspections FOR INSERT WITH CHECK (status = 'pending');

-- 9. Inspection Reports Policies
DROP POLICY IF EXISTS "Sellers read approved reports" ON public.inspection_reports;
CREATE POLICY "Sellers read approved reports" ON public.inspection_reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i 
    WHERE i.id = inspection_id AND (i.seller_id = auth.uid() AND i.status = 'completed')
  )
);
DROP POLICY IF EXISTS "Inspectors manage reports" ON public.inspection_reports;
CREATE POLICY "Inspectors manage reports" ON public.inspection_reports FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() = 'Admin'::public.user_role);

-- 10. Dealers Policies
DROP POLICY IF EXISTS "Anyone views verified dealers" ON public.dealers;
CREATE POLICY "Anyone views verified dealers" ON public.dealers FOR SELECT USING (is_verified = true OR auth.uid() = id);
DROP POLICY IF EXISTS "Dealers manage own info" ON public.dealers;
CREATE POLICY "Dealers manage own info" ON public.dealers FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admin manages dealers" ON public.dealers;
CREATE POLICY "Admin manages dealers" ON public.dealers FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 10b. Dealer KYC applications (dealer registration queue; see also
-- public/add_dealer_applications.sql for an idempotent standalone patch).
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

-- 11. Dealer Bids Policies
DROP POLICY IF EXISTS "Sellers view bids on own car" ON public.dealer_bids;
CREATE POLICY "Sellers view bids on own car" ON public.dealer_bids FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i 
    WHERE i.id = inspection_id AND i.seller_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Dealers bid on assigned cars" ON public.dealer_bids;
CREATE POLICY "Dealers bid on assigned cars" ON public.dealer_bids FOR ALL USING (auth.uid() = dealer_id);
DROP POLICY IF EXISTS "Staff manages bids" ON public.dealer_bids;
CREATE POLICY "Staff manages bids" ON public.dealer_bids FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 12. Park & Sell Policies
DROP POLICY IF EXISTS "Sellers view own park-sell status" ON public.park_sell;
CREATE POLICY "Sellers view own park-sell status" ON public.park_sell FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Staff manages park-sell program" ON public.park_sell;
CREATE POLICY "Staff manages park-sell program" ON public.park_sell FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 13. Test Drives Policies
DROP POLICY IF EXISTS "Buyers manage own test drives" ON public.test_drives;
CREATE POLICY "Buyers manage own test drives" ON public.test_drives FOR ALL USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Staff schedules test drives" ON public.test_drives;
CREATE POLICY "Staff schedules test drives" ON public.test_drives FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 14. Purchases Policies
DROP POLICY IF EXISTS "Buyers view own purchases" ON public.purchases;
CREATE POLICY "Buyers view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Staff manages transactions" ON public.purchases;
CREATE POLICY "Staff manages transactions" ON public.purchases FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 15. Notifications Policies (Central central)
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Users update own read status" ON public.notifications;
CREATE POLICY "Users update own read status" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "System/Staff inserts notifications" ON public.notifications;
CREATE POLICY "System/Staff inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Staff read all notifications" ON public.notifications;
CREATE POLICY "Staff read all notifications" ON public.notifications FOR SELECT USING (public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role));
DROP POLICY IF EXISTS "Staff manage all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin manages all notifications" ON public.notifications;
CREATE POLICY "Admin manages all notifications" ON public.notifications FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);
DROP POLICY IF EXISTS "Sales Associate updates notifications" ON public.notifications;
CREATE POLICY "Sales Associate updates notifications" ON public.notifications FOR UPDATE USING (public.get_auth_user_role() = 'Sales Associate'::public.user_role);

-- 16. Testimonials Policies
DROP POLICY IF EXISTS "Anyone reads testimonials" ON public.testimonials;
CREATE POLICY "Anyone reads testimonials" ON public.testimonials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users submit testimonials" ON public.testimonials;
CREATE POLICY "Users submit testimonials" ON public.testimonials FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Admin approves testimonials" ON public.testimonials;
CREATE POLICY "Admin approves testimonials" ON public.testimonials FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 17. FAQ Policies
DROP POLICY IF EXISTS "Anyone reads FAQ" ON public.faq;
CREATE POLICY "Anyone reads FAQ" ON public.faq FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages FAQ" ON public.faq;
CREATE POLICY "Admin manages FAQ" ON public.faq FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 18. Settings Policies
DROP POLICY IF EXISTS "Anyone reads settings" ON public.settings;
CREATE POLICY "Anyone reads settings" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin configures settings" ON public.settings;
CREATE POLICY "Admin configures settings" ON public.settings FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 18b. Finance Partners Policies
DROP POLICY IF EXISTS "Anyone reads finance partners" ON public.finance_partners;
CREATE POLICY "Anyone reads finance partners" ON public.finance_partners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages finance partners" ON public.finance_partners;
CREATE POLICY "Admin manages finance partners" ON public.finance_partners FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 18c. Expenses / Ledger Policies
DROP POLICY IF EXISTS "Staff read expenses" ON public.expenses;
CREATE POLICY "Staff read expenses" ON public.expenses FOR SELECT USING (public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role));
DROP POLICY IF EXISTS "Admin manages expenses" ON public.expenses;
CREATE POLICY "Admin manages expenses" ON public.expenses FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);


-- ====================================================
-- 19. OFFERS, AUCTIONS, AND SALES_NOTIFICATIONS TABLES
-- ====================================================

-- 20. OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  offer_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
-- Only the participating dealer, the car's seller, and staff may read offers.
DROP POLICY IF EXISTS "Anyone reads offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone manages offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers, dealers and staff read offers" ON public.offers;
DROP POLICY IF EXISTS "Dealers and staff place offers" ON public.offers;
DROP POLICY IF EXISTS "Dealers and sellers update offers, staff manage" ON public.offers;
DROP POLICY IF EXISTS "Staff delete offers" ON public.offers;
CREATE POLICY "Sellers, dealers and staff read offers" ON public.offers FOR SELECT USING (
  auth.uid() = dealer_id
  OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector')
  OR EXISTS (
    SELECT 1 FROM public.inspections i WHERE i.id = offers.inspection_id AND i.seller_id = auth.uid()
  )
);
CREATE POLICY "Dealers and staff place offers" ON public.offers FOR INSERT WITH CHECK (
  auth.uid() = dealer_id
  OR public.get_auth_user_role() IN ('Admin', 'Sales Associate')
);
CREATE POLICY "Dealers and sellers update offers, staff manage" ON public.offers FOR UPDATE USING (
  auth.uid() = dealer_id
  OR public.get_auth_user_role() IN ('Admin', 'Sales Associate')
  OR EXISTS (
    SELECT 1 FROM public.inspections i WHERE i.id = offers.inspection_id AND i.seller_id = auth.uid()
  )
);
CREATE POLICY "Staff delete offers" ON public.offers FOR DELETE USING (
  public.get_auth_user_role() IN ('Admin', 'Sales Associate')
);


-- 21. AUCTIONS TABLE
-- NOTE: The legacy flat "auctions" table (car_title/year/km_driven/fuel/
-- transmission/city/base_price/current_bid/highest_bidder_name/ends_at/
-- status='active') is NOT defined here anymore. The canonical table
-- (public.auctions with status machine, RLS, status guard trigger and
-- lifecycle RPCs) is created by public/auction_engine.sql — apply that file
-- after this one for the auctions module. auction_engine.sql retires any
-- leftover legacy table to public.auctions_legacy (data kept; drop it manually
-- only when you are sure no historical reference needs it). All app code
-- (auctionService, AdminCMS Live Auctions, Dealer Auction Center, CRM auction
-- rows) reads/writes only the canonical engine.


-- 22. SALES NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.sales_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  city TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  car_id TEXT NOT NULL,
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT
);

ALTER TABLE public.sales_notifications ENABLE ROW LEVEL SECURITY;
-- Leads contain customer PII (name/mobile). Visitors may SUBMIT a lead, but
-- only staff (Admin / Sales Associate) can read, update, or delete them.
DROP POLICY IF EXISTS "Anyone reads sales_notifications" ON public.sales_notifications;
DROP POLICY IF EXISTS "Anyone manages sales_notifications" ON public.sales_notifications;
DROP POLICY IF EXISTS "Visitors submit leads" ON public.sales_notifications;
DROP POLICY IF EXISTS "Staff manage leads" ON public.sales_notifications;
CREATE POLICY "Visitors submit leads" ON public.sales_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff manage leads" ON public.sales_notifications FOR ALL USING (
  public.get_auth_user_role() IN ('Admin', 'Sales Associate')
);


-- ====================================================
-- 23. PAGES TABLE (CMS-managed static/footer pages)
-- Used by AdminCMS, Navbar, Footer, and CustomPageView.
-- ====================================================
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  is_footer BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads pages" ON public.pages;
CREATE POLICY "Anyone reads pages" ON public.pages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages pages" ON public.pages;
CREATE POLICY "Admin manages pages" ON public.pages FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- Seed default CMS pages (footer/nav links) so the live site is not empty.
INSERT INTO public.pages (title, slug, content, is_footer) VALUES
  ('About Us', 'about-us', '# About 1stCars' || E'\n\n' || '1stCars is the premier marketplace for certified premium pre-owned vehicles inside the Gujarat region (Surat, Bharuch, Vadodara, Vapi). We stand by absolute transparency, zero-tolerance for tampered odometers, and 100% certified chassis security.', false),
  ('FAQs', 'faqs', '# Frequently Asked Questions' || E'\n\n' || 'Answers to the most common queries about our premium inspection services.', false),
  ('Warranty Terms', 'warranty-terms', '# 6-Month Premium Warranty Policy' || E'\n\n' || 'Every certified pre-owned vehicle qualifies for our complimentary 6-Month / 10,000 km Premium Warranty.', true),
  ('120-Point Certificate', '120-point-certificate', '# 120-Point Structural & Technical Inspection' || E'\n\n' || 'Every vehicle undergoes a meticulous 120-point check executed by our certified structural engineers.', true),
  ('Terms & Conditions', 'terms-and-conditions', '# Terms & Conditions of Business' || E'\n\n' || 'By using our marketplace and services you agree to our booking, delivery, and odometer-integrity policies.', true),
  ('Our Showrooms', 'our-showrooms', '# 1stCars Flagship Showrooms' || E'\n\n' || 'Visit our multi-brand flagship stores across Surat, Vadodara, Bharuch, and Vapi.', true)
ON CONFLICT (slug) DO NOTHING;



-- ====================================================
-- 24. SCHEMA COMPATIBILITY PATCHES
-- Columns the frontend writes to that were missing from the
-- original table definitions. Idempotent so this file can be
-- re-run safely.
-- ====================================================

-- Sellers need an approval gate; AdminCMS + AuthModal set this.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true NOT NULL;

-- Dealer review status (pending_approval / Approved) that AuthModal + AdminCMS
-- read and write on the profile; kept nullable for legacy rows (NULL = not flagged).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT;

-- Phone-OTP signups create auth users with a `phone` but no `email`.
-- The profile's email must be nullable (UNIQUE still allows multiple NULLs
-- in Postgres) so the signup trigger doesn't fail for phone-only users.
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- Inspection dashboards persist denormalized seller info, a score,
-- and free-form notes directly on the inspection row.
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_mobile TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS seller_email TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3,1);
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS notes TEXT;

-- The public Sell Car form is an anonymous lead submission (the mobile OTP is a
-- client-side mock), so the auto-created Seller sign-in may not always yield a
-- session. Visitors may insert a PENDING inspection request with seller_id NULL;
-- their identity lives in the denormalized seller_name/seller_mobile/seller_email
-- columns until staff link the lead to a real profile.
ALTER TABLE public.inspections ALTER COLUMN seller_id DROP NOT NULL;

-- Rich car record persisted by the Admin CMS (photos, price breakup, inspection
-- report, features, ...) on top of the normalized columns.
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Lead auto-assignment: every lead (test drive / buy-now) for a car uploaded
-- by a Sales Associate is routed to that associate's CRM desk only. The column
-- is nullable so legacy/portal leads stay in the shared pool.
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;


-- ====================================================
-- STORAGE BUCKETS CONFIGURATION
-- ====================================================

INSERT INTO storage.buckets (id, name, public)

VALUES ('car-images', 'car-images', true), ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Private "resumes" bucket for job-application CVs (CareersView.tsx):
-- visitors upload; only Admin / Sales Associate staff read them back.
-- Forces public = false in case it was ever created public manually.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies for storage objects.
-- "All Power" (FOR ALL USING (true) WITH CHECK (true)) was REMOVED — it
-- gave anonymous visitors unrestricted read/write/delete on every bucket.
DROP POLICY IF EXISTS "All Power" ON storage.objects;
-- Visitors keep viewing the public media buckets (car photos + logos).
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('car-images', 'logos'));
-- Authenticated staff/sellers manage the public media buckets.
DROP POLICY IF EXISTS "Authenticated manage media buckets" ON storage.objects;
CREATE POLICY "Authenticated manage media buckets" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id IN ('car-images', 'logos'))
  WITH CHECK (bucket_id IN ('car-images', 'logos'));
-- Anonymous visitors may ONLY upload CVs into the private resumes bucket.
DROP POLICY IF EXISTS "Visitors upload resumes" ON storage.objects;
CREATE POLICY "Visitors upload resumes" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'resumes');
-- Only Admin / Sales Associate staff may review (read) uploaded CVs.
DROP POLICY IF EXISTS "Staff review resumes" ON storage.objects;
CREATE POLICY "Staff review resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ====================================================
-- 25. ROLE GRANTS
-- RLS policies gate which ROWS each role may touch; these
-- grants gate which TABLES each role may access at all.
-- Without them, signed-in users hit "permission denied
-- for table <name>" on every write.
-- ====================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT ON public.sales_notifications TO anon;
-- anon may submit a pending inspection request (Sell Car lead form); the
-- "Visitors submit inspection requests" RLS policy gates it to status 'pending'.
GRANT INSERT, SELECT ON public.inspections TO anon;



-- ============================================================
-- SECTION 2/17: public/saved_cars.sql
-- ============================================================
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

-- ============================================================
-- SECTION 3/17: public/add_profiles_approval_columns.sql
-- ============================================================
-- ============================================================================
-- 1stCars — profiles approval columns (idempotent quick-fix migration)
-- ----------------------------------------------------------------------------
-- Fixes the 400 PGRST205 "Could not find the '<column>' column of 'profiles'"
-- error the frontend hits on databases created before these columns existed:
--
--   src/App.tsx                  SELECT id, ..., is_approved, status     (login profile)
--   src/components/AdminCMS.tsx  UPDATE profiles SET is_approved, status (dealer approve)
--   src/lib/auctions.ts          SELECT id, role, is_verified, is_approved (dealer bids)
--
-- Safe to run repeatedly (ADD COLUMN IF NOT EXISTS). No existing data is altered.
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> paste entire file -> Run
-- ============================================================================

-- 1) Admin-approval gate used by AdminCMS and the auction bid RPC.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true NOT NULL;

-- 2) Review status written by AuthModal (pending_approval) and AdminCMS (Approved).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT;

-- 3) Dealer-verification flag read by src/lib/auctions.ts (verifiedDealerIds)
--    and seeded by seed_auction_flow.sql. DEFAULT false keeps existing rows safe.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL;

-- ============================================================
-- SECTION 4/17: public/add_dealer_applications.sql
-- ============================================================
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


-- ============================================================
-- SECTION 5/17: public/add_career_applications.sql
-- ============================================================
-- ============================================================
-- 1stCars — Careers: job application submissions
--
-- Creates the `career_applications` table used by the /careers
-- page application form (src/components/CareersView.tsx).
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  experience TEXT,
  message TEXT,
  resume_url TEXT,
  resume_name TEXT,
  status TEXT DEFAULT 'pending' NOT NULL
);

-- Applications contain applicant PII (name/phone/email). Visitors may SUBMIT
-- an application, but only staff (Admin / Sales Associate) can read, update,
-- or delete them — mirroring the sales_notifications lead policy.
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visitors submit career applications" ON public.career_applications;
DROP POLICY IF EXISTS "Staff manage career applications" ON public.career_applications;

CREATE POLICY "Visitors submit career applications"
  ON public.career_applications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff manage career applications"
  ON public.career_applications
  FOR ALL
  USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- Private "resumes" storage bucket for uploaded CVs. Visitors may UPLOAD
-- (INSERT) only; only Admin / Sales Associate staff may read CVs back for
-- review — the Careers form stores the object path and the Admin panel
-- opens a short-lived signed URL ("View Resume"). If this bucket does not
-- exist the form still works and records only the resume file name.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Anonymous visitors may ONLY upload into the private resumes bucket;
-- they can never read, update or delete anything in it.
DROP POLICY IF EXISTS "Visitors upload resumes" ON storage.objects;
CREATE POLICY "Visitors upload resumes" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'resumes');

-- Only Admin / Sales Associate staff may review (read) uploaded CVs.
DROP POLICY IF EXISTS "Staff review resumes" ON storage.objects;
CREATE POLICY "Staff review resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ============================================================
-- SECTION 6/17: public/add_sales_notifications_assignment.sql
-- ============================================================
-- ============================================================
-- 1stCars — CRM: buyer-lead → Sales Associate assignment
--
-- Adds the assignee columns to `sales_notifications` and keeps
-- `assigned_at` in sync automatically.
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times).
-- ============================================================

-- 1) Assignee columns on the buyer-lead table (nullable = unassign allowed)
ALTER TABLE public.sales_notifications
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- 2) Auto-stamp assigned_at whenever the assignee changes
CREATE OR REPLACE FUNCTION public.touch_lead_assigned_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    NEW.assigned_at := timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sales_notif_assigned_at ON public.sales_notifications;
CREATE TRIGGER trg_sales_notif_assigned_at
  BEFORE UPDATE ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_lead_assigned_at();


-- ============================================================
-- SECTION 7/17: public/sales_crm_phase1.sql
-- ============================================================
-- ============================================================
-- 1stCars — PHASE 1: SALES CRM + SALES AUTOMATION
-- File: public/sales_crm_phase1.sql
--
-- Completes the vehicle-owner lead assignment rule server-side
-- and locks down lead privacy. Idempotent — safe to re-run.
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
--
-- What it does (nothing unrelated):
--   1. sales_notifications.assigned_to / assigned_at  (if missing)
--   2. safe_uuid(text) helper (car_id is TEXT; legacy ids are not UUIDs)
--   3. Owner-first lead assignment (Priority 1 = cars.created_by),
--      round-robin fallback kept as Priority 2/3, + idempotent
--      follow-up/task creation + assignment audit
--   4. Audit trail row on lead INSERT (updates were already audited)
--   5. test_drives.lead_id + appointment auto-creation for test-drive
--      leads, owned by the same Sales Associate
--   6. RLS: Sales Associates see ONLY their assigned leads + the
--      unassigned pool. Admin sees everything. Visitors can only submit.
--   7. Performance indexes
-- ============================================================

-- ------------------------------------------------------------
-- 1. Assignee columns on the buyer-lead table (no-ops if the
--    add_sales_notifications_assignment.sql patch already ran).
-- ------------------------------------------------------------
ALTER TABLE public.sales_notifications
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- ------------------------------------------------------------
-- 2. Safe TEXT → UUID cast. sales_notifications.car_id is TEXT and
--    legacy/demo rows carry non-UUID ids ("car-1"), so joins to
--    cars(id) must never explode on an invalid cast.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_uuid(t text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  RETURN t::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- ------------------------------------------------------------
-- 3. Post-assignment side effects — IDEMPOTENT.
--    Runs for BOTH assignment paths (vehicle owner + fallback).
--    Creates the intro follow-up + follow-up task + notification
--    only when they do not exist yet for this lead.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sales_crm_on_assign(uuid, uuid, text, text, uuid);
CREATE OR REPLACE FUNCTION public.sales_crm_on_assign(
  p_lead_id uuid,
  p_associate uuid,
  p_associate_name text DEFAULT NULL,
  p_how text DEFAULT 'vehicle_owner',
  p_event_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead public.sales_notifications%ROWTYPE;
  v_car text;
  v_title text;
BEGIN
  IF p_lead_id IS NULL OR p_associate IS NULL THEN RETURN; END IF;

  SELECT * INTO v_lead FROM public.sales_notifications WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN RETURN; END IF;

  v_car := COALESCE(NULLIF(v_lead.car_brand, '') || ' ' || NULLIF(v_lead.car_model, ''), 'vehicle');
  v_title := CASE
    WHEN v_lead.type = 'test_drive' THEN 'Test drive lead: ' || v_car
    WHEN v_lead.type = 'buy_now'    THEN 'Buy-now lead: ' || v_car
    ELSE 'Sales lead: ' || v_car
  END;

  -- 3.1 Intro follow-up (deduped on related_table + related_id + type)
  IF NOT EXISTS (
    SELECT 1 FROM public.follow_ups
     WHERE related_table = 'sales_notifications'
       AND related_id  = p_lead_id::text
       AND follow_up_type = 'new_lead_followup'
  ) THEN
    INSERT INTO public.follow_ups (
      related_table, related_id, assignee_id, assigned_role,
      follow_up_type, priority, status, due_at, notes
    ) VALUES (
      'sales_notifications', p_lead_id::text, p_associate, 'Sales Associate',
      'new_lead_followup', 'high', 'open',
      timezone('utc'::text, now()) + interval '24 hours',
      'First contact for ' || v_lead.name || ' (' || v_car || '). Reach out within 24 hours.'
    );
  END IF;

  -- 3.2 Follow-up task (deduped on source_table + source_id + task_type)
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
     WHERE source_table = 'sales_notifications'
       AND source_id  = p_lead_id::text
       AND task_type  = 'lead_followup'
  ) THEN
    INSERT INTO public.tasks (
      assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id
    ) VALUES (
      p_associate, 'lead_followup', v_title,
      COALESCE(v_lead.name, 'A buyer') || ' in ' || COALESCE(v_lead.city, 'your region') ||
      '. Reach out to confirm interest and schedule the next step within 24 hours.',
      'high', 'open', timezone('utc'::text, now()) + interval '24 hours',
      'sales_notifications', p_lead_id::text
    );
  END IF;

  -- 3.3 Assignment audit trail (activity timeline)
  PERFORM public.automation_audit('lead_assigned', 'sales_notifications', p_lead_id::text,
    NULL, COALESCE(v_lead.status, 'pending'),
    'auto:' || p_how,
    jsonb_build_object('assigned_to', p_associate, 'assigned_to_name', p_associate_name,
                       'lead_type', v_lead.type, 'car_id', v_lead.car_id));

  -- 3.4 Notify the associate
  PERFORM public.automation_notify(p_associate, 'New Lead Assigned',
    v_title || ' was assigned to you. Follow up within 24 hours.',
    'action', jsonb_build_object('lead_id', p_lead_id), p_event_id);

  PERFORM public.automation_log('info', 'assign-sales-lead',
    'Lead assigned to ' || COALESCE(p_associate_name, 'sales associate') || ' (' || p_how || ')',
    jsonb_build_object('lead_id', p_lead_id, 'assigned_to', p_associate, 'how', p_how),
    NULL, p_event_id);
END;
$$;


-- ------------------------------------------------------------
-- 4. OWNER-FIRST lead assignment (Priority 1) with the existing
--    round-robin kept as fallback (Priority 2/3).
--
--    Priority 1: lead has car_id → cars.created_by is a Sales
--                Associate → THAT associate owns the lead. Never
--                gated by the round-robin flag (core business rule).
--    Priority 2: car exists but has no associate owner → fallback.
--    Priority 3: no usable car_id → fallback.
--
--    Idempotent + admin-override safe: an already-assigned lead is
--    never re-touched, so an intentional Admin reassignment sticks.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.automation_auto_assign_sales_lead(uuid, text, text, uuid);
CREATE OR REPLACE FUNCTION public.automation_auto_assign_sales_lead(
  p_lead_id uuid,
  p_city text DEFAULT NULL,
  p_lead_type text DEFAULT 'lead',
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_car_id uuid;
  v_owner uuid;
  v_owner_name text;
  v_owner_ok boolean;
  v_sales public.profiles%ROWTYPE;
  v_car text;
  v_title text;
BEGIN
  IF p_lead_id IS NULL THEN RETURN NULL; END IF;

  -- Idempotency + admin-override protection: never re-touch an
  -- assigned lead (covers repeated events AND admin reassignments).
  PERFORM 1 FROM public.sales_notifications WHERE id = p_lead_id AND assigned_to IS NOT NULL;
  IF FOUND THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'Lead already assigned',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  -- ========== PRIORITY 1: vehicle owner ==========
  SELECT safe_uuid(car_id) INTO v_car_id
    FROM public.sales_notifications WHERE id = p_lead_id;
  IF v_car_id IS NOT NULL THEN
    SELECT c.created_by, c.created_by_name INTO v_owner, v_owner_name
      FROM public.cars c
     WHERE c.id = v_car_id AND c.created_by IS NOT NULL;

    IF v_owner IS NOT NULL THEN
      -- Own only by ACTIVE Sales Associates; otherwise use the fallback.
      SELECT COALESCE(p.is_approved, true) INTO v_owner_ok
        FROM public.profiles p
       WHERE p.id = v_owner AND p.role = 'Sales Associate'::public.user_role;

      IF COALESCE(v_owner_ok, false) THEN
        UPDATE public.sales_notifications
           SET assigned_to = v_owner
         WHERE id = p_lead_id;
        PERFORM public.sales_crm_on_assign(p_lead_id, v_owner, v_owner_name, 'vehicle_owner', p_event_id);
        RETURN v_owner;
      END IF;
      PERFORM public.automation_log('warn', 'assign-sales-lead',
        'Vehicle owner is not an active Sales Associate. Using fallback',
        jsonb_build_object('lead_id', p_lead_id, 'owner', v_owner), NULL, p_event_id);
    END IF;
  END IF;


  -- ========== PRIORITY 2/3: existing round-robin fallback ==========
  IF NOT public.automation_flag_on('automation.auto_assign_sales') THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead',
      'Auto-assign disabled for sales leads (no vehicle owner)',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  v_car := COALESCE((SELECT car_brand || ' ' || car_model FROM public.sales_notifications WHERE id = p_lead_id), 'vehicle');
  v_title := CASE
    WHEN p_lead_type = 'test_drive' THEN 'Test drive lead: ' || v_car
    WHEN p_lead_type = 'buy_now' THEN 'Buy-now lead: ' || v_car
    ELSE 'Sales lead: ' || v_car
  END;

  -- Lowest open-workload sales associate, same city preferred.
  SELECT p.id, p.name, p.city, p.email INTO v_sales
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT count(*) AS load FROM public.sales_notifications sn
      WHERE sn.assigned_to = p.id AND sn.status IN ('pending', 'contacted')
    ) l ON true
   WHERE p.role = 'Sales Associate'::public.user_role AND p.is_approved = true
     AND (p.city ILIKE p_city OR p.city IS NULL OR p.city = '')
   ORDER BY l.load ASC, p.created_at ASC
   LIMIT 1;

  IF v_sales.id IS NULL THEN
    SELECT p.id, p.name, p.city, p.email INTO v_sales
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT count(*) AS load FROM public.sales_notifications sn
        WHERE sn.assigned_to = p.id AND sn.status IN ('pending', 'contacted')
      ) l ON true
     WHERE p.role = 'Sales Associate'::public.user_role AND p.is_approved = true
     ORDER BY l.load ASC, p.created_at ASC
     LIMIT 1;
  END IF;

  IF v_sales.id IS NULL THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'No available sales associates',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  UPDATE public.sales_notifications SET assigned_to = v_sales.id, status = 'contacted'
   WHERE id = p_lead_id;

  PERFORM public.sales_crm_on_assign(p_lead_id, v_sales.id, v_sales.name, 'round_robin', p_event_id);
  RETURN v_sales.id;
END;
$$;


-- ------------------------------------------------------------
-- 5. Lead INSERT audit (updates were already audited by
--    automation_phase2.sql → on_lead_changed).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_sales_lead_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  v_event := public.automation_record_event(
    'lead.created', 'sales_notifications', NEW.id::text,
    jsonb_build_object(
      'lead_id', NEW.id, 'name', NEW.name, 'mobile', NEW.mobile, 'city', NEW.city,
      'type', NEW.type, 'car_brand', NEW.car_brand, 'car_model', NEW.car_model,
      'car_id', NEW.car_id, 'assigned_to', NEW.assigned_to,
      'preferred_date', NEW.preferred_date, 'preferred_time', NEW.preferred_time
    )
  );
  PERFORM public.automation_audit('lead_created', 'sales_notifications', NEW.id::text,
    NULL, COALESCE(NEW.status, 'pending'), NULL,
    jsonb_build_object('lead_type', NEW.type, 'car_id', NEW.car_id, 'name', NEW.name));
  PERFORM public.automation_auto_assign_sales_lead(NEW.id, NEW.city, NEW.type, v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_sales_lead_inserted ON public.sales_notifications;
CREATE TRIGGER automation_sales_lead_inserted
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_sales_lead_inserted();

-- ------------------------------------------------------------
-- 6. Appointments: test-drive leads get a test_drives row owned by
--    the SAME Sales Associate (test_drives.sales_associate_id).
--    buyer_id is relaxed to nullable because visitors submit leads
--    without a buyer profile; the lead row carries the customer.
-- ------------------------------------------------------------
ALTER TABLE public.test_drives
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.sales_notifications(id) ON DELETE SET NULL;
ALTER TABLE public.test_drives
  ALTER COLUMN buyer_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS test_drives_lead_id_uidx
  ON public.test_drives (lead_id) WHERE lead_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sales_crm_create_appointment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_assignee uuid;
  v_car_id uuid;
BEGIN
  IF NEW.type <> 'test_drive' THEN RETURN NEW; END IF;

  SELECT assigned_to INTO v_assignee FROM public.sales_notifications WHERE id = NEW.id;
  v_car_id := public.safe_uuid(NEW.car_id);

  -- Idempotent: one appointment per lead (partial unique index backs this).
  INSERT INTO public.test_drives (car_id, buyer_id, sales_associate_id, preferred_date, preferred_time, status, lead_id)
  SELECT v_car_id, NULL, v_assignee, NEW.preferred_date, NEW.preferred_time, 'scheduled', NEW.id
   WHERE NOT EXISTS (SELECT 1 FROM public.test_drives td WHERE td.lead_id = NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_lead_appointment ON public.sales_notifications;
CREATE TRIGGER sales_crm_lead_appointment
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_create_appointment();

-- ------------------------------------------------------------
-- 7. RLS — lead privacy at the DATABASE level.
--    Sales Associate: own assigned leads + the shared unassigned pool.
--    Admin: everything. Visitors: submit-only (no read).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Staff manage leads" ON public.sales_notifications;

DROP POLICY IF EXISTS "Admin manages all leads" ON public.sales_notifications;
CREATE POLICY "Admin manages all leads" ON public.sales_notifications
  FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

DROP POLICY IF EXISTS "Sales reads own and pool leads" ON public.sales_notifications;
CREATE POLICY "Sales reads own and pool leads" ON public.sales_notifications
  FOR SELECT USING (
    public.get_auth_user_role() = 'Sales Associate'::public.user_role
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

DROP POLICY IF EXISTS "Sales updates own and pool leads" ON public.sales_notifications;
CREATE POLICY "Sales updates own and pool leads" ON public.sales_notifications
  FOR UPDATE USING (
    public.get_auth_user_role() = 'Sales Associate'::public.user_role
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (public.get_auth_user_role() = 'Sales Associate'::public.user_role);

DROP POLICY IF EXISTS "Sales deletes own leads" ON public.sales_notifications;
CREATE POLICY "Sales deletes own leads" ON public.sales_notifications
  FOR DELETE USING (
    public.get_auth_user_role() = 'Sales Associate'::public.user_role
    AND assigned_to = auth.uid()
  );

-- "Visitors submit leads" (INSERT WITH CHECK (true)) already exists in
-- schema.sql and is intentionally kept.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_notifications TO authenticated;
GRANT INSERT ON public.sales_notifications TO anon;

-- Associates need to read their CRM activity timeline.
DROP POLICY IF EXISTS "Staff read audit trail" ON public.audit_trail;
CREATE POLICY "Staff read audit trail" ON public.audit_trail
  FOR SELECT USING (
    public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
    OR actor_user_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 8. Indexes for the CRM queries.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS sales_notifications_assigned_to_idx ON public.sales_notifications (assigned_to);
CREATE INDEX IF NOT EXISTS sales_notifications_car_id_idx ON public.sales_notifications (car_id);
CREATE INDEX IF NOT EXISTS sales_notifications_status_idx ON public.sales_notifications (status);
CREATE INDEX IF NOT EXISTS follow_ups_related_idx ON public.follow_ups (related_table, related_id);


-- ============================================================
-- SECTION 8/17: public/automation_schema.sql
-- ============================================================

-- ====================================================
-- 1stCars Native Automation Engine — DDL Migration
-- Event ledger, job queue, audit logs, internal task
-- queue, CRM activities, PL/pgSQL rules + guarded
-- pg_cron jobs. Idempotent: safe to re-run in the
-- Supabase SQL Editor (no external automation tools).
-- ====================================================


-- ====================================================
-- 1. NEW TABLES
-- ====================================================

-- 1.1 AUTOMATION EVENTS (idempotency source).
-- Every business event (inspection created, lead submitted,
-- auction ended, ...) is recorded here. `action_key` is a
-- deterministic dedupe key so a re-fired trigger / retried
-- request never records the same event twice.
CREATE TABLE IF NOT EXISTS public.automation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  source_table TEXT,
  source_id TEXT,
  action_key TEXT UNIQUE,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, processed, failed, skipped
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS automation_events_status_idx ON public.automation_events (status);
CREATE INDEX IF NOT EXISTS automation_events_type_idx ON public.automation_events (event_type, created_at);

-- 1.2 AUTOMATION JOBS (rule executions / scheduled jobs).
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_key TEXT UNIQUE,
  job_type TEXT NOT NULL,
  source_id TEXT,
  status TEXT DEFAULT 'queued' NOT NULL, -- queued, running, completed, failed, retrying, cancelled
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 1.3 AUTOMATION LOGS (execution audit trail).
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.automation_jobs(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.automation_events(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'info' NOT NULL, -- info, warn, error
  action TEXT,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS automation_logs_event_idx ON public.automation_logs (event_id);

-- 1.4 TASKS (internal work queue assigned to staff).
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = system
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' NOT NULL, -- low, medium, high, urgent
  status TEXT DEFAULT 'open' NOT NULL, -- open, in_progress, completed, cancelled, overdue
  due_at TIMESTAMP WITH TIME ZONE,
  source_table TEXT,
  source_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_assignee_status_idx ON public.tasks (assignee_id, status);

-- 1.5 CRM ACTIVITIES (customer activity timeline for staff).
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  subject TEXT,
  detail TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_activities_customer_idx ON public.crm_activities (customer_id, created_at);

-- Sales leads need a place to hold their auto-assigned sales associate.
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Seed automation feature flags (default OFF so existing manual workflows
-- keep working until the admin switches them on in the Automation Center).
INSERT INTO public.settings (key, value, description) VALUES
  ('automation.auto_assign_inspector', 'false', 'Automation engine: auto-assign inspectors to new inspection requests'),
  ('automation.auto_assign_sales', 'false', 'Automation engine: auto-assign sales associates to new buyer leads'),
  ('automation.reminders', 'true', 'Automation engine: overdue + follow-up reminders'),
  ('automation.poller_interval', '60', 'In-app poller interval in seconds (0 disables in-app polling)')
ON CONFLICT (key) DO NOTHING;


-- ====================================================
-- 2. ROW LEVEL SECURITY
-- ====================================================
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Automation events/jobs/logs: staff read, admin manages.
DROP POLICY IF EXISTS "Staff read automation events" ON public.automation_events;
CREATE POLICY "Staff read automation events" ON public.automation_events FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "System writes automation events" ON public.automation_events;
CREATE POLICY "System writes automation events" ON public.automation_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin manages automation events" ON public.automation_events;
CREATE POLICY "Admin manages automation events" ON public.automation_events FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read automation jobs" ON public.automation_jobs;
CREATE POLICY "Staff read automation jobs" ON public.automation_jobs FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages automation jobs" ON public.automation_jobs;
CREATE POLICY "Admin manages automation jobs" ON public.automation_jobs FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read automation logs" ON public.automation_logs;
CREATE POLICY "Staff read automation logs" ON public.automation_logs FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages automation logs" ON public.automation_logs;
CREATE POLICY "Admin manages automation logs" ON public.automation_logs FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- Tasks: assignee + staff read, assignee updates own task status, staff manage.
DROP POLICY IF EXISTS "Assignee and staff read tasks" ON public.tasks;
CREATE POLICY "Assignee and staff read tasks" ON public.tasks FOR SELECT USING (
  auth.uid() = assignee_id
  OR public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Assignee updates own tasks" ON public.tasks;
CREATE POLICY "Assignee updates own tasks" ON public.tasks FOR UPDATE USING (
  auth.uid() = assignee_id OR public.get_auth_user_role() = 'Admin'::public.user_role
);
DROP POLICY IF EXISTS "Admin manages tasks" ON public.tasks;
CREATE POLICY "Admin manages tasks" ON public.tasks FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- CRM activities: staff read/write, customers read their own timeline.
DROP POLICY IF EXISTS "Staff read crm activities" ON public.crm_activities;
CREATE POLICY "Staff read crm activities" ON public.crm_activities FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role)
);
DROP POLICY IF EXISTS "Customers read own crm activities" ON public.crm_activities;
CREATE POLICY "Customers read own crm activities" ON public.crm_activities FOR SELECT USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Staff write crm activities" ON public.crm_activities;
CREATE POLICY "Staff write crm activities" ON public.crm_activities FOR INSERT WITH CHECK (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages crm activities" ON public.crm_activities;
CREATE POLICY "Admin manages crm activities" ON public.crm_activities FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);


-- ====================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- ====================================================

-- 3.1 Write an audit log entry.
DROP FUNCTION IF EXISTS public.automation_log(text, text, text, jsonb, uuid, uuid);
CREATE OR REPLACE FUNCTION public.automation_log(
  p_level text,
  p_action text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_job_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.automation_logs (job_id, event_id, level, action, message, metadata)
  VALUES (p_job_id, p_event_id, coalesce(p_level, 'info'), p_action, p_message, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

-- 3.2 Record a business event (idempotent via action_key).
DROP FUNCTION IF EXISTS public.automation_record_event(text, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.automation_record_event(
  p_event_type text,
  p_source_table text,
  p_source_id text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_key text := p_event_type || ':' || coalesce(p_source_table, '') || ':' || coalesce(p_source_id, '');
  v_id uuid;
BEGIN
  IF p_event_type IS NULL OR p_event_type = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;
  INSERT INTO public.automation_events (event_type, source_table, source_id, action_key, payload, status)
  VALUES (p_event_type, p_source_table, p_source_id, v_key, coalesce(p_payload, '{}'::jsonb), 'pending')
  ON CONFLICT (action_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.automation_events WHERE action_key = v_key;
  END IF;
  RETURN v_id;
END;
$$;

-- 3.3 Create a system notification (and audit it).
DROP FUNCTION IF EXISTS public.automation_notify(uuid, text, text, text, jsonb, uuid);
CREATE OR REPLACE FUNCTION public.automation_notify(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_event_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_recipient_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (recipient_id, title, message, type, metadata)
  VALUES (p_recipient_id, p_title, p_message, coalesce(p_type, 'info'), coalesce(p_metadata, '{}'::jsonb));
  PERFORM public.automation_log('info', 'notify', p_title,
    jsonb_build_object('recipient_id', p_recipient_id, 'metadata', p_metadata),
    NULL, p_event_id);
END;
$$;

-- 3.4 Check whether an automation feature flag is ON.
CREATE OR REPLACE FUNCTION public.automation_flag_on(p_key text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT lower(value) IN ('true', 'on', '1', 'yes')
  FROM public.settings
  WHERE key = p_key
$$;

-- ====================================================
-- 4. RULES
-- ====================================================

-- 4.1 Auto-assign an inspector to an inspection request.
DROP FUNCTION IF EXISTS public.automation_auto_assign_inspector(uuid, uuid);
CREATE OR REPLACE FUNCTION public.automation_auto_assign_inspector(
  p_inspection_id uuid,
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_insp public.profiles%ROWTYPE;
  v_city text;
  v_vehicle text;
  v_inspector_id uuid;
BEGIN
  IF p_inspection_id IS NULL THEN RETURN NULL; END IF;

  IF NOT public.automation_flag_on('automation.auto_assign_inspector') THEN
    PERFORM public.automation_log('warn', 'assign-inspector',
      'Auto-assign disabled, inspection left for manual assignment',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  SELECT city INTO v_city FROM public.inspections WHERE id = p_inspection_id;
  IF v_city IS NULL THEN
    PERFORM public.automation_log('error', 'assign-inspector', 'Inspection not found',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  PERFORM 1 FROM public.inspections WHERE id = p_inspection_id AND inspector_id IS NOT NULL;
  IF FOUND THEN
    PERFORM public.automation_log('warn', 'assign-inspector', 'Inspection already assigned',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  -- Lowest open-workload inspector, same city preferred.
  SELECT p.id, p.name, p.city, p.email INTO v_insp
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT count(*) AS load FROM public.inspections i
      WHERE i.inspector_id = p.id AND i.status IN ('pending', 'assigned')
    ) l ON true
   WHERE p.role = 'Inspector'::public.user_role AND p.is_approved = true
     AND (p.city ILIKE v_city OR p.city IS NULL OR p.city = '')
   ORDER BY l.load ASC, p.created_at ASC
   LIMIT 1;

  IF v_insp.id IS NULL THEN
    SELECT p.id, p.name, p.city, p.email INTO v_insp
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT count(*) AS load FROM public.inspections i
        WHERE i.inspector_id = p.id AND i.status IN ('pending', 'assigned')
      ) l ON true
     WHERE p.role = 'Inspector'::public.user_role AND p.is_approved = true
     ORDER BY l.load ASC, p.created_at ASC
     LIMIT 1;
  END IF;

  IF v_insp.id IS NULL THEN
    PERFORM public.automation_log('warn', 'assign-inspector', 'No available inspectors',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  v_vehicle := COALESCE((SELECT brand || ' ' || model FROM public.inspections WHERE id = p_inspection_id), 'Vehicle');

  UPDATE public.inspections
     SET inspector_id = v_insp.id, status = 'assigned', updated_at = now()
   WHERE id = p_inspection_id;

  INSERT INTO public.tasks (assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id)
  VALUES (
    v_insp.id,
    'inspection_assignment',
    'Inspect ' || v_vehicle || ' (' || v_city || ')',
    'Vehicle inspection scheduled in ' || v_city || '. Visit the assigned inspections queue and complete the 120-point report.',
    'high', 'open', now() + interval '2 days', 'inspections', p_inspection_id::text
  );

  PERFORM public.automation_notify(v_insp.id,
    'New Inspection Assigned',
    'Inspection for ' || v_vehicle || ' in ' || v_city || ' was auto-assigned to you by the automation engine. Please complete it within 48 hours.',
    'action', jsonb_build_object('inspection_id', p_inspection_id, 'city', v_city), p_event_id);

  INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
  SELECT seller_id, v_insp.id, 'auto_assign', 'Inspector auto-assigned',
         'Inspector ' || v_insp.name || ' assigned by automation engine',
         jsonb_build_object('inspection_id', p_inspection_id)
    FROM public.inspections WHERE id = p_inspection_id;

  PERFORM public.automation_log('info', 'assign-inspector', 'Inspection auto-assigned to inspector',
    jsonb_build_object('inspection_id', p_inspection_id, 'inspector_id', v_insp.id, 'inspector', v_insp.name),
    NULL, p_event_id);

  RETURN v_insp.id;
END;
$$;

-- 4.2 Auto-assign a sales associate to a buyer lead.
DROP FUNCTION IF EXISTS public.automation_auto_assign_sales_lead(uuid, text, text, uuid);
CREATE OR REPLACE FUNCTION public.automation_auto_assign_sales_lead(
  p_lead_id uuid,
  p_city text,
  p_lead_type text DEFAULT 'lead',
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sales public.profiles%ROWTYPE;
  v_title text;
  v_car text;
BEGIN
  IF p_lead_id IS NULL THEN RETURN NULL; END IF;

  IF NOT public.automation_flag_on('automation.auto_assign_sales') THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'Auto-assign disabled for sales leads',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  PERFORM 1 FROM public.sales_notifications WHERE id = p_lead_id AND assigned_to IS NOT NULL;
  IF FOUND THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'Lead already assigned',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  v_car := COALESCE((SELECT car_brand || ' ' || car_model FROM public.sales_notifications WHERE id = p_lead_id), 'vehicle');
  v_title := CASE
    WHEN p_lead_type = 'test_drive' THEN 'Test drive lead: ' || v_car
    WHEN p_lead_type = 'buy_now' THEN 'Buy-now lead: ' || v_car
    ELSE 'Sales lead: ' || v_car
  END;

  -- Lowest open-workload sales associate, same city preferred.
  SELECT p.id, p.name, p.city, p.email INTO v_sales
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT count(*) AS load FROM public.sales_notifications sn
      WHERE sn.assigned_to = p.id AND sn.status IN ('pending', 'contacted')
    ) l ON true
   WHERE p.role = 'Sales Associate'::public.user_role AND p.is_approved = true
     AND (p.city ILIKE p_city OR p.city IS NULL OR p.city = '')
   ORDER BY l.load ASC, p.created_at ASC
   LIMIT 1;

  IF v_sales.id IS NULL THEN
    SELECT p.id, p.name, p.city, p.email INTO v_sales
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT count(*) AS load FROM public.sales_notifications sn
        WHERE sn.assigned_to = p.id AND sn.status IN ('pending', 'contacted')
      ) l ON true
     WHERE p.role = 'Sales Associate'::public.user_role AND p.is_approved = true
     ORDER BY l.load ASC, p.created_at ASC
     LIMIT 1;
  END IF;

  IF v_sales.id IS NULL THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'No available sales associates',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  UPDATE public.sales_notifications SET assigned_to = v_sales.id, status = 'contacted'
   WHERE id = p_lead_id;

  INSERT INTO public.tasks (assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id)
  VALUES (
    v_sales.id,
    'lead_followup',
    v_title,
    COALESCE((SELECT name || ' (' || mobile || ') in ' || city FROM public.sales_notifications WHERE id = p_lead_id), 'New buyer lead') ||
      '. Reach out to confirm interest and schedule the next step.',
    'high', 'open', now() + interval '1 day', 'sales_notifications', p_lead_id::text
  );

  PERFORM public.automation_notify(v_sales.id,
    'New Lead Assigned',
    v_title || ' was auto-assigned to you by the automation engine. Follow up within 24 hours.',
    'action', jsonb_build_object('lead_id', p_lead_id, 'city', p_city), p_event_id);

  INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
  VALUES (NULL, v_sales.id, 'auto_assign', 'Lead auto-assigned',
          'Lead #' || p_lead_id || ' (' || p_lead_type || ') assigned by automation engine',
          jsonb_build_object('lead_id', p_lead_id));

  PERFORM public.automation_log('info', 'assign-sales-lead', 'Lead auto-assigned to sales associate',
    jsonb_build_object('lead_id', p_lead_id, 'sales_associate_id', v_sales.id, 'sales_associate', v_sales.name),
    NULL, p_event_id);

  RETURN v_sales.id;
END;
$$;


-- ====================================================
-- 5. TRIGGERS
-- ====================================================

-- 5.1 Inspection created -> event + optional auto-assignment.
CREATE OR REPLACE FUNCTION public.on_inspection_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  v_event := public.automation_record_event(
    'inspection.created', 'inspections', NEW.id::text,
    jsonb_build_object(
      'inspection_id', NEW.id, 'city', NEW.city, 'brand', NEW.brand, 'model', NEW.model,
      'variant', NEW.variant, 'year', NEW.year, 'km_driven', NEW.km_driven,
      'seller_name', NEW.seller_name, 'seller_mobile', NEW.seller_mobile,
      'seller_email', NEW.seller_email, 'preferred_date', NEW.preferred_date,
      'preferred_time', NEW.preferred_time
    )
  );
  PERFORM public.automation_auto_assign_inspector(NEW.id, v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_created ON public.inspections;
CREATE TRIGGER automation_inspection_created
  AFTER INSERT ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_inserted();

-- 5.2 Sales lead submitted -> event + optional auto-assignment.
CREATE OR REPLACE FUNCTION public.on_sales_lead_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  v_event := public.automation_record_event(
    'lead.created', 'sales_notifications', NEW.id::text,
    jsonb_build_object(
      'lead_id', NEW.id, 'name', NEW.name, 'mobile', NEW.mobile, 'city', NEW.city,
      'type', NEW.type, 'car_brand', NEW.car_brand, 'car_model', NEW.car_model,
      'preferred_date', NEW.preferred_date, 'preferred_time', NEW.preferred_time
    )
  );
  PERFORM public.automation_auto_assign_sales_lead(NEW.id, NEW.city, NEW.type, v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_sales_lead_created ON public.sales_notifications;
CREATE TRIGGER automation_sales_lead_created
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_sales_lead_inserted();

-- 5.3 Inspection completed -> event (downstream: offers / valuation pipeline).
CREATE OR REPLACE FUNCTION public.on_inspection_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.automation_record_event(
      'inspection.completed', 'inspections', NEW.id::text,
      jsonb_build_object('inspection_id', NEW.id, 'city', NEW.city, 'brand', NEW.brand,
        'model', NEW.model, 'overall_score', NEW.overall_score)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_completed ON public.inspections;
CREATE TRIGGER automation_inspection_completed
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_completed();

-- 5.4 Auction lifecycle events are owned by the canonical engine
-- (public/auction_engine.sql). The engine's lifecycle RPCs write their own
-- events via public.automation_record_event with proper payloads, so the old
-- AFTER UPDATE trigger on the legacy flat auctions.status column
-- (on_auction_ended) is not created here anymore. If a legacy deployment
-- applied this trigger before auction_engine.sql, it moves with the table to
-- public.auctions_legacy during the engine migration — it can be dropped
-- there (DROP TRIGGER automation_auction_ended ON public.auctions_legacy).


-- ====================================================
-- 6. SCHEDULED JOBS (pg_cron, guarded so this file also
--    runs safely on databases without the extension)
-- ====================================================

-- 6.1 Overdue inspections: escalate assigned inspections whose preferred
-- date has passed. Returns the number of escalations performed.
CREATE OR REPLACE FUNCTION public.automation_inspection_overdue()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_vehicle text;
BEGIN
  FOR v_rec IN
    SELECT i.id, i.inspector_id, i.city, i.brand, i.model, i.preferred_date
      FROM public.inspections i
     WHERE i.status IN ('assigned', 'pending')
       AND i.preferred_date < current_date
       AND i.overall_score IS NULL
     ORDER BY i.preferred_date ASC
  LOOP
    v_vehicle := coalesce(v_rec.brand, '') || ' ' || coalesce(v_rec.model, '');

    INSERT INTO public.automation_jobs (job_key, job_type, source_id, status, metadata)
    VALUES ('overdue-inspection-' || v_rec.id, 'inspection_overdue', v_rec.id::text, 'completed',
            jsonb_build_object('inspection_id', v_rec.id, 'city', v_rec.city))
    ON CONFLICT (job_key) DO NOTHING;

    IF FOUND THEN
      IF v_rec.inspector_id IS NOT NULL THEN
        PERFORM public.automation_notify(v_rec.inspector_id,
          'Inspection Overdue',
          'The inspection for ' || v_vehicle || ' (' || v_rec.city || ') was due on ' ||
            to_char(v_rec.preferred_date, 'YYYY-MM-DD') || '. Please complete it today.',
          'alert', jsonb_build_object('inspection_id', v_rec.id), NULL);
      END IF;
      PERFORM public.automation_log('warn', 'inspection-overdue',
        'Overdue inspection escalated',
        jsonb_build_object('inspection_id', v_rec.id, 'preferred_date', v_rec.preferred_date), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6.2 Task reminders: flip expired open/in-progress tasks to overdue and
-- notify assignees. Returns the number of tasks escalated.
CREATE OR REPLACE FUNCTION public.automation_task_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT t.id, t.assignee_id, t.title, t.due_at
      FROM public.tasks t
     WHERE t.status IN ('open', 'in_progress')
       AND t.due_at IS NOT NULL
       AND t.due_at < now()
  LOOP
    UPDATE public.tasks SET status = 'overdue' WHERE id = v_rec.id AND status <> 'overdue';
    IF FOUND THEN
      IF v_rec.assignee_id IS NOT NULL THEN
        PERFORM public.automation_notify(v_rec.assignee_id,
          'Task Overdue',
          'Task "' || v_rec.title || '" is now overdue (due ' ||
            to_char(v_rec.due_at, 'YYYY-MM-DD HH24:MI') || ').',
          'alert', jsonb_build_object('task_id', v_rec.id), NULL);
      END IF;
      PERFORM public.automation_log('warn', 'task-overdue', 'Task marked overdue',
        jsonb_build_object('task_id', v_rec.id), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6.3 One-shot entry point the SPA poller can call to run both maintenance
-- passes (used when pg_cron is unavailable). Returns total work done.
CREATE OR REPLACE FUNCTION public.automation_run_overdue_checks()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_overdue integer;
  v_reminders integer;
BEGIN
  v_overdue := public.automation_inspection_overdue();
  v_reminders := public.automation_task_reminders();
  PERFORM public.automation_log('info', 'overdue-checks',
    'Overdue check pass completed',
    jsonb_build_object('overdue_inspections', v_overdue, 'task_reminders', v_reminders), NULL, NULL);
  RETURN v_overdue + v_reminders;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AND to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname IN ('automation-inspection-overdue', 'automation-task-reminders');
    PERFORM cron.schedule('automation-inspection-overdue', '0 9 * * *',
      $cmd$SELECT public.automation_inspection_overdue()$cmd$);
    PERFORM cron.schedule('automation-task-reminders', '0 * * * *',
      $cmd$SELECT public.automation_task_reminders()$cmd$);
  END IF;
END $$;


-- ====================================================
-- 7. ROLE GRANTS
-- ====================================================
GRANT EXECUTE ON FUNCTION public.automation_record_event(text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_flag_on(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_inspection_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_task_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_run_overdue_checks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_auto_assign_inspector(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_auto_assign_sales_lead(uuid, text, text, uuid) TO authenticated;

GRANT SELECT ON public.automation_events, public.automation_jobs, public.automation_logs, public.tasks, public.crm_activities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tasks TO authenticated;


-- ============================================================
-- SECTION 9/17: public/automation_phase2.sql
-- ============================================================
-- ====================================================
-- 1stCars Native Automation Engine — PHASE 2
-- Follow-ups, audit trail, vehicle status flow guard,
-- offer / dealer / booking triggers, scheduled jobs.
-- Idempotent: safe to re-run in the Supabase SQL Editor.
-- Run AFTER public/automation_schema.sql.
-- ====================================================

-- ====================================================
-- 1. NEW TABLES
-- ====================================================

-- 1.1 FOLLOW-UPS (outreach queue per workflow stage).
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  related_table TEXT,
  related_id TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_role TEXT, -- Sales Associate, Admin, Inspector
  follow_up_type TEXT NOT NULL, -- CONTACT_SELLER, CONTACT_BUYER, FOLLOW_UP_INSPECTION, CONFIRM_TEST_DRIVE, FOLLOW_UP_OFFER, COMPLETE_BOOKING, PREPARE_DELIVERY, PAYMENT, DOCUMENTATION
  priority TEXT DEFAULT 'medium' NOT NULL, -- low, medium, high, urgent
  status TEXT DEFAULT 'open' NOT NULL, -- open, in_progress, completed, cancelled, overdue
  due_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS follow_ups_status_due_idx ON public.follow_ups (status, due_at);
-- No duplicate ACTIVE follow-up for the same workflow stage.
CREATE UNIQUE INDEX IF NOT EXISTS follow_ups_stage_dedupe ON public.follow_ups (related_table, related_id, follow_up_type)
  WHERE status IN ('open', 'in_progress');

-- 1.2 AUDIT TRAIL (who/what/old/new/reason/timestamp).
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_trail_entity_idx ON public.audit_trail (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_trail_actor_idx ON public.audit_trail (actor_user_id, created_at);

-- 1.3 VEHICLE STATUS FLOW MAP (centralized allowed transitions).
CREATE TABLE IF NOT EXISTS public.car_status_flow (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
INSERT INTO public.car_status_flow (from_status, to_status) VALUES
  ('pending', 'pending'), ('pending', 'available'), ('pending', 'listed'), ('pending', 'sold'), ('pending', 'bidding'),
  ('draft', 'draft'), ('draft', 'seller_inquiry'), ('draft', 'inspection_pending'), ('draft', 'available'),
  ('seller_inquiry', 'seller_inquiry'), ('seller_inquiry', 'inspection_pending'), ('seller_inquiry', 'available'), ('seller_inquiry', 'listed'),
  ('inspection_pending', 'inspection_pending'), ('inspection_pending', 'inspection_in_progress'), ('inspection_pending', 'available'), ('inspection_pending', 'listed'),
  ('inspection_in_progress', 'inspection_in_progress'), ('inspection_in_progress', 'inspection_completed'), ('inspection_in_progress', 'available'), ('inspection_in_progress', 'listed'),
  ('inspection_completed', 'inspection_completed'), ('inspection_completed', 'valuation_pending'), ('inspection_completed', 'ready_for_sale'), ('inspection_completed', 'available'), ('inspection_completed', 'listed'),
  ('valuation_pending', 'valuation_pending'), ('valuation_pending', 'ready_for_sale'), ('valuation_pending', 'available'), ('valuation_pending', 'listed'),
  ('ready_for_sale', 'ready_for_sale'), ('ready_for_sale', 'listed'), ('ready_for_sale', 'available'), ('ready_for_sale', 'sold'),
  ('available', 'available'), ('available', 'reserved'), ('available', 'sold'), ('available', 'listed'), ('available', 'bidding'),
  ('listed', 'listed'), ('listed', 'reserved'), ('listed', 'sold'), ('listed', 'available'), ('listed', 'bidding'),
  ('reserved', 'reserved'), ('reserved', 'sold'), ('reserved', 'available'),
  ('bidding', 'bidding'), ('bidding', 'sold'), ('bidding', 'available'), ('bidding', 'listed'),
  ('sold', 'sold'), ('sold', 'delivered'),
  ('delivered', 'delivered')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- ====================================================
-- 2. ROW LEVEL SECURITY
-- ====================================================
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_status_flow ENABLE ROW LEVEL SECURITY;

-- Follow-ups: assignee + staff read, assignee updates own, admin manages.
DROP POLICY IF EXISTS "Assignee and staff read follow-ups" ON public.follow_ups;
CREATE POLICY "Assignee and staff read follow-ups" ON public.follow_ups FOR SELECT USING (
  auth.uid() = assignee_id
  OR public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Assignee updates own follow-ups" ON public.follow_ups;
CREATE POLICY "Assignee updates own follow-ups" ON public.follow_ups FOR UPDATE USING (
  auth.uid() = assignee_id OR public.get_auth_user_role() = 'Admin'::public.user_role
);
DROP POLICY IF EXISTS "Staff write follow-ups" ON public.follow_ups;
CREATE POLICY "Staff write follow-ups" ON public.follow_ups FOR INSERT WITH CHECK (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages follow-ups" ON public.follow_ups;
CREATE POLICY "Admin manages follow-ups" ON public.follow_ups FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- Audit trail: staff read, admin manages.
DROP POLICY IF EXISTS "Staff read audit trail" ON public.audit_trail;
CREATE POLICY "Staff read audit trail" ON public.audit_trail FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages audit trail" ON public.audit_trail;
CREATE POLICY "Admin manages audit trail" ON public.audit_trail FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- Status flow map: anyone reads (read-only reference data).
DROP POLICY IF EXISTS "Anyone reads car status flow" ON public.car_status_flow;
CREATE POLICY "Anyone reads car status flow" ON public.car_status_flow FOR SELECT USING (true);

-- ====================================================
-- 3. HELPER FUNCTIONS
-- ====================================================

-- 3.1 Write an audit trail entry.
CREATE OR REPLACE FUNCTION public.automation_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = v_actor;
  END IF;
  INSERT INTO public.audit_trail (actor_user_id, actor_role, action, entity_type, entity_id, old_status, new_status, reason, metadata)
  VALUES (v_actor, v_role, p_action, p_entity_type, p_entity_id, p_old_status, p_new_status, p_reason, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

-- 3.2 Create an internal task, idempotent via task_key (dedupes retries).
CREATE OR REPLACE FUNCTION public.automation_create_task(
  p_assignee_id uuid,
  p_task_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_due_at timestamptz DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id text DEFAULT NULL,
  p_task_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_task_key IS NOT NULL THEN
    SELECT id INTO v_id FROM public.tasks WHERE source_table = p_source_table AND source_id = p_source_id AND task_type = p_task_type LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  INSERT INTO public.tasks (assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id)
  VALUES (p_assignee_id, p_task_type, p_title, p_description, coalesce(p_priority, 'medium'), 'open', p_due_at, p_source_table, p_source_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 3.3 Create a follow-up (deduped by stage), optionally notifying the assignee.
CREATE OR REPLACE FUNCTION public.automation_create_follow_up(
  p_related_table text,
  p_related_id text,
  p_follow_up_type text,
  p_assignee_id uuid DEFAULT NULL,
  p_assigned_role text DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_due_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_notify_title text DEFAULT NULL,
  p_notify_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.follow_ups
   WHERE related_table = p_related_table AND related_id = p_related_id
     AND follow_up_type = p_follow_up_type AND status IN ('open', 'in_progress')
   LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.follow_ups (related_table, related_id, follow_up_type, assignee_id, assigned_role, priority, status, due_at, notes)
  VALUES (p_related_table, p_related_id, p_follow_up_type, p_assignee_id, p_assigned_role, coalesce(p_priority, 'medium'), 'open', p_due_at, p_notes)
  RETURNING id INTO v_id;

  IF p_notify_title IS NOT NULL AND p_assignee_id IS NOT NULL THEN
    PERFORM public.automation_notify(p_assignee_id, p_notify_title, p_notify_message, 'action',
      p_metadata || jsonb_build_object('follow_up_id', v_id), NULL);
  END IF;

  PERFORM public.automation_log('info', 'follow-up-created', 'Follow-up created for ' || p_follow_up_type,
    jsonb_build_object('follow_up_id', v_id, 'related_table', p_related_table, 'related_id', p_related_id),
    NULL, NULL);

  RETURN v_id;
END;
$$;

-- ====================================================
-- 4. OFFER AUTOMATION
-- ====================================================

-- 4.1 Offer inserted -> event + task + notification.
CREATE OR REPLACE FUNCTION public.on_offer_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
  v_car text;
  v_sales uuid;
BEGIN
  v_car := COALESCE((SELECT brand || ' ' || model FROM public.inspections WHERE id = NEW.inspection_id), 'vehicle');

  v_event := public.automation_record_event(
    'offer.created', 'offers', NEW.id::text,
    jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id, 'dealer_id', NEW.dealer_id,
      'dealer_name', NEW.dealer_name, 'offer_amount', NEW.offer_amount, 'car', v_car)
  );

  -- Sales/Admin queue task to review the offer.
  SELECT id INTO v_sales FROM public.profiles
   WHERE role = 'Sales Associate'::public.user_role AND is_approved = true
   ORDER BY created_at ASC LIMIT 1;

  PERFORM public.automation_create_task(v_sales, 'offer_review',
    'Review offer for ' || v_car,
    'Dealer ' || NEW.dealer_name || ' offered ₹' || NEW.offer_amount || '. Validate and route to the seller.',
    'high', now() + interval '24 hours', 'offers', NEW.id::text, 'offer-' || NEW.id::text);

  PERFORM public.automation_notify(v_sales, 'Offer Received',
    'New offer of ₹' || NEW.offer_amount || ' from ' || NEW.dealer_name || ' on ' || v_car || '.',
    'action', jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id), v_event);

  INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
  VALUES (NULL, v_sales, 'offer_received', 'Offer received',
    NEW.dealer_name || ' offered ₹' || NEW.offer_amount || ' for ' || v_car,
    jsonb_build_object('offer_id', NEW.id));

  PERFORM public.automation_audit('offer_created', 'offers', NEW.id::text, NULL, NEW.status, NULL,
    jsonb_build_object('amount', NEW.offer_amount, 'dealer_name', NEW.dealer_name));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_offer_created ON public.offers;
CREATE TRIGGER automation_offer_created
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_inserted();

-- 4.2 Offer status change -> events + notifications.
CREATE OR REPLACE FUNCTION public.on_offer_status_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
  v_seller uuid;
  v_car text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_car := COALESCE((SELECT brand || ' ' || model FROM public.inspections WHERE id = NEW.inspection_id), 'vehicle');
    SELECT seller_id INTO v_seller FROM public.inspections WHERE id = NEW.inspection_id;

    PERFORM public.automation_audit('offer_status_changed', 'offers', NEW.id::text, OLD.status, NEW.status);

    IF NEW.status IN ('accepted', 'rejected', 'expired') THEN
      v_event := public.automation_record_event(
        'offer.' || NEW.status, 'offers', NEW.id::text,
        jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id,
          'dealer_name', NEW.dealer_name, 'offer_amount', NEW.offer_amount, 'car', v_car)
      );
      IF v_seller IS NOT NULL THEN
        PERFORM public.automation_notify(v_seller,
          CASE WHEN NEW.status = 'accepted' THEN 'Offer Accepted' WHEN NEW.status = 'expired' THEN 'Offer Expired' ELSE 'Offer Rejected' END,
          CASE WHEN NEW.status = 'accepted'
               THEN 'Your ' || v_car || ' offer from ' || NEW.dealer_name || ' (₹' || NEW.offer_amount || ') was accepted.'
               WHEN NEW.status = 'expired'
               THEN 'The offer on ' || v_car || ' has expired. Ask staff to re-route your vehicle.'
               ELSE 'The offer on ' || v_car || ' from ' || NEW.dealer_name || ' was rejected.'
          END,
          CASE WHEN NEW.status = 'accepted' THEN 'success' ELSE 'info' END,
          jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id), v_event);
      END IF;
      IF NEW.status = 'accepted' THEN
        -- Accepted instant offer reserves the vehicle for purchase.
        UPDATE public.inspections SET status = 'sold' WHERE id = NEW.inspection_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_offer_status_changed ON public.offers;
CREATE TRIGGER automation_offer_status_changed
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_status_changed();

-- ====================================================
-- 5. DEALER APPROVAL AUTOMATION
-- ====================================================
CREATE OR REPLACE FUNCTION public.on_dealer_verified()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  IF NEW.is_verified = true AND OLD.is_verified IS DISTINCT FROM true THEN
    v_event := public.automation_record_event(
      'dealer.approved', 'dealers', NEW.id::text,
      jsonb_build_object('dealer_id', NEW.id, 'company_name', NEW.company_name)
    );
    PERFORM public.automation_notify(NEW.id,
      'Dealer Account Approved',
      'Congratulations! Your 1stCars dealer account is approved. You can now browse inventory and participate in dealer auctions.',
      'success', jsonb_build_object('dealer_id', NEW.id), v_event);
    INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
    VALUES (NEW.id, NULL, 'dealer_approved', 'Dealer approved', 'Dealer ' || NEW.company_name || ' approved by automation engine',
      jsonb_build_object('dealer_id', NEW.id));
    PERFORM public.automation_audit('dealer_approved', 'dealers', NEW.id::text, 'pending', 'approved');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_dealer_verified ON public.dealers;
CREATE TRIGGER automation_dealer_verified
  AFTER UPDATE OF is_verified ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.on_dealer_verified();

-- ====================================================
-- 6. VEHICLE STATUS CONSISTENCY
-- ====================================================

-- 6.1 Guard: reject invalid status transitions (frontend proof).
CREATE OR REPLACE FUNCTION public.on_cars_status_change_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (SELECT 1 FROM public.car_status_flow WHERE from_status = OLD.status AND to_status = NEW.status) THEN
      RAISE EXCEPTION 'Invalid vehicle status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_cars_status_guard ON public.cars;
CREATE TRIGGER automation_cars_status_guard
  BEFORE UPDATE OF status ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.on_cars_status_change_guard();

-- 6.2 After-change: event + audit + notification.
CREATE OR REPLACE FUNCTION public.on_cars_status_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := public.automation_record_event(
      'car.status_changed', 'cars', NEW.id::text,
      jsonb_build_object('car_id', NEW.id, 'title', NEW.title, 'brand', NEW.brand, 'model', NEW.model,
        'price', NEW.price, 'old_status', OLD.status, 'new_status', NEW.status)
    );
    PERFORM public.automation_audit('car_status_changed', 'cars', NEW.id::text, OLD.status, NEW.status);

    IF NEW.status = 'reserved' THEN
      PERFORM public.automation_notify(NEW.created_by, 'Vehicle Reserved',
        'Your ' || NEW.title || ' has been reserved by a buyer.', 'action',
        jsonb_build_object('car_id', NEW.id), v_event);
    ELSIF NEW.status = 'sold' THEN
      PERFORM public.automation_notify(NEW.created_by, 'Vehicle Sold',
        'Your ' || NEW.title || ' has been sold. Delivery workflow starts now.', 'success',
        jsonb_build_object('car_id', NEW.id), v_event);
    ELSIF NEW.status = 'listed' OR (NEW.status = 'available' AND OLD.status NOT IN ('available', 'listed')) THEN
      PERFORM public.automation_log('info', 'vehicle-listed', 'Vehicle available for sale',
        jsonb_build_object('car_id', NEW.id, 'title', NEW.title), NULL, v_event);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_cars_status_changed ON public.cars;
CREATE TRIGGER automation_cars_status_changed
  AFTER UPDATE OF status ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.on_cars_status_changed();

-- 6.3 New vehicle inserted (admin listing) -> event + audit.
CREATE OR REPLACE FUNCTION public.on_cars_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.automation_record_event(
    'car.status_changed', 'cars', NEW.id::text,
    jsonb_build_object('car_id', NEW.id, 'title', NEW.title, 'brand', NEW.brand, 'model', NEW.model,
      'price', NEW.price, 'old_status', NULL, 'new_status', NEW.status)
  );
  PERFORM public.automation_audit('car_created', 'cars', NEW.id::text, NULL, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_cars_inserted ON public.cars;
CREATE TRIGGER automation_cars_inserted
  AFTER INSERT ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.on_cars_inserted();

-- ====================================================
-- 7. INSPECTION COMPLETION -> VALUATION PIPELINE
-- (extends the phase-1 completion event with the
-- valuation task + follow-up, idempotent by task dedupe)
-- ====================================================
CREATE OR REPLACE FUNCTION public.on_inspection_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
  v_sales uuid;
  v_vehicle text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    v_event := public.automation_record_event(
      'inspection.completed', 'inspections', NEW.id::text,
      jsonb_build_object('inspection_id', NEW.id, 'city', NEW.city, 'brand', NEW.brand,
        'model', NEW.model, 'overall_score', NEW.overall_score)
    );

    v_vehicle := COALESCE(NEW.brand, '') || ' ' || COALESCE(NEW.model, '');

    PERFORM public.automation_audit('inspection_completed', 'inspections', NEW.id::text,
      OLD.status, NEW.status, NULL, jsonb_build_object('overall_score', NEW.overall_score));

    SELECT id INTO v_sales FROM public.profiles
     WHERE role = 'Sales Associate'::public.user_role AND is_approved = true
     ORDER BY created_at ASC LIMIT 1;

    PERFORM public.automation_create_task(v_sales, 'valuation_task',
      'Valuation pending: ' || v_vehicle,
      'Inspection completed (score ' || COALESCE(NEW.overall_score::text, '-') || '). Prepare the certified offer for the seller.',
      'high', now() + interval '1 day', 'inspections', NEW.id::text, 'valuation-' || NEW.id::text);

    PERFORM public.automation_notify(v_sales, 'Inspection Completed',
      'The 120-point inspection for ' || v_vehicle || ' is complete. Prepare the valuation offer.',
      'action', jsonb_build_object('inspection_id', NEW.id, 'score', NEW.overall_score), v_event);

    PERFORM public.automation_create_follow_up('inspections', NEW.id::text, 'VALUATION',
      v_sales, 'Sales Associate', 'high', now() + interval '24 hours',
      'Prepare certified offer once the inspection report is approved.',
      'Valuation Follow-up', 'Prepare the certified offer for ' || v_vehicle || '.',
      jsonb_build_object('inspection_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_completed ON public.inspections;
CREATE TRIGGER automation_inspection_completed
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_completed();

-- 7b. Inspection status change audit (all transitions).
CREATE OR REPLACE FUNCTION public.on_inspection_status_change_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.automation_audit('inspection_status_changed', 'inspections', NEW.id::text,
      OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_status_audit ON public.inspections;
CREATE TRIGGER automation_inspection_status_audit
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_status_change_audit();

-- ====================================================
-- 8. LEAD (sales_notifications) CHANGE AUDIT
-- ====================================================
CREATE OR REPLACE FUNCTION public.on_lead_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    PERFORM public.automation_audit('lead_updated', 'sales_notifications', NEW.id::text,
      COALESCE(OLD.status, 'pending'), NEW.status,
      CASE WHEN NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN 'assigned' ELSE NULL END,
      jsonb_build_object('lead_type', NEW.type, 'assigned_to', NEW.assigned_to));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_lead_changed ON public.sales_notifications;
CREATE TRIGGER automation_lead_changed
  AFTER UPDATE ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_lead_changed();

-- ====================================================
-- 9. SCHEDULED JOBS (pg_cron, guarded)
-- ====================================================

-- 9.1 Overdue follow-ups: flag + notify assignee, escalate to Admin.
CREATE OR REPLACE FUNCTION public.automation_follow_up_due()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_admin uuid;
BEGIN
  FOR v_rec IN
    SELECT f.id, f.assignee_id, f.follow_up_type, f.related_table, f.related_id, f.due_at
      FROM public.follow_ups f
     WHERE f.status IN ('open', 'in_progress') AND f.due_at IS NOT NULL AND f.due_at < now()
  LOOP
    UPDATE public.follow_ups SET status = 'overdue' WHERE id = v_rec.id AND status <> 'overdue';
    IF FOUND THEN
      IF v_rec.assignee_id IS NOT NULL THEN
        PERFORM public.automation_notify(v_rec.assignee_id, 'Follow-up Overdue',
          'Follow-up "' || v_rec.follow_up_type || '" for ' || COALESCE(v_rec.related_table, 'record') ||
          ' #' || COALESCE(v_rec.related_id, '') || ' is overdue.',
          'alert', jsonb_build_object('follow_up_id', v_rec.id), NULL);
      END IF;
      SELECT id INTO v_admin FROM public.profiles
       WHERE role = 'Admin'::public.user_role AND is_approved = true
       ORDER BY created_at ASC LIMIT 1;
      IF v_admin IS NOT NULL THEN
        PERFORM public.automation_notify(v_admin, 'Follow-up Escalated',
          'Follow-up "' || v_rec.follow_up_type || '" is overdue and escalated to you.',
          'alert', jsonb_build_object('follow_up_id', v_rec.id), NULL);
      END IF;
      PERFORM public.automation_log('warn', 'follow-up-overdue', 'Follow-up marked overdue',
        jsonb_build_object('follow_up_id', v_rec.id), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 9.2 Offer expiry: stale pending offers expire (setting automation.offer_expiry_days).
CREATE OR REPLACE FUNCTION public.automation_offer_expiry()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_days integer := COALESCE((SELECT value::integer FROM public.settings WHERE key = 'automation.offer_expiry_days'), 7);
  v_count integer := 0;
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT o.id, o.inspection_id, o.dealer_id, o.dealer_name, o.offer_amount, o.created_at
      FROM public.offers o
     WHERE o.status = 'pending' AND o.created_at < now() - make_interval(days => v_days)
  LOOP
    UPDATE public.offers SET status = 'expired' WHERE id = v_rec.id AND status = 'pending';
    IF FOUND THEN
      PERFORM public.automation_log('info', 'offer-expired', 'Pending offer expired',
        jsonb_build_object('offer_id', v_rec.id, 'amount', v_rec.offer_amount), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 9.3 Reservation expiry: release vehicles reserved too long (setting
-- automation.reservation_expiry_days), notifying the buyer.
CREATE OR REPLACE FUNCTION public.automation_reservation_expiry()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_days integer := COALESCE((SELECT value::integer FROM public.settings WHERE key = 'automation.reservation_expiry_days'), 3);
  v_count integer := 0;
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT c.id, c.title
      FROM public.cars c
     WHERE c.status = 'reserved'
       AND c.updated_at < now() - make_interval(days => v_days)
  LOOP
    UPDATE public.cars SET status = 'available', updated_at = now() WHERE id = v_rec.id AND status = 'reserved';
    IF FOUND THEN
      PERFORM public.automation_log('info', 'reservation-expired', 'Reservation released',
        jsonb_build_object('car_id', v_rec.id, 'title', v_rec.title), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 9.4 Extend the one-shot maintenance pass with the new jobs.
CREATE OR REPLACE FUNCTION public.automation_run_overdue_checks()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_overdue integer;
  v_reminders integer;
  v_followups integer;
  v_offers integer;
  v_reservations integer;
BEGIN
  v_overdue := public.automation_inspection_overdue();
  v_reminders := public.automation_task_reminders();
  v_followups := public.automation_follow_up_due();
  v_offers := public.automation_offer_expiry();
  v_reservations := public.automation_reservation_expiry();
  PERFORM public.automation_log('info', 'overdue-checks',
    'Maintenance pass completed',
    jsonb_build_object('overdue_inspections', v_overdue, 'task_reminders', v_reminders,
      'follow_ups', v_followups, 'offers_expired', v_offers, 'reservations_released', v_reservations), NULL, NULL);
  RETURN v_overdue + v_reminders + v_followups + v_offers + v_reservations;
END;
$$;

-- Seed phase-2 settings.
INSERT INTO public.settings (key, value, description) VALUES
  ('automation.follow_up_hours', '24', 'Automation engine: default follow-up due window in hours'),
  ('automation.offer_expiry_days', '7', 'Automation engine: days before a pending offer expires'),
  ('automation.reservation_expiry_days', '3', 'Automation engine: days before a reserved vehicle is released')
ON CONFLICT (key) DO NOTHING;

-- Schedule the extended pass (recreate the jobs so the new workload is covered).
DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AND to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname IN ('automation-inspection-overdue', 'automation-task-reminders', 'automation-maintenance');
    PERFORM cron.schedule('automation-maintenance', '*/30 * * * *',
      $cmd$SELECT public.automation_run_overdue_checks()$cmd$);
  END IF;
END $$;

-- ====================================================
-- 10. ROLE GRANTS
-- ====================================================
GRANT EXECUTE ON FUNCTION public.automation_audit(text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_create_task(uuid, text, text, text, text, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_create_follow_up(text, text, text, uuid, text, text, timestamptz, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_follow_up_due() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_offer_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_reservation_expiry() TO authenticated;

GRANT SELECT ON public.follow_ups, public.audit_trail, public.car_status_flow TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;


-- ============================================================
-- SECTION 10/17: public/auction_engine.sql
-- ============================================================
-- ============================================================
-- 1stCars Dealer Auction Engine V1
--
-- Introduces the canonical public.auctions table (replacing the
-- legacy flat "car_title / current_bid / highest_bidder_name"
-- auction demo) plus bid, eligibility and payment ledgers. All
-- state changes flow through SECURITY DEFINER RPCs so validation,
-- locking, anti-sniping extensions and automation events stay in
-- the database. No external tools required.
--
-- Order of operations:
--   1. Retire legacy public.auctions -> auctions_legacy (data kept)
--   2. Create new tables + status flow + RLS
--   3. Triggers (status guard, audit, events, eligibility)
--   4. RPCs (admin / dealer / seller / maintenance)
--   5. Realtime publication
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RETIRE LEGACY AUCTIONS TABLE
-- ============================================================

-- Drop legacy RLS policies before renaming (they move with the table,
-- but reference the old "active" status semantics we are replacing).
DROP POLICY IF EXISTS "Anyone reads auctions" ON public.auctions;
DROP POLICY IF EXISTS "Dealers bid on active auctions" ON public.auctions;
DROP POLICY IF EXISTS "Staff and inspectors manage auctions" ON public.auctions;

-- The legacy trigger/function from automation_schema.sql stays attached
-- to the renamed table so it keeps working on historical rows.
-- (Guarded so the migration can be re-run after a partial failure.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'auctions' AND c.relnamespace = 'public'::regnamespace)
     AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'auctions_legacy' AND c.relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.auctions RENAME TO auctions_legacy;
  END IF;
END $$;

-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- 2.1 Auction status transition map (enforced by a trigger).
CREATE TABLE IF NOT EXISTS public.auction_status_flow (
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO public.auction_status_flow (from_status, to_status) VALUES
  ('DRAFT', 'DRAFT'), ('DRAFT', 'READY'), ('DRAFT', 'SCHEDULED'), ('DRAFT', 'CANCELLED'),
  ('READY', 'READY'), ('READY', 'SCHEDULED'), ('READY', 'LIVE'), ('READY', 'CANCELLED'),
  ('SCHEDULED', 'SCHEDULED'), ('SCHEDULED', 'LIVE'), ('SCHEDULED', 'CANCELLED'), ('SCHEDULED', 'DRAFT'),
  ('LIVE', 'LIVE'), ('LIVE', 'EXTENDED'), ('LIVE', 'CLOSING'), ('LIVE', 'CANCELLED'),
  ('EXTENDED', 'EXTENDED'), ('EXTENDED', 'CLOSING'), ('EXTENDED', 'CANCELLED'),
  ('CLOSING', 'CLOSING'), ('CLOSING', 'CLOSED'), ('CLOSING', 'SELLER_REVIEW'), ('CLOSING', 'EXPIRED'), ('CLOSING', 'CANCELLED'),
  -- MED-01: 'CLOSED' is a legacy status — the close flow goes CLOSING →
  -- SELLER_REVIEW / EXPIRED directly and nothing writes CLOSED anymore. The
  -- rows below are kept only so historical rows remain decidable.
  ('CLOSED', 'SELLER_REVIEW'), ('CLOSED', 'ACCEPTED'), ('CLOSED', 'REJECTED'),
  ('SELLER_REVIEW', 'SELLER_REVIEW'), ('SELLER_REVIEW', 'ACCEPTED'), ('SELLER_REVIEW', 'REJECTED'), ('SELLER_REVIEW', 'CANCELLED'),
  ('ACCEPTED', 'ACCEPTED'),
  ('REJECTED', 'REJECTED'),
  ('EXPIRED', 'EXPIRED'),
  ('CANCELLED', 'CANCELLED')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 2.2 Canonical auctions table.
CREATE TABLE IF NOT EXISTS public.auctions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id                 UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  inspection_id          UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
  seller_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                 TEXT DEFAULT 'DRAFT' NOT NULL,
  starting_bid           INTEGER NOT NULL CHECK (starting_bid > 0),
  reserve_price          INTEGER DEFAULT 0 NOT NULL CHECK (reserve_price >= 0),
  current_highest_bid    INTEGER CHECK (current_highest_bid IS NULL OR current_highest_bid >= starting_bid),
  minimum_increment      INTEGER DEFAULT 5000 NOT NULL CHECK (minimum_increment > 0),
  starts_at              TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at                TIMESTAMP WITH TIME ZONE NOT NULL,
  extension_seconds      INTEGER DEFAULT 120 NOT NULL CHECK (extension_seconds > 0),
  max_extension_count    INTEGER DEFAULT 5 NOT NULL CHECK (max_extension_count >= 0),
  extension_count        INTEGER DEFAULT 0 NOT NULL CHECK (extension_count >= 0),
  winner_dealer_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winning_bid_id         UUID,
  closed_at              TIMESTAMP WITH TIME ZONE,
  ended_reason           TEXT,
  created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT auctions_time_window CHECK (ends_at > starts_at),
  CONSTRAINT auctions_status_enum CHECK (
    status IN ('DRAFT', 'READY', 'SCHEDULED', 'LIVE', 'EXTENDED', 'CLOSING', 'CLOSED', 'SELLER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')
  )
);

CREATE INDEX IF NOT EXISTS auctions_status_idx ON public.auctions (status);
CREATE INDEX IF NOT EXISTS auctions_ends_at_idx ON public.auctions (ends_at);
CREATE INDEX IF NOT EXISTS auctions_car_idx ON public.auctions (car_id);
CREATE INDEX IF NOT EXISTS auctions_seller_idx ON public.auctions (seller_id);

-- 2.3 Bid ledger. client_request_id is the idempotency key: a retried
-- request (double-click / network retry) returns the original outcome.
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id         UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  dealer_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount             INTEGER NOT NULL CHECK (amount > 0),
  status             TEXT DEFAULT 'WINNING' NOT NULL CHECK (status IN ('WINNING', 'OUTBID', 'CANCELLED', 'REJECTED')),
  client_request_id  TEXT UNIQUE,
  is_auto_extension  BOOLEAN DEFAULT false NOT NULL,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS auction_bids_auction_idx ON public.auction_bids (auction_id, amount DESC, created_at);
CREATE INDEX IF NOT EXISTS auction_bids_dealer_idx ON public.auction_bids (dealer_id);

-- 2.4 Dealer eligibility ledger (privacy + access control).
CREATE TABLE IF NOT EXISTS public.auction_dealer_eligibility (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id     UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  dealer_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status         TEXT DEFAULT 'INVITED' NOT NULL CHECK (status IN ('INVITED', 'ELIGIBLE', 'VIEWED', 'BIDDED', 'DISQUALIFIED')),
  invited_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  eligible_at    TIMESTAMP WITH TIME ZONE,
  viewed_at      TIMESTAMP WITH TIME ZONE,
  last_bid_at    TIMESTAMP WITH TIME ZONE,
  UNIQUE (auction_id, dealer_id)
);

CREATE INDEX IF NOT EXISTS auction_eligibility_dealer_idx ON public.auction_dealer_eligibility (dealer_id, status);

-- 2.5 Payment ledger (no gateway: statuses only).
CREATE TABLE IF NOT EXISTS public.auction_payments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id        UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  winner_dealer_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bid_id            UUID REFERENCES public.auction_bids(id) ON DELETE SET NULL,
  amount            INTEGER NOT NULL CHECK (amount > 0),
  status            TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RECEIVED', 'FAILED', 'REFUNDED')),
  method            TEXT,
  reference         TEXT,
  paid_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.auction_status_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_dealer_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_payments ENABLE ROW LEVEL SECURITY;

-- auction_status_flow: public reference map (like car_status_flow).
DROP POLICY IF EXISTS "Anyone reads auction status flow" ON public.auction_status_flow;
CREATE POLICY "Anyone reads auction status flow" ON public.auction_status_flow
  FOR SELECT USING (true);

-- auctions
DROP POLICY IF EXISTS "Staff manage auctions" ON public.auctions;
DROP POLICY IF EXISTS "Staff read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Eligible dealers read auctions" ON public.auctions;
DROP POLICY IF EXISTS "Sellers read own auctions" ON public.auctions;

CREATE POLICY "Staff manage auctions" ON public.auctions
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Eligible dealers read auctions" ON public.auctions
  FOR SELECT USING (
    public.get_auth_user_role() = 'Dealer' AND
    EXISTS (
      SELECT 1 FROM public.auction_dealer_eligibility ade
      WHERE ade.auction_id = public.auctions.id
        AND ade.dealer_id = auth.uid()
        AND ade.status IN ('INVITED', 'ELIGIBLE', 'VIEWED', 'BIDDED')
    )
  );

CREATE POLICY "Sellers read own auctions" ON public.auctions
  FOR SELECT USING (
    public.get_auth_user_role() = 'Seller' AND
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = public.auctions.inspection_id
        AND i.seller_id = auth.uid()
    )
  );

-- auction_bids: staff full visibility; dealers only their own bids.
-- Inserts happen exclusively inside SECURITY DEFINER RPCs, so no INSERT policy.
DROP POLICY IF EXISTS "Staff manage bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Dealers read own bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Admin deletes bids" ON public.auction_bids;

CREATE POLICY "Staff manage bids" ON public.auction_bids
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Dealers read own bids" ON public.auction_bids
  FOR SELECT USING (public.get_auth_user_role() = 'Dealer' AND dealer_id = auth.uid());

-- auction_dealer_eligibility: staff full; dealers only their own record.
DROP POLICY IF EXISTS "Staff manage eligibility" ON public.auction_dealer_eligibility;
DROP POLICY IF EXISTS "Dealers read own eligibility" ON public.auction_dealer_eligibility;

CREATE POLICY "Staff manage eligibility" ON public.auction_dealer_eligibility
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Dealers read own eligibility" ON public.auction_dealer_eligibility
  FOR SELECT USING (public.get_auth_user_role() = 'Dealer' AND dealer_id = auth.uid());

-- auction_payments: staff full; winning dealer reads own record only.
DROP POLICY IF EXISTS "Staff manage payments" ON public.auction_payments;
DROP POLICY IF EXISTS "Winning dealer reads payment" ON public.auction_payments;

CREATE POLICY "Staff manage payments" ON public.auction_payments
  FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

CREATE POLICY "Winning dealer reads payment" ON public.auction_payments
  FOR SELECT USING (public.get_auth_user_role() = 'Dealer' AND winner_dealer_id = auth.uid());

-- ============================================================
-- 4. HELPER FUNCTIONS + TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.auction_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_touch_updated ON public.auctions;
CREATE TRIGGER auctions_touch_updated
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_touch_updated_at();

DROP TRIGGER IF EXISTS auction_payments_touch_updated ON public.auction_payments;
CREATE TRIGGER auction_payments_touch_updated
  BEFORE UPDATE ON public.auction_payments
  FOR EACH ROW EXECUTE FUNCTION public.auction_touch_updated_at();

-- 4.1 Status guard: every auctions.status change must follow the map.
CREATE OR REPLACE FUNCTION public.auction_guard_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auction_status_flow
    WHERE from_status = OLD.status AND to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'Invalid auction status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_guard_status ON public.auctions;
CREATE TRIGGER auctions_guard_status
  BEFORE UPDATE OF status ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_guard_status_transition();

-- 4.2 Audit trail for every status change (even direct updates).
CREATE OR REPLACE FUNCTION public.auction_audit_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.automation_audit(
      'auction_status_changed', 'auctions', NEW.id::text,
      OLD.status, NEW.status, NEW.ended_reason,
      jsonb_build_object('car_id', NEW.car_id, 'winner_dealer_id', NEW.winner_dealer_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_audit_status ON public.auctions;
CREATE TRIGGER auctions_audit_status
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_audit_status_change();

-- 4.3 Created/eligibility events.
CREATE OR REPLACE FUNCTION public.auction_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.automation_record_event(
    'auction.created', 'auctions', NEW.id::text,
    jsonb_build_object(
      'auction_id', NEW.id, 'car_id', NEW.car_id,
      'inspection_id', NEW.inspection_id,
      'starting_bid', NEW.starting_bid, 'reserve_price', NEW.reserve_price,
      'starts_at', NEW.starts_at, 'ends_at', NEW.ends_at,
      'status', NEW.status
    )
  );
  PERFORM public.automation_audit('auction_created', 'auctions', NEW.id::text, NULL, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auctions_on_insert ON public.auctions;
CREATE TRIGGER auctions_on_insert
  AFTER INSERT ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_on_insert();

CREATE OR REPLACE FUNCTION public.auction_eligibility_on_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.automation_record_event(
      'auction.dealer_invited', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
      jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'ELIGIBLE' THEN
      PERFORM public.automation_record_event(
        'auction.dealer_eligible', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
        jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
      );
    ELSIF NEW.status = 'VIEWED' THEN
      PERFORM public.automation_record_event(
        'auction.viewed', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
        jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
      );
    ELSIF NEW.status = 'DISQUALIFIED' THEN
      PERFORM public.automation_record_event(
        'auction.dealer_disqualified', 'auction_dealer_eligibility', NEW.auction_id::text || ':' || NEW.dealer_id::text,
        jsonb_build_object('auction_id', NEW.auction_id, 'dealer_id', NEW.dealer_id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auction_eligibility_on_change ON public.auction_dealer_eligibility;
CREATE TRIGGER auction_eligibility_on_change
  AFTER INSERT OR UPDATE ON public.auction_dealer_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.auction_eligibility_on_change();

-- 4.4 Role helper for RPCs.
CREATE OR REPLACE FUNCTION public.auction_require_role(p_roles text[])
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role text;
BEGIN
  SELECT public.get_auth_user_role()::text INTO v_role;
  IF v_role IS NULL OR NOT (v_role = ANY (p_roles)) THEN
    RAISE EXCEPTION 'Not authorized. Required role: %', array_to_string(p_roles, ', ');
  END IF;
  RETURN v_role;
END;
$$;

-- ============================================================
-- 5. ADMIN / STAFF RPCS
-- ============================================================

-- 5.1 Create a DRAFT auction from a certified inspection.
CREATE OR REPLACE FUNCTION public.auction_create_auction(
  p_car_id uuid,
  p_inspection_id uuid,
  p_starting_bid integer,
  p_reserve_price integer DEFAULT 0,
  p_minimum_increment integer DEFAULT 5000,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_extension_seconds integer DEFAULT 120,
  p_max_extension_count integer DEFAULT 5,
  p_eligible_dealer_ids uuid[] DEFAULT NULL
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_seller_id uuid;
  v_auction public.auctions;
  v_start timestamptz := coalesce(p_starts_at, timezone('utc'::text, now()));
  v_end timestamptz := coalesce(p_ends_at, timezone('utc'::text, now()) + interval '24 hours');
  v_dealer uuid;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate', 'Inspector']);

  IF p_car_id IS NULL OR p_inspection_id IS NULL THEN
    RAISE EXCEPTION 'car_id and inspection_id are required';
  END IF;
  IF p_starting_bid IS NULL OR p_starting_bid <= 0 THEN
    RAISE EXCEPTION 'starting_bid must be positive';
  END IF;
  IF p_reserve_price IS NULL OR p_reserve_price < 0 THEN
    RAISE EXCEPTION 'reserve_price cannot be negative';
  END IF;
  IF v_end <= v_start THEN
    RAISE EXCEPTION 'ends_at must be after starts_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cars WHERE id = p_car_id AND status IN ('available', 'listed', 'ready_for_sale', 'inspection_completed')) THEN
    RAISE EXCEPTION 'Car is not available for auction (status must be available/listed)';
  END IF;

  SELECT seller_id INTO v_seller_id FROM public.inspections WHERE id = p_inspection_id;
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Inspection not found or has no seller';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.inspections
    WHERE id = p_inspection_id AND overall_score IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Inspection must be completed (overall score required) before auction';
  END IF;

  INSERT INTO public.auctions (
    car_id, inspection_id, seller_id, status, starting_bid, reserve_price,
    minimum_increment, starts_at, ends_at, extension_seconds, max_extension_count, created_by
  ) VALUES (
    p_car_id, p_inspection_id, v_seller_id, 'DRAFT', p_starting_bid, coalesce(p_reserve_price, 0),
    coalesce(p_minimum_increment, 5000), v_start, v_end,
    coalesce(p_extension_seconds, 120), coalesce(p_max_extension_count, 5), auth.uid()
  ) RETURNING * INTO v_auction;

  IF p_eligible_dealer_ids IS NOT NULL THEN
    FOR v_dealer IN SELECT unnest(p_eligible_dealer_ids) LOOP
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_dealer AND role::text = 'Dealer') THEN
        INSERT INTO public.auction_dealer_eligibility (auction_id, dealer_id, status)
        VALUES (v_auction.id, v_dealer, 'INVITED')
        ON CONFLICT (auction_id, dealer_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  PERFORM public.automation_audit('auction_created', 'auctions', v_auction.id::text, NULL, 'DRAFT',
    'Auction created by ' || v_role, jsonb_build_object('car_id', p_car_id, 'inspection_id', p_inspection_id));

  RETURN v_auction;
END;
$$;

-- 5.2 Publish: DRAFT -> READY (admin finalizes parameters, ready to schedule).
CREATE OR REPLACE FUNCTION public.auction_publish_auction(p_auction_id uuid)
RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate', 'Inspector']);
  UPDATE public.auctions SET status = 'READY', updated_at = now()
  WHERE id = p_auction_id AND status = 'DRAFT'
  RETURNING * INTO v_auction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found or not in DRAFT status';
  END IF;
  PERFORM public.automation_record_event('auction.published', 'auctions', v_auction.id::text,
    jsonb_build_object('auction_id', v_auction.id, 'status', 'READY'));
  PERFORM public.automation_audit('auction_published', 'auctions', v_auction.id::text, 'DRAFT', 'READY',
    'Published by ' || v_role);
  RETURN v_auction;
END;
$$;

-- 5.3 Schedule: READY/DRAFT -> SCHEDULED with an explicit time window.
CREATE OR REPLACE FUNCTION public.auction_schedule_auction(
  p_auction_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate', 'Inspector']);
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'A valid start/end window is required';
  END IF;
  UPDATE public.auctions
  SET status = 'SCHEDULED', starts_at = p_starts_at, ends_at = p_ends_at,
      extension_count = 0, updated_at = now()
  WHERE id = p_auction_id AND status IN ('DRAFT', 'READY')
  RETURNING * INTO v_auction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found or not schedulable from its current status';
  END IF;
  PERFORM public.automation_record_event('auction.scheduled', 'auctions', v_auction.id::text,
    jsonb_build_object('auction_id', v_auction.id, 'starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at));
  PERFORM public.automation_audit('auction_scheduled', 'auctions', v_auction.id::text, NULL, 'SCHEDULED',
    'Scheduled by ' || v_role, jsonb_build_object('starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at));
  RETURN v_auction;
END;
$$;

-- 5.4 Start: SCHEDULED/READY -> LIVE. Vehicle enters bidding.
CREATE OR REPLACE FUNCTION public.auction_start_auction(p_auction_id uuid)
RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
  v_seller uuid;
  v_eligible uuid;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate', 'Inspector']);
  UPDATE public.auctions SET status = 'LIVE', updated_at = now()
  WHERE id = p_auction_id AND status IN ('READY', 'SCHEDULED')
  RETURNING * INTO v_auction;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found or not startable from its current status';
  END IF;

  IF v_auction.car_id IS NOT NULL THEN
    UPDATE public.cars SET status = 'bidding', updated_at = now()
    WHERE id = v_auction.car_id AND status IN ('available', 'listed');
  END IF;

  SELECT seller_id INTO v_seller FROM public.inspections WHERE id = v_auction.inspection_id;
  IF v_seller IS NOT NULL THEN
    PERFORM public.automation_notify(v_seller, 'Auction Started',
      'Your certified vehicle is now live in the dealer auction. Track the result in your seller dashboard.',
      'info', jsonb_build_object('auction_id', v_auction.id));
  END IF;

  FOR v_eligible IN
    SELECT ade.dealer_id FROM public.auction_dealer_eligibility ade
    WHERE ade.auction_id = v_auction.id AND ade.status IN ('INVITED', 'ELIGIBLE', 'VIEWED', 'BIDDED')
  LOOP
    PERFORM public.automation_notify(v_eligible, 'Auction Live',
      'A new dealer auction you are eligible for is now live. Place your bids before it ends.',
      'action', jsonb_build_object('auction_id', v_auction.id));
  END LOOP;

  PERFORM public.automation_record_event('auction.started', 'auctions', v_auction.id::text,
    jsonb_build_object('auction_id', v_auction.id, 'starts_at', v_auction.starts_at, 'ends_at', v_auction.ends_at));
  PERFORM public.automation_audit('auction_started', 'auctions', v_auction.id::text, NULL, 'LIVE',
    'Started by ' || v_role);
  RETURN v_auction;
END;
$$;

-- 5.5 Add / refresh the eligible dealer pool for an auction.
CREATE OR REPLACE FUNCTION public.auction_set_eligible_dealers(
  p_auction_id uuid,
  p_dealer_ids uuid[]
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_dealer uuid;
  v_count integer := 0;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  IF NOT EXISTS (SELECT 1 FROM public.auctions WHERE id = p_auction_id) THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  IF p_dealer_ids IS NOT NULL THEN
    FOR v_dealer IN SELECT unnest(p_dealer_ids) LOOP
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_dealer AND role::text = 'Dealer') THEN
        INSERT INTO public.auction_dealer_eligibility (auction_id, dealer_id, status, eligible_at)
        VALUES (p_auction_id, v_dealer, 'ELIGIBLE', now())
        ON CONFLICT (auction_id, dealer_id)
        DO UPDATE SET status = CASE WHEN public.auction_dealer_eligibility.status IN ('INVITED', 'ELIGIBLE') THEN 'ELIGIBLE' ELSE public.auction_dealer_eligibility.status END,
                      eligible_at = COALESCE(public.auction_dealer_eligibility.eligible_at, now());
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- Remove invitations that were never activated (keeps the pool clean).
  DELETE FROM public.auction_dealer_eligibility
  WHERE auction_id = p_auction_id
    AND status = 'INVITED'
    AND (p_dealer_ids IS NULL OR NOT (dealer_id = ANY (p_dealer_ids)));

  PERFORM public.automation_audit('auction_eligibility_updated', 'auctions', p_auction_id::text,
    NULL, NULL, 'Eligible dealers updated by ' || v_role,
    jsonb_build_object('dealer_count', v_count));
  RETURN v_count;
END;
$$;

-- 5.6 Disqualify a single dealer from an auction.
CREATE OR REPLACE FUNCTION public.auction_disqualify_dealer(
  p_auction_id uuid,
  p_dealer_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  UPDATE public.auction_dealer_eligibility
  SET status = 'DISQUALIFIED'
  WHERE auction_id = p_auction_id AND dealer_id = p_dealer_id AND status <> 'BIDDED';
  PERFORM public.automation_audit('auction_dealer_disqualified', 'auction_dealer_eligibility',
    p_auction_id::text || ':' || p_dealer_id::text, NULL, 'DISQUALIFIED',
    'Disqualified by ' || v_role);
END;
$$;

-- 5.7 Cancel an auction and restore the vehicle.
CREATE OR REPLACE FUNCTION public.auction_cancel_auction(
  p_auction_id uuid,
  p_reason text DEFAULT 'Cancelled by staff'
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions;
  v_was_open boolean;
  v_eligible uuid;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  SELECT * INTO v_auction
  FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;
  v_was_open := v_auction.status IN ('LIVE', 'EXTENDED');

  UPDATE public.auctions
  SET status = 'CANCELLED', closed_at = now(), ended_reason = coalesce(p_reason, 'Cancelled by staff'), updated_at = now()
  WHERE id = p_auction_id AND status IN ('DRAFT', 'READY', 'SCHEDULED', 'LIVE', 'EXTENDED');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction cannot be cancelled from its current status (%)', v_auction.status;
  END IF;

  IF v_auction.car_id IS NOT NULL THEN
    UPDATE public.cars SET status = 'available', updated_at = now()
    WHERE id = v_auction.car_id AND status = 'bidding';
  END IF;

  IF v_was_open THEN
    FOR v_eligible IN
      SELECT ade.dealer_id FROM public.auction_dealer_eligibility ade
      WHERE ade.auction_id = p_auction_id AND ade.status IN ('ELIGIBLE', 'VIEWED', 'BIDDED')
    LOOP
      PERFORM public.automation_notify(v_eligible, 'Auction Cancelled',
        'An auction you were participating in was cancelled. No charges apply.',
        'alert', jsonb_build_object('auction_id', p_auction_id));
    END LOOP;
  END IF;

  PERFORM public.automation_record_event('auction.cancelled', 'auctions', p_auction_id::text,
    jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason, 'previous_status', v_auction.status));
  PERFORM public.automation_audit('auction_cancelled', 'auctions', p_auction_id::text,
    v_auction.status, 'CANCELLED', p_reason);
  RETURN v_auction;
END;
$$;

-- ============================================================
-- 6. DEALER RPCS
-- ============================================================

-- 6.1 Mark an auction as viewed (eligibility INVITED/ELIGIBLE -> VIEWED).
CREATE OR REPLACE FUNCTION public.auction_mark_viewed(p_auction_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.auction_require_role(ARRAY['Dealer']) IS NULL THEN RETURN; END IF;
  UPDATE public.auction_dealer_eligibility
  SET status = 'VIEWED', viewed_at = COALESCE(viewed_at, now())
  WHERE auction_id = p_auction_id AND dealer_id = v_uid
    AND status IN ('INVITED', 'ELIGIBLE');
END;
$$;

-- 6.2 Atomic, idempotent bid placement with anti-sniping extension.
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id uuid,
  p_amount integer,
  p_client_request_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_auction public.auctions%ROWTYPE;
  v_prev_bid_id uuid;
  v_prev_bid_amount integer;
  v_prev_dealer uuid;
  v_new_bid_id uuid;
  v_extended boolean := false;
  v_new_ends_at timestamptz;
  v_existing uuid;
  v_dup_amount integer;
  v_next_bid integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'Dealer' THEN RAISE EXCEPTION 'Only dealers can place bids'; END IF;
  -- Dealer approval gate: the profile must be admin-approved (is_approved, the
  -- flag AdminCMS flips for dealer applications). profiles.is_verified is NOT
  -- used as a gate: it was never written outside the demo seed, so gating on
  -- it locked every real dealer out of bidding (CRIT-02). If the dealer also
  -- has a row in public.dealers (dealer application flow), it must be verified.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.dealers d ON d.id = p.id
    WHERE p.id = v_uid AND p.is_approved = true
      AND (d.id IS NULL OR d.is_verified = true)
  ) THEN
    RAISE EXCEPTION 'Dealer account is not approved for auction participation';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Bid amount must be positive'; END IF;
  IF p_client_request_id IS NULL OR p_client_request_id = '' THEN
    RAISE EXCEPTION 'client_request_id is required';
  END IF;

  -- Lock the auction row so concurrent bids serialize.
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;

  -- Idempotency (CRIT-03): the check runs INSIDE the auction row lock so two
  -- concurrent retries of the same client_request_id cannot both pass the
  -- "no existing row" test. The lock holder's duplicate is found here; any
  -- other duplicate is caught by the UNIQUE constraint on client_request_id.
  SELECT b.id, b.amount INTO v_existing, v_dup_amount
  FROM public.auction_bids b
  WHERE b.auction_id = p_auction_id AND b.client_request_id = p_client_request_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true,
      'bid_id', v_existing, 'amount', v_dup_amount, 'created_at', now());
  END IF;

  IF v_auction.status NOT IN ('LIVE', 'EXTENDED') THEN
    RAISE EXCEPTION 'Auction is not open for bidding (current status: %)', v_auction.status;
  END IF;
  IF timezone('utc'::text, now()) < v_auction.starts_at THEN
    RAISE EXCEPTION 'Auction has not started yet';
  END IF;
  IF timezone('utc'::text, now()) >= v_auction.ends_at THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.auction_dealer_eligibility ade
    WHERE ade.auction_id = p_auction_id AND ade.dealer_id = v_uid
      AND ade.status IN ('ELIGIBLE', 'VIEWED', 'BIDDED')
  ) THEN
    RAISE EXCEPTION 'Dealer is not eligible to bid on this auction';
  END IF;

  IF v_auction.current_highest_bid IS NULL THEN
    IF p_amount < v_auction.starting_bid THEN
      RAISE EXCEPTION 'Bid must be at least the starting bid of ₹%', v_auction.starting_bid;
    END IF;
  ELSE
    v_next_bid := v_auction.current_highest_bid + v_auction.minimum_increment;
    IF p_amount < v_next_bid THEN
      RAISE EXCEPTION 'Bid must be at least ₹% (current high ₹% + increment ₹%)',
        v_next_bid, v_auction.current_highest_bid, v_auction.minimum_increment;
    END IF;
  END IF;

  SELECT b.id, b.amount, b.dealer_id INTO v_prev_bid_id, v_prev_bid_amount, v_prev_dealer
  FROM public.auction_bids b
  WHERE b.auction_id = p_auction_id AND b.status = 'WINNING'
  LIMIT 1;

  INSERT INTO public.auction_bids (auction_id, dealer_id, amount, status, client_request_id)
  VALUES (p_auction_id, v_uid, p_amount, 'WINNING', p_client_request_id)
  RETURNING id INTO v_new_bid_id;

  IF v_prev_bid_id IS NOT NULL THEN
    UPDATE public.auction_bids SET status = 'OUTBID' WHERE id = v_prev_bid_id;
  END IF;

  -- Anti-sniping: bids landing inside the extension window extend the clock.
  v_new_ends_at := v_auction.ends_at;
  IF (v_auction.ends_at - timezone('utc'::text, now())) <= make_interval(secs => v_auction.extension_seconds)
     AND v_auction.extension_count < v_auction.max_extension_count THEN
    v_new_ends_at := v_auction.ends_at + make_interval(secs => v_auction.extension_seconds);
    v_extended := true;
  END IF;

  UPDATE public.auctions SET
    current_highest_bid = p_amount,
    winner_dealer_id = v_uid,
    winning_bid_id = v_new_bid_id,
    extension_count = CASE WHEN v_extended THEN v_auction.extension_count + 1 ELSE v_auction.extension_count END,
    ends_at = v_new_ends_at,
    status = CASE WHEN v_extended THEN 'EXTENDED' ELSE v_auction.status END,
    updated_at = now()
  WHERE id = p_auction_id;

  UPDATE public.auction_dealer_eligibility
  SET status = 'BIDDED', last_bid_at = now(), viewed_at = COALESCE(viewed_at, now())
  WHERE auction_id = p_auction_id AND dealer_id = v_uid;

  PERFORM public.automation_record_event('auction.bid_placed', 'auction_bids', v_new_bid_id::text,
    jsonb_build_object('auction_id', p_auction_id, 'bid_id', v_new_bid_id,
      'amount', p_amount, 'extended', v_extended));

  IF v_prev_bid_id IS NOT NULL AND v_prev_dealer IS DISTINCT FROM v_uid THEN
    PERFORM public.automation_record_event('auction.bid_outbid', 'auction_bids',
      v_prev_bid_id::text || ':' || v_new_bid_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'outbid_bid_id', v_prev_bid_id,
        'new_bid_id', v_new_bid_id, 'previous_amount', v_prev_bid_amount, 'new_amount', p_amount));
    PERFORM public.automation_notify(v_prev_dealer, 'You have been outbid',
      'A higher bid of ₹' || p_amount::text || ' was placed on the auction you were winning. Place a new bid to stay in the race.',
      'alert', jsonb_build_object('auction_id', p_auction_id, 'new_amount', p_amount));
  END IF;

  IF v_extended THEN
    PERFORM public.automation_record_event('auction.extended', 'auctions',
      p_auction_id::text || '#ext' || (v_auction.extension_count + 1)::text,
      jsonb_build_object('auction_id', p_auction_id,
        'extension_count', v_auction.extension_count + 1,
        'old_ends_at', v_auction.ends_at, 'new_ends_at', v_new_ends_at));
  END IF;

  PERFORM public.automation_audit('auction_bid_placed', 'auctions', p_auction_id::text,
    v_auction.status, CASE WHEN v_extended THEN 'EXTENDED' ELSE v_auction.status END, NULL,
    jsonb_build_object('bid_id', v_new_bid_id, 'amount', p_amount, 'extended', v_extended));

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'amount', p_amount,
    'new_highest_bid', p_amount,
    'new_end_time', v_new_ends_at,
    'auction_status', CASE WHEN v_extended THEN 'EXTENDED' ELSE v_auction.status END,
    'extended', v_extended
  );
END;
$$;

-- 6.3 Masked public bid history (amounts + timing, never dealer identity).
CREATE OR REPLACE FUNCTION public.auction_public_bid_history(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_auction public.auctions%ROWTYPE;
  v_result jsonb;
  v_rank integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;

  IF v_role IN ('Admin', 'Sales Associate', 'Inspector') THEN
    SELECT jsonb_agg(jsonb_build_object(
      'bid_id', b.id, 'amount', b.amount, 'status', b.status,
      'dealer_id', b.dealer_id, 'created_at', b.created_at)
      ORDER BY b.created_at DESC)
      INTO v_result FROM public.auction_bids b WHERE b.auction_id = p_auction_id;
  ELSIF v_role = 'Dealer' THEN
    -- Dealers see amounts and their own bid marker only.
    SELECT jsonb_agg(jsonb_build_object(
      'amount', b.amount, 'status', b.status, 'is_mine', (b.dealer_id = v_uid),
      'rank', (SELECT count(*) FROM public.auction_bids b2
               WHERE b2.auction_id = p_auction_id AND b2.amount >= b.amount),
      'created_at', b.created_at)
      ORDER BY b.created_at DESC)
      INTO v_result FROM public.auction_bids b WHERE b.auction_id = p_auction_id;
  ELSIF v_role = 'Seller' AND EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = v_auction.inspection_id AND i.seller_id = v_uid
  ) THEN
    -- Sellers see counts/amounts without identities too.
    SELECT jsonb_agg(jsonb_build_object(
      'amount', b.amount, 'status', b.status,
      'rank', (SELECT count(*) FROM public.auction_bids b2
               WHERE b2.auction_id = p_auction_id AND b2.amount >= b.amount),
      'created_at', b.created_at)
      ORDER BY b.created_at DESC)
      INTO v_result FROM public.auction_bids b WHERE b.auction_id = p_auction_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to view bid history';
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- 7. CLOSE FLOW + SELLER / ADMIN DECISION
-- ============================================================

-- 7.1 Close a finished auction. Returns the outcome key.
CREATE OR REPLACE FUNCTION public.auction_close_if_ended(p_auction_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_seller uuid;
  v_winner uuid;
  v_winning_bid uuid;
  v_amount integer;
  v_staff uuid;
  v_vehicle text;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_auction.status NOT IN ('LIVE', 'EXTENDED', 'CLOSING') THEN
    RETURN 'not_closable';
  END IF;

  IF v_auction.status IN ('LIVE', 'EXTENDED') THEN
    UPDATE public.auctions SET status = 'CLOSING', updated_at = now() WHERE id = p_auction_id;
    PERFORM public.automation_record_event('auction.closing', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'previous_status', v_auction.status));
    v_auction.status := 'CLOSING';
  END IF;

  SELECT i.seller_id, i.brand || ' ' || i.model
    INTO v_seller, v_vehicle
    FROM public.inspections i WHERE i.id = v_auction.inspection_id;

  IF v_auction.current_highest_bid IS NULL OR v_auction.winner_dealer_id IS NULL THEN
    -- No bids: expiry, vehicle returns to inventory.
    UPDATE public.auctions
    SET status = 'EXPIRED', closed_at = now(), ended_reason = 'no_bids', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'available', updated_at = now()
      WHERE id = v_auction.car_id AND status = 'bidding';
    END IF;
    PERFORM public.automation_record_event('auction.expired', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'reason', 'no_bids'));
    PERFORM public.automation_audit('auction_expired', 'auctions', p_auction_id::text,
      v_auction.status, 'EXPIRED', 'No bids placed before deadline');
    SELECT id INTO v_staff FROM public.profiles
      WHERE role::text = 'Admin' ORDER BY created_at ASC LIMIT 1;
    IF v_staff IS NOT NULL THEN
      PERFORM public.automation_notify(v_staff, 'Auction Expired',
        'Auction ended with no bids' || CASE WHEN v_vehicle IS NOT NULL THEN ' for ' || v_vehicle ELSE '' END || '. Vehicle returned to inventory.',
        'info', jsonb_build_object('auction_id', p_auction_id));
    END IF;
    RETURN 'expired';
  END IF;

  -- Has a winner: review stage.
  SELECT id, dealer_id, amount INTO v_winning_bid, v_winner, v_amount
  FROM public.auction_bids
  WHERE auction_id = p_auction_id AND status = 'WINNING' LIMIT 1;

  UPDATE public.auctions
  SET status = 'SELLER_REVIEW', closed_at = now(), ended_reason = 'time_elapsed', updated_at = now()
  WHERE id = p_auction_id;

  PERFORM public.automation_record_event('auction.closed', 'auctions', p_auction_id::text,
    jsonb_build_object('auction_id', p_auction_id, 'winner_amount', v_amount));
  PERFORM public.automation_record_event('auction.winner_selected', 'auctions',
    p_auction_id::text || ':winner',
    jsonb_build_object('auction_id', p_auction_id, 'amount', v_amount,
      'reserve_met', v_amount >= v_auction.reserve_price));
  PERFORM public.automation_record_event('auction.seller_review', 'auctions',
    p_auction_id::text || ':review',
    jsonb_build_object('auction_id', p_auction_id, 'winner_amount', v_amount,
      'reserve_met', v_amount >= v_auction.reserve_price));

  IF v_winner IS NOT NULL AND v_winner IS DISTINCT FROM v_seller THEN
    PERFORM public.automation_notify(v_winner, 'Auction Won',
      'Congratulations! You won the auction with the highest bid of ₹' || v_amount::text ||
      '. 1stCars will guide you through payment and transfer.',
      'success', jsonb_build_object('auction_id', p_auction_id, 'amount', v_amount));
  END IF;

  IF v_seller IS NOT NULL THEN
    PERFORM public.automation_notify(v_seller, 'Auction Result Ready',
      'Your vehicle auction ended with a highest bid of ₹' || v_amount::text ||
      (CASE WHEN v_auction.reserve_price > 0 AND v_amount >= v_auction.reserve_price
            THEN ' (reserve met). Review and accept or reject the result.'
            ELSE '. The reserve was not met. You may reject the result.'
       END),
      'action', jsonb_build_object('auction_id', p_auction_id, 'amount', v_amount,
        'reserve_price', v_auction.reserve_price, 'reserve_met', v_amount >= v_auction.reserve_price));
  END IF;

  -- Staff follow-up task: route the result to the seller.
  SELECT id INTO v_staff FROM public.profiles
    WHERE role::text IN ('Admin', 'Sales Associate')
    ORDER BY (role::text = 'Admin') DESC, created_at ASC LIMIT 1;
  IF v_staff IS NOT NULL THEN
    PERFORM public.automation_create_task(
      v_staff, 'auction_result_review',
      'Review auction result and follow up with seller',
      'Auction #' || p_auction_id::text || ' closed at ₹' || v_amount::text ||
      '. Get the seller to accept/reject, then route the winner to payment.',
      'high', timezone('utc'::text, now()) + interval '24 hours',
      'auctions', p_auction_id::text, 'auction_result_review:' || p_auction_id::text
    );
  END IF;

  PERFORM public.automation_audit('auction_closed', 'auctions', p_auction_id::text,
    v_auction.status, 'SELLER_REVIEW', 'Auction closed', jsonb_build_object('winner_amount', v_amount));
  RETURN 'review';
END;
$$;

-- 7.2 Admin manual close.
CREATE OR REPLACE FUNCTION public.auction_admin_close(
  p_auction_id uuid,
  p_reason text DEFAULT 'Closed by staff'
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  SELECT status INTO v_status FROM public.auctions WHERE id = p_auction_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_status IN ('LIVE', 'EXTENDED', 'CLOSING') THEN
    RETURN public.auction_close_if_ended(p_auction_id);
  ELSIF v_status IN ('DRAFT', 'READY', 'SCHEDULED') THEN
    RETURN 'cancelled';
  ELSE
    RAISE EXCEPTION 'Auction cannot be closed from status %', v_status;
  END IF;
END;
$$;

-- 7.3 Seller decision on the auction result.
CREATE OR REPLACE FUNCTION public.seller_auction_decision(
  p_auction_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_auction public.auctions%ROWTYPE;
  v_seller uuid;
  v_vehicle text;
  v_staff uuid;
  v_payment public.auction_payments;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF public.auction_require_role(ARRAY['Seller']) IS NULL THEN RETURN NULL; END IF;
  IF p_decision NOT IN ('ACCEPT', 'REJECT') THEN
    RAISE EXCEPTION 'Decision must be ACCEPT or REJECT';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  SELECT seller_id INTO v_seller FROM public.inspections WHERE id = v_auction.inspection_id;
  IF v_seller IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only decide on auctions for your own vehicles';
  END IF;
  IF v_auction.status <> 'SELLER_REVIEW' THEN
    RAISE EXCEPTION 'Auction is not awaiting a seller decision (status: %)', v_auction.status;
  END IF;

  SELECT i.brand || ' ' || i.model INTO v_vehicle FROM public.inspections i WHERE i.id = v_auction.inspection_id;

  IF p_decision = 'ACCEPT' THEN
    -- Reserve enforcement (HIGH-09): a result below the reserve cannot be
    -- accepted by the seller — they must reject so the vehicle returns to
    -- inventory (or the car is re-auctioned).
    IF v_auction.reserve_price > 0
       AND (v_auction.current_highest_bid IS NULL OR v_auction.current_highest_bid < v_auction.reserve_price)
    THEN
      RAISE EXCEPTION 'The highest bid of ₹% is below the reserve price of ₹%. The result cannot be accepted.',
        v_auction.current_highest_bid, v_auction.reserve_price;
    END IF;
    UPDATE public.auctions SET status = 'ACCEPTED', ended_reason = 'seller_accepted', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'sold', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;

    INSERT INTO public.auction_payments (auction_id, winner_dealer_id, bid_id, amount, status)
    VALUES (p_auction_id, v_auction.winner_dealer_id, v_auction.winning_bid_id, v_auction.current_highest_bid, 'PENDING')
    RETURNING * INTO v_payment;

    IF v_auction.winner_dealer_id IS NOT NULL THEN
      PERFORM public.automation_notify(v_auction.winner_dealer_id, 'Payment Required',
        'Seller accepted the auction result. Pay ₹' || v_auction.current_highest_bid::text ||
        ' to complete your purchase.',
        'action', jsonb_build_object('auction_id', p_auction_id, 'payment_id', v_payment.id,
          'amount', v_auction.current_highest_bid));
    END IF;

    SELECT id INTO v_staff FROM public.profiles
      WHERE role::text = 'Admin' ORDER BY created_at ASC LIMIT 1;
    IF v_staff IS NOT NULL THEN
      PERFORM public.automation_create_task(
        v_staff, 'dealer_payment',
        'Collect dealer payment for auction #' || p_auction_id::text,
        'Collect ₹' || v_auction.current_highest_bid::text || ' from the winning dealer, then initiate vehicle transfer.',
        'urgent', timezone('utc'::text, now()) + interval '48 hours',
        'auctions', p_auction_id::text, 'dealer_payment:' || p_auction_id::text
      );
      PERFORM public.automation_notify(v_staff, 'Dealer Payment Task Created',
        'Collect ₹' || v_auction.current_highest_bid::text || ' for auction #' || p_auction_id::text || '.',
        'action', jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
    END IF;

    PERFORM public.automation_record_event('auction.seller_accepted', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
    PERFORM public.automation_record_event('auction.vehicle_sold', 'auctions', p_auction_id::text || ':sold',
      jsonb_build_object('auction_id', p_auction_id, 'car_id', v_auction.car_id,
        'amount', v_auction.current_highest_bid, 'winner_dealer_id', v_auction.winner_dealer_id));
    PERFORM public.automation_audit('auction_seller_accepted', 'auctions', p_auction_id::text,
      'SELLER_REVIEW', 'ACCEPTED', p_reason, jsonb_build_object('amount', v_auction.current_highest_bid));
  ELSE
    UPDATE public.auctions SET status = 'REJECTED', ended_reason = 'seller_rejected', updated_at = now()
    WHERE id = p_auction_id;
    -- MED-02: the winning bid must stop being "WINNING" once rejected — it was
    -- still shown as the active highest bid in dealer/seller UIs.
    UPDATE public.auction_bids SET status = 'REJECTED'
    WHERE auction_id = p_auction_id AND status = 'WINNING';
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'available', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;
    IF v_auction.winner_dealer_id IS NOT NULL AND v_auction.winner_dealer_id IS DISTINCT FROM v_uid THEN
      PERFORM public.automation_notify(v_auction.winner_dealer_id, 'Auction Result Rejected',
        'The seller did not accept the auction result for the vehicle you won. Your winning bid has been released.',
        'info', jsonb_build_object('auction_id', p_auction_id));
    END IF;
    PERFORM public.automation_record_event('auction.seller_rejected', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason));
    PERFORM public.automation_audit('auction_seller_rejected', 'auctions', p_auction_id::text,
      'SELLER_REVIEW', 'REJECTED', p_reason);
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  RETURN v_auction;
END;
$$;

-- 7.4 Admin override decision (used when the seller is unreachable).
CREATE OR REPLACE FUNCTION public.auction_admin_decision(
  p_auction_id uuid,
  p_decision text,
  p_reason text DEFAULT 'Admin override'
) RETURNS public.auctions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_auction public.auctions%ROWTYPE;
  v_seller uuid;
  v_payment public.auction_payments;
BEGIN
  v_role := public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  IF p_decision NOT IN ('ACCEPT', 'REJECT') THEN
    RAISE EXCEPTION 'Decision must be ACCEPT or REJECT';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auction not found'; END IF;
  IF v_auction.status NOT IN ('SELLER_REVIEW', 'CLOSED') THEN
    RAISE EXCEPTION 'Auction is not awaiting a decision (status: %)', v_auction.status;
  END IF;
  SELECT seller_id INTO v_seller FROM public.inspections WHERE id = v_auction.inspection_id;

  IF p_decision = 'ACCEPT' THEN
    UPDATE public.auctions SET status = 'ACCEPTED', ended_reason = 'admin_accepted', updated_at = now()
    WHERE id = p_auction_id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'sold', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;
    INSERT INTO public.auction_payments (auction_id, winner_dealer_id, bid_id, amount, status)
    VALUES (p_auction_id, v_auction.winner_dealer_id, v_auction.winning_bid_id, v_auction.current_highest_bid, 'PENDING')
    ON CONFLICT (auction_id) DO NOTHING
    RETURNING * INTO v_payment;
    IF v_auction.winner_dealer_id IS NOT NULL THEN
      PERFORM public.automation_notify(v_auction.winner_dealer_id, 'Auction Accepted. Payment Required',
        'Auction result accepted. Pay ₹' || v_auction.current_highest_bid::text || ' to complete your purchase.',
        'action', jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
    END IF;
    PERFORM public.automation_record_event('auction.admin_accepted', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'amount', v_auction.current_highest_bid));
  ELSE
    UPDATE public.auctions SET status = 'REJECTED', ended_reason = 'admin_rejected', updated_at = now()
    WHERE id = p_auction_id;
    -- MED-02: release the winning bid so it stops being shown as active.
    UPDATE public.auction_bids SET status = 'REJECTED'
    WHERE auction_id = p_auction_id AND status = 'WINNING';
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'available', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('bidding', 'available', 'listed');
    END IF;
    PERFORM public.automation_record_event('auction.admin_rejected', 'auctions', p_auction_id::text,
      jsonb_build_object('auction_id', p_auction_id, 'reason', p_reason));
  END IF;

  PERFORM public.automation_audit('auction_admin_decision', 'auctions', p_auction_id::text,
    v_auction.status, CASE WHEN p_decision = 'ACCEPT' THEN 'ACCEPTED' ELSE 'REJECTED' END, p_reason);
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  RETURN v_auction;
END;
$$;

-- ============================================================
-- 8. MAINTENANCE (auto-start + auto-close; safe to run via pg_cron
--    or the in-app poller — no auth context required).
-- ============================================================

CREATE OR REPLACE FUNCTION public.auction_run_maintenance()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_started integer := 0;
  v_closed integer := 0;
  v_auction public.auctions%ROWTYPE;
BEGIN
  -- MED-05: a pg_cron / system call has no auth context (auth.uid() IS NULL)
  -- and must be allowed; any interactive caller must be staff.
  IF auth.uid() IS NOT NULL THEN
    PERFORM public.auction_require_role(ARRAY['Admin', 'Sales Associate']);
  END IF;
  -- Auto-start scheduled auctions.
  FOR v_auction IN
    SELECT * FROM public.auctions
    WHERE status = 'SCHEDULED' AND starts_at <= timezone('utc'::text, now())
    FOR UPDATE
  LOOP
    UPDATE public.auctions SET status = 'LIVE', updated_at = now() WHERE id = v_auction.id;
    IF v_auction.car_id IS NOT NULL THEN
      UPDATE public.cars SET status = 'bidding', updated_at = now()
      WHERE id = v_auction.car_id AND status IN ('available', 'listed');
    END IF;
    PERFORM public.automation_record_event('auction.started', 'auctions', v_auction.id::text,
      jsonb_build_object('auction_id', v_auction.id, 'source', 'auto_start'));
    v_started := v_started + 1;
  END LOOP;

  -- Auto-close ended auctions.
  FOR v_auction IN
    SELECT * FROM public.auctions
    WHERE status IN ('LIVE', 'EXTENDED', 'CLOSING') AND ends_at <= timezone('utc'::text, now())
    FOR UPDATE
  LOOP
    PERFORM public.auction_close_if_ended(v_auction.id);
    v_closed := v_closed + 1;
  END LOOP;

  RETURN jsonb_build_object('started', v_started, 'closed', v_closed);
END;
$$;

-- ============================================================
-- 9. GRANTS
-- ============================================================

GRANT SELECT ON public.auction_status_flow TO anon, authenticated;
-- MED-06: read-only table grants. All auction writes flow through the
-- role-checked SECURITY DEFINER RPCs (place_auction_bid, auction_*), which run
-- as the function owner; direct INSERT/UPDATE/DELETE via PostgREST would have
-- let any authenticated user bypass the engine's validations under the
-- permissive "Staff manage auctions" policy. RLS SELECT policies still give
-- staff/dealers/sellers read access to their own auctions.
GRANT SELECT ON public.auctions, public.auction_bids,
  public.auction_dealer_eligibility, public.auction_payments TO authenticated;

GRANT EXECUTE ON FUNCTION public.auction_create_auction(uuid, uuid, integer, integer, integer, timestamptz, timestamptz, integer, integer, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_publish_auction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_schedule_auction(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_start_auction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_set_eligible_dealers(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_disqualify_dealer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_cancel_auction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_admin_close(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_admin_decision(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_mark_viewed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_public_bid_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_auction_decision(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auction_run_maintenance() TO authenticated;

-- auction_close_if_ended is an internal engine step: it is invoked only from
-- auction_admin_close (staff role-checked) and auction_run_maintenance
-- (time-based cron/auto pass). PostgreSQL defaults EXECUTE to PUBLIC, so
-- without this REVOKE any unauthenticated caller could force-close a LIVE
-- auction early (bypassing the end-time window). It is intentionally NOT
-- granted to authenticated — the frontend uses auction_admin_close instead.
REVOKE EXECUTE ON FUNCTION public.auction_close_if_ended(uuid) FROM PUBLIC;

-- ============================================================
-- 10. REALTIME PUBLICATION
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_dealer_eligibility;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

COMMIT;


-- ============================================================
-- SECTION 11/17: public/fix_booking_audit_fk.sql
-- ============================================================
-- ============================================================
-- 1stCars — FIX: Test-drive / buy-now booking fails on
--   "insert or update on table \"audit_trail\" violates foreign
--    key constraint \"audit_trail_actor_user_id_fkey\""
-- File: public/fix_booking_audit_fk.sql
--
-- ROOT CAUSE
--   The sales-lead INSERT trigger (on_sales_lead_inserted →
--   automation_audit) stores actor_user_id = auth.uid(). That column
--   has a foreign key to public.profiles(id). When the current auth
--   user has NO profile row (auto-created buyer accounts, Google
--   OAuth sessions, signups created before the signup trigger was
--   installed, or a DB where schema.sql's on_auth_user_created
--   trigger was never run), the audit insert is rejected and
--   PostgreSQL rolls back the entire sales_notifications INSERT —
--   blocking the booking.
--
-- FIXES (all idempotent — safe to re-run in the Supabase SQL Editor)
--   1. automation_audit() becomes FK-safe: it writes actor_user_id
--      ONLY when a matching profiles row exists, otherwise it records
--      the audit row with a NULL actor (guest) so the lead insert
--      can never be rolled back by the audit trail.
--   2. Ensures the signup → profile trigger (handle_new_user /
--      on_auth_user_created) exists so every NEW auth user gets a
--      profile automatically.
--   3. backfill_missing_profiles() RPC repairs auth users that never
--      received a profile (one-time maintenance for existing data).
--   4. ensure_profile() RPC — called by the app right before the lead
--      INSERT, so a signed-in buyer always has a profile row.
--   5. Guards sales_crm_create_appointment() so the test-drive
--      appointment trigger cannot fail on legacy/non-UUID car ids.
-- ============================================================

-- ------------------------------------------------------------
-- 1. FK-SAFE ACTOR RESOLUTION
--    Returns auth.uid() ONLY when a matching profiles row exists.
--    NULL otherwise — a NULL actor satisfies the FK constraint and
--    the lead transaction can never be rolled back by the audit.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_audit_actor_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN v_uid;
  END IF;
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- 2. HARDENED automation_audit()
--    Never writes an actor_user_id that would violate the FK, so a
--    buyer booking (or any trigger-driven side effect) can never be
--    rolled back because the audit trail rejected the insert.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_role text;
BEGIN
  v_actor := public.automation_audit_actor_id();
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = v_actor;
  END IF;

  INSERT INTO public.audit_trail
    (actor_user_id, actor_role, action, entity_type, entity_id,
     old_status, new_status, reason, metadata)
  VALUES
    (v_actor, coalesce(v_role, 'guest'), p_action, p_entity_type, p_entity_id,
     p_old_status, p_new_status, p_reason, coalesce(p_metadata, '{}'::jsonb));
END;
$$;
-- ------------------------------------------------------------
-- 3. SIGNUP → PROFILE SYNC (idempotent re-creation)
--    Every new auth user gets a profiles row, so auth.uid() is
--    always a valid audit actor afterwards.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role public.user_role;
  resolved_email TEXT;
  resolved_name TEXT;
  resolved_mobile TEXT;
BEGIN
  requested_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'Buyer'::public.user_role
  );

  -- Phone-OTP signups (supabase.auth.signInWithOtp) create an auth user with
  -- `phone` but NO `email`. Derive a synthetic email + sensible defaults so
  -- the profile insert never fails on the nullable email column.
  resolved_email := coalesce(
    new.email,
    CASE WHEN new.phone IS NOT NULL
         THEN replace(new.phone, '+', '') || '@phone.1stcars.com'
         ELSE NULL END
  );
  resolved_name := coalesce(
    new.raw_user_meta_data->>'name',
    CASE WHEN new.email IS NOT NULL
         THEN split_part(new.email, '@', 1)
         WHEN new.phone IS NOT NULL
         THEN 'Customer ' || right(new.phone, 4)
         ELSE 'Customer' END
  );
  resolved_mobile := coalesce(new.raw_user_meta_data->>'mobile', new.phone);

  INSERT INTO public.profiles (id, name, email, mobile, role, city)
  VALUES (
    new.id,
    resolved_name,
    resolved_email,
    resolved_mobile,
    CASE
      -- Staff roles (Admin / Sales Associate / Inspector) are ONLY granted to
      -- pre-approved accounts. Everyone else may pick a public role
      -- (Buyer / Seller / Dealer); anything else silently falls back to Buyer.
      WHEN new.email IN ('sales@1stcars.com', 'inspector@1stcars.com')
        THEN requested_role
      WHEN requested_role IN ('Buyer', 'Seller', 'Dealer') THEN requested_role
      ELSE 'Buyer'::public.user_role
    END,
    coalesce(new.raw_user_meta_data->>'city', 'Mumbai')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ------------------------------------------------------------
-- 4. BACKFILL + ensure_profile() RPCs
--    Repair existing auth users that have no profile row, and give
--    the SPA a cheap RPC to call before booking.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_user record;
  v_count integer := 0;
BEGIN
  FOR v_user IN
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
     WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, name, email, mobile, role, city)
      VALUES (
        v_user.id,
        coalesce(
          v_user.raw_user_meta_data->>'name',
          split_part(coalesce(v_user.email, ''), '@', 1),
          'Customer'
        ),
        v_user.email,
        coalesce(v_user.raw_user_meta_data->>'mobile', v_user.phone),
        CASE WHEN v_user.email IN ('sales@1stcars.com', 'inspector@1stcars.com')
             THEN coalesce((v_user.raw_user_meta_data->>'role')::public.user_role, 'Buyer'::public.user_role)
             WHEN (v_user.raw_user_meta_data->>'role') IN ('Buyer', 'Seller', 'Dealer')
             THEN (v_user.raw_user_meta_data->>'role')::public.user_role
             ELSE 'Buyer'::public.user_role END,
        coalesce(v_user.raw_user_meta_data->>'city', 'Mumbai')
      );
      v_count := v_count + 1;
    EXCEPTION
      WHEN unique_violation THEN NULL; -- raced with a concurrent run
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

-- RPC the app calls just before a lead INSERT. No-op for anonymous
-- visitors; for a signed-in user it guarantees a profile row exists so
-- the audit_trail FK can never reject the subsequent role.
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN v_uid;
  END IF;

  SELECT u.id, u.email, u.phone, u.raw_user_meta_data INTO v_user
    FROM auth.users u WHERE u.id = v_uid;
  IF v_user.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (id, name, email, mobile, role, city)
  VALUES (
    v_user.id,
    coalesce(v_user.raw_user_meta_data->>'name',
             split_part(coalesce(v_user.email, ''), '@', 1), 'Customer'),
    v_user.email,
    coalesce(v_user.raw_user_meta_data->>'mobile', v_user.phone),
    coalesce((v_user.raw_user_meta_data->>'role')::public.user_role, 'Buyer'::public.user_role),
    coalesce(v_user.raw_user_meta_data->>'city', 'Mumbai')
  );
  RETURN v_user.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_audit_actor_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.backfill_missing_profiles() TO authenticated;
-- ------------------------------------------------------------
-- 5. HARDENED TEST-DRIVE APPOINTMENT TRIGGER
--    Keeps the auto-created test_drives row from failing when the
--    lead's car_id is a legacy demo id ("car-1") that cannot be cast
--    to a UUID, or when no appointment exists yet. The booking lead
--    itself must always be saved.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_crm_create_appointment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_assignee uuid;
  v_car_id uuid;
BEGIN
  IF NEW.type <> 'test_drive' THEN RETURN NEW; END IF;

  SELECT assigned_to INTO v_assignee FROM public.sales_notifications WHERE id = NEW.id;
  v_car_id := public.safe_uuid(NEW.car_id);

  -- Legacy / non-UUID car ids have no appointments table row yet; never let
  -- the optional appointment block the lead insert.
  IF v_car_id IS NULL THEN RETURN NEW; END IF;

  -- Idempotent: one appointment per lead (partial unique index backs this).
  INSERT INTO public.test_drives (car_id, buyer_id, sales_associate_id, preferred_date, preferred_time, status, lead_id)
  SELECT v_car_id, NULL, v_assignee, NEW.preferred_date, NEW.preferred_time, 'scheduled', NEW.id
   WHERE NOT EXISTS (SELECT 1 FROM public.test_drives td WHERE td.lead_id = NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_lead_appointment ON public.sales_notifications;
CREATE TRIGGER sales_crm_lead_appointment
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_create_appointment();

-- Reveal how many auth users were missing profiles (helps verify the fix).
-- SELECT public.backfill_missing_profiles();

-- ============================================================
-- SECTION 12/17: public/fix_inspections_insert.sql
-- ============================================================
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
CREATE POLICY "Sellers read own inspections" ON public.inspections FOR SELECT USING (
  auth.uid() = seller_id
  OR seller_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  OR seller_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
  OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector')
);
-- Sellers may promote/update their own pending inspections (partial-lead → full
-- submission path, and the post-sign-in seller_id backfill so the dashboard shows rows
-- that were submitted anonymously before their auto-created Seller account existed).
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

-- 9) Force PostgREST to reload its schema cache so the new columns are
--    recognised immediately (fixes "could not find column ... schema cache").
NOTIFY pgrst, 'reload schema';

-- Done. Hard-refresh the site (Ctrl/Cmd + Shift + R) and submit again.


-- ============================================================
-- SECTION 13/17: public/fix_admin_profile_delete_rls.sql
-- ============================================================
-- ============================================================
-- 1stCars — Fix: Admin cannot DELETE dealer / inspector / sales
-- profiles from the Admin Panel
--
-- SYMPTOM: clicking Delete in Admin → Dealers removes the row
-- from the UI, but the dealer comes back after a reload, and no
-- error is shown.
--
-- ROOT CAUSE: `public.profiles` has RLS enabled with policies for
-- SELECT (public read), UPDATE (own row) and ALL (Admin), but on
-- databases provisioned from an older schema snapshot the "Admin
-- manages all profiles" FOR ALL policy is missing — so every
-- DELETE is silently rejected by Row Level Security.
--
-- FIX: (re)create an explicit Admin DELETE policy on profiles,
-- plus explicit admin delete policies on the sibling tables the
-- dealer delete path touches (dealers / dealer_applications).
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times) and fully
-- self-contained (does not depend on the rest of schema.sql).
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

-- 1) Explicit Admin DELETE policy on profiles (the critical one).
--    Row Level Security rejects an operation when no policy allows
--    it, so without this, admin deletes on profiles always fail.
DROP POLICY IF EXISTS "Admin deletes profiles" ON public.profiles;
CREATE POLICY "Admin deletes profiles" ON public.profiles
  FOR DELETE
  USING (public.get_auth_user_role()::text = 'Admin');

-- 2) Belt & braces: re-assert the broad admin manage policy too, so
--    databases missing it entirely get it created (FOR ALL covers
--    SELECT / INSERT / UPDATE / DELETE for admins).
DROP POLICY IF EXISTS "Admin manages all profiles" ON public.profiles;
CREATE POLICY "Admin manages all profiles" ON public.profiles
  FOR ALL
  USING (public.get_auth_user_role()::text = 'Admin')
  WITH CHECK (public.get_auth_user_role()::text = 'Admin');

-- 3) Admin can delete rows off the dealers sibling table (cleanup
--    step of the admin dealer delete).
DROP POLICY IF EXISTS "Admin manages dealers" ON public.dealers;
CREATE POLICY "Admin manages dealers" ON public.dealers
  FOR ALL
  USING (public.get_auth_user_role()::text = 'Admin')
  WITH CHECK (public.get_auth_user_role()::text = 'Admin');

-- 4) Same for dealer_applications when that table exists (the
--    pre-migration / older databases may not have it — the DO
--    block below skips it in that case so the script never errors).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dealer_applications'
  ) THEN
    DROP POLICY IF EXISTS "Admin manages dealer_applications" ON public.dealer_applications;
    EXECUTE $pol$
      CREATE POLICY "Admin manages dealer_applications" ON public.dealer_applications
        FOR ALL
        USING (public.get_auth_user_role()::text = 'Admin')
        WITH CHECK (public.get_auth_user_role()::text = 'Admin');
    $pol$;
  END IF;
END $$;

-- 5) Sanity report: show the effective policies on profiles.
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;


-- ============================================================
-- SECTION 14/17: public/fix_launch_security_storage_profiles.sql
-- ============================================================
-- ============================================================
-- 1stCars — LAUNCH SECURITY PATCH
-- Storage lockdown + private "resumes" bucket + profiles read lockdown
--
-- Fixes three launch-critical issues from the security review:
--
--   1. storage.objects "All Power" policy
--      It was `FOR ALL USING (true) WITH CHECK (true)` — anonymous
--      visitors could read, overwrite and delete EVERY object in EVERY
--      bucket. It is REMOVED and replaced with scoped policies:
--        · everyone may still VIEW the public car-images / logos buckets
--          (visitor car photos + brand logos render without a session);
--        · AUTHENTICATED users (staff + sellers uploading their own car
--          photos) manage car-images / logos;
--        · ANONYMOUS users may only INSERT (upload) into the private
--          "resumes" bucket — nothing else, anywhere.
--
--   2. Private "resumes" storage bucket (job-application CVs)
--      Created here with WORKING policies: visitors upload only; only
--      Admin / Sales Associate staff may read CVs back for review
--      (the Admin panel mints a short-lived signed URL on "View
--      Resume"). The Careers form records the storage path.
--
--   3. profiles "Public profiles read" policy
--      It was `FOR SELECT USING (true)` — anonymous visitors could
--      enumerate every user's name / email / mobile / role. SELECT is
--      now for AUTHENTICATED users only. Anonymous buyer (test-drive /
--      buy-now) and seller (Sell Car) lead submissions are NOT affected:
--      they never read profiles while signed out, and their
--      policies/grants are untouched by this patch.
--
-- Run this ENTIRE file in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times).
--
-- NOTE: no GRANT changes are needed — the storage API evaluates these
-- RLS policies directly, and the existing table grants are unchanged.
-- ============================================================

-- ------------------------------------------------------------
-- 1. STORAGE BUCKETS
-- ------------------------------------------------------------
-- car-images / logos stay PUBLIC (car photos and brand logos must
-- render for visitors without a session).
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true), ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- The "resumes" bucket must be PRIVATE: creates it when missing and
-- forces public = false in case it was ever created public manually.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ------------------------------------------------------------
-- 2. STORAGE.OBJECTS RLS POLICIES
-- ------------------------------------------------------------
-- REMOVE the launch blocker: unrestricted anonymous access everywhere.
DROP POLICY IF EXISTS "All Power" ON storage.objects;

-- Visitors may keep VIEWING the public media buckets (no change in
-- behaviour for the public site).
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('car-images', 'logos'));

-- Authenticated staff (and sellers uploading their own car photos)
-- keep full management of the public media buckets. Anonymous users
-- get nothing here anymore.
DROP POLICY IF EXISTS "Authenticated manage media buckets" ON storage.objects;
CREATE POLICY "Authenticated manage media buckets" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id IN ('car-images', 'logos'))
  WITH CHECK (bucket_id IN ('car-images', 'logos'));

-- ANONYMOUS: the ONLY write allowed anywhere is uploading a CV into the
-- private "resumes" bucket (Careers form). No reads, updates or deletes
-- — and nothing at all in any other bucket.
DROP POLICY IF EXISTS "Visitors upload resumes" ON storage.objects;
CREATE POLICY "Visitors upload resumes" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'resumes');

-- STAFF REVIEW: only Admin / Sales Associate may read uploaded CVs back
-- out of the private bucket (Admin panel "View Resume" signed URLs).
DROP POLICY IF EXISTS "Staff review resumes" ON storage.objects;
CREATE POLICY "Staff review resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ------------------------------------------------------------
-- 3. PROFILES READ LOCKDOWN
-- ------------------------------------------------------------
-- REMOVE the leak: everyone (including anonymous visitors) could read
-- the whole profiles table.
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;

-- Authenticated users may still read profiles — the buyer dashboards,
-- in-app notifications (recipients resolved from staff profiles) and
-- CRM / auction staff views depend on it. Admins additionally keep full
-- control via "Admin manages all profiles".
DROP POLICY IF EXISTS "Authenticated profiles read" ON public.profiles;
CREATE POLICY "Authenticated profiles read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- ------------------------------------------------------------
-- 4. POST-RUN VERIFICATION (optional — run separately)
-- ------------------------------------------------------------
-- Expect "All Power" GONE and the five policies below PRESENT:
--   SELECT policyname, cmd, roles FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects';
-- Expect the profiles SELECT policy WITHOUT an anon entry:
--   SELECT policyname, cmd, roles FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'profiles';
-- Expect resumes PRIVATE (public = false):
--   SELECT id, public FROM storage.buckets
--    WHERE id IN ('car-images', 'logos', 'resumes');


-- ============================================================
-- SECTION 15/17: public/refine_supabase_v2.sql
-- ============================================================
-- ============================================================================
-- 1stCars — Consolidated Safe Refinements (v2)
-- ----------------------------------------------------------------------------
-- Derived from the full repository + Supabase audit. Idempotent and
-- NON-DESTRUCTIVE: safe to run repeatedly in the Supabase SQL Editor.
--
-- Run order (after the baseline schema + automation + auction + CRM files):
--   schema.sql  ->  automation_schema.sql  ->  automation_phase2.sql
--                ->  auction_engine.sql  ->  sales_crm_phase1.sql
--                ->  THIS FILE (refine_supabase_v2.sql)
--
-- What this file does:
--   A. cars.created_by_name          (code reads it; the column was missing)
--   B. updated_at auto-maintenance   (shared set_updated_at() trigger)
--   C. Missing performance indexes
--   D. Money + status CHECK guards   (only applied when existing rows comply)
--   E. report_150_json legacy note  (no drop; 120-point is canonical)
--   F. sales_notifications.assigned_to type reconciliation (guarded)
--
-- Every destructive/ambiguous change is either left out or guarded behind a
-- live-data check. Nothing is dropped by this migration.
-- ============================================================================

BEGIN;

-- ============================================================================
-- A. cars.created_by_name
-- ----------------------------------------------------------------------------
-- src/lib/leadAssignment.ts selects `created_by, created_by_name` from cars to
-- auto-assign sales leads. `cars.created_by` existed but `created_by_name` did
-- not, so that query failed on the real backend. Add + backfill it.
-- ============================================================================
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS created_by_name TEXT;

UPDATE public.cars c
   SET created_by_name = p.name
  FROM public.profiles p
 WHERE c.created_by = p.id
   AND c.created_by_name IS NULL
   AND c.created_by IS NOT NULL;

-- ============================================================================
-- B. updated_at auto-maintenance
-- ----------------------------------------------------------------------------
-- Most tables carry `updated_at` but nothing refreshes it. A shared trigger
-- keeps it accurate across every table that has the column (profiles, cars,
-- settings, dealer_applications, auctions, ...) without double-attaching.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END $$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT table_name
      FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I;', t.table_name, t.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t.table_name, t.table_name);
  END LOOP;
END $$;

-- ============================================================================
-- C. Performance indexes for the busiest query paths
-- ============================================================================
CREATE INDEX IF NOT EXISTS cars_status_city_idx       ON public.cars (status, city);
CREATE INDEX IF NOT EXISTS cars_status_created_idx    ON public.cars (status, created_at);
CREATE INDEX IF NOT EXISTS cars_brand_idx             ON public.cars (brand);
CREATE INDEX IF NOT EXISTS cars_created_by_idx        ON public.cars (created_by);
CREATE INDEX IF NOT EXISTS inspections_status_insp_idx ON public.inspections (status, inspector_id);
CREATE INDEX IF NOT EXISTS inspections_status_created_idx ON public.inspections (status, created_at);
CREATE INDEX IF NOT EXISTS test_drives_buyer_idx      ON public.test_drives (buyer_id);
CREATE INDEX IF NOT EXISTS test_drives_assoc_idx      ON public.test_drives (sales_associate_id);
CREATE INDEX IF NOT EXISTS purchases_buyer_idx        ON public.purchases (buyer_id);
CREATE INDEX IF NOT EXISTS purchases_status_idx       ON public.purchases (payment_status);
CREATE INDEX IF NOT EXISTS notifications_recip_read_idx ON public.notifications (recipient_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS sell_requests_seller_idx   ON public.sell_requests (seller_id);
CREATE INDEX IF NOT EXISTS car_images_car_idx         ON public.car_images (car_id, is_primary);

-- ============================================================================
-- D. Money/status CHECK guards
-- ----------------------------------------------------------------------------
-- Applied ONLY when the column exists AND no existing row would violate the
-- constraint, so a dirty live table never blocks the migration.
-- ============================================================================
DO $$
DECLARE
  r   record;
  bad integer;
  cname text;
BEGIN
  FOR r IN VALUES
    ('cars'::text,        'price'::text),
    ('offers'::text,      'offer_amount'::text),
    ('dealer_bids'::text, 'bid_amount'::text),
    ('purchases'::text,   'amount_paid'::text),
    ('park_sell'::text,   'pricing_expected'::text)
  LOOP
    -- skip if the column does not exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=r.column1 AND column_name=r.column2
    ) THEN
      CONTINUE;
    END IF;

    cname := r.column1 || '_' || r.column2 || '_nonneg';

    -- skip if the constraint already exists
    IF EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = cname AND connamespace = 'public'::regnamespace
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I < 0', r.column1, r.column2)
      INTO bad;

    IF bad = 0 THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I >= 0)',
        r.column1, cname, r.column2);
    ELSE
      RAISE NOTICE 'Skipped CHECK on %.% — % violating row(s) present.', r.column1, r.column2, bad;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- E. report_150_json (legacy 150-point report)
-- ----------------------------------------------------------------------------
-- Business requirement is the 120-point inspection. `report_120_json` is the
-- canonical report. `report_150_json` is legacy but may still hold historical
-- rows, so it is NOT dropped here. This block only documents the current state
-- and backfills report_120_json from report_150_json when 120 is empty
-- (helps data built before the 120-point form existed).
-- The app code no longer writes report_150_json (see AdminCMS.tsx).
--
-- NOTE: the live `inspections` table may predate these columns (older CREATE
-- TABLE IF NOT EXISTS won't add them to an existing table). Add them
-- defensively first so this block never fails on an older schema.
-- ============================================================================
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS report_120_json TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS report_150_json TEXT;

UPDATE public.inspections
   SET report_120_json = report_150_json
 WHERE report_120_json IS NULL
   AND report_150_json IS NOT NULL;

COMMENT ON COLUMN public.inspections.report_150_json IS
  'LEGACY 150-point report payload (deprecated). Canonical report is report_120_json. Keep for historical data; not written by the app.';

-- ============================================================================
-- F. sales_notifications.assigned_to type reconciliation
-- ----------------------------------------------------------------------------
-- CONFLICT AUDIT FINDING: schema.sql declares assigned_to TEXT while
-- sales_crm_phase1.sql / automation_schema.sql / add_sales_notifications_assignment.sql
-- declare it UUID REFERENCES profiles(id). Because all use ADD COLUMN
-- IF NOT EXISTS, whichever ran first wins. If the column is currently TEXT,
-- the Sales-CRM RLS policies (which compare assigned_to = auth.uid()) and the
-- FK join to profiles break.
--
-- This block safely normalises it to UUID when ALL non-null values are already
-- valid UUIDs. If any non-UUID (legacy) values exist it does NOT touch the
-- column and prints a notice so you can map them first.
-- ============================================================================
DO $$
DECLARE
  col_type text;
  bad      integer;
  has_fk   boolean;
BEGIN
  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='sales_notifications' AND column_name='assigned_to';

  IF col_type IS NULL THEN
    RAISE NOTICE 'sales_notifications.assigned_to column missing — skipping type reconciliation.';
    RETURN;
  END IF;

  IF col_type = 'uuid' THEN
    RAISE NOTICE 'sales_notifications.assigned_to is already UUID — nothing to do.';
    RETURN;
  END IF;

  EXECUTE $q$
    SELECT count(*) FROM public.sales_notifications
     WHERE assigned_to IS NOT NULL
       AND assigned_to !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  $q$ INTO bad;

  IF bad > 0 THEN
    RAISE NOTICE 'assigned_to has % non-UUID value(s) — cannot auto-convert. Map/clean them first.', bad;
    RETURN;
  END IF;

  ALTER TABLE public.sales_notifications ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid;

  -- Attach the FK only if it is not present yet.
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'sales_notifications_assigned_to_fkey'
       AND connamespace = 'public'::regnamespace
  ) INTO has_fk;

  IF NOT has_fk THEN
    ALTER TABLE public.sales_notifications
      ADD CONSTRAINT sales_notifications_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  RAISE NOTICE 'sales_notifications.assigned_to normalised to UUID + FK.';
END $$;

-- Refresh the PostgREST schema cache so new/changed columns are visible now.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFY AFTER RUNNING (paste into a fresh SQL query):
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name='sales_notifications' AND column_name='assigned_to';
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='cars' AND column_name='created_by_name';
--   SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_updated_at'
--    AND tgrelid::regclass::text = 'public.cars'::text;
-- ============================================================================



-- ============================================================
-- SECTION 16/17: public/fix_sales_notifications_rls.sql
-- ============================================================
-- ============================================================
-- 1stCars — FIX: Book Test Drive / Buy Now fails with
--   "new row violates row-level security policy for table
--    sales_notifications"
-- File: public/fix_sales_notifications_rls.sql
--
-- ROOT CAUSE (matches screenshot in Book Test Drive modal)
--   1. `sales_notifications` has RLS enabled with only
--      "Visitors submit leads" FOR INSERT. The frontend does
--      `.insert().select()` (see src/lib/leadAssignment.ts) which
--      requires a SELECT policy too. Anonymous visitors and fresh
--      buyers (no profiles row yet, or mobile not yet synced) match
--      NO SELECT policy, so PostgREST reports the whole statement
--      as an RLS violation on sales_notifications.
--   2. On some DBs the INSERT policy was created without
--      `TO anon, authenticated`, or GRANTs are missing.
--   3. Secondary triggers (audit_trail FK, test_drives NOT NULL)
--      can roll back the outer INSERT (see fix_booking_audit_fk.sql).
--
-- FIX (all idempotent — safe to re-run in Supabase SQL Editor):
--   A. Ensure every column the BookingModal writes exists.
--   B. Relax car_id NOT NULL so general enquiries never fail.
--   C. Re-create permissive INSERT for anon + authenticated.
--   D. Add narrow SELECT-back so `.insert().select()` works for
--      the submitter without exposing all PII to the public.
--   E. Harden test-drive appointment trigger (NULL car guard).
--   F. Harden automation_audit() so missing profiles never roll
--      back the lead (same as fix_booking_audit_fk.sql).
-- ============================================================

-- ------------------------------------------------------------
-- A. Columns the app writes (BookingModal + leadAssignment).
--    If any are missing PostgREST fails with "schema cache".
-- ------------------------------------------------------------
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS car_brand TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS car_model TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS vehicle TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'test_drive';
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS preferred_date DATE;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS preferred_time TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- B. General enquiries have no car — never block them.
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.sales_notifications ALTER COLUMN car_id DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.sales_notifications ALTER COLUMN preferred_date DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.sales_notifications ALTER COLUMN preferred_time DROP NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- ------------------------------------------------------------
-- C. INSERT must work for visitors (anon) AND signed-in buyers.
-- ------------------------------------------------------------
ALTER TABLE public.sales_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visitors submit leads" ON public.sales_notifications;
CREATE POLICY "Visitors submit leads"
  ON public.sales_notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.sales_notifications TO anon, authenticated;
GRANT SELECT, UPDATE ON public.sales_notifications TO authenticated;

-- ------------------------------------------------------------
-- D. Allow `.insert().select()` to return the just-created row.
--    - Authenticated buyers can read back rows matching their own
--      profile mobile (already covered by "Buyers view own leads"
--      from saved_cars.sql, re-created here if missing).
--    - Anon has no identity, so PostgREST cannot filter RETURNING.
--      The app code now falls back to plain `.insert()` (no select)
--      when the RETURNING is RLS-blocked — see leadAssignment.ts.
--      As a belt-and-braces, allow anon to SELECT rows created in
--      the last 5 minutes ONLY by matching mobile is impossible for
--      anon, so we do NOT open public SELECT. Staff keep full read
--      via existing Admin/Sales policies.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Buyers view own leads" ON public.sales_notifications;
CREATE POLICY "Buyers view own leads" ON public.sales_notifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.mobile IS NOT NULL AND p.mobile <> ''
        AND p.mobile = public.sales_notifications.mobile
    )
  );

-- ------------------------------------------------------------
-- E. Harden test-drive appointment trigger: never let a legacy /
--    non-UUID car_id or missing car abort the lead INSERT.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_crm_create_appointment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_assignee uuid;
  v_car_id uuid;
BEGIN
  IF NEW.type NOT IN ('test_drive', 'Test Drive Request', 'test-drive', 'test drive') THEN RETURN NEW; END IF;
  BEGIN
    SELECT assigned_to INTO v_assignee FROM public.sales_notifications WHERE id = NEW.id;
  EXCEPTION WHEN others THEN v_assignee := NULL;
  END;
  BEGIN
    v_car_id := public.safe_uuid(NEW.car_id);
  EXCEPTION WHEN others THEN v_car_id := NULL;
  END;
  IF v_car_id IS NULL THEN RETURN NEW; END IF;
  BEGIN
    INSERT INTO public.test_drives (car_id, buyer_id, sales_associate_id, preferred_date, preferred_time, status, lead_id)
    SELECT v_car_id, NULL, v_assignee, NEW.preferred_date, NEW.preferred_time, 'scheduled', NEW.id
    WHERE NOT EXISTS (SELECT 1 FROM public.test_drives td WHERE td.lead_id = NEW.id);
  EXCEPTION WHEN others THEN NULL; -- optional side-effect must never block booking
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_lead_appointment ON public.sales_notifications;
CREATE TRIGGER sales_crm_lead_appointment
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_create_appointment();

-- ------------------------------------------------------------
-- F. FK-safe audit actor (same as fix_booking_audit_fk.sql).
--    Missing profiles row must never roll back the booking.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_audit_actor_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN RETURN v_uid; END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.automation_audit(
  p_action text, p_entity_type text, p_entity_id text,
  p_old_status text DEFAULT NULL, p_new_status text DEFAULT NULL,
  p_reason text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor uuid; v_role text;
BEGIN
  BEGIN
    v_actor := public.automation_audit_actor_id();
    IF v_actor IS NOT NULL THEN
      SELECT role::text INTO v_role FROM public.profiles WHERE id = v_actor;
    END IF;
    INSERT INTO public.audit_trail
      (actor_user_id, actor_role, action, entity_type, entity_id, old_status, new_status, reason, metadata)
    VALUES
      (v_actor, coalesce(v_role, 'guest'), p_action, p_entity_type, p_entity_id,
       p_old_status, p_new_status, p_reason, coalesce(p_metadata, '{}'::jsonb));
  EXCEPTION WHEN others THEN NULL; -- audit must never block booking
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_audit_actor_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- VERIFY (run in a fresh query after this file):
--   SELECT * FROM pg_policies WHERE tablename = 'sales_notifications';
--   -- expect: "Visitors submit leads" with roles {anon, authenticated}
--   -- Test as anon:
--   --   INSERT INTO public.sales_notifications
--   --     (name, mobile, city, preferred_date, preferred_time, car_id, type, status)
--   --   VALUES ('Test User','9898989898','Surat', CURRENT_DATE+1, 'Mid-day (11:00 AM - 01:00 PM)', NULL, 'test_drive','pending');
-- ------------------------------------------------------------


-- ============================================================
-- SECTION 17/17: supabase/migrations/20260929000000_fix_sales_testdrive_assign_sync.sql
-- ============================================================
-- ============================================================
-- 1stCars — Sales CRM: keep test_drives.sales_associate_id in sync
-- Run in the Supabase SQL Editor (idempotent, safe to re-run).
--
-- WHY: sales_crm_create_appointment() (AFTER INSERT on
-- sales_notifications) copies NEW.assigned_to into
-- test_drives.sales_associate_id. But test-drive bookings are inserted
-- WITHOUT assigned_to (BookingModal assigns in the background / the
-- auto-assign trigger may round-robin later), so the appointment row is
-- permanently orphaned with sales_associate_id = NULL — and the Sales
-- Associate's Test Drives tab (filtered by sales_associate_id) stays
-- empty even though the lead IS assigned to them.
--
-- FIX: (1) an AFTER UPDATE trigger propagates every later assignment
-- onto the linked appointment row; (2) a one-time backfill repairs
-- rows that are already orphaned.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sales_crm_sync_appointment_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    UPDATE public.test_drives
       SET sales_associate_id = NEW.assigned_to
     WHERE lead_id = NEW.id
       AND (sales_associate_id IS NULL OR sales_associate_id IS DISTINCT FROM NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_appointment_assignee_sync ON public.sales_notifications;
CREATE TRIGGER sales_crm_appointment_assignee_sync
  AFTER UPDATE OF assigned_to ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_sync_appointment_assignee();

-- Backfill: repair appointment rows orphaned before this trigger existed.
UPDATE public.test_drives td
   SET sales_associate_id = sn.assigned_to
  FROM public.sales_notifications sn
 WHERE td.lead_id = sn.id
   AND td.sales_associate_id IS NULL
   AND sn.assigned_to IS NOT NULL;

