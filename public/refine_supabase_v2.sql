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

