// Nudge Scheduler Edge Function (Self-contained for Supabase Dashboard)
// Deploy as: nudge-scheduler
// Schedule via pg_cron or external cron to run every 15 minutes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function sendSlackMessage(botToken: string, channel: string, blocks: unknown[], text: string) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, blocks, text }),
  });
  return response.json();
}

function renderBlocks(blocks: unknown[], vars: Record<string, string | number | null | undefined>): unknown[] {
  let json = JSON.stringify(blocks);
  for (const [key, value] of Object.entries(vars)) {
    json = json.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }
  return JSON.parse(json);
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly < today) return `*Overdue*`;
  if (dateOnly.getTime() === today.getTime()) return '*Today*';
  if (dateOnly.getTime() === tomorrow.getTime()) return '*Tomorrow*';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isAppropriateTime(preferredTime: string, timezone: string): boolean {
  try {
    const now = new Date();
    const userHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(now), 10);
    const preferredHour = parseInt(preferredTime?.split(':')[0] || '9', 10);
    return Math.abs(userHour - preferredHour) <= 1;
  } catch {
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const results = { action_reminders: 0, goal_checkins: 0, session_preps: 0, errors: 0 };
  const supabase = getSupabaseClient();
  const portalUrl = Deno.env.get('PORTAL_URL') || 'https://my.boon-health.com';

  try {
    // Get templates
    const { data: templates } = await supabase.from('nudge_templates').select('nudge_type, message_blocks').eq('is_default', true);
    const templateMap = new Map(templates?.map(t => [t.nudge_type, t.message_blocks]) || []);

    // ============ ACTION ITEM REMINDERS ============
    const { data: dueActions } = await supabase.rpc('get_due_action_items', { days_ahead: 2 });

    for (const action of dueActions || []) {
      try {
        const { data: connections } = await supabase.rpc('get_employee_slack_connection', { lookup_email: action.email });
        const conn = connections?.[0];
        if (!conn?.nudge_enabled || !isAppropriateTime(conn.preferred_time, conn.timezone)) continue;

        const template = templateMap.get('action_reminder');
        if (!template?.blocks) continue;

        const blocks = renderBlocks(template.blocks, {
          first_name: action.first_name,
          coach_name: action.coach_name || 'your coach',
          action_text: action.action_text,
          due_date: formatDueDate(action.due_date),
          action_id: action.action_id,
        });

        const result = await sendSlackMessage(conn.bot_token, conn.slack_dm_channel_id, blocks, `Reminder: ${action.action_text}`);

        if (result.ok && result.ts) {
          await supabase.rpc('record_nudge', {
            p_employee_email: action.email,
            p_nudge_type: 'action_reminder',
            p_reference_id: action.action_id,
            p_reference_type: 'action_item',
            p_message_ts: result.ts,
            p_channel_id: conn.slack_dm_channel_id,
          });
          results.action_reminders++;
        }
      } catch (e) {
        console.error('Action reminder error:', e);
        results.errors++;
      }
    }

    // ============ GOAL CHECK-INS (3 days post-session) ============
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const { data: recentSessions } = await supabase
      .from('session_tracking')
      .select('id, goals, coach_name, employee_manager!inner(company_email, first_name)')
      .eq('status', 'Completed')
      .gte('session_date', fourDaysAgo.toISOString().split('T')[0])
      .lte('session_date', threeDaysAgo.toISOString().split('T')[0])
      .not('goals', 'is', null);

    for (const session of recentSessions || []) {
      try {
        const employee = (session as any).employee_manager;
        const email = employee?.company_email;
        if (!email) continue;

        // Check if already nudged
        const { data: existing } = await supabase
          .from('slack_nudges')
          .select('id')
          .eq('employee_email', email.toLowerCase())
          .eq('nudge_type', 'goal_checkin')
          .eq('reference_id', session.id)
          .single();
        if (existing) continue;

        const { data: connections } = await supabase.rpc('get_employee_slack_connection', { lookup_email: email });
        const conn = connections?.[0];
        if (!conn?.nudge_enabled || !isAppropriateTime(conn.preferred_time, conn.timezone)) continue;

        const template = templateMap.get('goal_checkin');
        if (!template?.blocks) continue;

        const blocks = renderBlocks(template.blocks, {
          first_name: employee.first_name,
          coach_name: session.coach_name || 'your coach',
          goals: session.goals,
          session_id: String(session.id),
        });

        const result = await sendSlackMessage(conn.bot_token, conn.slack_dm_channel_id, blocks, 'How\'s progress on your goals?');

        if (result.ok && result.ts) {
          await supabase.rpc('record_nudge', {
            p_employee_email: email,
            p_nudge_type: 'goal_checkin',
            p_reference_id: session.id,
            p_reference_type: 'session',
            p_message_ts: result.ts,
            p_channel_id: conn.slack_dm_channel_id,
          });
          results.goal_checkins++;
        }
      } catch (e) {
        console.error('Goal checkin error:', e);
        results.errors++;
      }
    }

    // ============ SESSION PREP (24h before) ============
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: upcomingSessions } = await supabase
      .from('session_tracking')
      .select('id, coach_name, employee_manager!inner(company_email, first_name)')
      .eq('status', 'Upcoming')
      .eq('session_date', tomorrowStr);

    for (const session of upcomingSessions || []) {
      try {
        const employee = (session as any).employee_manager;
        const email = employee?.company_email;
        if (!email) continue;

        const { data: existing } = await supabase
          .from('slack_nudges')
          .select('id')
          .eq('employee_email', email.toLowerCase())
          .eq('nudge_type', 'session_prep')
          .eq('reference_id', session.id)
          .single();
        if (existing) continue;

        const { data: connections } = await supabase.rpc('get_employee_slack_connection', { lookup_email: email });
        const conn = connections?.[0];
        if (!conn?.nudge_enabled || !isAppropriateTime(conn.preferred_time, conn.timezone)) continue;

        const template = templateMap.get('session_prep');
        if (!template?.blocks) continue;

        const blocks = renderBlocks(template.blocks, {
          first_name: employee.first_name,
          coach_name: session.coach_name || 'your coach',
          session_id: String(session.id),
          portal_url: portalUrl,
        });

        const result = await sendSlackMessage(conn.bot_token, conn.slack_dm_channel_id, blocks, 'Session tomorrow!');

        if (result.ok && result.ts) {
          await supabase.rpc('record_nudge', {
            p_employee_email: email,
            p_nudge_type: 'session_prep',
            p_reference_id: session.id,
            p_reference_type: 'session',
            p_message_ts: result.ts,
            p_channel_id: conn.slack_dm_channel_id,
          });
          results.session_preps++;
        }
      } catch (e) {
        console.error('Session prep error:', e);
        results.errors++;
      }
    }

    console.log('Nudge scheduler results:', results);
    return new Response(JSON.stringify({ success: true, results }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(JSON.stringify({ error: 'Scheduler failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
