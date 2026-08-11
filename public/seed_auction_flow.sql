-- ============================================================
-- 1stCars Auction Engine - End-to-End Flow Test / Seed
--
-- Run AFTER auction_engine.sql (and the automation + schema
-- migrations) in the Supabase SQL editor. Re-runnable: it
-- deletes its own test users first.
--
-- What it exercises (through the REAL RPCs):
--   Auction #1  Happy path: create -> publish -> start ->
--               mark viewed -> bid -> anti-sniping extension ->
--               counterbid -> close (SELLER_REVIEW) ->
--               seller ACCEPT -> payment record
--   Auction #2  Maintenance path: schedule in the past ->
--               auction_run_maintenance() auto-starts then
--               auto-closes with no bids -> EXPIRED
--   Negative    Bid after close must raise; retried bid with the
--               same client_request_id must return duplicate.
--
-- Test users created (password for all: Test@12345):
--   admin@1stcars.test / seller@1stcars.test /
--   dealer1@1stcars.test / dealer2@1stcars.test
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Guard: place_auction_bid reads profiles.is_verified; make sure it exists.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false NOT NULL;

-- ---------- 0. Reset test users (cascades to profiles/dealers) ----------
DELETE FROM auth.users WHERE email IN (
  'admin@1stcars.test', 'seller@1stcars.test',
  'dealer1@1stcars.test', 'dealer2@1stcars.test'
);

-- ---------- 1. Test users (auth.users + profiles + dealers) ----------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@1stcars.test',   crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'seller@1stcars.test',  crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'dealer1@1stcars.test', crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now()),
('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'dealer2@1stcars.test', crypt('Test@12345', gen_salt('bf')), now(), '', '', '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.profiles (id, name, email, role, is_verified) VALUES
('11111111-1111-1111-1111-111111111111', 'Test Admin',   'admin@1stcars.test',   'Admin',           true),
('22222222-2222-2222-2222-222222222222', 'Test Seller',  'seller@1stcars.test',  'Seller',          true),
('33333333-3333-3333-3333-333333333333', 'Dealer One',   'dealer1@1stcars.test', 'Dealer',          true),
('44444444-4444-4444-4444-444444444444', 'Dealer Two',   'dealer2@1stcars.test', 'Dealer',          true)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_verified = true, email = EXCLUDED.email, name = EXCLUDED.name;

INSERT INTO public.dealers (id, company_name, license_number, is_verified) VALUES
('33333333-3333-3333-3333-333333333333', 'Dealer One Motors',  'DL-2024-0001', true),
('44444444-4444-4444-4444-444444444444', 'Dealer Two Imports', 'DL-2024-0002', true)
ON CONFLICT (id) DO UPDATE SET is_verified = true;

-- ---------- 2. Fixture vehicles (car + certified inspection each) ----------
INSERT INTO public.cars (id, title, brand, model, variant, year, price, km_driven, fuel, transmission, city, reg_number, status, created_by)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BMW M4 Competition', 'BMW', 'M4 Competition', 'M xDrive', 2023, 14500000, 2100, 'Petrol', 'Automatic', 'Surat', 'GJ05-BMW-0001', 'available', '11111111-1111-1111-1111-111111111111'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Audi RS e-tron GT',  'Audi', 'RS e-tron GT',  'Quattro',  2022, 16500000, 6100, 'Electric', 'Automatic', 'Surat', 'GJ05-AUD-0002', 'available', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspections (
  id, sell_request_id, seller_id, seller_name, seller_mobile, seller_email,
  inspector_id, reg_number, brand, model, variant, fuel, transmission,
  year, km_driven, city, address, preferred_date, preferred_time,
  status, overall_score, is_certified
) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '22222222-2222-2222-2222-222222222222', 'Test Seller', '9876543210', 'seller@1stcars.test',
 '11111111-1111-1111-1111-111111111111', 'GJ05-BMW-0001', 'BMW', 'M4 Competition', 'M xDrive', 'Petrol', 'Automatic',
 2023, 2100, 'Surat', 'Test address 1', CURRENT_DATE, '10:00', 'completed', 9.9, true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', NULL, '22222222-2222-2222-2222-222222222222', 'Test Seller', '9876543210', 'seller@1stcars.test',
 '11111111-1111-1111-1111-111111111111', 'GJ05-AUD-0002', 'Audi', 'RS e-tron GT', 'Quattro', 'Electric', 'Automatic',
 2022, 6100, 'Surat', 'Test address 2', CURRENT_DATE, '11:00', 'completed', 9.7, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- 3. Context table to pass auction ids between steps ----------
CREATE TEMP TABLE IF NOT EXISTS seed_ctx (key text PRIMARY KEY, val uuid);
TRUNCATE seed_ctx;

-- ============================================================
-- AUCTION #1 : FULL HAPPY PATH
-- ============================================================

-- 3.1 Admin: create (near-ending window to trigger anti-sniping) -> publish -> set eligible -> start
DO $$
DECLARE
  v_auction public.auctions;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  v_auction := public.auction_create_auction(
    p_car_id                => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    p_inspection_id         => 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    p_starting_bid          => 1000000,
    p_reserve_price         => 1500000,
    p_minimum_increment     => 50000,
    p_starts_at             => timezone('utc'::text, now()) - interval '1 hour',
    p_ends_at               => timezone('utc'::text, now()) + interval '30 seconds',
    p_extension_seconds     => 120,
    p_max_extension_count   => 5,
    p_eligible_dealer_ids   => ARRAY['33333333-3333-3333-3333-333333333333',
                                     '44444444-4444-4444-4444-444444444444']
  );
  RAISE NOTICE '3.1 create -> status=%, id=%', v_auction.status, v_auction.id;
  INSERT INTO seed_ctx VALUES ('auction1', v_auction.id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  v_auction := public.auction_publish_auction(v_auction.id);
  RAISE NOTICE '3.1 publish -> status=%', v_auction.status;

  v_auction := public.auction_start_auction(v_auction.id);
  RAISE NOTICE '3.1 start  -> status=% (car should be "bidding")', v_auction.status;
END $$;

-- 3.2 Dealer1: mark viewed + first bid + idempotent retry (must return duplicate)
DO $$
DECLARE
  v_aid uuid;
  v_res jsonb;
  v_ends timestamptz;
  v_status text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  SELECT val INTO v_aid FROM seed_ctx WHERE key = 'auction1';

  PERFORM public.auction_mark_viewed(v_aid);
  RAISE NOTICE '3.2 marked viewed';

  v_res := public.place_auction_bid(v_aid, 1000000, 'seed-bid-1');
  RAISE NOTICE '3.2 dealer1 bid -> %', v_res;

  v_res := public.place_auction_bid(v_aid, 1000000, 'seed-bid-1');
  RAISE NOTICE '3.2 dealer1 retry (idempotent) -> %', v_res;

  SELECT status, ends_at INTO v_status, v_ends FROM public.auctions WHERE id = v_aid;
  RAISE NOTICE '3.2 after bid: status=%, ends_at in % seconds (extension should be visible)',
    v_status, round(extract(epoch FROM (v_ends - timezone('utc'::text, now())))::numeric);
END $$;

-- 3.3 Dealer2: counterbid -> Dealer1's bid must flip to OUTBID
DO $$
DECLARE
  v_aid uuid;
  v_res jsonb;
  v_status text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
  SELECT val INTO v_aid FROM seed_ctx WHERE key = 'auction1';

  v_res := public.place_auction_bid(v_aid, 1100000, 'seed-bid-2');
  RAISE NOTICE '3.3 dealer2 bid -> %', v_res;

  SELECT status INTO v_status FROM public.auction_bids WHERE client_request_id = 'seed-bid-1';
  RAISE NOTICE '3.3 dealer1 bid status (expect OUTBID): %', v_status;
END $$;

-- 3.4 Admin: close the finished auction -> SELLER_REVIEW
DO $$
DECLARE
  v_aid uuid;
  v_ret text;
  v_status text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  SELECT val INTO v_aid FROM seed_ctx WHERE key = 'auction1';

  v_ret := public.auction_close_if_ended(v_aid);
  SELECT status INTO v_status FROM public.auctions WHERE id = v_aid;
  RAISE NOTICE '3.4 close -> result=%, status=%', v_ret, v_status;
END $$;

-- 3.5 Seller: view masked history then ACCEPT the result
DO $$
DECLARE
  v_aid uuid;
  v_history jsonb;
  v_auction public.auctions;
  v_payment public.auction_payments;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  SELECT val INTO v_aid FROM seed_ctx WHERE key = 'auction1';

  v_history := public.auction_public_bid_history(v_aid);
  RAISE NOTICE '3.5 seller bid history (no identities) -> %', v_history;

  v_auction := public.seller_auction_decision(v_aid, 'ACCEPT', 'seed test');
  RAISE NOTICE '3.5 seller accepted -> returned status=%', v_auction.status;

  SELECT * INTO v_payment FROM public.auction_payments WHERE auction_id = v_aid;
  RAISE NOTICE '3.5 payment row -> status=%, amount=%, winner=%',
    v_payment.status, v_payment.amount, v_payment.winner_dealer_id;

  RAISE NOTICE '3.5 car status (expect sold): %',
    (SELECT status FROM public.cars WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
END $$;

-- 3.6 Negative tests: bid after close must raise; dealer-only role checks
DO $$
DECLARE
  v_aid uuid;
  v_res jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  SELECT val INTO v_aid FROM seed_ctx WHERE key = 'auction1';

  BEGIN
    v_res := public.place_auction_bid(v_aid, 1200000, 'seed-bid-after-close');
    RAISE NOTICE '3.6 UNEXPECTED success: %', v_res;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '3.6 bid-after-close correctly raised: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- AUCTION #2 : SCHEDULED IN THE PAST -> MAINTENANCE EXPIRY
-- ============================================================

DO $$
DECLARE
  v_auction public.auctions;
  v_ret jsonb;
  v_status text;
  v_car text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

  v_auction := public.auction_create_auction(
    p_car_id                => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    p_inspection_id         => 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    p_starting_bid          => 500000,
    p_reserve_price         => 700000,
    p_minimum_increment     => 25000,
    p_starts_at             => timezone('utc'::text, now()) - interval '2 hours',
    p_ends_at               => timezone('utc'::text, now()) - interval '1 minute',
    p_eligible_dealer_ids   => ARRAY['33333333-3333-3333-3333-333333333333']
  );
  v_auction := public.auction_publish_auction(v_auction.id);
  v_auction := public.auction_schedule_auction(v_auction.id,
    timezone('utc'::text, now()) - interval '2 hours',
    timezone('utc'::text, now()) - interval '1 minute');
  RAISE NOTICE 'Auction #2 scheduled: %', v_auction.status;

  v_ret := public.auction_run_maintenance();
  RAISE NOTICE 'Maintenance run -> %', v_ret;

  SELECT status INTO v_status FROM public.auctions WHERE id = v_auction.id;
  SELECT status INTO v_car FROM public.cars WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  RAISE NOTICE 'Auction #2 status (expect EXPIRED): %, car status (expect available): %', v_status, v_car;
END $$;

-- ============================================================
-- 4. SUMMARY
-- ============================================================

SELECT id, status, ended_reason, extension_count, current_highest_bid,
       winner_dealer_id IS NOT NULL AS has_winner, starts_at, ends_at
FROM public.auctions ORDER BY created_at;

SELECT status, count(*) FROM public.auction_bids GROUP BY status ORDER BY status;

SELECT auction_id, status AS payment_status, amount, winner_dealer_id IS NOT NULL AS has_winner
FROM public.auction_payments;
