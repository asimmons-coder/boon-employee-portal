-- =============================================
-- DUMMY DATA FOR ALEX'S EMPLOYEE PORTAL
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. CREATE COACHES TABLE (if it doesn't exist)
-- =============================================
CREATE TABLE IF NOT EXISTS coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  photo_url TEXT,
  specialties TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on coaches
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read coaches
CREATE POLICY IF NOT EXISTS "Anyone can view coaches" ON coaches
  FOR SELECT USING (true);

-- Insert a sample coach
INSERT INTO coaches (name, email, bio, photo_url, specialties)
VALUES (
  'Sarah Johnson',
  'sarah.johnson@boon-health.com',
  'Sarah is an ICF-certified executive coach with 10+ years of experience helping professionals unlock their potential. She specializes in leadership development, career transitions, and building resilience.',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
  ARRAY['Leadership', 'Communication', 'Career Development', 'Work-Life Balance']
)
ON CONFLICT DO NOTHING;


-- 2. ADD DUMMY SESSIONS FOR ALEX
-- =============================================
-- First, get Alex's employee ID (replace if different)
-- Alex's employee_id is: 17872

INSERT INTO session_tracking (
  employee_id,
  employee_name,
  session_date,
  status,
  coach_name,
  leadership_management_skills,
  communication_skills,
  mental_well_being,
  other_themes,
  summary,
  duration_minutes,
  appointment_number
) VALUES
-- Completed sessions
(
  '17872',
  'Alex Test',
  NOW() - INTERVAL '14 days',
  'Completed',
  'Sarah Johnson',
  true,
  false,
  true,
  'Goal setting',
  'We discussed your current challenges with time management and set up a framework for prioritizing tasks. You identified 3 key areas to focus on this month.',
  45,
  1
),
(
  '17872',
  'Alex Test',
  NOW() - INTERVAL '7 days',
  'Completed',
  'Sarah Johnson',
  false,
  true,
  false,
  'Presentation skills',
  'Great progress on your communication goals! We practiced techniques for managing nervousness before presentations and you shared positive feedback from your team meeting.',
  45,
  2
),
-- Upcoming session
(
  '17872',
  'Alex Test',
  NOW() + INTERVAL '3 days',
  'Upcoming',
  'Sarah Johnson',
  false,
  false,
  true,
  NULL,
  NULL,
  45,
  3
),
-- Future session
(
  '17872',
  'Alex Test',
  NOW() + INTERVAL '17 days',
  'Upcoming',
  'Sarah Johnson',
  false,
  false,
  false,
  NULL,
  NULL,
  45,
  4
);


-- 3. ADD WELCOME SURVEY (BASELINE) FOR ALEX
-- =============================================
INSERT INTO welcome_survey_scale (
  email,
  satisfaction,
  productivity,
  work_life_balance,
  focus_leadership,
  focus_communication,
  focus_wellbeing
) VALUES (
  'alexsimm95@gmail.com',
  3,  -- satisfaction (1-5 scale)
  3,  -- productivity (1-5 scale)
  2,  -- work_life_balance (1-5 scale)
  true,   -- wants to focus on leadership
  true,   -- wants to focus on communication
  false   -- wellbeing
)
ON CONFLICT (email) DO UPDATE SET
  satisfaction = EXCLUDED.satisfaction,
  productivity = EXCLUDED.productivity,
  work_life_balance = EXCLUDED.work_life_balance;


-- 4. ADD SURVEY RESPONSES (PROGRESS DATA) FOR ALEX
-- =============================================
INSERT INTO survey_submissions (
  email,
  date,
  coach_satisfaction,
  nps,
  wellbeing_satisfaction,
  wellbeing_productivity,
  wellbeing_balance
) VALUES
(
  'alexsimm95@gmail.com',
  NOW() - INTERVAL '14 days',
  4,
  8,
  3,
  3,
  3
),
(
  'alexsimm95@gmail.com',
  NOW() - INTERVAL '7 days',
  5,
  9,
  4,
  4,
  3
);


-- 5. VERIFY THE DATA
-- =============================================
-- Run these queries to verify:

-- Check sessions
-- SELECT * FROM session_tracking WHERE employee_id = '17872';

-- Check welcome survey
-- SELECT * FROM welcome_survey_scale WHERE email = 'alexsimm95@gmail.com';

-- Check coach
-- SELECT * FROM coaches;

-- Check survey submissions
-- SELECT * FROM survey_submissions WHERE email = 'alexsimm95@gmail.com';
