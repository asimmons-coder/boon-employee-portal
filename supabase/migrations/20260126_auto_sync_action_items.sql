-- Migration: Auto-sync session_tracking.plan to action_items
-- Creates a trigger that fires when a session is completed with a plan

-- Function to create action items from a session's plan
CREATE OR REPLACE FUNCTION sync_session_plan_to_action_items()
RETURNS TRIGGER AS $$
DECLARE
  employee_email TEXT;
  line TEXT;
  action_text TEXT;
BEGIN
  -- Only process if status is Completed and plan exists
  IF NEW.status = 'Completed' AND NEW.plan IS NOT NULL AND trim(NEW.plan) != '' THEN
    -- Get employee email
    SELECT company_email INTO employee_email
    FROM employee_manager
    WHERE id = NEW.employee_id;

    IF employee_email IS NOT NULL THEN
      -- Split plan by newlines and create action items
      FOREACH line IN ARRAY string_to_array(NEW.plan, E'\n')
      LOOP
        -- Clean up the line (remove bullets, numbers, etc.)
        action_text := trim(regexp_replace(line, E'^[\\s•\\-\\*\\d\\.\\)]+', ''));

        -- Skip empty or very short lines
        IF action_text != '' AND length(action_text) > 5 THEN
          -- Insert if not duplicate
          INSERT INTO action_items (email, session_id, coach_name, action_text, status, due_date, created_at)
          SELECT
            employee_email,
            NEW.id,
            NEW.coach_name,
            action_text,
            'pending',
            CURRENT_DATE + 7, -- Default due date: 1 week from now
            NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM action_items ai
            WHERE ai.email = employee_email
              AND ai.action_text = action_text
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on session_tracking
DROP TRIGGER IF EXISTS trigger_sync_plan_to_action_items ON session_tracking;
CREATE TRIGGER trigger_sync_plan_to_action_items
  AFTER INSERT OR UPDATE ON session_tracking
  FOR EACH ROW
  EXECUTE FUNCTION sync_session_plan_to_action_items();

-- Also run the one-time sync for existing sessions that don't have action items yet
-- This ensures hello@boon-health.com gets their action items
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
plan_lines AS (
  SELECT
    ls.id as session_id,
    ls.email,
    ls.coach_name,
    ls.session_date,
    trim(regexp_replace(line, E'^[\\s•\\-\\*\\d\\.\\)]+', '')) as action_text
  FROM latest_sessions ls,
  LATERAL unnest(string_to_array(ls.plan, E'\n')) as line
  WHERE trim(line) != ''
)
INSERT INTO action_items (email, session_id, coach_name, action_text, status, due_date, created_at)
SELECT
  pl.email,
  pl.session_id,
  pl.coach_name,
  pl.action_text,
  'pending',
  CURRENT_DATE + 7, -- Default due date: 1 week from now
  NOW()
FROM plan_lines pl
WHERE pl.action_text != ''
  AND length(pl.action_text) > 5
  AND NOT EXISTS (
    SELECT 1 FROM action_items ai
    WHERE ai.email = pl.email
      AND ai.action_text = pl.action_text
  );
