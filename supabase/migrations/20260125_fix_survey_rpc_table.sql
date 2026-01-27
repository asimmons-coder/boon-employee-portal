-- Migration: Fix submit_survey_for_user to use employee_manager table
-- Date: 2026-01-25
-- Uses actual survey_type values: feedback, touchpoint, first_session, sixth_session, midpoint, end_of_program

-- Drop existing function
DROP FUNCTION IF EXISTS submit_survey_for_user(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER, BOOLEAN, INTEGER, BOOLEAN, TEXT[], BOOLEAN);

CREATE OR REPLACE FUNCTION submit_survey_for_user(
  user_email TEXT,
  p_survey_type TEXT,
  p_coach_name TEXT DEFAULT NULL,
  p_coach_satisfaction INTEGER DEFAULT NULL,
  p_outcomes TEXT DEFAULT NULL,
  p_feedback_suggestions TEXT DEFAULT NULL,
  p_nps INTEGER DEFAULT NULL,
  p_open_to_testimonial BOOLEAN DEFAULT FALSE,
  -- New fields for check-in survey
  p_match_rating INTEGER DEFAULT NULL,
  p_next_session_booked BOOLEAN DEFAULT NULL,
  p_not_booked_reasons TEXT[] DEFAULT NULL,
  p_open_to_followup BOOLEAN DEFAULT NULL
)
RETURNS survey_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result survey_submissions;
  emp_record RECORD;
BEGIN
  -- Look up employee data from employee_manager table
  SELECT
    em.first_name,
    em.last_name,
    em.company_name as account_name,
    em.program as program_title,
    CASE
      WHEN upper(em.program) LIKE 'GROW%' THEN 'GROW'
      WHEN upper(em.program) LIKE 'SCALE%' THEN 'SCALE'
      WHEN upper(em.program) LIKE 'EXEC%' THEN 'EXEC'
      ELSE 'SCALE'
    END as program_type
  INTO emp_record
  FROM employee_manager em
  WHERE lower(em.company_email) = lower(user_email)
  LIMIT 1;

  INSERT INTO survey_submissions (
    email,
    first_name,
    last_name,
    account_name,
    program_title,
    program_type,
    survey_type,
    coach_name,
    coach_satisfaction,
    outcomes,
    feedback_suggestions,
    nps,
    open_to_testimonial,
    match_rating,
    next_session_booked,
    not_booked_reasons,
    open_to_followup,
    submitted_at
  ) VALUES (
    lower(user_email),
    emp_record.first_name,
    emp_record.last_name,
    emp_record.account_name,
    emp_record.program_title,
    emp_record.program_type,
    p_survey_type,
    p_coach_name,
    p_coach_satisfaction,
    p_outcomes,
    p_feedback_suggestions,
    p_nps,
    p_open_to_testimonial,
    p_match_rating,
    p_next_session_booked,
    p_not_booked_reasons,
    p_open_to_followup,
    NOW()
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_survey_for_user TO authenticated;
