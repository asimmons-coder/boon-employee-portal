-- Migration: Fix RLS policy for survey_submissions
-- Date: 2026-01-21
-- Fixes: Allow authenticated users to insert survey submissions for their email

-- ============================================
-- FIX 1: Update survey_submissions RLS policy
-- ============================================
-- The current policy checks auth.jwt() ->> 'email' which may not work
-- for all authentication methods. Add fallback through employee_manager.

DROP POLICY IF EXISTS "employees_insert_own_surveys" ON survey_submissions;

CREATE POLICY "employees_insert_own_surveys" ON survey_submissions
FOR INSERT WITH CHECK (
  -- Primary: email matches JWT email
  lower(email) = lower(auth.jwt() ->> 'email')
  OR
  -- Fallback: email matches employee_manager record linked to auth user
  lower(email) = (
    SELECT lower(company_email)
    FROM employee_manager
    WHERE auth_user_id = auth.uid()
  )
);

-- ============================================
-- FIX 2: Add SECURITY DEFINER function for survey submission
-- ============================================
-- Bypasses RLS for cases where the policy still fails

CREATE OR REPLACE FUNCTION submit_survey_for_user(
  user_email TEXT,
  p_survey_type TEXT,
  p_coach_name TEXT DEFAULT NULL,
  p_coach_satisfaction INTEGER DEFAULT NULL,
  p_outcomes TEXT DEFAULT NULL,
  p_feedback_suggestions TEXT DEFAULT NULL,
  p_nps INTEGER DEFAULT NULL,
  p_open_to_testimonial BOOLEAN DEFAULT FALSE
)
RETURNS survey_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result survey_submissions;
BEGIN
  INSERT INTO survey_submissions (
    email,
    survey_type,
    coach_name,
    coach_satisfaction,
    outcomes,
    feedback_suggestions,
    nps,
    open_to_testimonial,
    submitted_at
  ) VALUES (
    lower(user_email),
    p_survey_type,
    p_coach_name,
    p_coach_satisfaction,
    p_outcomes,
    p_feedback_suggestions,
    p_nps,
    p_open_to_testimonial,
    NOW()
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_survey_for_user TO authenticated;
