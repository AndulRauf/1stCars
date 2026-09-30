-- ============================================================
-- 1stCars — Sales CRM: keep test_drives.sales_associate_id in sync
-- Run in the Supabase SQL Editor (idempotent, safe to re-run).
--
-- WHY: sales_crm_create_appointment() (AFTER INSERT on
-- sales_notifications) copies NEW.assigned_to into
-- test_drives.sales_associate_id. But test-drive bookings are inserted
-- WITHOUT assigned_to (BookingModal assigns in the background / the
-- auto-assign trigger may round-robin later), so the appointment row is
-- permanently orphaned with sales_associate_id = NULL — and the Sales
-- Associate's Test Drives tab (filtered by sales_associate_id) stays
-- empty even though the lead IS assigned to them.
--
-- FIX: (1) an AFTER UPDATE trigger propagates every later assignment
-- onto the linked appointment row; (2) a one-time backfill repairs
-- rows that are already orphaned.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sales_crm_sync_appointment_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    UPDATE public.test_drives
       SET sales_associate_id = NEW.assigned_to
     WHERE lead_id = NEW.id
       AND (sales_associate_id IS NULL OR sales_associate_id IS DISTINCT FROM NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_appointment_assignee_sync ON public.sales_notifications;
CREATE TRIGGER sales_crm_appointment_assignee_sync
  AFTER UPDATE OF assigned_to ON public.sales_notifications
  FOR EACH ROW EXECUTE FUNCTION public.sales_crm_sync_appointment_assignee();

-- Backfill: repair appointment rows orphaned before this trigger existed.
UPDATE public.test_drives td
   SET sales_associate_id = sn.assigned_to
  FROM public.sales_notifications sn
 WHERE td.lead_id = sn.id
   AND td.sales_associate_id IS NULL
   AND sn.assigned_to IS NOT NULL;
