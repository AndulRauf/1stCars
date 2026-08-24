-- ============================================================
-- 1stCars — Careers: job application submissions
--
-- Creates the `career_applications` table used by the /careers
-- page application form (src/components/CareersView.tsx).
--
-- Run this ENTIRE file once in the Supabase Dashboard:
--   SQL Editor  →  New query  →  paste  →  Run
-- It is idempotent (safe to run multiple times).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  experience TEXT,
  message TEXT,
  resume_url TEXT,
  resume_name TEXT,
  status TEXT DEFAULT 'pending' NOT NULL
);

-- Applications contain applicant PII (name/phone/email). Visitors may SUBMIT
-- an application, but only staff (Admin / Sales Associate) can read, update,
-- or delete them — mirroring the sales_notifications lead policy.
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visitors submit career applications" ON public.career_applications;
DROP POLICY IF EXISTS "Staff manage career applications" ON public.career_applications;

CREATE POLICY "Visitors submit career applications"
  ON public.career_applications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff manage career applications"
  ON public.career_applications
  FOR ALL
  USING (public.get_auth_user_role() IN ('Admin', 'Sales Associate'))
  WITH CHECK (public.get_auth_user_role() IN ('Admin', 'Sales Associate'));

-- Optional: private "resumes" storage bucket for uploaded CVs. Public buckets
-- are created from the Supabase Dashboard; if this bucket does not exist the
-- form still works and records only the resume file name.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;