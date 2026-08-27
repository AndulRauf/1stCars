-- ============================================================================
-- 1stCars — PRE‑FLIGHT DIAGNOSTIC (READ‑ONLY)
-- ----------------------------------------------------------------------------
-- Run this BEFORE re-running public/refine_supabase_v2.sql to see exactly what
-- exists on your live database. It performs NO changes — only SELECTs and a
-- SHOW-like check on the system catalogs.
--
-- Paste the ENTIRE file into the Supabase SQL Editor → Run. Read the results,
-- then run refine_supabase_v2.sql.
-- ============================================================================

-- 1. Core tables the migration touches — do they exist?
SELECT 'table_exists' AS check_name, table_name, NULL::text AS detail, NULL::text AS status
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('cars','inspections','sales_notifications','profiles','offers','dealer_bids','purchases','park_sell')
 ORDER BY table_name;

-- 2. Key columns' existence + data type (the ones the migration depends on)
SELECT
  c.table_name || '.' || c.column_name                  AS col,
  c.data_type                                            AS data_type,
  CASE WHEN c.column_name = 'assigned_to'
            AND c.table_name = 'sales_notifications'
       THEN 'UUID expected (sales_crm_phase1) / TEXT if schema.sql ran last'
       ELSE '' END                                        AS note
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND (   (c.table_name='cars'        AND c.column_name IN ('created_by','created_by_name'))
       OR (c.table_name='inspections' AND c.column_name IN ('report_120_json','report_150_json','overall_score'))
       OR (c.table_name='sales_notifications' AND c.column_name IN ('assigned_to','assigned_at'))
      )
ORDER BY 1;

-- 3. sales_notifications.assigned_to: non-UUID values present? (drives section F)
--    Cast to ::text so this works whether the column is UUID or TEXT.
SELECT
  count(*)                                                          AS total,
  count(assigned_to)                                                AS non_null,
  count(*) FILTER (WHERE assigned_to IS NOT NULL
                   AND assigned_to::text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') AS bad_non_uuid
FROM public.sales_notifications;

-- 4. Existing FK named sales_notifications_assigned_to_fkey? (section F skips if present)
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname = 'sales_notifications_assigned_to_fkey';

-- 5. Negative money values that would BLOCK section D CHECKs (0 = safe to add)
SELECT 'cars'      AS tbl, count(*) AS negative_rows FROM public.cars      WHERE price < 0
UNION ALL SELECT 'offers',      count(*) FROM public.offers       WHERE offer_amount < 0
UNION ALL SELECT 'dealer_bids', count(*) FROM public.dealer_bids  WHERE bid_amount < 0
UNION ALL SELECT 'purchases',   count(*) FROM public.purchases    WHERE amount_paid < 0
UNION ALL SELECT 'park_sell',   count(*) FROM public.park_sell    WHERE pricing_expected < 0;

-- 6. Does the 'updated_at' column exist on each table (section B attaches only where it does)?
SELECT table_name
FROM information_schema.columns
WHERE table_schema='public' AND column_name='updated_at'
ORDER BY table_name;