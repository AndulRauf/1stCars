-- ----------------------------------------------------
-- 1stCars Supabase DDL Schema Migration
-- Production-Ready Schema, Triggers, & Row-Level Security
-- ----------------------------------------------------

-- 1. Custom User Roles Enum Types
CREATE TYPE public.user_role AS ENUM ('Buyer', 'Seller', 'Dealer', 'Inspector', 'Sales Associate', 'Admin');

-- 2. PROFILES TABLE (Linked with auth.users)
CREATE TABLE public.profiles (
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
CREATE TABLE public.brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_popular BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. MODELS TABLE
CREATE TABLE public.models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  body_type TEXT, -- Sedan, SUV, Coupe, Convertible, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, name)
);

-- 5. CITIES TABLE
CREATE TABLE public.cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CARS TABLE (Premium Inventory List)
CREATE TABLE public.cars (
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
CREATE TABLE public.car_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SELL REQUESTS TABLE (Spinny-inspired intake)
CREATE TABLE public.sell_requests (
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
CREATE TABLE public.inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sell_request_id UUID REFERENCES public.sell_requests(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE public.inspection_reports (
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
CREATE TABLE public.dealers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  license_number TEXT,
  address TEXT,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. DEALER BIDS TABLE
CREATE TABLE public.dealer_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE NOT NULL,
  dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bid_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, accepted, rejected, outbid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. PARK & SELL TABLE (Consignment program)
CREATE TABLE public.park_sell (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  location_hub TEXT NOT NULL,
  pricing_expected INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, active, sold, returned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. TEST DRIVES TABLE
CREATE TABLE public.test_drives (
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
CREATE TABLE public.purchases (
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
CREATE TABLE public.notifications (
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
CREATE TABLE public.testimonials (
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
CREATE TABLE public.faq (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  category TEXT, -- general, buying, selling, financing
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. SETTINGS TABLE
CREATE TABLE public.settings (
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
BEGIN
  INSERT INTO public.profiles (id, name, email, mobile, role, city)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'mobile',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'Buyer'::public.user_role),
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
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin manages all profiles" ON public.profiles FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 2. Brands Policies
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admin manages brands" ON public.brands FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 3. Models Policies
CREATE POLICY "Public read models" ON public.models FOR SELECT USING (true);
CREATE POLICY "Admin manages models" ON public.models FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 4. Cities Policies
CREATE POLICY "Public read active cities" ON public.cities FOR SELECT USING (is_active = true OR public.get_auth_user_role() = 'Admin'::public.user_role);
CREATE POLICY "Admin manages cities" ON public.cities FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 5. Cars Policies (Inventory)
CREATE POLICY "Anyone reads available/reserved cars" ON public.cars FOR SELECT USING (status IN ('available', 'reserved', 'bidding') OR auth.uid() = created_by OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector'));
CREATE POLICY "Staff manages inventory" ON public.cars FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 6. Car Images Policies
CREATE POLICY "Anyone reads images" ON public.car_images FOR SELECT USING (true);
CREATE POLICY "Staff manages images" ON public.car_images FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 7. Sell Requests Policies
CREATE POLICY "Sellers manage own requests" ON public.sell_requests FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Staff reads/updates sell requests" ON public.sell_requests FOR SELECT USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector'));

-- 8. Inspections Policies
CREATE POLICY "Sellers read own inspections" ON public.inspections FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Inspectors view assigned" ON public.inspections FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() IN ('Admin', 'Sales Associate'));
CREATE POLICY "Staff creates inspections" ON public.inspections FOR INSERT WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Seller'));

-- 9. Inspection Reports Policies
CREATE POLICY "Sellers read approved reports" ON public.inspection_reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i 
    WHERE i.id = inspection_id AND (i.seller_id = auth.uid() AND i.status = 'completed')
  )
);
CREATE POLICY "Inspectors manage reports" ON public.inspection_reports FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() = 'Admin'::public.user_role);

-- 10. Dealers Policies
CREATE POLICY "Anyone views verified dealers" ON public.dealers FOR SELECT USING (is_verified = true OR auth.uid() = id);
CREATE POLICY "Dealers manage own info" ON public.dealers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Admin manages dealers" ON public.dealers FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 11. Dealer Bids Policies
CREATE POLICY "Sellers view bids on own car" ON public.dealer_bids FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i 
    WHERE i.id = inspection_id AND i.seller_id = auth.uid()
  )
);
CREATE POLICY "Dealers bid on assigned cars" ON public.dealer_bids FOR ALL USING (auth.uid() = dealer_id);
CREATE POLICY "Staff manages bids" ON public.dealer_bids FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 12. Park & Sell Policies
CREATE POLICY "Sellers view own park-sell status" ON public.park_sell FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Staff manages park-sell program" ON public.park_sell FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 13. Test Drives Policies
CREATE POLICY "Buyers manage own test drives" ON public.test_drives FOR ALL USING (auth.uid() = buyer_id);
CREATE POLICY "Staff schedules test drives" ON public.test_drives FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 14. Purchases Policies
CREATE POLICY "Buyers view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Staff manages transactions" ON public.purchases FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- 15. Notifications Policies (Central central)
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users update own read status" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "System/Staff inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 16. Testimonials Policies
CREATE POLICY "Anyone reads testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Users submit testimonials" ON public.testimonials FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admin approves testimonials" ON public.testimonials FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 17. FAQ Policies
CREATE POLICY "Anyone reads FAQ" ON public.faq FOR SELECT USING (true);
CREATE POLICY "Admin manages FAQ" ON public.faq FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- 18. Settings Policies
CREATE POLICY "Anyone reads settings" ON public.settings FOR SELECT USING (true);
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
CREATE POLICY "Anyone reads offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Anyone manages offers" ON public.offers FOR ALL USING (true);


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
CREATE POLICY "Anyone reads auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Anyone manages auctions" ON public.auctions FOR ALL USING (true);


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
CREATE POLICY "Anyone reads sales_notifications" ON public.sales_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone manages sales_notifications" ON public.sales_notifications FOR ALL USING (true);


-- ====================================================
-- STORAGE BUCKETS CONFIGURATION
-- ====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true), ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('car-images', 'logos'));
CREATE POLICY "All Power" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

