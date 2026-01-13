-- ============================================
-- SLACK NUDGE ANALYTICS QUERIES
-- Run these in Supabase SQL Editor for insights
-- ============================================

-- 1. Overall Nudge Stats
SELECT
  COUNT(*) as total_nudges,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending,
  ROUND(100.0 * COUNT(CASE WHEN status = 'responded' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as response_rate_pct
FROM slack_nudges;

-- 2. Response Rate by Nudge Type
SELECT
  nudge_type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
  ROUND(100.0 * COUNT(CASE WHEN status = 'responded' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as response_rate_pct
FROM slack_nudges
GROUP BY nudge_type
ORDER BY total DESC;

-- 3. Response Breakdown (what buttons are people clicking?)
SELECT
  response,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) as pct
FROM slack_nudges
WHERE response IS NOT NULL
GROUP BY response
ORDER BY count DESC;

-- 4. Nudges by Day (last 30 days)
SELECT
  DATE(sent_at) as date,
  COUNT(*) as sent,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded
FROM slack_nudges
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- 5. Top Engaged Employees (anonymized)
SELECT
  LEFT(employee_email, 3) || '***' as employee,
  COUNT(*) as total_nudges,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
  COUNT(CASE WHEN response = 'action_done' THEN 1 END) as actions_completed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'responded' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as response_rate
FROM slack_nudges
GROUP BY employee_email
HAVING COUNT(*) >= 3
ORDER BY response_rate DESC, total_nudges DESC
LIMIT 10;

-- 6. Average Response Time (for those who respond)
SELECT
  nudge_type,
  ROUND(AVG(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 3600), 1) as avg_hours_to_respond,
  ROUND(MIN(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 60), 0) as fastest_response_mins,
  ROUND(MAX(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 3600), 1) as slowest_response_hours
FROM slack_nudges
WHERE responded_at IS NOT NULL
GROUP BY nudge_type;

-- 7. Connection Stats
SELECT
  COUNT(DISTINCT employee_email) as connected_employees,
  COUNT(CASE WHEN nudge_enabled = true THEN 1 END) as nudges_enabled,
  COUNT(CASE WHEN nudge_frequency = 'smart' THEN 1 END) as using_smart,
  COUNT(CASE WHEN nudge_frequency = 'daily' THEN 1 END) as using_daily,
  COUNT(CASE WHEN nudge_frequency = 'weekly' THEN 1 END) as using_weekly,
  COUNT(CASE WHEN nudge_frequency = 'none' THEN 1 END) as nudges_disabled
FROM employee_slack_connections;

-- 8. Action Items Completed via Slack
SELECT
  COUNT(*) as total_actions_completed_via_slack
FROM action_items ai
JOIN slack_nudges sn ON sn.reference_id = ai.id::text
WHERE sn.response = 'action_done' AND ai.status = 'completed';

-- 9. Weekly Engagement Trend
SELECT
  DATE_TRUNC('week', sent_at) as week,
  COUNT(*) as nudges_sent,
  COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
  ROUND(100.0 * COUNT(CASE WHEN status = 'responded' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as response_rate
FROM slack_nudges
WHERE sent_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', sent_at)
ORDER BY week DESC;

-- 10. Create a View for Easy Dashboard Access
CREATE OR REPLACE VIEW nudge_analytics_summary AS
SELECT
  (SELECT COUNT(*) FROM employee_slack_connections WHERE nudge_enabled = true) as active_users,
  (SELECT COUNT(*) FROM slack_nudges WHERE sent_at >= NOW() - INTERVAL '7 days') as nudges_last_7_days,
  (SELECT COUNT(*) FROM slack_nudges WHERE status = 'responded' AND sent_at >= NOW() - INTERVAL '7 days') as responses_last_7_days,
  (SELECT ROUND(100.0 * COUNT(CASE WHEN status = 'responded' THEN 1 END) / NULLIF(COUNT(*), 0), 1) FROM slack_nudges) as overall_response_rate,
  (SELECT COUNT(*) FROM slack_nudges WHERE response = 'action_done') as total_actions_completed;
