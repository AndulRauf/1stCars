-- ====================================================
-- 1stCars - Enable RLS on live Supabase database
-- Idempotent: safe to run repeatedly in the SQL Editor.
-- Drops + recreates every policy from public/schema.sql,
-- then restores sensible default grants.
-- ====================================================

-- The auctions table may not exist yet on this database
-- (it was added to schema.sql after the first setup), so
-- create it first or the RLS statements below will fail.
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

-- ---------- Compatibility columns ----------
-- The live database predates some columns the policies and
-- the frontend rely on (e.g. inspector_id on inspections).
-- All statements are idempotent so this file stays re-runnable.
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3,1);
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.dealer_bids ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE;
ALTER TABLE public.dealer_bids ADD COLUMN IF NOT EXISTS dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.park_sell ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sell_requests ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true NOT NULL;

-- ---------- Enable RLS on all public tables ----------
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
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- ---------- Profiles ----------
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users edit own profile" ON public.profiles;
CREATE POLICY "Users edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admin manages all profiles" ON public.profiles;
CREATE POLICY "Admin manages all profiles" ON public.profiles FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Brands ----------
DROP POLICY IF EXISTS "Public read brands" ON public.brands;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages brands" ON public.brands;
CREATE POLICY "Admin manages brands" ON public.brands FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Models ----------
DROP POLICY IF EXISTS "Public read models" ON public.models;
CREATE POLICY "Public read models" ON public.models FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages models" ON public.models;
CREATE POLICY "Admin manages models" ON public.models FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Cities ----------
DROP POLICY IF EXISTS "Public read active cities" ON public.cities;
CREATE POLICY "Public read active cities" ON public.cities FOR SELECT USING (is_active = true OR public.get_auth_user_role() = 'Admin'::public.user_role);
DROP POLICY IF EXISTS "Admin manages cities" ON public.cities;
CREATE POLICY "Admin manages cities" ON public.cities FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Cars ----------
DROP POLICY IF EXISTS "Anyone reads available/reserved cars" ON public.cars;
CREATE POLICY "Anyone reads available/reserved cars" ON public.cars FOR SELECT USING (status IN ('available', 'reserved', 'bidding') OR auth.uid() = created_by OR public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector'));
DROP POLICY IF EXISTS "Staff manages inventory" ON public.cars;
CREATE POLICY "Staff manages inventory" ON public.cars FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ---------- Car Images ----------
DROP POLICY IF EXISTS "Anyone reads images" ON public.car_images;
CREATE POLICY "Anyone reads images" ON public.car_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manages images" ON public.car_images;
CREATE POLICY "Staff manages images" ON public.car_images FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ---------- Sell Requests ----------
DROP POLICY IF EXISTS "Sellers manage own requests" ON public.sell_requests;
CREATE POLICY "Sellers manage own requests" ON public.sell_requests FOR ALL USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Staff reads/updates sell requests" ON public.sell_requests;
CREATE POLICY "Staff reads/updates sell requests" ON public.sell_requests FOR SELECT USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Inspector'));

-- ---------- Inspections ----------
DROP POLICY IF EXISTS "Sellers read own inspections" ON public.inspections;
CREATE POLICY "Sellers read own inspections" ON public.inspections FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Inspectors view assigned" ON public.inspections;
CREATE POLICY "Inspectors view assigned" ON public.inspections FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() IN ('Admin', 'Sales Associate'));
DROP POLICY IF EXISTS "Staff creates inspections" ON public.inspections;
CREATE POLICY "Staff creates inspections" ON public.inspections FOR INSERT WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate', 'Seller'));

-- ---------- Inspection Reports ----------
DROP POLICY IF EXISTS "Sellers read approved reports" ON public.inspection_reports;
CREATE POLICY "Sellers read approved reports" ON public.inspection_reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_id AND (i.seller_id = auth.uid() AND i.status = 'completed')
  )
);
DROP POLICY IF EXISTS "Inspectors manage reports" ON public.inspection_reports;
CREATE POLICY "Inspectors manage reports" ON public.inspection_reports FOR ALL USING (auth.uid() = inspector_id OR public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Dealers ----------
DROP POLICY IF EXISTS "Anyone views verified dealers" ON public.dealers;
CREATE POLICY "Anyone views verified dealers" ON public.dealers FOR SELECT USING (is_verified = true OR auth.uid() = id);
DROP POLICY IF EXISTS "Dealers manage own info" ON public.dealers;
CREATE POLICY "Dealers manage own info" ON public.dealers FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admin manages dealers" ON public.dealers;
CREATE POLICY "Admin manages dealers" ON public.dealers FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Dealer Bids ----------
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

-- ---------- Park & Sell ----------
DROP POLICY IF EXISTS "Sellers view own park-sell status" ON public.park_sell;
CREATE POLICY "Sellers view own park-sell status" ON public.park_sell FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Staff manages park-sell program" ON public.park_sell;
CREATE POLICY "Staff manages park-sell program" ON public.park_sell FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ---------- Test Drives ----------
DROP POLICY IF EXISTS "Buyers manage own test drives" ON public.test_drives;
CREATE POLICY "Buyers manage own test drives" ON public.test_drives FOR ALL USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Staff schedules test drives" ON public.test_drives;
CREATE POLICY "Staff schedules test drives" ON public.test_drives FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ---------- Purchases ----------
DROP POLICY IF EXISTS "Buyers view own purchases" ON public.purchases;
CREATE POLICY "Buyers view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Staff manages transactions" ON public.purchases;
CREATE POLICY "Staff manages transactions" ON public.purchases FOR ALL USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- ---------- Notifications ----------
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Users update own read status" ON public.notifications;
CREATE POLICY "Users update own read status" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS "System/Staff inserts notifications" ON public.notifications;
CREATE POLICY "System/Staff inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ---------- Testimonials ----------
DROP POLICY IF EXISTS "Anyone reads testimonials" ON public.testimonials;
CREATE POLICY "Anyone reads testimonials" ON public.testimonials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users submit testimonials" ON public.testimonials;
CREATE POLICY "Users submit testimonials" ON public.testimonials FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Admin approves testimonials" ON public.testimonials;
CREATE POLICY "Admin approves testimonials" ON public.testimonials FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- FAQ ----------
DROP POLICY IF EXISTS "Anyone reads FAQ" ON public.faq;
CREATE POLICY "Anyone reads FAQ" ON public.faq FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages FAQ" ON public.faq;
CREATE POLICY "Admin manages FAQ" ON public.faq FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Settings ----------
DROP POLICY IF EXISTS "Anyone reads settings" ON public.settings;
CREATE POLICY "Anyone reads settings" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin configures settings" ON public.settings;
CREATE POLICY "Admin configures settings" ON public.settings FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Offers ----------
DROP POLICY IF EXISTS "Anyone reads offers" ON public.offers;
CREATE POLICY "Anyone reads offers" ON public.offers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone manages offers" ON public.offers;
CREATE POLICY "Anyone manages offers" ON public.offers FOR ALL USING (true);

-- ---------- Auctions ----------
DROP POLICY IF EXISTS "Anyone reads auctions" ON public.auctions;
CREATE POLICY "Anyone reads auctions" ON public.auctions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone manages auctions" ON public.auctions;
CREATE POLICY "Anyone manages auctions" ON public.auctions FOR ALL USING (true);

-- ---------- Sales Notifications ----------
DROP POLICY IF EXISTS "Anyone reads sales_notifications" ON public.sales_notifications;
CREATE POLICY "Anyone reads sales_notifications" ON public.sales_notifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone manages sales_notifications" ON public.sales_notifications;
CREATE POLICY "Anyone manages sales_notifications" ON public.sales_notifications FOR ALL USING (true);

-- ---------- Pages ----------
DROP POLICY IF EXISTS "Anyone reads pages" ON public.pages;
CREATE POLICY "Anyone reads pages" ON public.pages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages pages" ON public.pages;
CREATE POLICY "Admin manages pages" ON public.pages FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

-- ---------- Grants (idempotent, matches live defaults) ----------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ====================================================
-- NOTE: public.read-only data (cars/brands/models/cities/
-- pages/settings/faq/testimonials/offers/auctions) stays
-- readable by visitors by design. Anything holding personal
-- data (profiles, inspections, sales_notifications,
-- test_drives, purchases, dealer_bids, park_sell) is now
-- locked to the owner or staff roles only.
-- ====================================================

-- ====================================================
-- SELF-CHECK (runs after the patch; paste this result
-- back when reporting issues):
--   policies      = total RLS policies (expect 50)
--   rls_tables    = tables with RLS enabled (expect 22)
--   anon_insert   = tables anon may INSERT into (expect 0)
-- ====================================================
SELECT 'policies' AS check_name, count(*)::int AS n
  FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'rls_tables', count(*)::int
  FROM pg_tables WHERE schemaname = 'public' AND rowsecurity
UNION ALL
SELECT 'anon_insert', count(*)::int
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon' AND privilege_type = 'INSERT';
