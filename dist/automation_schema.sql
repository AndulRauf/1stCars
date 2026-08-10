-- ====================================================
-- 1stCars Native Automation Engine — DDL Migration
-- Event ledger, job queue, audit logs, internal task
-- queue, CRM activities, PL/pgSQL rules + guarded
-- pg_cron jobs. Idempotent: safe to re-run in the
-- Supabase SQL Editor (no external automation tools).
-- ====================================================


-- ====================================================
-- 1. NEW TABLES
-- ====================================================

-- 1.1 AUTOMATION EVENTS (idempotency source).
-- Every business event (inspection created, lead submitted,
-- auction ended, ...) is recorded here. `action_key` is a
-- deterministic dedupe key so a re-fired trigger / retried
-- request never records the same event twice.
CREATE TABLE IF NOT EXISTS public.automation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  source_table TEXT,
  source_id TEXT,
  action_key TEXT UNIQUE,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, processed, failed, skipped
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS automation_events_status_idx ON public.automation_events (status);
CREATE INDEX IF NOT EXISTS automation_events_type_idx ON public.automation_events (event_type, created_at);

-- 1.2 AUTOMATION JOBS (rule executions / scheduled jobs).
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_key TEXT UNIQUE,
  job_type TEXT NOT NULL,
  source_id TEXT,
  status TEXT DEFAULT 'queued' NOT NULL, -- queued, running, completed, failed, retrying, cancelled
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 1.3 AUTOMATION LOGS (execution audit trail).
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.automation_jobs(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.automation_events(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'info' NOT NULL, -- info, warn, error
  action TEXT,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS automation_logs_event_idx ON public.automation_logs (event_id);

-- 1.4 TASKS (internal work queue assigned to staff).
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = system
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' NOT NULL, -- low, medium, high, urgent
  status TEXT DEFAULT 'open' NOT NULL, -- open, in_progress, completed, cancelled, overdue
  due_at TIMESTAMP WITH TIME ZONE,
  source_table TEXT,
  source_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_assignee_status_idx ON public.tasks (assignee_id, status);

-- 1.5 CRM ACTIVITIES (customer activity timeline for staff).
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  subject TEXT,
  detail TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS crm_activities_customer_idx ON public.crm_activities (customer_id, created_at);

-- Sales leads need a place to hold their auto-assigned sales associate.
ALTER TABLE public.sales_notifications ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Seed automation feature flags (default OFF so existing manual workflows
-- keep working until the admin switches them on in the Automation Center).
INSERT INTO public.settings (key, value, description) VALUES
  ('automation.auto_assign_inspector', 'false', 'Automation engine: auto-assign inspectors to new inspection requests'),
  ('automation.auto_assign_sales', 'false', 'Automation engine: auto-assign sales associates to new buyer leads'),
  ('automation.reminders', 'true', 'Automation engine: overdue + follow-up reminders'),
  ('automation.poller_interval', '60', 'In-app poller interval in seconds (0 disables in-app polling)')
ON CONFLICT (key) DO NOTHING;


-- ====================================================
-- 2. ROW LEVEL SECURITY
-- ====================================================
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Automation events/jobs/logs: staff read, admin manages.
DROP POLICY IF EXISTS "Staff read automation events" ON public.automation_events;
CREATE POLICY "Staff read automation events" ON public.automation_events FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "System writes automation events" ON public.automation_events;
CREATE POLICY "System writes automation events" ON public.automation_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin manages automation events" ON public.automation_events;
CREATE POLICY "Admin manages automation events" ON public.automation_events FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read automation jobs" ON public.automation_jobs;
CREATE POLICY "Staff read automation jobs" ON public.automation_jobs FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages automation jobs" ON public.automation_jobs;
CREATE POLICY "Admin manages automation jobs" ON public.automation_jobs FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read automation logs" ON public.automation_logs;
CREATE POLICY "Staff read automation logs" ON public.automation_logs FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages automation logs" ON public.automation_logs;
CREATE POLICY "Admin manages automation logs" ON public.automation_logs FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- Tasks: assignee + staff read, assignee updates own task status, staff manage.
DROP POLICY IF EXISTS "Assignee and staff read tasks" ON public.tasks;
CREATE POLICY "Assignee and staff read tasks" ON public.tasks FOR SELECT USING (
  auth.uid() = assignee_id
  OR public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role, 'Inspector'::public.user_role)
);
DROP POLICY IF EXISTS "Assignee updates own tasks" ON public.tasks;
CREATE POLICY "Assignee updates own tasks" ON public.tasks FOR UPDATE USING (
  auth.uid() = assignee_id OR public.get_auth_user_role() = 'Admin'::public.user_role
);
DROP POLICY IF EXISTS "Admin manages tasks" ON public.tasks;
CREATE POLICY "Admin manages tasks" ON public.tasks FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);

-- CRM activities: staff read/write, customers read their own timeline.
DROP POLICY IF EXISTS "Staff read crm activities" ON public.crm_activities;
CREATE POLICY "Staff read crm activities" ON public.crm_activities FOR SELECT USING (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role)
);
DROP POLICY IF EXISTS "Customers read own crm activities" ON public.crm_activities;
CREATE POLICY "Customers read own crm activities" ON public.crm_activities FOR SELECT USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Staff write crm activities" ON public.crm_activities;
CREATE POLICY "Staff write crm activities" ON public.crm_activities FOR INSERT WITH CHECK (
  public.get_auth_user_role() IN ('Admin'::public.user_role, 'Sales Associate'::public.user_role)
);
DROP POLICY IF EXISTS "Admin manages crm activities" ON public.crm_activities;
CREATE POLICY "Admin manages crm activities" ON public.crm_activities FOR ALL USING (public.get_auth_user_role() = 'Admin'::public.user_role) WITH CHECK (true);


-- ====================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- ====================================================

-- 3.1 Write an audit log entry.
CREATE OR REPLACE FUNCTION public.automation_log(
  p_level text,
  p_action text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_job_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.automation_logs (job_id, event_id, level, action, message, metadata)
  VALUES (p_job_id, p_event_id, coalesce(p_level, 'info'), p_action, p_message, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

-- 3.2 Record a business event (idempotent via action_key).
CREATE OR REPLACE FUNCTION public.automation_record_event(
  p_event_type text,
  p_source_table text,
  p_source_id text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_key text := p_event_type || ':' || coalesce(p_source_table, '') || ':' || coalesce(p_source_id, '');
  v_id uuid;
BEGIN
  IF p_event_type IS NULL OR p_event_type = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;
  INSERT INTO public.automation_events (event_type, source_table, source_id, action_key, payload, status)
  VALUES (p_event_type, p_source_table, p_source_id, v_key, coalesce(p_payload, '{}'::jsonb), 'pending')
  ON CONFLICT (action_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.automation_events WHERE action_key = v_key;
  END IF;
  RETURN v_id;
END;
$$;

-- 3.3 Create a system notification (and audit it).
CREATE OR REPLACE FUNCTION public.automation_notify(
  p_recipient_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_event_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_recipient_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (recipient_id, title, message, type, metadata)
  VALUES (p_recipient_id, p_title, p_message, coalesce(p_type, 'info'), coalesce(p_metadata, '{}'::jsonb));
  PERFORM public.automation_log('info', 'notify', p_title,
    jsonb_build_object('recipient_id', p_recipient_id, 'metadata', p_metadata),
    NULL, p_event_id);
END;
$$;

-- 3.4 Check whether an automation feature flag is ON.
CREATE OR REPLACE FUNCTION public.automation_flag_on(p_key text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT lower(value) IN ('true', 'on', '1', 'yes')
  FROM public.settings
  WHERE key = p_key
$$;

-- ====================================================
-- 4. RULES
-- ====================================================

-- 4.1 Auto-assign an inspector to an inspection request.
CREATE OR REPLACE FUNCTION public.automation_auto_assign_inspector(
  p_inspection_id uuid,
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_insp public.profiles%ROWTYPE;
  v_city text;
  v_vehicle text;
  v_inspector_id uuid;
BEGIN
  IF p_inspection_id IS NULL THEN RETURN NULL; END IF;

  IF NOT public.automation_flag_on('automation.auto_assign_inspector') THEN
    PERFORM public.automation_log('warn', 'assign-inspector',
      'Auto-assign disabled, inspection left for manual assignment',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  SELECT city INTO v_city FROM public.inspections WHERE id = p_inspection_id;
  IF v_city IS NULL THEN
    PERFORM public.automation_log('error', 'assign-inspector', 'Inspection not found',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  PERFORM 1 FROM public.inspections WHERE id = p_inspection_id AND inspector_id IS NOT NULL;
  IF FOUND THEN
    PERFORM public.automation_log('warn', 'assign-inspector', 'Inspection already assigned',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  -- Lowest open-workload inspector, same city preferred.
  SELECT p.id, p.name, p.city, p.email INTO v_insp
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT count(*) AS load FROM public.inspections i
      WHERE i.inspector_id = p.id AND i.status IN ('pending', 'assigned')
    ) l ON true
   WHERE p.role = 'Inspector'::public.user_role AND p.is_approved = true
     AND (p.city ILIKE v_city OR p.city IS NULL OR p.city = '')
   ORDER BY l.load ASC, p.created_at ASC
   LIMIT 1;

  IF v_insp.id IS NULL THEN
    SELECT p.id, p.name, p.city, p.email INTO v_insp
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT count(*) AS load FROM public.inspections i
        WHERE i.inspector_id = p.id AND i.status IN ('pending', 'assigned')
      ) l ON true
     WHERE p.role = 'Inspector'::public.user_role AND p.is_approved = true
     ORDER BY l.load ASC, p.created_at ASC
     LIMIT 1;
  END IF;

  IF v_insp.id IS NULL THEN
    PERFORM public.automation_log('warn', 'assign-inspector', 'No available inspectors',
      jsonb_build_object('inspection_id', p_inspection_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  v_vehicle := COALESCE((SELECT brand || ' ' || model FROM public.inspections WHERE id = p_inspection_id), 'Vehicle');

  UPDATE public.inspections
     SET inspector_id = v_insp.id, status = 'assigned', updated_at = now()
   WHERE id = p_inspection_id;

  INSERT INTO public.tasks (assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id)
  VALUES (
    v_insp.id,
    'inspection_assignment',
    'Inspect ' || v_vehicle || ' (' || v_city || ')',
    'Vehicle inspection scheduled in ' || v_city || '. Visit the assigned inspections queue and complete the 120-point report.',
    'high', 'open', now() + interval '2 days', 'inspections', p_inspection_id::text
  );

  PERFORM public.automation_notify(v_insp.id,
    'New Inspection Assigned',
    'Inspection for ' || v_vehicle || ' in ' || v_city || ' was auto-assigned to you by the automation engine. Please complete it within 48 hours.',
    'action', jsonb_build_object('inspection_id', p_inspection_id, 'city', v_city), p_event_id);

  INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
  SELECT seller_id, v_insp.id, 'auto_assign', 'Inspector auto-assigned',
         'Inspector ' || v_insp.name || ' assigned by automation engine',
         jsonb_build_object('inspection_id', p_inspection_id)
    FROM public.inspections WHERE id = p_inspection_id;

  PERFORM public.automation_log('info', 'assign-inspector', 'Inspection auto-assigned to inspector',
    jsonb_build_object('inspection_id', p_inspection_id, 'inspector_id', v_insp.id, 'inspector', v_insp.name),
    NULL, p_event_id);

  RETURN v_insp.id;
END;
$$;

-- 4.2 Auto-assign a sales associate to a buyer lead.
CREATE OR REPLACE FUNCTION public.automation_auto_assign_sales_lead(
  p_lead_id uuid,
  p_city text,
  p_lead_type text DEFAULT 'lead',
  p_event_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sales public.profiles%ROWTYPE;
  v_title text;
  v_car text;
BEGIN
  IF p_lead_id IS NULL THEN RETURN NULL; END IF;

  IF NOT public.automation_flag_on('automation.auto_assign_sales') THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'Auto-assign disabled for sales leads',
      jsonb_build_object('lead_id', p_lead_id), NULL, p_event_id);
    RETURN NULL;
  END IF;

  PERFORM 1 FROM public.sales_notifications WHERE id = p_lead_id AND assigned_to IS NOT NULL;
  IF FOUND THEN
    PERFORM public.automation_log('warn', 'assign-sales-lead', 'Lead already assigned',
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

  INSERT INTO public.tasks (assignee_id, task_type, title, description, priority, status, due_at, source_table, source_id)
  VALUES (
    v_sales.id,
    'lead_followup',
    v_title,
    COALESCE((SELECT name || ' (' || mobile || ') in ' || city FROM public.sales_notifications WHERE id = p_lead_id), 'New buyer lead') ||
      ' — reach out to confirm interest and schedule the next step.',
    'high', 'open', now() + interval '1 day', 'sales_notifications', p_lead_id::text
  );

  PERFORM public.automation_notify(v_sales.id,
    'New Lead Assigned',
    v_title || ' was auto-assigned to you by the automation engine. Follow up within 24 hours.',
    'action', jsonb_build_object('lead_id', p_lead_id, 'city', p_city), p_event_id);

  INSERT INTO public.crm_activities (customer_id, staff_id, activity_type, subject, detail, metadata)
  VALUES (NULL, v_sales.id, 'auto_assign', 'Lead auto-assigned',
          'Lead #' || p_lead_id || ' (' || p_lead_type || ') assigned by automation engine',
          jsonb_build_object('lead_id', p_lead_id));

  PERFORM public.automation_log('info', 'assign-sales-lead', 'Lead auto-assigned to sales associate',
    jsonb_build_object('lead_id', p_lead_id, 'sales_associate_id', v_sales.id, 'sales_associate', v_sales.name),
    NULL, p_event_id);

  RETURN v_sales.id;
END;
$$;


-- ====================================================
-- 5. TRIGGERS
-- ====================================================

-- 5.1 Inspection created -> event + optional auto-assignment.
CREATE OR REPLACE FUNCTION public.on_inspection_inserted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event uuid;
BEGIN
  v_event := public.automation_record_event(
    'inspection.created', 'inspections', NEW.id::text,
    jsonb_build_object(
      'inspection_id', NEW.id, 'city', NEW.city, 'brand', NEW.brand, 'model', NEW.model,
      'variant', NEW.variant, 'year', NEW.year, 'km_driven', NEW.km_driven,
      'seller_name', NEW.seller_name, 'seller_mobile', NEW.seller_mobile,
      'seller_email', NEW.seller_email, 'preferred_date', NEW.preferred_date,
      'preferred_time', NEW.preferred_time
    )
  );
  PERFORM public.automation_auto_assign_inspector(NEW.id, v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_created ON public.inspections;
CREATE TRIGGER automation_inspection_created
  AFTER INSERT ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_inserted();

-- 5.2 Sales lead submitted -> event + optional auto-assignment.
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
      'preferred_date', NEW.preferred_date, 'preferred_time', NEW.preferred_time
    )
  );
  PERFORM public.automation_auto_assign_sales_lead(NEW.id, NEW.city, NEW.type, v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_sales_lead_created ON public.sales_notifications;
CREATE TRIGGER automation_sales_lead_created
  AFTER INSERT ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_sales_lead_inserted();

-- 5.3 Inspection completed -> event (downstream: offers / valuation pipeline).
CREATE OR REPLACE FUNCTION public.on_inspection_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM public.automation_record_event(
      'inspection.completed', 'inspections', NEW.id::text,
      jsonb_build_object('inspection_id', NEW.id, 'city', NEW.city, 'brand', NEW.brand,
        'model', NEW.model, 'overall_score', NEW.overall_score)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_inspection_completed ON public.inspections;
CREATE TRIGGER automation_inspection_completed
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.on_inspection_completed();

-- 5.4 Auction ended -> event (downstream: winner notification / car status).
CREATE OR REPLACE FUNCTION public.on_auction_ended()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status IS DISTINCT FROM 'ended' THEN
    PERFORM public.automation_record_event(
      'auction.ended', 'auctions', NEW.id::text,
      jsonb_build_object('auction_id', NEW.id, 'car_title', NEW.car_title,
        'current_bid', NEW.current_bid, 'highest_bidder_name', NEW.highest_bidder_name, 'ends_at', NEW.ends_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_auction_ended ON public.auctions;
CREATE TRIGGER automation_auction_ended
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.on_auction_ended();


-- ====================================================
-- 6. SCHEDULED JOBS (pg_cron, guarded so this file also
--    runs safely on databases without the extension)
-- ====================================================

-- 6.1 Overdue inspections: escalate assigned inspections whose preferred
-- date has passed. Returns the number of escalations performed.
CREATE OR REPLACE FUNCTION public.automation_inspection_overdue()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
  v_vehicle text;
BEGIN
  FOR v_rec IN
    SELECT i.id, i.inspector_id, i.city, i.brand, i.model, i.preferred_date
      FROM public.inspections i
     WHERE i.status IN ('assigned', 'pending')
       AND i.preferred_date < current_date
       AND i.overall_score IS NULL
     ORDER BY i.preferred_date ASC
  LOOP
    v_vehicle := coalesce(v_rec.brand, '') || ' ' || coalesce(v_rec.model, '');

    INSERT INTO public.automation_jobs (job_key, job_type, source_id, status, metadata)
    VALUES ('overdue-inspection-' || v_rec.id, 'inspection_overdue', v_rec.id::text, 'completed',
            jsonb_build_object('inspection_id', v_rec.id, 'city', v_rec.city))
    ON CONFLICT (job_key) DO NOTHING;

    IF FOUND THEN
      IF v_rec.inspector_id IS NOT NULL THEN
        PERFORM public.automation_notify(v_rec.inspector_id,
          'Inspection Overdue',
          'The inspection for ' || v_vehicle || ' (' || v_rec.city || ') was due on ' ||
            to_char(v_rec.preferred_date, 'YYYY-MM-DD') || '. Please complete it today.',
          'alert', jsonb_build_object('inspection_id', v_rec.id), NULL);
      END IF;
      PERFORM public.automation_log('warn', 'inspection-overdue',
        'Overdue inspection escalated',
        jsonb_build_object('inspection_id', v_rec.id, 'preferred_date', v_rec.preferred_date), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6.2 Task reminders: flip expired open/in-progress tasks to overdue and
-- notify assignees. Returns the number of tasks escalated.
CREATE OR REPLACE FUNCTION public.automation_task_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT t.id, t.assignee_id, t.title, t.due_at
      FROM public.tasks t
     WHERE t.status IN ('open', 'in_progress')
       AND t.due_at IS NOT NULL
       AND t.due_at < now()
  LOOP
    UPDATE public.tasks SET status = 'overdue' WHERE id = v_rec.id AND status <> 'overdue';
    IF FOUND THEN
      IF v_rec.assignee_id IS NOT NULL THEN
        PERFORM public.automation_notify(v_rec.assignee_id,
          'Task Overdue',
          'Task "' || v_rec.title || '" is now overdue (due ' ||
            to_char(v_rec.due_at, 'YYYY-MM-DD HH24:MI') || ').',
          'alert', jsonb_build_object('task_id', v_rec.id), NULL);
      END IF;
      PERFORM public.automation_log('warn', 'task-overdue', 'Task marked overdue',
        jsonb_build_object('task_id', v_rec.id), NULL, NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6.3 One-shot entry point the SPA poller can call to run both maintenance
-- passes (used when pg_cron is unavailable). Returns total work done.
CREATE OR REPLACE FUNCTION public.automation_run_overdue_checks()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_overdue integer;
  v_reminders integer;
BEGIN
  v_overdue := public.automation_inspection_overdue();
  v_reminders := public.automation_task_reminders();
  PERFORM public.automation_log('info', 'overdue-checks',
    'Overdue check pass completed',
    jsonb_build_object('overdue_inspections', v_overdue, 'task_reminders', v_reminders), NULL, NULL);
  RETURN v_overdue + v_reminders;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AND to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname IN ('automation-inspection-overdue', 'automation-task-reminders');
    PERFORM cron.schedule('automation-inspection-overdue', '0 9 * * *',
      $cmd$SELECT public.automation_inspection_overdue()$cmd$);
    PERFORM cron.schedule('automation-task-reminders', '0 * * * *',
      $cmd$SELECT public.automation_task_reminders()$cmd$);
  END IF;
END $$;


-- ====================================================
-- 7. ROLE GRANTS
-- ====================================================
GRANT EXECUTE ON FUNCTION public.automation_record_event(text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.automation_flag_on(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_inspection_overdue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_task_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_run_overdue_checks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_auto_assign_inspector(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_auto_assign_sales_lead(uuid, text, text, uuid) TO authenticated;

GRANT SELECT ON public.automation_events, public.automation_jobs, public.automation_logs, public.tasks, public.crm_activities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
