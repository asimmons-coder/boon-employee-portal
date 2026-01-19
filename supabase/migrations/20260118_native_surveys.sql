-- ============================================
-- Native Survey System Migration
-- Replaces Typeform for core feedback flows
-- ============================================

-- 1. Core Competencies Reference Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.core_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  display_order int NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert the 12 core competencies
INSERT INTO core_competencies (name, description, display_order) VALUES
('Effective Communication', 'Expressing ideas clearly and listening actively', 1),
('Persuasion and Influence', 'Inspiring and motivating others toward shared goals', 2),
('Adaptability and Resilience', 'Navigating change and bouncing back from setbacks', 3),
('Strategic Thinking', 'Seeing the big picture and planning for the future', 4),
('Emotional Intelligence', 'Understanding and managing emotions in yourself and others', 5),
('Building Relationships at Work', 'Creating meaningful professional connections', 6),
('Self Confidence & Imposter Syndrome', 'Trusting your abilities and owning your achievements', 7),
('Delegation and Accountability', 'Empowering others while maintaining responsibility', 8),
('Giving and Receiving Feedback', 'Offering constructive input and accepting it gracefully', 9),
('Effective Planning and Execution', 'Setting goals and following through systematically', 10),
('Change Management', 'Leading and adapting to organizational transitions', 11),
('Time Management & Productivity', 'Prioritizing effectively and maximizing output', 12)
ON CONFLICT (name) DO NOTHING;

-- 2. Add new columns to survey_submissions
-- ============================================
ALTER TABLE survey_submissions
  ADD COLUMN IF NOT EXISTS survey_type text CHECK (survey_type IN ('scale_feedback', 'scale_end', 'grow_baseline', 'grow_end')),
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS session_number int,
  ADD COLUMN IF NOT EXISTS company_id text,
  ADD COLUMN IF NOT EXISTS coach_name text,
  ADD COLUMN IF NOT EXISTS wants_rematch boolean,
  ADD COLUMN IF NOT EXISTS rematch_reason text,
  ADD COLUMN IF NOT EXISTS outcomes text,
  ADD COLUMN IF NOT EXISTS open_to_testimonial boolean,
  ADD COLUMN IF NOT EXISTS focus_areas text[],
  ADD COLUMN IF NOT EXISTS coach_qualities text[], -- multi-select: made_me_feel_safe, listened_well, provided_tools, challenged_me
  ADD COLUMN IF NOT EXISTS has_booked_next_session boolean,
  ADD COLUMN IF NOT EXISTS feedback_text text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT now();

-- 3. Competency Scores Table (for GROW surveys)
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_competency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_submission_id uuid REFERENCES survey_submissions(id) ON DELETE CASCADE,
  email text NOT NULL,
  competency_name text NOT NULL,
  score int NOT NULL CHECK (score >= 1 AND score <= 5), -- 1=Learning, 2=Growing, 3=Applying, 4=Excelling, 5=Mastering
  score_type text NOT NULL CHECK (score_type IN ('pre', 'post')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(survey_submission_id, competency_name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_survey_competency_scores_email ON survey_competency_scores(email);
CREATE INDEX IF NOT EXISTS idx_survey_competency_scores_submission ON survey_competency_scores(survey_submission_id);

-- 4. Program config columns (add to programs table if they don't exist)
-- ============================================
-- These fields control survey milestone logic per program
DO $$
BEGIN
  -- Add sessions_per_employee if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'sessions_per_employee'
  ) THEN
    ALTER TABLE programs ADD COLUMN sessions_per_employee int DEFAULT 6;
  END IF;

  -- Add program_end_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programs' AND column_name = 'program_end_date'
  ) THEN
    ALTER TABLE programs ADD COLUMN program_end_date date;
  END IF;
END $$;

-- 5. Pending Surveys View (for detection logic)
-- ============================================
-- Handles GROW vs SCALE differently:
-- SCALE milestones: 1, 3, 6, 12, 18, 24, 30, 36
-- GROW milestones: 1, 6 only (end of program handled separately)
-- End detection: completed >= sessions_per_employee OR program_end_date passed
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
    COALESCE(p.sessions_per_employee, 6) as sessions_per_employee,
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
    'scale_feedback' as suggested_survey_type,
    'milestone' as survey_trigger
  FROM session_tracking st
  JOIN program_info pi ON st.employee_id = pi.employee_id
  LEFT JOIN employee_session_counts esc ON st.employee_id = esc.employee_id
  LEFT JOIN survey_submissions ss ON (
    lower(ss.email) = lower(st.employee_email)
    AND ss.session_id = st.id
  )
  WHERE st.status = 'Completed'
    AND ss.id IS NULL
    -- Apply program-specific milestones
    AND (
      -- SCALE milestones: 1, 3, 6, 12, 18, 24, 30, 36
      (pi.program_type = 'SCALE' AND st.appointment_number IN (1, 3, 6, 12, 18, 24, 30, 36))
      OR
      -- GROW milestones: 1, 6 only
      (pi.program_type = 'GROW' AND st.appointment_number IN (1, 6))
      OR
      -- EXEC treated like SCALE for now
      (pi.program_type = 'EXEC' AND st.appointment_number IN (1, 3, 6, 12, 18, 24, 30, 36))
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

-- 5. RLS Policies
-- ============================================

-- Core competencies: everyone can read
ALTER TABLE core_competencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_read_competencies" ON core_competencies;
CREATE POLICY "anyone_can_read_competencies" ON core_competencies FOR SELECT USING (true);

-- Survey competency scores: employees can read/write their own
ALTER TABLE survey_competency_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_view_own_competency_scores" ON survey_competency_scores;
CREATE POLICY "employees_view_own_competency_scores" ON survey_competency_scores
FOR SELECT USING (
  lower(email) = lower(auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "employees_insert_own_competency_scores" ON survey_competency_scores;
CREATE POLICY "employees_insert_own_competency_scores" ON survey_competency_scores
FOR INSERT WITH CHECK (
  lower(email) = lower(auth.jwt() ->> 'email')
);

-- Survey submissions: add insert policy
DROP POLICY IF EXISTS "employees_insert_own_surveys" ON survey_submissions;
CREATE POLICY "employees_insert_own_surveys" ON survey_submissions
FOR INSERT WITH CHECK (
  lower(email) = lower(auth.jwt() ->> 'email')
);

-- 6. Helper function to check for pending survey
-- ============================================
-- Returns the OLDEST pending survey (so users complete in order)
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
