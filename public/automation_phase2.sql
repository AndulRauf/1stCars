-- ====================================================
-- 1stCars Native Automation Engine — PHASE 2
-- Follow-ups, audit trail, vehicle status flow guard,
-- offer / dealer / booking triggers, scheduled jobs.
-- Idempotent: safe to re-run in the Supabase SQL Editor.
-- Run AFTER public/automation_schema.sql.
-- ====================================================

-- ====================================================
-- 1. NEW TABLES
-- ====================================================

-- 1.1 FOLLOW-UPS (outreach queue per workflow stage).
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  related_table TEXT,
  related_id TEXT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_role TEXT, -- Sales Associate, Admin, Inspector
  follow_up_type TEXT NOT NULL, -- CONTACT_SELLER, CONTACT_BUYER, FOLLOW_UP_INSPECTION, CONFIRM_TEST_DRIVE, FOLLOW_UP_OFFER, COMPLETE_BOOKING, PREPARE_DELIVERY, PAYMENT, DOCUMENTATION
  priority TEXT DEFAULT 'medium' NOT NULL, -- low, medium, high, urgent
  status TEXT DEFAULT 'open' NOT NULL, -- open, in_progress, completed, cancelled, overdue
  due_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS follow_ups_status_due_idx ON public.follow_ups (status, due_at);
-- No duplicate ACTIVE follow-up for the same workflow stage.
CREATE UNIQUE INDEX IF NOT EXISTS follow_ups_stage_dedupe ON public.follow_ups (related_table, related_id, follow_up_type)
  WHERE status IN ('open', 'in_progress');

-- 1.2 AUDIT TRAIL (who/what/old/new/reason/timestamp).
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_trail_entity_idx ON public.audit_trail (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_trail_actor_idx ON public.audit_trail (actor_user_id, created_at);

-- 1.3 VEHICLE STATUS FLOW MAP (centralized allowed transitions).
CREATE TABLE IF NOT EXISTS public.car_status_flow (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
INSERT INTO public.car_status_flow (from_status, to_status) VALUES
  ('draft', 'draft'), ('draft', 'seller_inquiry'), ('draft', 'inspection_pending'), ('draft', 'available'),
  ('seller_inquiry', 'seller_inquiry'), ('seller_inquiry', 'inspection_pending'), ('seller_inquiry', 'available'), ('seller_inquiry', 'listed'),
  ('inspection_pending', 'inspection_pending'), ('inspection_pending', 'inspection_in_progress'), ('inspection_pending', 'available'), ('inspection_pending', 'listed'),
  ('inspection_in_progress', 'inspection_in_progress'), ('inspection_in_progress', 'inspection_completed'), ('inspection_in_progress', 'available'), ('inspection_in_progress', 'listed'),
  ('inspection_completed', 'inspection_completed'), ('inspection_completed', 'valuation_pending'), ('inspection_completed', 'ready_for_sale'), ('inspection_completed', 'available'), ('inspection_completed', 'listed'),
  ('valuation_pending', 'valuation_pending'), ('valuation_pending', 'ready_for_sale'), ('valuation_pending', 'available'), ('valuation_pending', 'listed'),
  ('ready_for_sale', 'ready_for_sale'), ('ready_for_sale', 'listed'), ('ready_for_sale', 'available'), ('ready_for_sale', 'sold'),
  ('available', 'available'), ('available', 'reserved'), ('available', 'sold'), ('available', 'listed'), ('available', 'bidding'),
  ('listed', 'listed'), ('listed', 'reserved'), ('listed', 'sold'), ('listed', 'available'), ('listed', 'bidding'),
  ('reserved', 'reserved'), ('reserved', 'sold'), ('reserved', 'available'),
  ('bidding', 'bidding'), ('bidding', 'sold'), ('bidding', 'available'), ('bidding', 'listed'),
  ('sold', 'sold'), ('sold', 'delivered'),
  ('delivered', 'delivered')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- ====================================================
-- 2. ROW LEVEL SECURITY
-- ====================================================
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_status_flow ENABLE ROW LEVEL SECURITY;

-- Follow-ups: assignee + staff read, assignee updates own, admin manages.
DROP POLICY IF EXISTS "Assignee and staff read follow-ups" ON public.follow_ups;
CREATE POLICY "Assignee and staff read follow-ups" ON public.follow_ups FOR SELECT USING (
  auth.uid() = assignee_id
  OR public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Assignee updates own follow-ups" ON public.follow_ups;
CREATE POLICY "Assignee updates own follow-ups" ON public.follow_ups FOR UPDATE USING (
  auth.uid() = assignee_id OR public.get_auth_user_role() = 'Admin'::public.user_role
);
DROP POLICY IF EXISTS "Staff write follow-ups" ON public.follow_ups;
CREATE POLICY "Staff write follow-ups" ON public.follow_ups FOR INSERT WITH CHECK (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages follow-ups" ON public.follow_ups;
CREATE POLICY "Admin manages follow-ups" ON public.follow_ups FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- Audit trail: staff read, admin manages.
DROP POLICY IF EXISTS "Staff read audit trail" ON public.audit_trail;
CREATE POLICY "Staff read audit trail" ON public.audit_trail FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages audit trail" ON public.audit_trail;
CREATE POLICY "Admin manages audit trail" ON public.audit_trail FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- Status flow map: anyone reads (read-only reference data).
DROP POLICY IF EXISTS "Anyone reads car status flow" ON public.car_status_flow;
CREATE POLICY "Anyone reads car status flow" ON public.car_status_flow FOR SELECT USING (true);

-- ====================================================
-- 3. HELPER FUNCTIONS
-- ====================================================

-- 3.1 Write an audit trail entry.
CREATE OR REPLACE FUNCTION public.automation_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role FROM public.profiles WHERE id = v_actor;
  END IF;
  INSERT INTO public.audit_trail (actor_user_id, actor_role, action, entity_type, entity_id, old_status, new_status, reason, metadata)
  VALUES (v_actor, v_role, p_action, p_entity_type, p_entity_id, p_old_status, p_new_status, p_reason, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

-- 3.2 Create an internal task, idempotent via task_key (dedupes retries).
CREATE OR REPLACE FUNCTION public.automation_create_task(
  p_assignee_id uuid,
  p_task_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_due_at timestamptz DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id text DEFAULT NULL,
  p_task_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_task_key IS NOT NULL THEN
    SELECT id INTO v_id FROM public.tasks WHERE source_table = p_source_table AND source_id = p_source_id AND task_type = p_task_type LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  INSERT INTO public.tasks (assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id)
  VALUES (p_assignee_id, p_task_type, p_title, p_description, coalesce(p_priority, 'medium'), 'open', p_due_at, p_source_table, p_source_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 3.3 Create a follow-up (deduped by stage), optionally notifying the assignee.
CREATE OR REPLACE FUNCTION public.automation_create_follow_up(
  p_related_table text,
  p_related_id text,
  p_follow_up_type text,
  p_assignee_id uuid DEFAULT NULL,
  p_assigned_role text DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_due_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_notify_title text DEFAULT NULL,
  p_notify_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.follow_ups
   WHERE related_table = p_related_table AND related_id = p_related_id
     AND follow_up_type = p_follow_up_type AND status IN ('open', 'in_progress')
   LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.follow_ups (related_table, related_id, follow_up_type, assignee_id, assigned_role, priority, status, due_at, notes)
  VALUES (p_related_table, p_related_id, p_follow_up_type, p_assignee_id, p_assigned_role, coalesce(p_priority, 'medium'), 'open', p_due_at, p_notes)
  RETURNING id INTO v_id;

  IF p_notify_title IS NOT NULL AND p_assignee_id IS NOT NULL THEN
    PERFORM public.automation_notify(p_assignee_id, p_notify_title, p_notify_message, 'action',
      p_metadata || jsonb_build_object('follow_up_id', v_id), NULL);
  END IF;

  PERFORM public.automation_log('info', 'follow-up-created', 'Follow-up created for ' || p_follow_up_type,
    jsonb_build_object('follow_up_id', v_id, 'related_table', p_related_table, 'related_id', p_related_id),
    NULL, NULL);

  RETURN v_id;
END;
$$;

-- ====================================================
-- 4. OFFER AUTOMATION
-- ====================================================

-- 4.1 Offer inserted -> event + task + notification.
CREATE OR REPLACE FUNCTION public.on_offer_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
  v_car text;
  v_sales uuid;
BEGIN
  v_car := COALESCE((SELECT brand || ' ' || model FROM public.inspections WHERE id = NEW.inspection_id), 'vehicle');

  v_event := public.automation_record_event(
    'offer.created', 'offers', NEW.id::text,
    jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id, 'dealer_id', NEW.dealer_id,
      'dealer_name', NEW.dealer_name, 'offer_amount', NEW.offer_amount, 'car', v_car)
  );

  -- Sales/Admin queue task to review the offer.
  SELECT id INTO v_sales FROM public.profiles
   WHERE role = 'Sales Associate'::public.user_role AND is_approved = true
   ORDER BY created_at ASC LIMIT 1;

  PERFORM public.automation_create_task(v_sales, 'offer_review',
    'Review offer for ' || v_car,
    'Dealer ' || NEW.dealer_name || ' offered ₹' || NEW.offer_amount || ' — validate and route to the seller.',
    'high', now() + interval '24 hours', 'offers', NEW.id::text, 'offer-' || NEW.id::text);

  PERFORM public.automation_notify(v_sales, 'Offer Received',
    'New offer of ₹' || NEW.offer_amount || ' from ' || NEW.dealer_name || ' on ' || v_car || '.',
    'action', jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id), v_event);

  INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
  VALUES (NULL, v_sales, 'offer_received', 'Offer received',
    NEW.dealer_name || ' offered ₹' || NEW.offer_amount || ' for ' || v_car,
    jsonb_build_object('offer_id', NEW.id));

  PERFORM public.automation_audit('offer_created', 'offers', NEW.id::text, NULL, NEW.status, NULL,
    jsonb_build_object('amount', NEW.offer_amount, 'dealer_name', NEW.dealer_name));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_offer_created ON public.offers;
CREATE TRIGGER automation_offer_created
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_inserted();

-- 4.2 Offer status change -> events + notifications.
CREATE OR REPLACE FUNCTION public.on_offer_status_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
  v_seller uuid;
  v_car text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_car := COALESCE((SELECT brand || ' ' || model FROM public.inspections WHERE id = NEW.inspection_id), 'vehicle');
    SELECT seller_id INTO v_seller FROM public.inspections WHERE id = NEW.inspection_id;

    PERFORM public.automation_audit('offer_status_changed', 'offers', NEW.id::text, OLD.status, NEW.status);

    IF NEW.status IN ('accepted', 'rejected', 'expired') THEN
      v_event := public.automation_record_event(
        'offer.' || NEW.status, 'offers', NEW.id::text,
        jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id,
          'dealer_name', NEW.dealer_name, 'offer_amount', NEW.offer_amount, 'car', v_car)
      );
      IF v_seller IS NOT NULL THEN
        PERFORM public.automation_notify(v_seller,
          CASE WHEN NEW.status = 'accepted' THEN 'Offer Accepted' WHEN NEW.status = 'expired' THEN 'Offer Expired' ELSE 'Offer Rejected' END,
          CASE WHEN NEW.status = 'accepted'
               THEN 'Your ' || v_car || ' offer from ' || NEW.dealer_name || ' (₹' || NEW.offer_amount || ') was accepted.'
               WHEN NEW.status = 'expired'
               THEN 'The offer on ' || v_car || ' has expired. Ask staff to re-route your vehicle.'
               ELSE 'The offer on ' || v_car || ' from ' || NEW.dealer_name || ' was rejected.'
          END,
          CASE WHEN NEW.status = 'accepted' THEN 'success' ELSE 'info' END,
          jsonb_build_object('offer_id', NEW.id, 'inspection_id', NEW.inspection_id), v_event);
      END IF;
      IF NEW.status = 'accepted' THEN
        -- Accepted instant offer reserves the vehicle for purchase.
        UPDATE public.inspections SET status = 'sold' WHERE id = NEW.inspection_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_offer_status_changed ON public.offers;
CREATE TRIGGER automation_offer_status_changed
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_status_changed();

-- ====================================================
-- 5. DEALER APPROVAL AUTOMATION
-- ====================================================
CREATE OR REPLACE FUNCTION public.on_dealer_verified()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  IF NEW.is_verified = true AND OLD.is_verified IS DISTINCT FROM true THEN
    v_event := public.automation_record_event(
      'dealer.approved', 'dealers', NEW.id::text,
      jsonb_build_object('dealer_id', NEW.id, 'company_name', NEW.company_name)
    );
    PERFORM public.automation_notify(NEW.id,
      'Dealer Account Approved',
      'Congratulations! Your 1stCars dealer account is approved. You can now browse inventory and participate in dealer auctions.',
      'success', jsonb_build_object('dealer_id', NEW.id), v_event);
    INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
    VALUES (NEW.id, NULL, 'dealer_approved', 'Dealer approved', 'Dealer ' || NEW.company_name || ' approved by automation engine',
      jsonb_build_object('dealer_id', NEW.id));
    PERFORM public.automation_audit('dealer_approved', 'dealers', NEW.id::text, 'pending', 'approved');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_dealer_verified ON public.dealers;
CREATE TRIGGER automation_dealer_verified
  AFTER UPDATE OF is_verified ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.on_dealer_verified();

-- ====================================================
-- 6. VEHICLE STATUS CONSISTENCY
-- ====================================================

-- 6.1 Guard: reject invalid status transitions (frontend proof).
CREATE OR REPLACE FUNCTION public.on_cars_status_change_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (SELECT 1 FROM public.car_status_flow WHERE from_status = OLD.status AND to_status = NEW.status) THEN
      RAISE EXCEPTION 'Invalid vehicle status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_cars_status_guard ON public.cars;
CREATE TRIGGER automation_cars_status_guard
  BEFORE UPDATE OF status ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.on_cars_status_change_guard();

-- 6.2 After-change: event + audit + notification.
CREATE OR REPLACE FUNCTION public.on_cars_status_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := public.automation_record_event(
      'car.status_changed', 'cars', NEW.id::text,
      jsonb_build_object('car_id', NEW.id, 'title', NEW.title, 'brand', NEW.brand, 'model', NEW.model,
        'price', NEW.price, 'old_status', OLD.status, 'new_status', NEW.status)
    );
    PERFORM public.automation_audit('car_status_changed', 'cars', NEW.id::text, OLD.status, NEW.status);

    IF NEW.status = 'reserved' THEN
      PERFORM public.automation_notify(NEW.created_by, 'Vehicle Reserved',
        'Your ' || NEW.title || ' has been reserved by a buyer.', 'action',
        jsonb_build_object('car_id', NEW.id), v_event);
    ELSIF NEW.status = 'sold' THEN
      PERFORM public.automation_notify(NEW.created_by, 'Vehicle Sold',
        'Your ' || NEW.title || ' has been sold. Delivery workflow starts now.', 'success',
        jsonb_build_object('car_id', NEW.id), v_event);
    ELSIF NEW.status = 'listed' OR (NEW.status = 'available' AND OLD.status NOT IN ('available', 'listed')) THEN
      PERFORM public.automation_log('info', 'vehicle-listed', 'Vehicle available for sale',
        jsonb_build_object('car_id', NEW.id, 'title', NEW.title), NULL, v_event);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_cars_status_changed ON public.cars;
CREATE TRIGGER automation_cars_status_changed
  AFTER UPDATE OF status ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.on_cars_status_changed();

-- 6.3 New vehicle inserted (admin listing) -> event + audit.
CREATE OR REPLACE FUNCTION public.on_cars_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.automation_record_event(
    'car.status_changed', 'cars', NEW.id::text,
    jsonb_build_object('car_id', NEW.id, 'title', NEW.title, 'brand', NEW.brand, 'model', NEW.model,
      'price', NEW.price, 'old_status', NULL, 'new_status', NEW.status)
  );
  PERFORM public.automation_audit('car_created', 'cars', NEW.id::text, NULL, NEW.status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_cars_inserted ON public.cars;
CREATE TRIGGER automation_cars_inserted
  AFTER INSERT ON public.cars
  FOR EACH ROW EXECUTE FUNCTION public.on_cars_inserted();

-- ====================================================
-- 7. INSPECTION COMPLETION -> VALUATION PIPELINE
-- (extends the phase-1 completion event with the
-- valuation task + follow-up, idempotent by task dedupe)
-- ====================================================
CREATE OR REPLACE FUNCTION public.on_inspection_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
  v_sales uuid;
  v_vehicle text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    v_event := public.automation_record_event(
      'inspection.completed', 'inspections', NEW.id::text,
      jsonb_build_object('inspection_id', NEW.id, 'city', NEW.city, 'brand', NEW.brand,
        'model', NEW.model, 'overall_score', NEW.overall_score)
    );

    v_vehicle := COALESCE(NEW.brand, '') || ' ' || COALESCE(NEW.model, '');

    PERFORM public.automation_audit('inspection_completed', 'inspections', NEW.id::text,
      OLD.status, NEW.status, NULL, jsonb_build_object('overall_score', NEW.overall_score));

    SELECT id INTO v_sales FROM public.profiles
     WHERE role = 'Sales Associate'::public.user_role AND is_approved = true
     ORDER BY created_at ASC LIMIT 1;

    PERFORM public.automation_create_task(v_sales, 'valuation_task',
      'Valuation pending: ' || v_vehicle,
      'Inspection completed (score ' || COALESCE(NEW.overall_score::text, '—') || '). Prepare the certified offer for the seller.',
      'high', now() + interval '1 day', 'inspections', NEW.id::text, 'valuation-' || NEW.id::text);

    PERFORM public.automation_notify(v_sales, 'Inspection Completed',
      'The 120-point inspection for ' || v_vehicle || ' is complete. Prepare the valuation offer.',
      'action', jsonb_build_object('inspection_id', NEW.id, 'score', NEW.overall_score), v_event);

    PERFORM public.automation_create_follow_up('inspections', NEW.id::text, 'VALUATION',
      v_sales, 'Sales Associate', 'high', now() + interval '24 hours',
      'Prepare certified offer once the inspection report is approved.',
      'Valuation Follow-up', 'Prepare the certified offer for ' || v_vehicle || '.',
      jsonb_build_object('inspection_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_completed ON public.inspections;
CREATE TRIGGER automation_inspection_completed
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_completed();

-- 7b. Inspection status change audit (all transitions).
CREATE OR REPLACE FUNCTION public.on_inspection_status_change_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.automation_audit('inspection_status_changed', 'inspections', NEW.id::text,
      OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_status_audit ON public.inspections;
CREATE TRIGGER automation_inspection_status_audit
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_status_change_audit();

-- ====================================================
-- 8. LEAD (sales_notifications) CHANGE AUDIT
-- ====================================================
CREATE OR REPLACE FUNCTION public.on_lead_changed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    PERFORM public.automation_audit('lead_updated', 'sales_notifications', NEW.id::text,
      COALESCE(OLD.status, 'pending'), NEW.status,
      CASE WHEN NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN 'assigned' ELSE NULL END,
      jsonb_build_object('lead_type', NEW.type, 'assigned_to', NEW.assigned_to));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_lead_changed ON public.sales_notifications;
CREATE TRIGGER automation_lead_changed
  AFTER UPDATE ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_lead_changed();

-- ====================================================
-- 9. SCHEDULED JOBS (pg_cron, guarded)
-- ====================================================

-- 9.1 Overdue follow-ups: flag + notify assignee, escalate to Admin.
CREATE OR REPLACE FUNCTION public.automation_follow_up_due()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_admin uuid;
BEGIN
  FOR v_rec IN
    SELECT f.id, f.assignee_id, f.follow_up_type, f.related_table, f.related_id, f.due_at
      FROM public.follow_ups f
     WHERE f.status IN ('open', 'in_progress') AND f.due_at IS NOT NULL AND f.due_at < now()
  LOOP
    UPDATE public.follow_ups SET status = 'overdue' WHERE id = v_rec.id AND status <> 'overdue';
    IF FOUND THEN
      IF v_rec.assignee_id IS NOT NULL THEN
        PERFORM public.automation_notify(v_rec.assignee_id, 'Follow-up Overdue',
          'Follow-up "' || v_rec.follow_up_type || '" for ' || COALESCE(v_rec.related_table, 'record') ||
          ' #' || COALESCE(v_rec.related_id, '') || ' is overdue.',
          'alert', jsonb_build_object('follow_up_id', v_rec.id), NULL);
      END IF;
      SELECT id INTO v_admin FROM public.profiles
       WHERE role = 'Admin'::public.user_role AND is_approved = true
       ORDER BY created_at ASC LIMIT 1;
      IF v_admin IS NOT NULL THEN
        PERFORM public.automation_notify(v_admin, 'Follow-up Escalated',
          'Follow-up "' || v_rec.follow_up_type || '" is overdue and escalated to you.',
          'alert', jsonb_build_object('follow_up_id', v_rec.id), NULL);
      END IF;
      PERFORM public.automation_log('warn', 'follow-up-overdue', 'Follow-up marked overdue',
        jsonb_build_object('follow_up_id', v_rec.id), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 9.2 Offer expiry: stale pending offers expire (setting automation.offer_expiry_days).
CREATE OR REPLACE FUNCTION public.automation_offer_expiry()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_days integer := COALESCE((SELECT value::integer FROM public.settings WHERE key = 'automation.offer_expiry_days'), 7);
  v_count integer := 0;
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT o.id, o.inspection_id, o.dealer_id, o.dealer_name, o.offer_amount, o.created_at
      FROM public.offers o
     WHERE o.status = 'pending' AND o.created_at < now() - make_interval(days => v_days)
  LOOP
    UPDATE public.offers SET status = 'expired' WHERE id = v_rec.id AND status = 'pending';
    IF FOUND THEN
      PERFORM public.automation_log('info', 'offer-expired', 'Pending offer expired',
        jsonb_build_object('offer_id', v_rec.id, 'amount', v_rec.offer_amount), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 9.3 Reservation expiry: release vehicles reserved too long (setting
-- automation.reservation_expiry_days), notifying the buyer.
CREATE OR REPLACE FUNCTION public.automation_reservation_expiry()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_days integer := COALESCE((SELECT value::integer FROM public.settings WHERE key = 'automation.reservation_expiry_days'), 3);
  v_count integer := 0;
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT c.id, c.title
      FROM public.cars c
     WHERE c.status = 'reserved'
       AND c.updated_at < now() - make_interval(days => v_days)
  LOOP
    UPDATE public.cars SET status = 'available', updated_at = now() WHERE id = v_rec.id AND status = 'reserved';
    IF FOUND THEN
      PERFORM public.automation_log('info', 'reservation-expired', 'Reservation released',
        jsonb_build_object('car_id', v_rec.id, 'title', v_rec.title), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 9.4 Extend the one-shot maintenance pass with the new jobs.
CREATE OR REPLACE FUNCTION public.automation_run_overdue_checks()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_overdue integer;
  v_reminders integer;
  v_followups integer;
  v_offers integer;
  v_reservations integer;
BEGIN
  v_overdue := public.automation_inspection_overdue();
  v_reminders := public.automation_task_reminders();
  v_followups := public.automation_follow_up_due();
  v_offers := public.automation_offer_expiry();
  v_reservations := public.automation_reservation_expiry();
  PERFORM public.automation_log('info', 'overdue-checks',
    'Maintenance pass completed',
    jsonb_build_object('overdue_inspections', v_overdue, 'task_reminders', v_reminders,
      'follow_ups', v_followups, 'offers_expired', v_offers, 'reservations_released', v_reservations), NULL, NULL);
  RETURN v_overdue + v_reminders + v_followups + v_offers + v_reservations;
END;
$$;

-- Seed phase-2 settings.
INSERT INTO public.settings (key, value, description) VALUES
  ('automation.follow_up_hours', '24', 'Automation engine: default follow-up due window in hours'),
  ('automation.offer_expiry_days', '7', 'Automation engine: days before a pending offer expires'),
  ('automation.reservation_expiry_days', '3', 'Automation engine: days before a reserved vehicle is released')
ON CONFLICT (key) DO NOTHING;

-- Schedule the extended pass (recreate the jobs so the new workload is covered).
DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AND to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname IN ('automation-inspection-overdue', 'automation-task-reminders', 'automation-maintenance');
    PERFORM cron.schedule('automation-maintenance', '*/30 * * * *',
      $cmd$SELECT public.automation_run_overdue_checks()$cmd$);
  END IF;
END $$;

-- ====================================================
-- 10. ROLE GRANTS
-- ====================================================
GRANT EXECUTE ON FUNCTION public.automation_audit(text, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_create_task(uuid, text, text, text, text, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_create_follow_up(text, text, text, uuid, text, text, timestamptz, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_follow_up_due() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_offer_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_reservation_expiry() TO authenticated;

GRANT SELECT ON public.follow_ups, public.audit_trail, public.car_status_flow TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
