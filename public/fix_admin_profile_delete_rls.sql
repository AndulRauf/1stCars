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
  USING (public.get_auth_user_role() = 'Admin'::text);

-- 2) Belt & braces: re-assert the broad admin manage policy too, so
--    databases missing it entirely get it created (FOR ALL covers
--    SELECT / INSERT / UPDATE / DELETE for admins).
DROP POLICY IF EXISTS "Admin manages all profiles" ON public.profiles;
CREATE POLICY "Admin manages all profiles" ON public.profiles
  FOR ALL
  USING (public.get_auth_user_role() = 'Admin'::text)
  WITH CHECK (public.get_auth_user_role() = 'Admin'::text);

-- 3) Admin can delete rows off the dealers sibling table (cleanup
--    step of the admin dealer delete).
DROP POLICY IF EXISTS "Admin manages dealers" ON public.dealers;
CREATE POLICY "Admin manages dealers" ON public.dealers
  FOR ALL
  USING (public.get_auth_user_role() = 'Admin'::text)
  WITH CHECK (public.get_auth_user_role() = 'Admin'::text);

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
        USING (public.get_auth_user_role() = 'Admin'::text)
        WITH CHECK (public.get_auth_user_role() = 'Admin'::text);
    $pol$;
  END IF;
END $$;

-- 5) Sanity report: show the effective policies on profiles.
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
