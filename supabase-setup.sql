-- ============================================
-- BOON EMPLOYEE PORTAL - SUPABASE SETUP
-- ============================================
-- Run this in your Supabase SQL Editor
-- This adds the auth_user_id column and RLS policies
-- for the employee-facing portal
-- ============================================


-- 1. Add auth_user_id column to employee_manager
-- This links Supabase auth users to employee records
-- ============================================

ALTER TABLE public.employee_manager
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_manager_auth_user_id 
ON public.employee_manager(auth_user_id);

-- Create index on company_email for magic link lookup
CREATE INDEX IF NOT EXISTS idx_employee_manager_company_email 
ON public.employee_manager(lower(company_email));


-- 2. Enable Row Level Security on all relevant tables
-- ============================================

ALTER TABLE employee_manager ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE welcome_survey_scale ENABLE ROW LEVEL SECURITY;


-- 3. RLS Policies for employee_manager
-- Employees can only see their own record
-- ============================================

-- Drop existing employee-specific policies if they exist
DROP POLICY IF EXISTS "employees_view_own_profile" ON employee_manager;
DROP POLICY IF EXISTS "employees_update_own_profile" ON employee_manager;

-- Employees can read their own record (matched by auth_user_id)
CREATE POLICY "employees_view_own_profile"
ON employee_manager
FOR SELECT
USING (
  auth.uid() = auth_user_id
  OR
  -- Also allow lookup by email for initial login before auth_user_id is set
  lower(company_email) = lower(auth.jwt() ->> 'email')
);

-- Employees can update limited fields on their own record
CREATE POLICY "employees_update_own_profile"
ON employee_manager
FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);


-- 4. RLS Policies for session_tracking
-- Employees can only see their own sessions
-- ============================================

DROP POLICY IF EXISTS "employees_view_own_sessions" ON session_tracking;

CREATE POLICY "employees_view_own_sessions"
ON session_tracking
FOR SELECT
USING (
  employee_id = (
    SELECT id 
    FROM employee_manager 
    WHERE auth_user_id = auth.uid()
  )
);


-- 5. RLS Policies for survey_submissions
-- Employees can only see their own survey responses
-- ============================================

DROP POLICY IF EXISTS "employees_view_own_surveys" ON survey_submissions;

CREATE POLICY "employees_view_own_surveys"
ON survey_submissions
FOR SELECT
USING (
  lower(email) = (
    SELECT lower(company_email) 
    FROM employee_manager 
    WHERE auth_user_id = auth.uid()
  )
  OR
  lower(email) = lower(auth.jwt() ->> 'email')
);


-- 6. RLS Policies for welcome_survey_scale (baseline survey)
-- Employees can only see their own baseline survey
-- ============================================

DROP POLICY IF EXISTS "employees_view_own_baseline" ON welcome_survey_scale;

CREATE POLICY "employees_view_own_baseline"
ON welcome_survey_scale
FOR SELECT
USING (
  lower(email) = (
    SELECT lower(company_email) 
    FROM employee_manager 
    WHERE auth_user_id = auth.uid()
  )
  OR
  lower(email) = lower(auth.jwt() ->> 'email')
);


-- 7. Helper Functions for Auth Flow
-- ============================================

-- Function to check if an employee exists (for pre-login validation)
CREATE OR REPLACE FUNCTION check_employee_exists(lookup_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM employee_manager 
    WHERE lower(company_email) = lower(lookup_email)
      AND (status IS NULL OR status != 'Inactive')
  );
END;
$$;

-- Function to link auth user to employee (called after first sign-in)
CREATE OR REPLACE FUNCTION link_auth_user_to_employee(lookup_email TEXT, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employee_manager
  SET auth_user_id = user_id
  WHERE lower(company_email) = lower(lookup_email)
    AND auth_user_id IS NULL;  -- Only if not already linked
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_employee_exists TO anon, authenticated;
GRANT EXECUTE ON FUNCTION link_auth_user_to_employee TO authenticated;


-- 8. Optional: Add session summary column if it doesn't exist
-- ============================================

ALTER TABLE public.session_tracking
ADD COLUMN IF NOT EXISTS summary TEXT;


-- 9. Optional: Create action_items table for future use
-- ============================================

CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  session_id BIGINT REFERENCES session_tracking(id),
  coach_name TEXT,
  action_text TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on action_items
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Employees can view and update their own action items
CREATE POLICY "employees_manage_own_actions"
ON action_items
FOR ALL
USING (
  lower(email) = (
    SELECT lower(company_email) 
    FROM employee_manager 
    WHERE auth_user_id = auth.uid()
  )
  OR
  lower(email) = lower(auth.jwt() ->> 'email')
);


-- 10. Optional: Create session_feedback table
-- ============================================

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id BIGINT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on session_feedback
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- Employees can insert feedback for their own sessions
CREATE POLICY "employees_submit_feedback"
ON session_feedback
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM session_tracking st
    WHERE st.id = session_id
    AND st.employee_id = (
      SELECT id FROM employee_manager WHERE auth_user_id = auth.uid()
    )
  )
);


-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify the setup worked
-- ============================================

-- Check if auth_user_id column exists
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'employee_manager' AND column_name = 'auth_user_id';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('employee_manager', 'session_tracking', 'survey_submissions', 'welcome_survey_scale');

-- List all policies
-- SELECT tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;


-- ============================================
-- IMPORTANT: Configure Supabase Auth
-- ============================================
-- 
-- In your Supabase Dashboard:
-- 
-- 1. Go to Authentication > URL Configuration
-- 2. Add to "Redirect URLs":
--    - http://localhost:5173/auth/callback (for local dev)
--    - https://your-production-domain.com/auth/callback
--
-- 3. Go to Authentication > Email Templates
-- 4. Customize the magic link email if desired
--
-- ============================================
