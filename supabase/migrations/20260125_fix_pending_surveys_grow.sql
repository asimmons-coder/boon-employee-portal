-- ============================================
-- Fix pending_surveys view for GROW programs
-- - Use 12 as default sessions for GROW (not 6)
-- - Add grow_midpoint to survey_type check
-- - Support dynamic midpoint calculation
-- ============================================

-- First, update the survey_type check constraint to include grow_midpoint
ALTER TABLE survey_submissions
DROP CONSTRAINT IF EXISTS survey_submissions_survey_type_check;

-- Update any NULL or unexpected survey_type values
UPDATE survey_submissions
SET survey_type = 'scale_feedback'
WHERE survey_type IS NULL
   OR survey_type NOT IN ('scale_feedback', 'scale_end', 'grow_baseline', 'grow_midpoint', 'grow_end');

-- Add the updated constraint
ALTER TABLE survey_submissions
ADD CONSTRAINT survey_submissions_survey_type_check
CHECK (survey_type IN ('scale_feedback', 'scale_end', 'grow_baseline', 'grow_midpoint', 'grow_end'));

-- Update the pending_surveys view with proper GROW defaults
CREATE OR REPLACE VIEW pending_surveys AS
WITH employee_session_counts AS (
  -- Count completed sessions per employee
  SELECT
    employee_email,
    employee_id,
    COUNT(*) as completed_sessions
  FROM session_tracking
  WHERE status = 'Completed'
  GROUP BY employee_email, employee_id
),
program_info AS (
  -- Get program config via employee_manager -> programs join
  SELECT
    em.id as employee_id,
    em.company_email,
    COALESCE(
      p.program_type,
      CASE
        WHEN upper(em.program) LIKE 'GROW%' THEN 'GROW'
        WHEN upper(em.program) LIKE 'SCALE%' THEN 'SCALE'
        WHEN upper(em.program) LIKE 'EXEC%' THEN 'EXEC'
        ELSE 'SCALE'
      END
    ) as program_type,
    -- Use program-specific defaults: GROW=12, SCALE/EXEC=36
    COALESCE(
      p.sessions_per_employee,
      CASE
        WHEN upper(em.program) LIKE 'GROW%' THEN 12
        WHEN upper(em.program) LIKE 'EXEC%' THEN 12
        ELSE 36
      END
    ) as sessions_per_employee,
    p.program_end_date
  FROM employee_manager em
  LEFT JOIN programs p ON (
    em.program = p.id::text
    OR upper(em.program) LIKE upper(p.name) || '%'
    OR upper(em.program) = upper(p.program_type)
  )
),
-- Milestone-based surveys (regular session feedback)
milestone_surveys AS (
  SELECT
    st.id as session_id,
    st.employee_email as email,
    st.employee_id,
    st.session_date,
    st.appointment_number as session_number,
    st.coach_name,
    st.company_id,
    pi.program_type,
    pi.sessions_per_employee,
    pi.program_end_date,
    esc.completed_sessions,
    -- Determine survey type: midpoint for GROW at session = total/2
    CASE
      WHEN pi.program_type = 'GROW' AND st.appointment_number = (pi.sessions_per_employee / 2)
        THEN 'grow_midpoint'
      ELSE 'scale_feedback'
    END as suggested_survey_type,
    'milestone' as survey_trigger
  FROM session_tracking st
  -- Join on email for more reliable matching (in case employee_id doesn't match)
  JOIN program_info pi ON lower(st.employee_email) = lower(pi.company_email)
  LEFT JOIN employee_session_counts esc ON st.employee_id = esc.employee_id
  -- Check for existing survey by email and session pattern in outcomes
  LEFT JOIN survey_submissions ss ON (
    lower(ss.email) = lower(st.employee_email)
    AND (
      ss.session_id = st.id
      OR ss.outcomes ILIKE '%Session ' || st.appointment_number::text || '%'
    )
  )
  WHERE st.status = 'Completed'
    AND ss.id IS NULL
    -- Apply program-specific milestones
    AND (
      -- SCALE milestones: 1, 3, 6, 12, 18, 24, 30, 36
      (pi.program_type = 'SCALE' AND st.appointment_number IN (1, 3, 6, 12, 18, 24, 30, 36))
      OR
      -- GROW milestones: 1 and midpoint (sessions_per_employee / 2)
      (pi.program_type = 'GROW' AND (
        st.appointment_number = 1
        OR st.appointment_number = (pi.sessions_per_employee / 2)
      ))
      OR
      -- EXEC milestones: 1 and midpoint (like GROW)
      (pi.program_type = 'EXEC' AND (
        st.appointment_number = 1
        OR st.appointment_number = (pi.sessions_per_employee / 2)
      ))
    )
    -- Exclude if already at/past program end (those get end survey instead)
    AND COALESCE(esc.completed_sessions, 0) < pi.sessions_per_employee
),
-- End-of-program surveys (SCALE_END or GROW_END)
end_of_program_surveys AS (
  SELECT DISTINCT ON (pi.employee_id)
    latest_session.id as session_id,
    pi.company_email as email,
    pi.employee_id,
    latest_session.session_date,
    latest_session.appointment_number as session_number,
    latest_session.coach_name,
    latest_session.company_id,
    pi.program_type,
    pi.sessions_per_employee,
    pi.program_end_date,
    esc.completed_sessions,
    CASE
      WHEN pi.program_type = 'GROW' THEN 'grow_end'
      WHEN pi.program_type = 'EXEC' THEN 'grow_end'
      ELSE 'scale_end'
    END as suggested_survey_type,
    'end_of_program' as survey_trigger
  FROM program_info pi
  JOIN employee_session_counts esc ON pi.employee_id = esc.employee_id
  CROSS JOIN LATERAL (
    -- Get the most recent completed session for end-of-program context
    SELECT st.id, st.session_date, st.appointment_number, st.coach_name, st.company_id
    FROM session_tracking st
    WHERE st.employee_id = pi.employee_id AND st.status = 'Completed'
    ORDER BY st.session_date DESC
    LIMIT 1
  ) latest_session
  WHERE
    -- End condition: completed >= sessions_per_employee
    -- OR program_end_date passed with at least 1 session
    (
      esc.completed_sessions >= pi.sessions_per_employee
      OR (
        pi.program_end_date IS NOT NULL
        AND pi.program_end_date < CURRENT_DATE
        AND esc.completed_sessions >= 1
      )
    )
    -- Check they haven't already submitted an end survey
    AND NOT EXISTS (
      SELECT 1 FROM survey_submissions ss
      WHERE lower(ss.email) = lower(pi.company_email)
      AND ss.survey_type IN ('scale_end', 'grow_end')
    )
)
-- Combine milestone and end-of-program surveys
SELECT
  session_id,
  email,
  employee_id,
  session_date,
  session_number,
  coach_name,
  company_id,
  program_type,
  suggested_survey_type
FROM (
  SELECT * FROM milestone_surveys
  UNION ALL
  SELECT * FROM end_of_program_surveys
) all_pending
ORDER BY session_date ASC;

-- Update the RPC function to return proper types
CREATE OR REPLACE FUNCTION get_pending_survey(user_email TEXT)
RETURNS TABLE (
  session_id uuid,
  session_number int,
  session_date timestamptz,
  coach_name text,
  survey_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.session_id,
    ps.session_number,
    ps.session_date,
    ps.coach_name,
    ps.suggested_survey_type as survey_type
  FROM pending_surveys ps
  WHERE lower(ps.email) = lower(user_email)
  ORDER BY ps.session_date ASC
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_survey TO authenticated;
