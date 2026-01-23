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


-- 10b. Create session_prep table for storing session intentions
-- ============================================
-- This is the KEY behavior - employees write what they want to talk about

CREATE TABLE IF NOT EXISTS public.session_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  session_id BIGINT NOT NULL,
  intention TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, session_id)
);

-- Enable RLS on session_prep
ALTER TABLE session_prep ENABLE ROW LEVEL SECURITY;

-- Employees can manage their own session prep
DROP POLICY IF EXISTS "employees_manage_own_session_prep" ON session_prep;

CREATE POLICY "employees_manage_own_session_prep"
ON session_prep
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

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_session_prep_email_session
ON session_prep(lower(email), session_id);


-- ============================================
-- 10c. Create reflection_responses table for post-program reflections
-- ============================================
-- This stores the final reflection/assessment submitted at program end

CREATE TABLE IF NOT EXISTS public.reflection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Competency post-assessment (same 12 as baseline)
  comp_adaptability_and_resilience INTEGER CHECK (comp_adaptability_and_resilience BETWEEN 1 AND 5),
  comp_building_relationships_at_work INTEGER CHECK (comp_building_relationships_at_work BETWEEN 1 AND 5),
  comp_change_management INTEGER CHECK (comp_change_management BETWEEN 1 AND 5),
  comp_delegation_and_accountability INTEGER CHECK (comp_delegation_and_accountability BETWEEN 1 AND 5),
  comp_effective_communication INTEGER CHECK (comp_effective_communication BETWEEN 1 AND 5),
  comp_effective_planning_and_execution INTEGER CHECK (comp_effective_planning_and_execution BETWEEN 1 AND 5),
  comp_emotional_intelligence INTEGER CHECK (comp_emotional_intelligence BETWEEN 1 AND 5),
  comp_giving_and_receiving_feedback INTEGER CHECK (comp_giving_and_receiving_feedback BETWEEN 1 AND 5),
  comp_persuasion_and_influence INTEGER CHECK (comp_persuasion_and_influence BETWEEN 1 AND 5),
  comp_self_confidence_and_imposter_syndrome INTEGER CHECK (comp_self_confidence_and_imposter_syndrome BETWEEN 1 AND 5),
  comp_strategic_thinking INTEGER CHECK (comp_strategic_thinking BETWEEN 1 AND 5),
  comp_time_management_and_productivity INTEGER CHECK (comp_time_management_and_productivity BETWEEN 1 AND 5),
  -- NPS
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  -- Qualitative feedback
  qualitative_shift TEXT,
  qualitative_other TEXT,
  -- Testimonial consent
  testimonial_consent BOOLEAN DEFAULT false
);

-- Enable RLS on reflection_responses
ALTER TABLE reflection_responses ENABLE ROW LEVEL SECURITY;

-- Employees can insert and view their own reflection
DROP POLICY IF EXISTS "employees_manage_own_reflection" ON reflection_responses;

CREATE POLICY "employees_manage_own_reflection"
ON reflection_responses
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

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_reflection_responses_email
ON reflection_responses(lower(email));


-- ============================================
-- 10d. Create checkpoints table for SCALE longitudinal tracking
-- ============================================
-- SCALE users get checkpoints every 6 sessions to track growth over time

CREATE TABLE IF NOT EXISTS public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  checkpoint_number INTEGER NOT NULL CHECK (checkpoint_number >= 1),
  session_count_at_checkpoint INTEGER NOT NULL,
  -- Competency scores stored as JSONB for flexibility
  competency_scores JSONB NOT NULL DEFAULT '{}',
  -- Reflection and focus
  reflection_text TEXT,  -- "What's shifted"
  focus_area TEXT,       -- "What to focus on next 6 sessions"
  -- NPS and testimonial
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  testimonial_consent BOOLEAN DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one checkpoint number per user
  UNIQUE(email, checkpoint_number)
);

-- Enable RLS on checkpoints
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

-- Employees can insert and view their own checkpoints
DROP POLICY IF EXISTS "employees_manage_own_checkpoints" ON checkpoints;

CREATE POLICY "employees_manage_own_checkpoints"
ON checkpoints
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

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_checkpoints_email
ON checkpoints(lower(email));

CREATE INDEX IF NOT EXISTS idx_checkpoints_email_number
ON checkpoints(lower(email), checkpoint_number DESC);


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
-- 11. SLACK INTEGRATION TABLES
-- ============================================

-- Store Slack workspace connections (per company)
CREATE TABLE IF NOT EXISTS public.slack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT UNIQUE NOT NULL,        -- Slack workspace ID
  team_name TEXT,
  bot_token TEXT NOT NULL,             -- Encrypted bot OAuth token
  bot_user_id TEXT,
  installed_by TEXT,
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link employees to their Slack user IDs
CREATE TABLE IF NOT EXISTS public.employee_slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  slack_team_id TEXT NOT NULL REFERENCES slack_installations(team_id),
  slack_user_id TEXT NOT NULL,
  slack_dm_channel_id TEXT,            -- DM channel for direct messages
  nudge_enabled BOOLEAN DEFAULT true,
  nudge_frequency TEXT DEFAULT 'smart' CHECK (nudge_frequency IN ('smart', 'daily', 'weekly', 'none')),
  preferred_time TIME DEFAULT '09:00', -- Local time for nudges
  timezone TEXT DEFAULT 'America/New_York',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_email, slack_team_id)
);

-- Track sent nudges (for analytics + preventing spam)
CREATE TABLE IF NOT EXISTS public.slack_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email TEXT NOT NULL,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('action_reminder', 'goal_checkin', 'session_prep', 'weekly_digest', 'daily_digest', 'streak_celebration')),
  reference_id UUID,                   -- action_item_id or session_id
  reference_type TEXT,                 -- 'action_item' or 'session'
  message_ts TEXT,                     -- Slack message timestamp (for updates)
  channel_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'responded', 'dismissed', 'failed')),
  response TEXT,                       -- User's button response
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Nudge templates (customizable per company)
CREATE TABLE IF NOT EXISTS public.nudge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('action_reminder', 'goal_checkin', 'session_prep', 'weekly_digest', 'daily_digest', 'streak_celebration')),
  template_name TEXT,
  message_blocks JSONB NOT NULL,       -- Slack Block Kit JSON
  is_default BOOLEAN DEFAULT false,
  company_id TEXT,                     -- NULL = system default
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Slack tables
ALTER TABLE slack_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_slack_connections
-- Employees can only view/manage their own Slack connection
DROP POLICY IF EXISTS "employees_manage_own_slack_connection" ON employee_slack_connections;

CREATE POLICY "employees_manage_own_slack_connection"
ON employee_slack_connections
FOR ALL
USING (
  lower(employee_email) = (
    SELECT lower(company_email)
    FROM employee_manager
    WHERE auth_user_id = auth.uid()
  )
  OR
  lower(employee_email) = lower(auth.jwt() ->> 'email')
);

-- RLS Policies for slack_nudges
-- Employees can only view their own nudge history
DROP POLICY IF EXISTS "employees_view_own_nudges" ON slack_nudges;

CREATE POLICY "employees_view_own_nudges"
ON slack_nudges
FOR SELECT
USING (
  lower(employee_email) = (
    SELECT lower(company_email)
    FROM employee_manager
    WHERE auth_user_id = auth.uid()
  )
  OR
  lower(employee_email) = lower(auth.jwt() ->> 'email')
);

-- Service role policy for slack_installations (only backend can access)
DROP POLICY IF EXISTS "service_role_manage_installations" ON slack_installations;

CREATE POLICY "service_role_manage_installations"
ON slack_installations
FOR ALL
USING (auth.role() = 'service_role');

-- Nudge templates are readable by all authenticated users
DROP POLICY IF EXISTS "authenticated_read_templates" ON nudge_templates;

CREATE POLICY "authenticated_read_templates"
ON nudge_templates
FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Indexes for efficient nudge scheduling queries
CREATE INDEX IF NOT EXISTS idx_slack_connections_email
ON employee_slack_connections(lower(employee_email));

CREATE INDEX IF NOT EXISTS idx_slack_nudges_sent_at
ON slack_nudges(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_slack_nudges_employee
ON slack_nudges(lower(employee_email), nudge_type);

CREATE INDEX IF NOT EXISTS idx_action_items_due_date
ON action_items(due_date) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_action_items_email_status
ON action_items(lower(email), status);


-- 12. Helper Functions for Slack Integration
-- ============================================

-- Function to get employee's Slack connection (for edge functions)
CREATE OR REPLACE FUNCTION get_employee_slack_connection(lookup_email TEXT)
RETURNS TABLE(
  slack_user_id TEXT,
  slack_dm_channel_id TEXT,
  nudge_enabled BOOLEAN,
  nudge_frequency TEXT,
  preferred_time TIME,
  timezone TEXT,
  bot_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    esc.slack_user_id,
    esc.slack_dm_channel_id,
    esc.nudge_enabled,
    esc.nudge_frequency,
    esc.preferred_time,
    esc.timezone,
    si.bot_token
  FROM employee_slack_connections esc
  JOIN slack_installations si ON si.team_id = esc.slack_team_id
  WHERE lower(esc.employee_email) = lower(lookup_email)
    AND esc.nudge_enabled = true;
END;
$$;

-- Function to check if employee was nudged recently (prevent spam)
CREATE OR REPLACE FUNCTION was_recently_nudged(
  lookup_email TEXT,
  lookup_nudge_type TEXT,
  hours_threshold INTEGER DEFAULT 24
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM slack_nudges
    WHERE lower(employee_email) = lower(lookup_email)
      AND nudge_type = lookup_nudge_type
      AND sent_at > NOW() - (hours_threshold || ' hours')::INTERVAL
  );
END;
$$;

-- Function to get pending action items due soon
CREATE OR REPLACE FUNCTION get_due_action_items(days_ahead INTEGER DEFAULT 2)
RETURNS TABLE(
  action_id UUID,
  email TEXT,
  action_text TEXT,
  due_date DATE,
  coach_name TEXT,
  first_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id as action_id,
    ai.email,
    ai.action_text,
    ai.due_date,
    ai.coach_name,
    em.first_name
  FROM action_items ai
  JOIN employee_manager em ON lower(em.company_email) = lower(ai.email)
  WHERE ai.status = 'pending'
    AND ai.due_date <= CURRENT_DATE + days_ahead
    AND ai.due_date >= CURRENT_DATE - 1  -- Include 1 day overdue
    AND NOT was_recently_nudged(ai.email, 'action_reminder', 20);
END;
$$;

-- Function to record a sent nudge
CREATE OR REPLACE FUNCTION record_nudge(
  p_employee_email TEXT,
  p_nudge_type TEXT,
  p_reference_id UUID,
  p_reference_type TEXT,
  p_message_ts TEXT,
  p_channel_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nudge_id UUID;
BEGIN
  INSERT INTO slack_nudges (
    employee_email, nudge_type, reference_id, reference_type, message_ts, channel_id
  ) VALUES (
    p_employee_email, p_nudge_type, p_reference_id, p_reference_type, p_message_ts, p_channel_id
  )
  RETURNING id INTO nudge_id;

  RETURN nudge_id;
END;
$$;

-- Function to record nudge response
CREATE OR REPLACE FUNCTION record_nudge_response(
  p_message_ts TEXT,
  p_channel_id TEXT,
  p_response TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE slack_nudges
  SET
    status = 'responded',
    response = p_response,
    responded_at = NOW()
  WHERE message_ts = p_message_ts
    AND channel_id = p_channel_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions on Slack functions
GRANT EXECUTE ON FUNCTION get_employee_slack_connection TO service_role;
GRANT EXECUTE ON FUNCTION was_recently_nudged TO service_role;
GRANT EXECUTE ON FUNCTION get_due_action_items TO service_role;
GRANT EXECUTE ON FUNCTION record_nudge TO service_role;
GRANT EXECUTE ON FUNCTION record_nudge_response TO service_role;


-- 13. Insert default nudge templates
-- ============================================

INSERT INTO nudge_templates (nudge_type, template_name, message_blocks, is_default) VALUES
(
  'action_reminder',
  'Default Action Reminder',
  '{
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":dart: *Coaching Action Reminder*\n\nHey {{first_name}}! You set this goal in your session with {{coach_name}}:"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "> {{action_text}}"
        }
      },
      {
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": ":calendar: Due: {{due_date}}"
          }
        ]
      },
      {
        "type": "actions",
        "block_id": "action_{{action_id}}",
        "elements": [
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "✅ Done", "emoji": true},
            "style": "primary",
            "value": "action_done",
            "action_id": "action_done"
          },
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "🔄 In Progress", "emoji": true},
            "value": "action_in_progress",
            "action_id": "action_in_progress"
          },
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "📅 Reschedule", "emoji": true},
            "value": "action_reschedule",
            "action_id": "action_reschedule"
          },
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "💬 Need Help", "emoji": true},
            "value": "need_help",
            "action_id": "need_help"
          }
        ]
      }
    ]
  }'::jsonb,
  true
),
(
  'goal_checkin',
  'Default Goal Check-in',
  '{
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":wave: *Quick Check-in*\n\nIt''s been a few days since your session with {{coach_name}}. How''s progress on your goals?"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "> {{goals}}"
        }
      },
      {
        "type": "actions",
        "block_id": "goal_{{session_id}}",
        "elements": [
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "🚀 Great progress", "emoji": true},
            "style": "primary",
            "value": "progress_great",
            "action_id": "progress_great"
          },
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "🐢 Slow but moving", "emoji": true},
            "value": "progress_slow",
            "action_id": "progress_slow"
          },
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "🚧 Stuck", "emoji": true},
            "value": "progress_stuck",
            "action_id": "progress_stuck"
          }
        ]
      }
    ]
  }'::jsonb,
  true
),
(
  'session_prep',
  'Default Session Prep Reminder',
  '{
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":calendar: *Session Tomorrow*\n\nHey {{first_name}}! You have a coaching session with {{coach_name}} tomorrow."
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Quick prep questions:*\n• What''s been on your mind this week?\n• Any wins to celebrate?\n• What do you want to focus on?"
        }
      },
      {
        "type": "actions",
        "block_id": "prep_{{session_id}}",
        "elements": [
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "📝 Open Session Prep", "emoji": true},
            "style": "primary",
            "url": "{{portal_url}}/session-prep",
            "action_id": "open_prep"
          }
        ]
      }
    ]
  }'::jsonb,
  true
),
(
  'weekly_digest',
  'Default Weekly Digest',
  '{
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":clipboard: *Your Weekly Coaching Digest*\n\nHere''s where you stand this week:"
        }
      },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": "*Pending Actions:*\n{{pending_count}}"
          },
          {
            "type": "mrkdwn",
            "text": "*Completed This Week:*\n{{completed_count}}"
          }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Top priority:*\n> {{top_action}}"
        }
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {"type": "plain_text", "text": "View All Actions", "emoji": true},
            "url": "{{portal_url}}/actions",
            "action_id": "view_actions"
          }
        ]
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;


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


-- ============================================
-- SLACK APP SETUP INSTRUCTIONS
-- ============================================
--
-- 1. Go to https://api.slack.com/apps
-- 2. Create New App > From Manifest
-- 3. Use this manifest:
--
-- display_information:
--   name: Boon Coaching
--   description: Coaching nudges and goal tracking
--   background_color: "#4A90A4"
--
-- features:
--   bot_user:
--     display_name: Boon Coach
--     always_online: true
--
-- oauth_config:
--   scopes:
--     bot:
--       - chat:write
--       - users:read
--       - users:read.email
--       - im:write
--
-- settings:
--   interactivity:
--     is_enabled: true
--     request_url: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/slack-interactions
--   event_subscriptions:
--     request_url: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/slack-events
--     bot_events:
--       - app_home_opened
--
-- 4. Install to your workspace
-- 5. Copy the Bot OAuth Token to your Supabase secrets
--
-- ============================================
