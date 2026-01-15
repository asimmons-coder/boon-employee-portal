-- Progress Surveys Migration
-- Adds resilience column to Scale welcome survey and creates Grow welcome survey

-- ============================================
-- 1. Add resilience column to Scale welcome survey
-- ============================================

ALTER TABLE welcome_survey_scale
ADD COLUMN IF NOT EXISTS resilience INTEGER CHECK (resilience >= 1 AND resilience <= 5);

-- ============================================
-- 2. Add new fields to survey_submissions for tracking
-- ============================================

ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS wellbeing_resilience INTEGER CHECK (wellbeing_resilience >= 1 AND wellbeing_resilience <= 5);

-- Add Grow-specific competency columns to survey_submissions
ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS strategic_thinking INTEGER CHECK (strategic_thinking >= 1 AND strategic_thinking <= 5);

ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS decision_making INTEGER CHECK (decision_making >= 1 AND decision_making <= 5);

ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS people_management INTEGER CHECK (people_management >= 1 AND people_management <= 5);

ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS influence INTEGER CHECK (influence >= 1 AND influence <= 5);

ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS emotional_intelligence INTEGER CHECK (emotional_intelligence >= 1 AND emotional_intelligence <= 5);

ALTER TABLE survey_submissions
ADD COLUMN IF NOT EXISTS adaptability INTEGER CHECK (adaptability >= 1 AND adaptability <= 5);


-- ============================================
-- 3. Create Grow Welcome Survey table
-- ============================================

CREATE TABLE IF NOT EXISTS welcome_survey_grow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,

  -- Core wellbeing metrics (same as Scale)
  satisfaction INTEGER CHECK (satisfaction >= 1 AND satisfaction <= 5),
  productivity INTEGER CHECK (productivity >= 1 AND productivity <= 5),
  work_life_balance INTEGER CHECK (work_life_balance >= 1 AND work_life_balance <= 5),
  resilience INTEGER CHECK (resilience >= 1 AND resilience <= 5),

  -- Focus areas
  focus_leadership BOOLEAN DEFAULT false,
  focus_communication BOOLEAN DEFAULT false,
  focus_wellbeing BOOLEAN DEFAULT false,

  -- Core leadership competencies (Grow-specific)
  strategic_thinking INTEGER CHECK (strategic_thinking >= 1 AND strategic_thinking <= 5),
  decision_making INTEGER CHECK (decision_making >= 1 AND decision_making <= 5),
  people_management INTEGER CHECK (people_management >= 1 AND people_management <= 5),
  influence INTEGER CHECK (influence >= 1 AND influence <= 5),
  emotional_intelligence INTEGER CHECK (emotional_intelligence >= 1 AND emotional_intelligence <= 5),
  adaptability INTEGER CHECK (adaptability >= 1 AND adaptability <= 5),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_welcome_survey_grow_email ON welcome_survey_grow(lower(email));

-- Enable RLS
ALTER TABLE welcome_survey_grow ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Grow welcome survey
DROP POLICY IF EXISTS "employees_view_own_grow_baseline" ON welcome_survey_grow;

CREATE POLICY "employees_view_own_grow_baseline"
ON welcome_survey_grow
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

-- Allow inserts via service role or matching email
DROP POLICY IF EXISTS "employees_insert_own_grow_baseline" ON welcome_survey_grow;

CREATE POLICY "employees_insert_own_grow_baseline"
ON welcome_survey_grow
FOR INSERT
WITH CHECK (
  lower(email) = lower(auth.jwt() ->> 'email')
  OR auth.role() = 'service_role'
);


-- ============================================
-- 4. Comments for documentation
-- ============================================

COMMENT ON TABLE welcome_survey_grow IS 'Baseline survey for Grow program clients with core leadership competencies';

COMMENT ON COLUMN welcome_survey_grow.strategic_thinking IS 'Self-assessment: Ability to think strategically and see the big picture (1-5)';
COMMENT ON COLUMN welcome_survey_grow.decision_making IS 'Self-assessment: Confidence in making complex decisions (1-5)';
COMMENT ON COLUMN welcome_survey_grow.people_management IS 'Self-assessment: Effectiveness in managing and developing team members (1-5)';
COMMENT ON COLUMN welcome_survey_grow.influence IS 'Self-assessment: Ability to influence stakeholders and drive change (1-5)';
COMMENT ON COLUMN welcome_survey_grow.emotional_intelligence IS 'Self-assessment: Awareness and management of emotions in self and others (1-5)';
COMMENT ON COLUMN welcome_survey_grow.adaptability IS 'Self-assessment: Flexibility and comfort with change and ambiguity (1-5)';
