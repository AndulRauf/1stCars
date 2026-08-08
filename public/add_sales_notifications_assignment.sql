-- ============================================================
-- 1stCars — CRM: buyer-lead → Sales Associate assignment
--
-- Adds the assignee columns to `sales_notifications` and keeps
-- `assigned_at` in sync automatically.
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times).
-- ============================================================

-- 1) Assignee columns on the buyer-lead table (nullable = unassign allowed)
ALTER TABLE public.sales_notifications
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- 2) Auto-stamp assigned_at whenever the assignee changes
CREATE OR REPLACE FUNCTION public.touch_lead_assigned_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    NEW.assigned_at := timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sales_notif_assigned_at ON public.sales_notifications;
CREATE TRIGGER trg_sales_notif_assigned_at
  BEFORE UPDATE ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_lead_assigned_at();
