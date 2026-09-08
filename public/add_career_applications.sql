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

-- Private "resumes" storage bucket for uploaded CVs. Visitors may UPLOAD
-- (INSERT) only; only Admin / Sales Associate staff may read CVs back for
-- review — the Careers form stores the object path and the Admin panel
-- opens a short-lived signed URL ("View Resume"). If this bucket does not
-- exist the form still works and records only the resume file name.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Anonymous visitors may ONLY upload into the private resumes bucket;
-- they can never read, update or delete anything in it.
DROP POLICY IF EXISTS "Visitors upload resumes" ON storage.objects;
CREATE POLICY "Visitors upload resumes" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'resumes');

-- Only Admin / Sales Associate staff may review (read) uploaded CVs.
DROP POLICY IF EXISTS "Staff review resumes" ON storage.objects;
CREATE POLICY "Staff review resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND public.get_auth_user_role() IN ('Admin', 'Sales Associate'));