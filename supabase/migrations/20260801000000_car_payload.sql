-- Add a JSONB payload column to public.cars so the Admin CMS can persist the
-- rich car record (images, price_breakup, inspection report, features, ...)
-- alongside the normalized columns, on both the real Supabase table and the
-- local mock.
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ensure the mock-friendly text ids can still be inserted locally: real-mode
-- inserts omit `id` so Postgres generates a UUID (see src/lib/carPersistence.ts).
-- No data change required on existing rows.
