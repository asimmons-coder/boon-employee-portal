// Nudge Scheduler Edge Function
// Runs on a cron schedule to send coaching nudges via Slack
//
// Deploy with cron: supabase functions deploy nudge-scheduler --schedule "*/15 * * * *"
// (Runs every 15 minutes)

import { getSupabaseClient } from '../_shared/supabase.ts';
import { sendSlackMessage, renderBlocks } from '../_shared/slack.ts';

interface ActionItem {
  action_id: string;
  email: string;
  action_text: string;
  due_date: string;
  coach_name: string | null;
  first_name: string;
}

interface SlackConnection {
  slack_user_id: string;
  slack_dm_channel_id: string;
  nudge_enabled: boolean;
  nudge_frequency: string;
  preferred_time: string;
  timezone: string;
  bot_token: string;
}

interface NudgeTemplate {
  nudge_type: string;
  message_blocks: { blocks: unknown[] };
}

Deno.serve(async (req) => {
  // Allow manual trigger via POST or scheduled via GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const startTime = Date.now();
  const results = {
    action_reminders_sent: 0,
    goal_checkins_sent: 0,
    session_preps_sent: 0,
    errors: 0,
  };

  try {
    const supabase = getSupabaseClient();

    // Get nudge templates
    const { data: templates } = await supabase
      .from('nudge_templates')
      .select('nudge_type, message_blocks')
      .eq('is_default', true);

    const templateMap = new Map<string, NudgeTemplate>();
    templates?.forEach((t: NudgeTemplate) => templateMap.set(t.nudge_type, t));

    // ============================================
    // 1. ACTION ITEM REMINDERS
    // ============================================
    const { data: dueActions } = await supabase.rpc('get_due_action_items', {
      days_ahead: 2,
    }) as { data: ActionItem[] | null };

    if (dueActions && dueActions.length > 0) {
      console.log(`Found ${dueActions.length} action items due soon`);

      for (const action of dueActions) {
        try {
          // Get employee's Slack connection
          const { data: connections } = await supabase.rpc('get_employee_slack_connection', {
            lookup_email: action.email,
          }) as { data: SlackConnection[] | null };

          const connection = connections?.[0];
          if (!connection || !connection.nudge_enabled) {
            continue;
          }

          // Check if it's an appropriate time for this user
          if (!isAppropriateTime(connection.preferred_time, connection.timezone)) {
            continue;
          }

          // Get template and render
          const template = templateMap.get('action_reminder');
          if (!template) continue;

          const blocks = renderBlocks(template.message_blocks.blocks, {
            first_name: action.first_name,
            coach_name: action.coach_name || 'your coach',
            action_text: action.action_text,
            due_date: formatDueDate(action.due_date),
            action_id: action.action_id,
          });

          // Send the message
          const result = await sendSlackMessage(connection.bot_token, {
            channel: connection.slack_dm_channel_id,
            blocks,
            text: `Reminder: ${action.action_text}`,
          });

          if (result.ok && result.ts) {
            // Record the nudge
            await supabase.rpc('record_nudge', {
              p_employee_email: action.email,
              p_nudge_type: 'action_reminder',
              p_reference_id: action.action_id,
              p_reference_type: 'action_item',
              p_message_ts: result.ts,
              p_channel_id: connection.slack_dm_channel_id,
            });

            results.action_reminders_sent++;
            console.log(`Sent action reminder to ${action.email}`);
          } else {
            console.error(`Failed to send to ${action.email}:`, result.error);
            results.errors++;
          }

        } catch (error) {
          console.error(`Error processing action for ${action.email}:`, error);
          results.errors++;
        }
      }
    }

    // ============================================
    // 2. GOAL CHECK-INS (3 days post-session)
    // ============================================
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const { data: recentSessions } = await supabase
      .from('session_tracking')
      .select(`
        id,
        employee_id,
        goals,
        coach_name,
        employee_manager!inner(company_email, first_name)
      `)
      .eq('status', 'Completed')
      .gte('session_date', fourDaysAgo.toISOString().split('T')[0])
      .lte('session_date', threeDaysAgo.toISOString().split('T')[0])
      .not('goals', 'is', null);

    if (recentSessions && recentSessions.length > 0) {
      console.log(`Found ${recentSessions.length} sessions for goal check-in`);

      for (const session of recentSessions) {
        try {
          const employee = (session as any).employee_manager;
          const email = employee?.company_email;

          if (!email) continue;

          // Check if already nudged for this session
          const { data: existingNudge } = await supabase
            .from('slack_nudges')
            .select('id')
            .eq('employee_email', email.toLowerCase())
            .eq('nudge_type', 'goal_checkin')
            .eq('reference_id', session.id)
            .single();

          if (existingNudge) continue;

          // Get Slack connection
          const { data: connections } = await supabase.rpc('get_employee_slack_connection', {
            lookup_email: email,
          }) as { data: SlackConnection[] | null };

          const connection = connections?.[0];
          if (!connection || !connection.nudge_enabled) continue;

          if (!isAppropriateTime(connection.preferred_time, connection.timezone)) continue;

          // Render and send
          const template = templateMap.get('goal_checkin');
          if (!template) continue;

          const blocks = renderBlocks(template.message_blocks.blocks, {
            first_name: employee.first_name,
            coach_name: session.coach_name || 'your coach',
            goals: session.goals,
            session_id: String(session.id),
          });

          const result = await sendSlackMessage(connection.bot_token, {
            channel: connection.slack_dm_channel_id,
            blocks,
            text: 'How\'s progress on your coaching goals?',
          });

          if (result.ok && result.ts) {
            await supabase.rpc('record_nudge', {
              p_employee_email: email,
              p_nudge_type: 'goal_checkin',
              p_reference_id: session.id,
              p_reference_type: 'session',
              p_message_ts: result.ts,
              p_channel_id: connection.slack_dm_channel_id,
            });

            results.goal_checkins_sent++;
            console.log(`Sent goal check-in to ${email}`);
          } else {
            results.errors++;
          }

        } catch (error) {
          console.error('Error processing session:', error);
          results.errors++;
        }
      }
    }

    // ============================================
    // 3. SESSION PREP REMINDERS (24h before)
    // ============================================
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: upcomingSessions } = await supabase
      .from('session_tracking')
      .select(`
        id,
        employee_id,
        coach_name,
        employee_manager!inner(company_email, first_name)
      `)
      .eq('status', 'Upcoming')
      .eq('session_date', tomorrowStr);

    if (upcomingSessions && upcomingSessions.length > 0) {
      console.log(`Found ${upcomingSessions.length} sessions tomorrow`);

      for (const session of upcomingSessions) {
        try {
          const employee = (session as any).employee_manager;
          const email = employee?.company_email;

          if (!email) continue;

          // Check if already nudged
          const { data: existingNudge } = await supabase
            .from('slack_nudges')
            .select('id')
            .eq('employee_email', email.toLowerCase())
            .eq('nudge_type', 'session_prep')
            .eq('reference_id', session.id)
            .single();

          if (existingNudge) continue;

          const { data: connections } = await supabase.rpc('get_employee_slack_connection', {
            lookup_email: email,
          }) as { data: SlackConnection[] | null };

          const connection = connections?.[0];
          if (!connection || !connection.nudge_enabled) continue;

          if (!isAppropriateTime(connection.preferred_time, connection.timezone)) continue;

          const template = templateMap.get('session_prep');
          if (!template) continue;

          const portalUrl = Deno.env.get('PORTAL_URL') || 'http://localhost:5173';

          const blocks = renderBlocks(template.message_blocks.blocks, {
            first_name: employee.first_name,
            coach_name: session.coach_name || 'your coach',
            session_id: String(session.id),
            portal_url: portalUrl,
          });

          const result = await sendSlackMessage(connection.bot_token, {
            channel: connection.slack_dm_channel_id,
            blocks,
            text: 'You have a coaching session tomorrow!',
          });

          if (result.ok && result.ts) {
            await supabase.rpc('record_nudge', {
              p_employee_email: email,
              p_nudge_type: 'session_prep',
              p_reference_id: session.id,
              p_reference_type: 'session',
              p_message_ts: result.ts,
              p_channel_id: connection.slack_dm_channel_id,
            });

            results.session_preps_sent++;
            console.log(`Sent session prep to ${email}`);
          } else {
            results.errors++;
          }

        } catch (error) {
          console.error('Error processing upcoming session:', error);
          results.errors++;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(40));
    console.log('Nudge Scheduler Complete');
    console.log(`Action reminders sent: ${results.action_reminders_sent}`);
    console.log(`Goal check-ins sent: ${results.goal_checkins_sent}`);
    console.log(`Session preps sent: ${results.session_preps_sent}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(40));

    return new Response(
      JSON.stringify({
        success: true,
        results,
        duration: `${duration}s`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Nudge scheduler error:', error);
    return new Response(
      JSON.stringify({ error: 'Scheduler failed', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Check if current time is within the user's preferred window
 * (within 1 hour of their preferred time)
 */
function isAppropriateTime(preferredTime: string, timezone: string): boolean {
  try {
    const now = new Date();

    // Get current hour in user's timezone
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(now);

    const currentHour = parseInt(userTime, 10);
    const preferredHour = parseInt(preferredTime.split(':')[0], 10);

    // Allow nudges within 1 hour of preferred time
    return Math.abs(currentHour - preferredHour) <= 1;
  } catch {
    // Default to allowing if timezone parsing fails
    return true;
  }
}

/**
 * Format due date for display
 */
function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() < today.getTime()) {
    return `*Overdue* (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  } else if (dateOnly.getTime() === today.getTime()) {
    return '*Today*';
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return '*Tomorrow*';
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
