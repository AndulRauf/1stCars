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
