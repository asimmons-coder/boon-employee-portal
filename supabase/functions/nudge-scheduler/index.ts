// Nudge Scheduler Edge Function (Standalone)
// Runs on a cron schedule to send coaching nudges via Slack
//
// Deploy with cron: supabase functions deploy nudge-scheduler --schedule "0 * * * *"
// (Runs every hour to catch users in their preferred time windows)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Inline helper: create Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// Inline helper: send Slack message
async function sendSlackMessage(
  botToken: string,
  options: { channel: string; blocks: unknown[]; text: string }
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: options.channel,
      blocks: options.blocks,
      text: options.text,
    }),
  });
  return response.json();
}

// Inline helper: render template blocks with variables
function renderBlocks(
  blocks: unknown[],
  vars: Record<string, string | number | null | undefined>
): unknown[] {
  let json = JSON.stringify(blocks);
  for (const [key, value] of Object.entries(vars)) {
    json = json.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
  }
  return JSON.parse(json);
}

interface PendingActionItem {
  id: string;
  action_text: string;
  coach_name: string | null;
  created_at: string;
}

interface EmployeeWithActions {
  email: string;
  first_name: string;
  slack_user_id: string;
  slack_dm_channel_id: string;
  nudge_frequency: string;
  preferred_time: string;
  timezone: string;
  bot_token: string;
  pending_actions: PendingActionItem[];
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
    daily_digests_sent: 0,
    weekly_digests_sent: 0,
    goal_checkins_sent: 0,
    session_preps_sent: 0,
    errors: 0,
  };

  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday

    // Get nudge templates
    const { data: templates } = await supabase
      .from('nudge_templates')
      .select('nudge_type, message_blocks')
      .eq('is_default', true);

    const templateMap = new Map<string, NudgeTemplate>();
    templates?.forEach((t: NudgeTemplate) => templateMap.set(t.nudge_type, t));

    // ============================================
    // 1. DAILY ACTION ITEM DIGEST
    // For users with nudge_frequency = 'daily'
    // ============================================
    const { data: dailyUsers } = await supabase
      .from('employee_slack_connections')
      .select(`
        employee_email,
        slack_user_id,
        slack_dm_channel_id,
        nudge_frequency,
        preferred_time,
        timezone
      `)
      .eq('nudge_enabled', true)
      .eq('nudge_frequency', 'daily');

    if (dailyUsers && dailyUsers.length > 0) {
      console.log(`Processing ${dailyUsers.length} daily digest users`);

      for (const user of dailyUsers) {
        try {
          // Check if it's the right time for this user
          if (!isAppropriateTime(user.preferred_time, user.timezone)) {
            continue;
          }

          // Check if we already sent a daily digest today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const { data: existingNudge } = await supabase
            .from('slack_nudges')
            .select('id')
            .eq('employee_email', user.employee_email.toLowerCase())
            .eq('nudge_type', 'daily_digest')
            .gte('sent_at', todayStart.toISOString())
            .limit(1);

          if (existingNudge && existingNudge.length > 0) {
            continue; // Already sent today
          }

          // Get pending action items for this user
          const { data: pendingActions } = await supabase
            .from('action_items')
            .select('id, action_text, coach_name, created_at')
            .ilike('email', user.employee_email)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);

          if (!pendingActions || pendingActions.length === 0) {
            continue; // No pending actions
          }

          // Get bot token from installation
          const { data: slackTeam } = await supabase
            .from('employee_slack_connections')
            .select('slack_team_id')
            .eq('employee_email', user.employee_email)
            .single();

          if (!slackTeam) continue;

          const { data: installation } = await supabase
            .from('slack_installations')
            .select('bot_token')
            .eq('team_id', slackTeam.slack_team_id)
            .single();

          if (!installation?.bot_token) continue;

          // Get user's first name
          const { data: employee } = await supabase
            .from('employee_manager')
            .select('first_name')
            .ilike('company_email', user.employee_email)
            .single();

          const firstName = employee?.first_name || 'there';

          // Build action items list
          const actionsList = pendingActions
            .map((a, i) => `${i + 1}. ${a.action_text}`)
            .join('\n');

          // Get template or use inline blocks
          const template = templateMap.get('daily_digest');
          let blocks;

          if (template) {
            blocks = renderBlocks(template.message_blocks.blocks, {
              first_name: firstName,
              actions_list: actionsList,
              action_count: pendingActions.length,
            });
          } else {
            // Fallback inline template
            blocks = [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Good morning, ${firstName}!* :sun_small_cloud:\n\nHere's your coaching action items for today:`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: actionsList,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `${pendingActions.length} pending item${pendingActions.length > 1 ? 's' : ''} • <${Deno.env.get('PORTAL_URL') || 'https://portal.booncoaching.com'}|Open Portal>`,
                  },
                ],
              },
            ];
          }

          // Send the message
          const result = await sendSlackMessage(installation.bot_token, {
            channel: user.slack_dm_channel_id,
            blocks,
            text: `You have ${pendingActions.length} pending coaching action items`,
          });

          if (result.ok && result.ts) {
            await supabase
              .from('slack_nudges')
              .insert({
                employee_email: user.employee_email.toLowerCase(),
                nudge_type: 'daily_digest',
                reference_id: null,
                reference_type: 'action_items',
                message_ts: result.ts,
                channel_id: user.slack_dm_channel_id,
              });

            results.daily_digests_sent++;
            console.log(`Sent daily digest to ${user.employee_email}`);
          } else {
            console.error(`Failed to send to ${user.employee_email}:`, result.error);
            results.errors++;
          }

        } catch (error) {
          console.error(`Error processing daily digest for ${user.employee_email}:`, error);
          results.errors++;
        }
      }
    }

    // ============================================
    // 2. WEEKLY DIGEST (Monday only)
    // For users with nudge_frequency = 'weekly'
    // ============================================
    if (dayOfWeek === 1) { // Monday
      const { data: weeklyUsers } = await supabase
        .from('employee_slack_connections')
        .select(`
          employee_email,
          slack_user_id,
          slack_dm_channel_id,
          slack_team_id,
          nudge_frequency,
          preferred_time,
          timezone
        `)
        .eq('nudge_enabled', true)
        .eq('nudge_frequency', 'weekly');

      if (weeklyUsers && weeklyUsers.length > 0) {
        console.log(`Processing ${weeklyUsers.length} weekly digest users`);

        for (const user of weeklyUsers) {
          try {
            if (!isAppropriateTime(user.preferred_time, user.timezone)) {
              continue;
            }

            // Check if we already sent this week
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const { data: existingNudge } = await supabase
              .from('slack_nudges')
              .select('id')
              .eq('employee_email', user.employee_email.toLowerCase())
              .eq('nudge_type', 'weekly_digest')
              .gte('sent_at', weekStart.toISOString())
              .limit(1);

            if (existingNudge && existingNudge.length > 0) {
              continue;
            }

            // Get pending action items
            const { data: pendingActions } = await supabase
              .from('action_items')
              .select('id, action_text, coach_name, created_at')
              .ilike('email', user.employee_email)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(5);

            if (!pendingActions || pendingActions.length === 0) {
              continue;
            }

            // Get bot token
            const { data: installation } = await supabase
              .from('slack_installations')
              .select('bot_token')
              .eq('team_id', user.slack_team_id)
              .single();

            if (!installation?.bot_token) continue;

            // Get first name
            const { data: employee } = await supabase
              .from('employee_manager')
              .select('first_name')
              .ilike('company_email', user.employee_email)
              .single();

            const firstName = employee?.first_name || 'there';
            const actionsList = pendingActions
              .map((a, i) => `${i + 1}. ${a.action_text}`)
              .join('\n');

            const blocks = [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Happy Monday, ${firstName}!* :wave:\n\nHere's your coaching focus for the week:`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: actionsList,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `${pendingActions.length} action item${pendingActions.length > 1 ? 's' : ''} to work on this week`,
                  },
                ],
              },
            ];

            const result = await sendSlackMessage(installation.bot_token, {
              channel: user.slack_dm_channel_id,
              blocks,
              text: `Weekly coaching digest: ${pendingActions.length} action items`,
            });

            if (result.ok && result.ts) {
              await supabase
                .from('slack_nudges')
                .insert({
                  employee_email: user.employee_email.toLowerCase(),
                  nudge_type: 'weekly_digest',
                  reference_id: null,
                  reference_type: 'action_items',
                  message_ts: result.ts,
                  channel_id: user.slack_dm_channel_id,
                });

              results.weekly_digests_sent++;
              console.log(`Sent weekly digest to ${user.employee_email}`);
            } else {
              results.errors++;
            }

          } catch (error) {
            console.error(`Error processing weekly digest:`, error);
            results.errors++;
          }
        }
      }
    }

    // ============================================
    // 3. GOAL CHECK-INS (3 days post-session)
    // For all users with nudges enabled
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
            .eq('reference_id', String(session.id))
            .single();

          if (existingNudge) continue;

          // Get Slack connection
          const { data: connection } = await supabase
            .from('employee_slack_connections')
            .select('slack_dm_channel_id, slack_team_id, nudge_enabled, preferred_time, timezone')
            .ilike('employee_email', email)
            .single();

          if (!connection || !connection.nudge_enabled) continue;
          if (!isAppropriateTime(connection.preferred_time, connection.timezone)) continue;

          // Get bot token
          const { data: installation } = await supabase
            .from('slack_installations')
            .select('bot_token')
            .eq('team_id', connection.slack_team_id)
            .single();

          if (!installation?.bot_token) continue;

          // Render and send
          const template = templateMap.get('goal_checkin');
          let blocks;

          if (template) {
            blocks = renderBlocks(template.message_blocks.blocks, {
              first_name: employee.first_name,
              coach_name: session.coach_name || 'your coach',
              goals: session.goals,
              session_id: String(session.id),
            });
          } else {
            blocks = [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Hey ${employee.first_name}!* :wave:\n\nA few days ago you set this goal with ${session.coach_name || 'your coach'}:\n\n_"${session.goals}"_\n\nHow's it going?`,
                },
              },
            ];
          }

          const result = await sendSlackMessage(installation.bot_token, {
            channel: connection.slack_dm_channel_id,
            blocks,
            text: 'How\'s progress on your coaching goals?',
          });

          if (result.ok && result.ts) {
            await supabase
              .from('slack_nudges')
              .insert({
                employee_email: email.toLowerCase(),
                nudge_type: 'goal_checkin',
                reference_id: String(session.id),
                reference_type: 'session',
                message_ts: result.ts,
                channel_id: connection.slack_dm_channel_id,
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
    // 4. SESSION PREP REMINDERS (24h before)
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
            .eq('reference_id', String(session.id))
            .single();

          if (existingNudge) continue;

          const { data: connection } = await supabase
            .from('employee_slack_connections')
            .select('slack_dm_channel_id, slack_team_id, nudge_enabled, preferred_time, timezone')
            .ilike('employee_email', email)
            .single();

          if (!connection || !connection.nudge_enabled) continue;
          if (!isAppropriateTime(connection.preferred_time, connection.timezone)) continue;

          const { data: installation } = await supabase
            .from('slack_installations')
            .select('bot_token')
            .eq('team_id', connection.slack_team_id)
            .single();

          if (!installation?.bot_token) continue;

          const template = templateMap.get('session_prep');
          const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.booncoaching.com';

          let blocks;
          if (template) {
            blocks = renderBlocks(template.message_blocks.blocks, {
              first_name: employee.first_name,
              coach_name: session.coach_name || 'your coach',
              session_id: String(session.id),
              portal_url: portalUrl,
            });
          } else {
            blocks = [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Hey ${employee.first_name}!* :calendar:\n\nYou have a coaching session with ${session.coach_name || 'your coach'} tomorrow!\n\nTake a moment to think about what you want to focus on.`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Prepare for Session' },
                    url: portalUrl,
                  },
                ],
              },
            ];
          }

          const result = await sendSlackMessage(installation.bot_token, {
            channel: connection.slack_dm_channel_id,
            blocks,
            text: 'You have a coaching session tomorrow!',
          });

          if (result.ok && result.ts) {
            await supabase
              .from('slack_nudges')
              .insert({
                employee_email: email.toLowerCase(),
                nudge_type: 'session_prep',
                reference_id: String(session.id),
                reference_type: 'session',
                message_ts: result.ts,
                channel_id: connection.slack_dm_channel_id,
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
    console.log(`Daily digests sent: ${results.daily_digests_sent}`);
    console.log(`Weekly digests sent: ${results.weekly_digests_sent}`);
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
