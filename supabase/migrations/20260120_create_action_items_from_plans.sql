-- Migration: Create action_items from session_tracking.plan field
-- This takes each client's most recent completed session plan and creates individual action_items
-- Plans are typically newline-separated

-- Step 1: Get the most recent session per employee that has a plan
WITH latest_sessions AS (
  SELECT DISTINCT ON (st.employee_id)
    st.id,
    st.employee_id,
    e.company_email as email,
    st.coach_name,
    st.plan,
    st.session_date
  FROM session_tracking st
  JOIN employee_manager e ON e.id = st.employee_id
  WHERE st.status = 'Completed'
    AND st.plan IS NOT NULL
    AND trim(st.plan) != ''
  ORDER BY st.employee_id, st.session_date DESC
),
-- Step 2: Split plans into individual lines
plan_lines AS (
  SELECT
    ls.id as session_id,
    ls.email,
    ls.coach_name,
    ls.session_date,
    -- Split by newline and clean up each line
    trim(regexp_replace(line, E'^[\\s•\\-\\*\\d\\.\\)]+', '')) as action_text
  FROM latest_sessions ls,
  LATERAL unnest(string_to_array(ls.plan, E'\n')) as line
  WHERE trim(line) != ''
)
-- Step 3: Insert as action_items (skip if already exists)
INSERT INTO action_items (email, session_id, coach_name, action_text, status, created_at)
SELECT
  pl.email,
  pl.session_id,
  pl.coach_name,
  pl.action_text,
  'pending',
  NOW()
FROM plan_lines pl
WHERE pl.action_text != ''
  AND length(pl.action_text) > 5  -- Skip very short lines
  -- Don't create duplicates
  AND NOT EXISTS (
    SELECT 1 FROM action_items ai
    WHERE ai.email = pl.email
      AND ai.action_text = pl.action_text
  );
