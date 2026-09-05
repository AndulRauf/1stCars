-- ============================================================
-- 1stCars — FIX: Test-drive / buy-now booking fails on
--   "insert or update on table \"audit_trail\" violates foreign
--    key constraint \"audit_trail_actor_user_id_fkey\""
-- File: public/fix_booking_audit_fk.sql
--
-- ROOT CAUSE
--   The sales-lead INSERT trigger (on_sales_lead_inserted →
--   automation_audit) stores actor_user_id = auth.uid(). That column
--   has a foreign key to public.profiles(id). When the current auth
--   user has NO profile row (auto-created buyer accounts, Google
--   OAuth sessions, signups created before the signup trigger was
--   installed, or a DB where schema.sql's on_auth_user_created
--   trigger was never run), the audit insert is rejected and
--   PostgreSQL rolls back the entire sales_notifications INSERT —
--   blocking the booking.
--
-- FIXES (all idempotent — safe to re-run in the Supabase SQL Editor)
--   1. automation_audit() becomes FK-safe: it writes actor_user_id
--      ONLY when a matching profiles row exists, otherwise it records
--      the audit row with a NULL actor (guest) so the lead insert
--      can never be rolled back by the audit trail.
--   2. Ensures the signup → profile trigger (handle_new_user /
--      on_auth_user_created) exists so every NEW auth user gets a
--      profile automatically.
--   3. backfill_missing_profiles() RPC repairs auth users that never
--      received a profile (one-time maintenance for existing data).
--   4. ensure_profile() RPC — called by the app right before the lead
--      INSERT, so a signed-in buyer always has a profile row.
--   5. Guards sales_crm_create_appointment() so the test-drive
--      appointment trigger cannot fail on legacy/non-UUID car ids.
-- ============================================================

-- ------------------------------------------------------------
-- 1. FK-SAFE ACTOR RESOLUTION
--    Returns auth.uid() ONLY when a matching profiles row exists.
--    NULL otherwise — a NULL actor satisfies the FK constraint and
--    the lead transaction can never be rolled back by the audit.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_audit_actor_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN v_uid;
  END IF;
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- 2. HARDENED automation_audit()
--    Never writes an actor_user_id that would violate the FK, so a
--    buyer booking (or any trigger-driven side effect) can never be
--    rolled back because the audit trail rejected the insert.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_role text;
BEGIN
  v_actor := public.automation_audit_actor_id();
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = v_actor;
  END IF;

  INSERT INTO public.audit_trail
    (actor_user_id, actor_role, action, entity_type, entity_id,
     old_status, new_status, reason, metadata)
  VALUES
    (v_actor, coalesce(v_role, 'guest'), p_action, p_entity_type, p_entity_id,
     p_old_status, p_new_status, p_reason, coalesce(p_metadata, '{}'::jsonb));
END;
$$;
-- ------------------------------------------------------------
-- 3. SIGNUP → PROFILE SYNC (idempotent re-creation)
--    Every new auth user gets a profiles row, so auth.uid() is
--    always a valid audit actor afterwards.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
      WHEN new.email IN ('sales@1stcars.com', 'inspector@1stcars.com')
        THEN requested_role
      WHEN requested_role IN ('Buyer', 'Seller', 'Dealer') THEN requested_role
      ELSE 'Buyer'::public.user_role
    END,
    coalesce(new.raw_user_meta_data->>'city', 'Mumbai')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ------------------------------------------------------------
-- 4. BACKFILL + ensure_profile() RPCs
--    Repair existing auth users that have no profile row, and give
--    the SPA a cheap RPC to call before booking.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_user record;
  v_count integer := 0;
BEGIN
  FOR v_user IN
    SELECT u.id, u.email, u.phone, u.raw_user_meta_data
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
     WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, name, email, mobile, role, city)
      VALUES (
        v_user.id,
        coalesce(
          v_user.raw_user_meta_data->>'name',
          split_part(coalesce(v_user.email, ''), '@', 1),
          'Customer'
        ),
        v_user.email,
        coalesce(v_user.raw_user_meta_data->>'mobile', v_user.phone),
        CASE WHEN v_user.email IN ('sales@1stcars.com', 'inspector@1stcars.com')
             THEN coalesce((v_user.raw_user_meta_data->>'role')::public.user_role, 'Buyer'::public.user_role)
             WHEN (v_user.raw_user_meta_data->>'role') IN ('Buyer', 'Seller', 'Dealer')
             THEN (v_user.raw_user_meta_data->>'role')::public.user_role
             ELSE 'Buyer'::public.user_role END,
        coalesce(v_user.raw_user_meta_data->>'city', 'Mumbai')
      );
      v_count := v_count + 1;
    EXCEPTION
      WHEN unique_violation THEN NULL; -- raced with a concurrent run
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

-- RPC the app calls just before a lead INSERT. No-op for anonymous
-- visitors; for a signed-in user it guarantees a profile row exists so
-- the audit_trail FK can never reject the subsequent role.
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN v_uid;
  END IF;

  SELECT u.id, u.email, u.phone, u.raw_user_meta_data INTO v_user
    FROM auth.users u WHERE u.id = v_uid;
  IF v_user.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (id, name, email, mobile, role, city)
  VALUES (
    v_user.id,
    coalesce(v_user.raw_user_meta_data->>'name',
             split_part(coalesce(v_user.email, ''), '@', 1), 'Customer'),
    v_user.email,
    coalesce(v_user.raw_user_meta_data->>'mobile', v_user.phone),
    coalesce((v_user.raw_user_meta_data->>'role')::public.user_role, 'Buyer'::public.user_role),
    coalesce(v_user.raw_user_meta_data->>'city', 'Mumbai')
  );
  RETURN v_user.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_audit_actor_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.backfill_missing_profiles() TO authenticated;
-- ------------------------------------------------------------
-- 5. HARDENED TEST-DRIVE APPOINTMENT TRIGGER
--    Keeps the auto-created test_drives row from failing when the
--    lead's car_id is a legacy demo id ("car-1") that cannot be cast
--    to a UUID, or when no appointment exists yet. The booking lead
--    itself must always be saved.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_crm_create_appointment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_assignee uuid;
  v_car_id uuid;
BEGIN
  IF NEW.type <> 'test_drive' THEN RETURN NEW; END IF;

  SELECT assigned_to INTO v_assignee FROM public.sales_notifications WHERE id = NEW.id;
  v_car_id := public.safe_uuid(NEW.car_id);

  -- Legacy / non-UUID car ids have no appointments table row yet; never let
  -- the optional appointment block the lead insert.
  IF v_car_id IS NULL THEN RETURN NEW; END IF;

  -- Idempotent: one appointment per lead (partial unique index backs this).
  INSERT INTO public.test_drives (car_id, buyer_id, sales_associate_id, preferred_date, preferred_time, status, lead_id)
  SELECT v_car_id, NULL, v_assignee, NEW.preferred_date, NEW.preferred_time, 'scheduled', NEW.id
   WHERE NOT EXISTS (SELECT 1 FROM public.test_drives td WHERE td.lead_id = NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_lead_appointment ON public.sales_notifications;
CREATE TRIGGER sales_crm_lead_appointment
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_create_appointment();

-- Reveal how many auth users were missing profiles (helps verify the fix).
-- SELECT public.backfill_missing_profiles();