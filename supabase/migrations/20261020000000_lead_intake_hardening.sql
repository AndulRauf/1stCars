-- ============================================================
-- 1stCars — Lead intake hardening (buyer / test-drive + buy-now)
-- File: supabase/migrations/20261020000000_lead_intake_hardening.sql
--
-- WHY
--   Buyer leads are written to public.sales_notifications by
--   BookingModal / BuyNowCheckout. Seller leads (public.inspections) were
--   landing while every test-drive lead was being lost, because:
--     1. anon has INSERT but NO SELECT policy on sales_notifications, so
--        `INSERT ... RETURNING` (supabase `.insert().select()`) is rejected
--        with 42501 even though the INSERT itself is allowed;
--     2. the optional `test_drives` appointment side-effect ran in the same
--        transaction and could abort the lead on a legacy car id / FK / NOT
--        NULL failure;
--     3. the audit-trail actor FK could roll back a signed-in buyer's lead.
--
-- WHAT THIS DOES (idempotent — safe to re-run)
--   A. Makes test_drives.lead_id / buyer_id shape safe for visitor leads.
--   B. Re-asserts the visitor INSERT policy + anon grant.
--   C. Canonical server-side RPC submit_sales_lead(jsonb) (bypasses RLS).
--   D. verify_sales_lead(uuid) so the client can confirm a write landed
--      without granting read access to PII.
--   E. Fully exception-guarded test-drive appointment trigger.
--   F. FK-safe automation_audit() + ensure_profile().
--   G. Keeps test_drives.sales_associate_id in sync on later assignment.
--
-- Run this ENTIRE file once in the Supabase SQL Editor (or via
-- `supabase db push`). Verify and smoke-test statements are at the bottom.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Shared helpers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_uuid(p_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN
    RETURN NULL;
  END IF;
  RETURN p_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- A. Appointment table shape (visitor leads have no buyer profile)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.test_drives') IS NOT NULL
     AND to_regclass('public.sales_notifications') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'test_drives'
         AND column_name = 'lead_id'
    ) THEN
      ALTER TABLE public.test_drives ADD COLUMN lead_id uuid;
      BEGIN
        ALTER TABLE public.test_drives
          ADD CONSTRAINT test_drives_lead_id_fkey
          FOREIGN KEY (lead_id) REFERENCES public.sales_notifications(id)
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
    ALTER TABLE public.test_drives ALTER COLUMN buyer_id DROP NOT NULL;
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS test_drives_lead_id_uidx '
         || 'ON public.test_drives (lead_id) WHERE lead_id IS NOT NULL';
  END IF;
END $$;

-- ------------------------------------------------------------
-- B. Visitor INSERT policy + grants (lead PII stays staff-only:
--    deliberately NO anon SELECT policy)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Visitors submit leads" ON public.sales_notifications;
CREATE POLICY "Visitors submit leads" ON public.sales_notifications
  FOR INSERT
  WITH CHECK (true);

GRANT INSERT ON public.sales_notifications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.sales_notifications TO authenticated;

-- ------------------------------------------------------------
-- C. Canonical RPC — SECURITY DEFINER bypasses RLS entirely
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_sales_lead(p_lead jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_date date;
BEGIN
  -- Never let a malformed date abort the lead.
  BEGIN
    v_date := NULLIF(trim(COALESCE(p_lead->>'preferred_date', '')), '')::date;
  EXCEPTION WHEN others THEN
    v_date := NULL;
  END;
  v_date := COALESCE(v_date, CURRENT_DATE);

  INSERT INTO public.sales_notifications (
    name, mobile, city,
    preferred_date, preferred_time,
    car_id, car_brand, car_model,
    type, status, notes
  ) VALUES (
    NULLIF(trim(COALESCE(p_lead->>'name', '')), ''),
    NULLIF(trim(COALESCE(p_lead->>'mobile', '')), ''),
    NULLIF(trim(COALESCE(p_lead->>'city', 'Surat')), ''),
    v_date,
    NULLIF(trim(COALESCE(p_lead->>'preferred_time', '11:00 AM - 01:00 PM')), ''),
    NULLIF(trim(COALESCE(p_lead->>'car_id', '')), ''),
    NULLIF(trim(COALESCE(p_lead->>'car_brand', '1stCars')), ''),
    NULLIF(trim(COALESCE(p_lead->>'car_model', 'Selection')), ''),
    NULLIF(trim(COALESCE(p_lead->>'type', 'test_drive')), ''),
    NULLIF(trim(COALESCE(p_lead->>'status', 'pending')), ''),
    p_lead->>'notes'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_sales_lead(jsonb) TO anon, authenticated;

-- ------------------------------------------------------------
-- D. Write confirmation without exposing lead PII.
--    Existence check only (uuid is unguessable) — never returns row data.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_sales_lead(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.sales_notifications WHERE id = p_id);
$$;

GRANT EXECUTE ON FUNCTION public.verify_sales_lead(uuid) TO anon, authenticated;

-- ------------------------------------------------------------
-- E. Test-drive appointment trigger — optional side-effect must NEVER
--    roll back the lead insert.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_crm_create_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee uuid;
  v_car_id uuid;
BEGIN
  IF NEW.type NOT IN ('test_drive', 'Test Drive Request', 'test-drive', 'test drive') THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT assigned_to INTO v_assignee
      FROM public.sales_notifications WHERE id = NEW.id;
  EXCEPTION WHEN others THEN
    v_assignee := NULL;
  END;

  BEGIN
    v_car_id := public.safe_uuid(NEW.car_id);
  EXCEPTION WHEN others THEN
    v_car_id := NULL;
  END;

  -- Legacy / non-UUID car ids cannot reference cars(id); skip the optional row.
  IF v_car_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.test_drives
      (car_id, buyer_id, sales_associate_id, preferred_date, preferred_time, status, lead_id)
    SELECT v_car_id, NULL, v_assignee, NEW.preferred_date, NEW.preferred_time,
           'scheduled', NEW.id
     WHERE NOT EXISTS (
       SELECT 1 FROM public.test_drives td WHERE td.lead_id = NEW.id
     );
  EXCEPTION WHEN others THEN
    NULL; -- the appointment is a convenience; the lead is the source of truth
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_lead_appointment ON public.sales_notifications;
CREATE TRIGGER sales_crm_lead_appointment
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_create_appointment();

-- ------------------------------------------------------------
-- F1. FK-safe audit actor
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_audit_actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- F2. audit writes can never roll back a lead
CREATE OR REPLACE FUNCTION public.automation_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_role text;
BEGIN
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
  EXCEPTION WHEN others THEN
    NULL; -- audit must never block a booking
  END;
END;
$$;

-- F3. Best-effort profile creation for signed-in buyers
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
    CASE
      WHEN (v_user.raw_user_meta_data->>'role') IN ('Buyer', 'Seller', 'Dealer')
        THEN (v_user.raw_user_meta_data->>'role')::public.user_role
      ELSE 'Buyer'::public.user_role
    END,
    coalesce(v_user.raw_user_meta_data->>'city', 'Surat')
  );
  RETURN v_user.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_audit_actor_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated, anon;

-- ------------------------------------------------------------
-- G. Propagate a later assignment onto the linked appointment row.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_crm_sync_appointment_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
     AND NEW.assigned_to IS NOT NULL THEN
    BEGIN
      UPDATE public.test_drives
         SET sales_associate_id = NEW.assigned_to
       WHERE lead_id = NEW.id
         AND (sales_associate_id IS NULL
              OR sales_associate_id IS DISTINCT FROM NEW.assigned_to);
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_appointment_assignee_sync ON public.sales_notifications;
CREATE TRIGGER sales_crm_appointment_assignee_sync
  AFTER UPDATE OF assigned_to ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_sync_appointment_assignee();

-- ------------------------------------------------------------
-- Reload PostgREST so the two new RPCs are callable immediately.
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- VERIFY (run in a fresh SQL query after this file):
--   SELECT policyname, roles, cmd FROM pg_policies
--    WHERE tablename = 'sales_notifications' AND cmd = 'INSERT';
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('submit_sales_lead', 'verify_sales_lead');
--   SELECT is_nullable FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='test_drives'
--      AND column_name='buyer_id';  -- expect YES
--   SELECT pg_get_functiondef('public.sales_crm_create_appointment()'::regproc);
--    -- expect both EXCEPTION WHEN others blocks
--
-- Smoke test (anonymous-style insert, rolled back):
--   BEGIN;
--   SELECT public.submit_sales_lead('{"name":"RLS Check","mobile":"9000000099",
--     "city":"Surat","car_brand":"Honda","car_model":"City",
--     "type":"test_drive"}'::jsonb);
--   SELECT public.verify_sales_lead(id) FROM public.sales_notifications
--     WHERE mobile = '9000000099';
--   ROLLBACK;
-- ------------------------------------------------------------
