-- Migration: Fix RLS policies for session_tracking and coaching_wins
-- Date: 2026-01-20
-- Fixes:
-- 1. session_tracking RLS now includes email fallback for new users
-- 2. coaching_wins RLS uses auth.jwt() for consistent email matching

-- ============================================
-- FIX 1: session_tracking RLS policy
-- ============================================
-- The original policy only matched by auth_user_id which fails for new users
-- whose auth_user_id hasn't been linked yet. Adding email-based fallback.

DROP POLICY IF EXISTS "employees_view_own_sessions" ON session_tracking;

CREATE POLICY "employees_view_own_sessions"
ON session_tracking
FOR SELECT
USING (
  -- Primary match: by auth_user_id linked to employee_manager
  employee_id = (
    SELECT id
    FROM employee_manager
    WHERE auth_user_id = auth.uid()
  )
  OR
  -- Fallback: by employee_email matching JWT email (for new users before auth_user_id is linked)
  lower(employee_email) = lower(auth.jwt() ->> 'email')
);

-- ============================================
-- FIX 2: coaching_wins RLS policies
-- ============================================
-- The original policies used current_setting() which is unreliable
-- Updating to use auth.jwt() for consistent behavior with other tables

DROP POLICY IF EXISTS "Users can view own wins" ON coaching_wins;
DROP POLICY IF EXISTS "Users can insert own wins" ON coaching_wins;

-- Policy: Users can read their own wins
CREATE POLICY "Users can view own wins" ON coaching_wins
  FOR SELECT
  USING (
    -- Match by employee_id through employee_manager
    employee_id = (
      SELECT id::bigint
      FROM employee_manager
      WHERE auth_user_id = auth.uid()
    )
    OR
    -- Fallback: Match by email (case-insensitive)
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Policy: Users can insert their own wins
CREATE POLICY "Users can insert own wins" ON coaching_wins
  FOR INSERT
  WITH CHECK (
    -- Verify email matches authenticated user
    lower(email) = lower(auth.jwt() ->> 'email')
    OR
    -- Or employee_id matches through employee_manager
    employee_id = (
      SELECT id::bigint
      FROM employee_manager
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- FIX 3: Add RPC function for coaching wins (SECURITY DEFINER fallback)
-- ============================================
-- In case RLS still causes issues, provide a SECURITY DEFINER function

CREATE OR REPLACE FUNCTION get_coaching_wins_for_user(user_email TEXT)
RETURNS SETOF coaching_wins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM coaching_wins
  WHERE lower(email) = lower(user_email)
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_coaching_wins_for_user TO authenticated;

-- Function to add a coaching win (bypasses RLS)
CREATE OR REPLACE FUNCTION add_coaching_win_for_user(
  user_email TEXT,
  user_employee_id BIGINT,
  win_text_value TEXT,
  session_num INTEGER DEFAULT NULL,
  is_private_value BOOLEAN DEFAULT false,
  source_value TEXT DEFAULT 'manual'
)
RETURNS coaching_wins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result coaching_wins;
BEGIN
  INSERT INTO coaching_wins (
    email,
    employee_id,
    win_text,
    session_number,
    is_private,
    source,
    created_at
  ) VALUES (
    lower(user_email),
    user_employee_id,
    win_text_value,
    session_num,
    is_private_value,
    source_value,
    NOW()
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION add_coaching_win_for_user TO authenticated;
