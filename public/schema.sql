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
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, assigned, completed, rejected
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

-- Help functions to check user roles easily
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
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
CREATE POLICY "Sellers read own inspections" ON public.inspections FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Inspectors view assigned" ON public.inspections;
CREATE POLICY "Inspectors view assigned" ON public.inspections FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() IN ('Admin', 'Sales Associate'));
DROP POLICY IF EXISTS "Staff creates inspections" ON public.inspections;
CREATE POLICY "Staff creates inspections" ON public.inspections FOR INSERT WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Seller'));
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
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  car_title TEXT NOT NULL,
  year INTEGER NOT NULL,
  km_driven INTEGER NOT NULL,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  city TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  current_bid INTEGER NOT NULL,
  highest_bidder_name TEXT,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL
);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
-- Anyone may view auctions (public listings); only dealers may bid on
-- ACTIVE ones; staff and inspectors manage them.
DROP POLICY IF EXISTS "Anyone reads auctions" ON public.auctions;
CREATE POLICY "Anyone reads auctions" ON public.auctions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone manages auctions" ON public.auctions;
DROP POLICY IF EXISTS "Dealers bid on active auctions" ON public.auctions;
DROP POLICY IF EXISTS "Staff and inspectors manage auctions" ON public.auctions;
CREATE POLICY "Dealers bid on active auctions" ON public.auctions FOR UPDATE USING (
  public.get_auth_user_role() = 'Dealer'::public.user_role AND status = 'active'
) WITH CHECK (
  public.get_auth_user_role() = 'Dealer'::public.user_role AND status = 'active'
);
CREATE POLICY "Staff and inspectors manage auctions" ON public.auctions FOR ALL USING (
  public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector')
);


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


-- ====================================================
-- STORAGE BUCKETS CONFIGURATION
-- ====================================================

INSERT INTO storage.buckets (id, name, public)

VALUES ('car-images', 'car-images', true), ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('car-images', 'logos'));
DROP POLICY IF EXISTS "All Power" ON storage.objects;
CREATE POLICY "All Power" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

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

