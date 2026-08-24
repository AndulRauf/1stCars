-- ============================================================
-- 1stCars — PHASE 1: SALES CRM + SALES AUTOMATION
-- File: public/sales_crm_phase1.sql
--
-- Completes the vehicle-owner lead assignment rule server-side
-- and locks down lead privacy. Idempotent — safe to re-run.
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
--
-- What it does (nothing unrelated):
--   1. sales_notifications.assigned_to / assigned_at  (if missing)
--   2. safe_uuid(text) helper (car_id is TEXT; legacy ids are not UUIDs)
--   3. Owner-first lead assignment (Priority 1 = cars.created_by),
--      round-robin fallback kept as Priority 2/3, + idempotent
--      follow-up/task creation + assignment audit
--   4. Audit trail row on lead INSERT (updates were already audited)
--   5. test_drives.lead_id + appointment auto-creation for test-drive
--      leads, owned by the same Sales Associate
--   6. RLS: Sales Associates see ONLY their assigned leads + the
--      unassigned pool. Admin sees everything. Visitors can only submit.
--   7. Performance indexes
-- ============================================================

-- ------------------------------------------------------------
-- 1. Assignee columns on the buyer-lead table (no-ops if the
--    add_sales_notifications_assignment.sql patch already ran).
-- ------------------------------------------------------------
ALTER TABLE public.sales_notifications
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- ------------------------------------------------------------
-- 2. Safe TEXT → UUID cast. sales_notifications.car_id is TEXT and
--    legacy/demo rows carry non-UUID ids ("car-1"), so joins to
--    cars(id) must never explode on an invalid cast.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_uuid(t text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  RETURN t::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- ------------------------------------------------------------
-- 3. Post-assignment side effects — IDEMPOTENT.
--    Runs for BOTH assignment paths (vehicle owner + fallback).
--    Creates the intro follow-up + follow-up task + notification
--    only when they do not exist yet for this lead.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_crm_on_assign(
  p_lead_id uuid,
  p_associate uuid,
  p_associate_name text DEFAULT NULL,
  p_how text DEFAULT 'vehicle_owner',
  p_event_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead public.sales_notifications%ROWTYPE;
  v_car text;
  v_title text;
BEGIN
  IF p_lead_id IS NULL OR p_associate IS NULL THEN RETURN; END IF;

  SELECT * INTO v_lead FROM public.sales_notifications WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN RETURN; END IF;

  v_car := COALESCE(NULLIF(v_lead.car_brand, '') || ' ' || NULLIF(v_lead.car_model, ''), 'vehicle');
  v_title := CASE
    WHEN v_lead.type = 'test_drive' THEN 'Test drive lead: ' || v_car
    WHEN v_lead.type = 'buy_now'    THEN 'Buy-now lead: ' || v_car
    ELSE 'Sales lead: ' || v_car
  END;

  -- 3.1 Intro follow-up (deduped on related_table + related_id + type)
  IF NOT EXISTS (
    SELECT 1 FROM public.follow_ups
     WHERE related_table = 'sales_notifications'
       AND related_id  = p_lead_id::text
       AND follow_up_type = 'new_lead_followup'
  ) THEN
    INSERT INTO public.follow_ups (
      related_table, related_id, assignee_id, assigned_role,
      follow_up_type, priority, status, due_at, notes
    ) VALUES (
      'sales_notifications', p_lead_id::text, p_associate, 'Sales Associate',
      'new_lead_followup', 'high', 'open',
      timezone('utc'::text, now()) + interval '24 hours',
      'First contact for ' || v_lead.name || ' (' || v_car || '). Reach out within 24 hours.'
    );
  END IF;

  -- 3.2 Follow-up task (deduped on source_table + source_id + task_type)
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
     WHERE source_table = 'sales_notifications'
       AND source_id  = p_lead_id::text
       AND task_type  = 'lead_followup'
  ) THEN
    INSERT INTO public.tasks (
      assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id
    ) VALUES (
      p_associate, 'lead_followup', v_title,
      COALESCE(v_lead.name, 'A buyer') || ' in ' || COALESCE(v_lead.city, 'your region') ||
      ' — reach out to confirm interest and schedule the next step within 24 hours.',
      'high', 'open', timezone('utc'::text, now()) + interval '24 hours',
      'sales_notifications', p_lead_id::text
    );
  END IF;

  -- 3.3 Assignment audit trail (activity timeline)
  PERFORM public.automation_audit('lead_assigned', 'sales_notifications', p_lead_id::text,
    NULL, COALESCE(v_lead.status, 'pending'),
    'auto:' || p_how,
    jsonb_build_object('assigned_to', p_associate, 'assigned_to_name', p_associate_name,
                       'lead_type', v_lead.type, 'car_id', v_lead.car_id));

  -- 3.4 Notify the associate
  PERFORM public.automation_notify(p_associate, 'New Lead Assigned',
    v_title || ' was assigned to you. Follow up within 24 hours.',
    'action', jsonb_build_object('lead_id', p_lead_id), p_event_id);

  PERFORM public.automation_log('info', 'assign-sales-lead',
    'Lead assigned to ' || COALESCE(p_associate_name, 'sales associate') || ' (' || p_how || ')',
    jsonb_build_object('lead_id', p_lead_id, 'assigned_to', p_associate, 'how', p_how),
    NULL, p_event_id);
END;
$$;


-- ------------------------------------------------------------
-- 4. OWNER-FIRST lead assignment (Priority 1) with the existing
--    round-robin kept as fallback (Priority 2/3).
--
--    Priority 1: lead has car_id → cars.created_by is a Sales
--                Associate → THAT associate owns the lead. Never
--                gated by the round-robin flag (core business rule).
--    Priority 2: car exists but has no associate owner → fallback.
--    Priority 3: no usable car_id → fallback.
--
--    Idempotent + admin-override safe: an already-assigned lead is
--    never re-touched, so an intentional Admin reassignment sticks.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.automation_auto_assign_sales_lead(
  p_lead_id uuid,
  p_city text DEFAULT NULL,
  p_lead_type text DEFAULT 'lead',
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_car_id uuid;
  v_owner uuid;
  v_owner_name text;
  v_owner_ok boolean;
  v_sales public.profiles%ROWTYPE;
  v_car text;
  v_title text;
BEGIN
  IF p_lead_id IS NULL THEN RETURN NULL; END IF;

  -- Idempotency + admin-override protection: never re-touch an
  -- assigned lead (covers repeated events AND admin reassignments).
  PERFORM 1 FROM public.sales_notifications WHERE id = p_lead_id AND assigned_to IS NOT NULL;
  IF FOUND THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'Lead already assigned',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  -- ========== PRIORITY 1: vehicle owner ==========
  SELECT safe_uuid(car_id) INTO v_car_id
    FROM public.sales_notifications WHERE id = p_lead_id;
  IF v_car_id IS NOT NULL THEN
    SELECT c.created_by, c.created_by_name INTO v_owner, v_owner_name
      FROM public.cars c
     WHERE c.id = v_car_id AND c.created_by IS NOT NULL;

    IF v_owner IS NOT NULL THEN
      -- Own only by ACTIVE Sales Associates; otherwise use the fallback.
      SELECT COALESCE(p.is_approved, true) INTO v_owner_ok
        FROM public.profiles p
       WHERE p.id = v_owner AND p.role = 'Sales Associate'::public.user_role;

      IF COALESCE(v_owner_ok, false) THEN
        UPDATE public.sales_notifications
           SET assigned_to = v_owner
         WHERE id = p_lead_id;
        PERFORM public.sales_crm_on_assign(p_lead_id, v_owner, v_owner_name, 'vehicle_owner', p_event_id);
        RETURN v_owner;
      END IF;
      PERFORM public.automation_log('warn', 'assign-sales-lead',
        'Vehicle owner is not an active Sales Associate — using fallback',
        jsonb_build_object('lead_id', p_lead_id, 'owner', v_owner), NULL, p_event_id);
    END IF;
  END IF;


  -- ========== PRIORITY 2/3: existing round-robin fallback ==========
  IF NOT public.automation_flag_on('automation.auto_assign_sales') THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead',
      'Auto-assign disabled for sales leads (no vehicle owner)',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  v_car := COALESCE((SELECT car_brand || ' ' || car_model FROM public.sales_notifications WHERE id = p_lead_id), 'vehicle');
  v_title := CASE
    WHEN p_lead_type = 'test_drive' THEN 'Test drive lead: ' || v_car
    WHEN p_lead_type = 'buy_now' THEN 'Buy-now lead: ' || v_car
    ELSE 'Sales lead: ' || v_car
  END;

  -- Lowest open-workload sales associate, same city preferred.
  SELECT p.id, p.name, p.city, p.email INTO v_sales
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT count(*) AS load FROM public.sales_notifications sn
      WHERE sn.assigned_to = p.id AND sn.status IN ('pending', 'contacted')
    ) l ON true
   WHERE p.role = 'Sales Associate'::public.user_role AND p.is_approved = true
     AND (p.city ILIKE p_city OR p.city IS NULL OR p.city = '')
   ORDER BY l.load ASC, p.created_at ASC
   LIMIT 1;

  IF v_sales.id IS NULL THEN
    SELECT p.id, p.name, p.city, p.email INTO v_sales
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT count(*) AS load FROM public.sales_notifications sn
        WHERE sn.assigned_to = p.id AND sn.status IN ('pending', 'contacted')
      ) l ON true
     WHERE p.role = 'Sales Associate'::public.user_role AND p.is_approved = true
     ORDER BY l.load ASC, p.created_at ASC
     LIMIT 1;
  END IF;

  IF v_sales.id IS NULL THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'No available sales associates',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  UPDATE public.sales_notifications SET assigned_to = v_sales.id, status = 'contacted'
   WHERE id = p_lead_id;

  PERFORM public.sales_crm_on_assign(p_lead_id, v_sales.id, v_sales.name, 'round_robin', p_event_id);
  RETURN v_sales.id;
END;
$$;


-- ------------------------------------------------------------
-- 5. Lead INSERT audit (updates were already audited by
--    automation_phase2.sql → on_lead_changed).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_sales_lead_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  v_event := public.automation_record_event(
    'lead.created', 'sales_notifications', NEW.id::text,
    jsonb_build_object(
      'lead_id', NEW.id, 'name', NEW.name, 'mobile', NEW.mobile, 'city', NEW.city,
      'type', NEW.type, 'car_brand', NEW.car_brand, 'car_model', NEW.car_model,
      'car_id', NEW.car_id, 'assigned_to', NEW.assigned_to,
      'preferred_date', NEW.preferred_date, 'preferred_time', NEW.preferred_time
    )
  );
  PERFORM public.automation_audit('lead_created', 'sales_notifications', NEW.id::text,
    NULL, COALESCE(NEW.status, 'pending'), NULL,
    jsonb_build_object('lead_type', NEW.type, 'car_id', NEW.car_id, 'name', NEW.name));
  PERFORM public.automation_auto_assign_sales_lead(NEW.id, NEW.city, NEW.type, v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_sales_lead_inserted ON public.sales_notifications;
CREATE TRIGGER automation_sales_lead_inserted
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_sales_lead_inserted();

-- ------------------------------------------------------------
-- 6. Appointments: test-drive leads get a test_drives row owned by
--    the SAME Sales Associate (test_drives.sales_associate_id).
--    buyer_id is relaxed to nullable because visitors submit leads
--    without a buyer profile; the lead row carries the customer.
-- ------------------------------------------------------------
ALTER TABLE public.test_drives
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.sales_notifications(id) ON DELETE SET NULL;
ALTER TABLE public.test_drives
  ALTER COLUMN buyer_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS test_drives_lead_id_uidx
  ON public.test_drives (lead_id) WHERE lead_id IS NOT NULL;

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

-- ------------------------------------------------------------
-- 7. RLS — lead privacy at the DATABASE level.
--    Sales Associate: own assigned leads + the shared unassigned pool.
--    Admin: everything. Visitors: submit-only (no read).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Staff manage leads" ON public.sales_notifications;

DROP POLICY IF EXISTS "Admin manages all leads" ON public.sales_notifications;
CREATE POLICY "Admin manages all leads" ON public.sales_notifications
  FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role);

DROP POLICY IF EXISTS "Sales reads own and pool leads" ON public.sales_notifications;
CREATE POLICY "Sales reads own and pool leads" ON public.sales_notifications
  FOR SELECT USING (
    public.get_auth_user_role() = 'Sales Associate'::public.user_role
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

DROP POLICY IF EXISTS "Sales updates own and pool leads" ON public.sales_notifications;
CREATE POLICY "Sales updates own and pool leads" ON public.sales_notifications
  FOR UPDATE USING (
    public.get_auth_user_role() = 'Sales Associate'::public.user_role
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (public.get_auth_user_role() = 'Sales Associate'::public.user_role);

DROP POLICY IF EXISTS "Sales deletes own leads" ON public.sales_notifications;
CREATE POLICY "Sales deletes own leads" ON public.sales_notifications
  FOR DELETE USING (
    public.get_auth_user_role() = 'Sales Associate'::public.user_role
    AND assigned_to = auth.uid()
  );

-- "Visitors submit leads" (INSERT WITH CHECK (true)) already exists in
-- schema.sql and is intentionally kept.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_notifications TO authenticated;
GRANT INSERT ON public.sales_notifications TO anon;

-- Associates need to read their CRM activity timeline.
DROP POLICY IF EXISTS "Staff read audit trail" ON public.audit_trail;
CREATE POLICY "Staff read audit trail" ON public.audit_trail
  FOR SELECT USING (
    public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
    OR actor_user_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 8. Indexes for the CRM queries.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS sales_notifications_assigned_to_idx ON public.sales_notifications (assigned_to);
CREATE INDEX IF NOT EXISTS sales_notifications_car_id_idx ON public.sales_notifications (car_id);
CREATE INDEX IF NOT EXISTS sales_notifications_status_idx ON public.sales_notifications (status);
CREATE INDEX IF NOT EXISTS follow_ups_related_idx ON public.follow_ups (related_table, related_id);

