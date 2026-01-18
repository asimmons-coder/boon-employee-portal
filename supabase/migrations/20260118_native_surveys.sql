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

-- 4. Pending Surveys View (for detection logic)
-- ============================================
CREATE OR REPLACE VIEW pending_surveys AS
SELECT
  st.id as session_id,
  st.employee_email as email,
  st.employee_id,
  st.session_date,
  st.appointment_number as session_number,
  st.coach_name,
  st.company_id,
  em.program as program_type,
  CASE
    WHEN st.appointment_number IN (1, 3, 6, 12, 18, 24, 30, 36) THEN 'scale_feedback'
    ELSE NULL
  END as suggested_survey_type
FROM session_tracking st
JOIN employee_manager em ON st.employee_id = em.id
LEFT JOIN survey_submissions ss ON (
  lower(ss.email) = lower(st.employee_email)
  AND ss.session_id = st.id
)
WHERE st.status = 'Completed'
  AND st.appointment_number IN (1, 3, 6, 12, 18, 24, 30, 36)
  AND ss.id IS NULL
ORDER BY st.session_date DESC;

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
  ORDER BY ps.session_date DESC
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_survey TO authenticated;
