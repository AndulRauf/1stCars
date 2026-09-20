-- ============================================================================
-- 1stCars — CRM Center sample data seed
-- ----------------------------------------------------------------------------
-- Populates the "Customer Relationship Center" seen in the admin panel (and the
-- Leads & Enquiries / Customers tables it reads) with realistic SAMPLE data so
-- the funnel, pipeline, customers snapshot and activity timeline are demoable.
--
-- WHY THIS EXISTS
--   The CRM center is a read-only aggregate over the existing business tables:
--   sales_notifications, sell_requests, park_sell, inspections,
--   inspection_reports, offers, dealer_bids, profiles, notifications,
--   crm_activities, test_drives. On a fresh install those tables are empty, so
--   the center correctly renders 0s everywhere. Run this file once to load a
--   believable funnel (leads -> inspection -> valuation/bidding -> deals).
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> paste this file -> Run.
--   (psql "$YOUR_SUPABASE_DB_URL" -f public/seed_crm_demo.sql works too.)
--
-- SAFETY / IDEMPOTENCY
--   * Re-runnable: it first DELETES only its own rows (users whose email ends
--     in @crm.1stcars.test + their cascade-linked data, plus leads flagged
--     notes '[CRM demo]'). Real rows are never touched.
--   * No auction rows are created here — the auction engine owns those tables
--     (see public/seed_auction_flow.sql for that demo).
--   * No test_drive-type leads are created: buyer enquiries feed a trigger
--     that creates test_drives rows keyed to the real cars table, so sample
--     leads here use buy_now / general so they stay decoupled from inventory.
--   * Sample user password for all created users is: Test@12345
--     (matches public/seed_auction_flow.sql).
--
-- WHAT YOU GET
--   11 sample users (3 buyers, 2 sellers, 2 dealers, 2 inspectors,
--   2 sales associates) + 5 buyer leads + 2 sell requests + 1 park & sell +
--   3 inspections (pending / assigned / offered-with-report) + 1 report +
--   2 offers + 3 dealer bids + 3 notifications + 4 crm_activity entries.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. Idempotent columns the CRM path reads (safe to ADD IF NOT EXISTS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 1. Reset this seed's own data (cascades from auth.users -> profiles ->
--    dealers/inspections/offers/bids/park_sell/sell_requests/notifications…)
-- ----------------------------------------------------------------------------
DELETE FROM public.sales_notifications WHERE notes LIKE '[CRM demo]%';
DELETE FROM auth.users WHERE email LIKE '%@crm.1stcars.test';

-- ----------------------------------------------------------------------------
-- 2. Sample users (auth.users + profiles) — password for all: Test@12345
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
('00000000-0000-0000-0000-000000000000', 'aaaa0001-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'sales.sneha@crm.1stcars.test', crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Sales Associate"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'aaaa0002-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'sales.rajesh@crm.1stcars.test', crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Sales Associate"}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'bbbb0001-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'insp.vikram@crm.1stcars.test',    crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Inspector"}',         now(), now()),
('00000000-0000-0000-0000-000000000000', 'bbbb0002-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'insp.irfan@crm.1stcars.test',     crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Inspector"}',         now(), now()),
('00000000-0000-0000-0000-000000000000', 'cccc0001-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'dealer.devang@crm.1stcars.test',  crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Dealer"}',            now(), now()),
('00000000-0000-0000-0000-000000000000', 'cccc0002-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'dealer.nirav@crm.1stcars.test',   crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Dealer"}',            now(), now()),
('00000000-0000-0000-0000-000000000000', 'dddd0001-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'seller.amit@crm.1stcars.test',    crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Seller"}',            now(), now()),
('00000000-0000-0000-0000-000000000000', 'dddd0002-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'seller.ritu@crm.1stcars.test',     crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Seller"}',            now(), now()),
('00000000-0000-0000-0000-000000000000', 'eeee0001-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'buyer.rahul@crm.1stcars.test',     crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Buyer"}',             now(), now()),
('00000000-0000-0000-0000-000000000000', 'eeee0002-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'buyer.priya@crm.1stcars.test',     crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Buyer"}',             now(), now()),
('00000000-0000-0000-0000-000000000000', 'eeee0003-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'buyer.karan@crm.1stcars.test',     crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{"role":"Buyer"}',             now(), now());

INSERT INTO public.profiles (id, name, email, mobile, role, city, is_verified, is_approved, created_at)
VALUES
('aaaa0001-0000-4000-8000-000000000001', 'Sneha Patel',     'sales.sneha@crm.1stcars.test',   '9811110001', 'Sales Associate', 'Surat',     true, true, now() - interval '45 days'),
('aaaa0002-0000-4000-8000-000000000002', 'Rajesh Kumar',    'sales.rajesh@crm.1stcars.test',  '9811110002', 'Sales Associate', 'Vadodara',  true, true, now() - interval '40 days'),
('bbbb0001-0000-4000-8000-000000000003', 'Vikram Rathore',  'insp.vikram@crm.1stcars.test',   '9811110003', 'Inspector',       'Surat',     true, true, now() - interval '38 days'),
('bbbb0002-0000-4000-8000-000000000004', 'Irfan Shaikh',    'insp.irfan@crm.1stcars.test',    '9811110004', 'Inspector',       'Vadodara',  true, true, now() - interval '38 days'),
('cccc0001-0000-4000-8000-000000000005', 'Devang Desai',    'dealer.devang@crm.1stcars.test', '9811110005', 'Dealer',          'Surat',     true, true, now() - interval '30 days'),
('cccc0002-0000-4000-8000-000000000006', 'Nirav Shah',      'dealer.nirav@crm.1stcars.test',  '9811110006', 'Dealer',          'Vadodara',  true, true, now() - interval '30 days'),
('dddd0001-0000-4000-8000-000000000007', 'Amit Verma',      'seller.amit@crm.1stcars.test',   '9811110007', 'Seller',          'Surat',     true, true, now() - interval '21 days'),
('dddd0002-0000-4000-8000-000000000008', 'Ritu Singh',      'seller.ritu@crm.1stcars.test',   '9811110008', 'Seller',          'Surat',     true, true, now() - interval '14 days'),
('eeee0001-0000-4000-8000-000000000009', 'Rahul Sharma',    'buyer.rahul@crm.1stcars.test',   '9811110009', 'Buyer',           'Mumbai',    false, true, now() - interval '12 days'),
('eeee0002-0000-4000-8000-00000000000a', 'Priya Menon',     'buyer.priya@crm.1stcars.test',   '9811110010', 'Buyer',           'Delhi NCR', false, true, now() - interval '9 days'),
('eeee0003-0000-4000-8000-00000000000b', 'Karan Mehta',     'buyer.karan@crm.1stcars.test',   '9811110011', 'Buyer',           'Surat',     false, true, now() - interval '5 days');

-- Dealer company profiles (Dealers & Approvals module).
INSERT INTO public.dealers (id, company_name, license_number, is_verified, created_at) VALUES
('cccc0001-0000-4000-8000-000000000005', 'Elite Motors Surat',   'DL-2026-1101', true, now() - interval '30 days'),
('cccc0002-0000-4000-8000-000000000006', 'Apex Prestige Vadodara', 'DL-2026-1102', true, now() - interval '30 days');

-- ----------------------------------------------------------------------------
-- 3. Selling funnel: sell requests -> inspections -> offers / bids
-- ----------------------------------------------------------------------------
INSERT INTO public.sell_requests (id, seller_id, brand, model, year, km_driven, city, expected_price, status, created_at) VALUES
('5e110001-0000-4000-8000-000000000016', 'dddd0001-0000-4000-8000-000000000007', 'Maruti Suzuki', 'Swift VXi', 2019, 42000, 'Surat', 560000, 'approved', now() - interval '6 days'),
('5e110002-0000-4000-8000-000000000017', 'dddd0002-0000-4000-8000-000000000008', 'Tata',          'Nexon XZA', 2021, 51000, 'Surat', 760000, 'pending',  now() - interval '2 days');

INSERT INTO public.park_sell (id, car_id, seller_id, location_hub, pricing_expected, status, created_at) VALUES
('park0001-0000-4000-8000-000000000030', NULL, 'dddd0001-0000-4000-8000-000000000007', 'Surat Park & Sell Hub', 2450000, 'pending', now() - interval '4 days');

INSERT INTO public.inspections (
  id, sell_request_id, seller_id, seller_name, seller_mobile, seller_email,
  inspector_id, reg_number, brand, model, variant, fuel, transmission,
  year, km_driven, city, address, preferred_date, preferred_time,
  status, overall_score, is_certified, created_at
) VALUES
('1n5p0001-0000-4000-8000-000000000021', '5e110001-0000-4000-8000-000000000016', 'dddd0001-0000-4000-8000-000000000007', 'Amit Verma', '9811110007', 'seller.amit@crm.1stcars.test',
 NULL, 'GJ05-AB-1234', 'Honda', 'City', 'VX i-VTEC', 'Petrol', 'Manual', 2021, 38000, 'Surat', 'B-402, Vesu, Surat', CURRENT_DATE, '10:00 AM - 12:00 PM',
 'pending', NULL, false, now() - interval '2 days'),
('1n5p0002-0000-4000-8000-000000000022', '5e110002-0000-4000-8000-000000000017', 'dddd0002-0000-4000-8000-000000000008', 'Ritu Singh', '9811110008', 'seller.ritu@crm.1stcars.test',
 'bbbb0001-0000-4000-8000-000000000003', 'GJ05-CD-5678', 'Hyundai', 'Creta', 'SX 1.5 Petrol', 'Petrol', 'Automatic', 2022, 24000, 'Surat', 'C-12, Adajan, Surat', CURRENT_DATE + 1, '02:00 PM - 04:00 PM',
 'assigned', NULL, false, now() - interval '1 day'),
('1n5p0003-0000-4000-8000-000000000023', NULL, 'dddd0001-0000-4000-8000-000000000007', 'Amit Verma', '9811110007', 'seller.amit@crm.1stcars.test',
 'bbbb0002-0000-4000-8000-000000000004', 'GJ06-EF-9012', 'BMW', '3 Series', '320d Luxury Line', 'Diesel', 'Automatic', 2020, 29000, 'Vadodara', 'Sunrise Towers, Alkapuri, Vadodara', CURRENT_DATE - 2, '11:00 AM - 01:00 PM',
 'offered', 9.2, true, now() - interval '4 days');

INSERT INTO public.inspection_reports (
  id, inspection_id, inspector_id, overall_score,
  report_engine, report_brakes, report_electronics, report_exterior, report_interior, report_suspension,
  notes, created_at
) VALUES
('r3p00001-0000-4000-8000-000000000024', '1n5p0003-0000-4000-8000-000000000023', 'bbbb0002-0000-4000-8000-000000000004', 9.2,
 'Engine and OBD clean — no fault codes, smooth idle, slight turbo lag at low revs.',
 'Front discs 70% life, pads healthy, ABS + stability systems functioning.',
 'All electronics, infotainment, sensors and warning lamps verified — no errors.',
 'Minor stone chips on bonnet and door edges, original paint confirmed with gauge.',
 'Interior mint — OEM mats, no tears or odours, all seat adjustments working.',
 'Shock absorbers and bushes within spec, no play in steering rack.',
 'Certified under the 120-Point inspection. Report id r3p00001.', now() - interval '3 days');

INSERT INTO public.offers (id, created_at, inspection_id, dealer_id, dealer_name, offer_amount, status) VALUES
('0ff00001-0000-4000-8000-000000000025', now() - interval '3 days', '1n5p0003-0000-4000-8000-000000000023', 'cccc0001-0000-4000-8000-000000000005', 'Devang Desai', 2450000, 'pending'),
('0ff00002-0000-4000-8000-000000000026', now() - interval '2 days', '1n5p0003-0000-4000-8000-000000000023', 'cccc0002-0000-4000-8000-000000000006', 'Nirav Shah',   2500000, 'pending');

INSERT INTO public.dealer_bids (id, inspection_id, dealer_id, bid_amount, status, created_at) VALUES
('b1d00001-0000-4000-8000-000000000027', '1n5p0003-0000-4000-8000-000000000023', 'cccc0001-0000-4000-8000-000000000005', 2440000, 'pending', now() - interval '3 days'),
('b1d00002-0000-4000-8000-000000000028', '1n5p0003-0000-4000-8000-000000000023', 'cccc0002-0000-4000-8000-000000000006', 2490000, 'pending', now() - interval '2 days'),
('b1d00003-0000-4000-8000-000000000029', '1n5p0003-0000-4000-8000-000000000023', 'cccc0001-0000-4000-8000-000000000005', 2510000, 'pending', now() - interval '1 day');

-- ----------------------------------------------------------------------------
-- 4. Buyer leads (sales_notifications).
--    NOTE: type is restricted to buy_now / general — 'test_drive' leads create
--    linked test_drives rows against the real cars table via trigger, which is
--    intentionally left out of this inventory-agnostic sample.
-- ----------------------------------------------------------------------------
INSERT INTO public.sales_notifications (
  id, created_at, name, mobile, city, preferred_date, preferred_time,
  car_id, car_brand, car_model, type, status, notes, assigned_to
) VALUES
('a1eadd01-0000-4000-8000-000000000011', now() - interval '7 days',  'Rahul Sharma',   '9811110009', 'Mumbai',     CURRENT_DATE + 3, '11:00 AM - 01:00 PM', 'car-demo-1', 'BMW', 'M4 Competition',   'buy_now', 'pending',   '[CRM demo] sample lead', NULL),
('a1eadd02-0000-4000-8000-000000000012', now() - interval '5 days',  'Priya Menon',    '9811110010', 'Delhi NCR',  CURRENT_DATE + 2, '03:00 PM - 05:00 PM', 'car-demo-2', 'Porsche', 'Macan',        'general', 'contacted', '[CRM demo] sample lead', 'aaaa0001-0000-4000-8000-000000000001'),
('a1eadd03-0000-4000-8000-000000000013', now() - interval '3 days',  'Karan Mehta',    '9811110011', 'Surat',      CURRENT_DATE + 1, '10:00 AM - 12:00 PM', 'car-demo-3', 'Mercedes-Benz', 'GLC 300', 'buy_now', 'pending',   '[CRM demo] sample lead', NULL),
('a1eadd04-0000-4000-8000-000000000014', now() - interval '2 days',  'Rahul Sharma',   '9811110009', 'Mumbai',     CURRENT_DATE + 2, '12:00 PM - 02:00 PM', 'car-demo-1', 'BMW', 'M4 Competition',   'buy_now', 'resolved',  '[CRM demo] sample lead', 'aaaa0002-0000-4000-8000-000000000002'),
('a1eadd05-0000-4000-8000-000000000015', now() - interval '1 day',   'Priya Menon',    '9811110010', 'Delhi NCR',  CURRENT_DATE,     '05:00 PM - 07:00 PM', 'car-demo-4', 'Audi', 'Q5',            'general', 'pending',   '[CRM demo] sample lead', NULL);

-- ----------------------------------------------------------------------------
-- 5. Activity timeline + notification ledger
-- ----------------------------------------------------------------------------
INSERT INTO public.notifications (id, recipient_id, sender_id, title, message, type, is_read, created_at) VALUES
('n0t00001-0000-4000-8000-000000000031', 'eeee0001-0000-4000-8000-000000000009', NULL, 'Welcome to 1stCars', 'Your buyer account is ready — browse certified cars and book test drives.', 'info', true, now() - interval '12 days'),
('n0t00002-0000-4000-8000-000000000032', 'dddd0001-0000-4000-8000-000000000007', 'bbbb0001-0000-4000-8000-000000000003', 'Inspection scheduled', 'Vikram Rathore will inspect your Honda City on the requested slot.', 'success', false, now() - interval '2 days'),
('n0t00003-0000-4000-8000-000000000033', 'dddd0001-0000-4000-8000-000000000007', NULL, 'New dealer offers', 'Two dealers have placed offers on your BMW 3 Series — review them now.', 'alert', false, now() - interval '2 days');

INSERT INTO public.crm_activities (id, customer_id, staff_id, activity_type, subject, detail, created_at) VALUES
('crm00001-0000-4000-8000-000000000041', 'eeee0001-0000-4000-8000-000000000009', 'aaaa0001-0000-4000-8000-000000000001', 'call',      'First follow-up call',     'Discussed BMW M4 interest, financing preference and test drive availability.', now() - interval '6 days'),
('crm00002-0000-4000-8000-000000000042', 'dddd0001-0000-4000-8000-000000000007', 'bbbb0001-0000-4000-8000-000000000003', 'meeting',   'Doorstep inspection done',  '120-point inspection completed, report handed over. Score 9.2/10.', now() - interval '3 days'),
('crm00003-0000-4000-8000-000000000043', 'eeee0002-0000-4000-8000-00000000000a', 'aaaa0002-0000-4000-8000-000000000002', 'follow_up', 'WhatsApp follow-up',        'Shared certified Porsche Macan photos and valuation details.', now() - interval '2 days'),
('crm00004-0000-4000-8000-000000000044', 'eeee0003-0000-4000-8000-00000000000b', 'aaaa0001-0000-4000-8000-000000000001', 'note',      'Slot booked',               'Karan has a test drive booked for tomorrow morning at the Surat hub.', now() - interval '1 day');

-- ----------------------------------------------------------------------------
-- 6. Verification summary
-- ----------------------------------------------------------------------------
SELECT 'profiles' AS table_name, count(*) FROM public.profiles WHERE email LIKE '%@crm.1stcars.test'
UNION ALL SELECT 'sales_notifications (demo)', count(*) FROM public.sales_notifications WHERE notes LIKE '[CRM demo]%'
UNION ALL SELECT 'sell_requests',              count(*) FROM public.sell_requests  WHERE seller_id IN ('dddd0001-0000-4000-8000-000000000007','dddd0002-0000-4000-8000-000000000008')
UNION ALL SELECT 'inspections',                count(*) FROM public.inspections   WHERE id IN ('1n5p0001-0000-4000-8000-000000000021','1n5p0002-0000-4000-8000-000000000022','1n5p0003-0000-4000-8000-000000000023')
UNION ALL SELECT 'inspection_reports',         count(*) FROM public.inspection_reports WHERE id = 'r3p00001-0000-4000-8000-000000000024'
UNION ALL SELECT 'offers',                     count(*) FROM public.offers        WHERE id IN ('0ff00001-0000-4000-8000-000000000025','0ff00002-0000-4000-8000-000000000026')
UNION ALL SELECT 'dealer_bids',                count(*) FROM public.dealer_bids   WHERE id IN ('b1d00001-0000-4000-8000-000000000027','b1d00002-0000-4000-8000-000000000028','b1d00003-0000-4000-8000-000000000029')
UNION ALL SELECT 'park_sell',                  count(*) FROM public.park_sell     WHERE id = 'park0001-0000-4000-8000-000000000030'
UNION ALL SELECT 'notifications (demo)',       count(*) FROM public.notifications WHERE id IN ('n0t00001-0000-4000-8000-000000000031','n0t00002-0000-4000-8000-000000000032','n0t00003-0000-4000-8000-000000000033')
UNION ALL SELECT 'crm_activities (demo)',      count(*) FROM public.crm_activities WHERE id IN ('crm00001-0000-4000-8000-000000000041','crm00002-0000-4000-8000-000000000042','crm00003-0000-4000-8000-000000000043','crm00004-0000-4000-8000-000000000044')
ORDER BY table_name;