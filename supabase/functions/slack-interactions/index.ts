// Slack Interactions Edge Function
// Handles button clicks from Slack messages

import { getSupabaseClient, getEnvVar } from '../_shared/supabase.ts';
import { verifySlackSignature, updateSlackMessage } from '../_shared/slack.ts';

Deno.serve(async (req) => {
  // Slack sends interactions as form data
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();

    // Verify Slack signature
    const signature = req.headers.get('x-slack-signature') || '';
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    const signingSecret = getEnvVar('SLACK_SIGNING_SECRET');

    const isValid = await verifySlackSignature(signingSecret, signature, timestamp, body);

    if (!isValid) {
      console.error('Invalid Slack signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse the payload
    const params = new URLSearchParams(body);
    const payloadStr = params.get('payload');

    if (!payloadStr) {
      return new Response('Missing payload', { status: 400 });
    }

    const payload = JSON.parse(payloadStr);
    const { type, actions, user, message, channel } = payload;

    // Handle URL verification (for initial setup)
    if (type === 'url_verification') {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle block actions (button clicks)
    if (type === 'block_actions' && actions?.length > 0) {
      const action = actions[0];
      const actionId = action.action_id;
      const blockId = action.block_id || '';

      // Extract reference ID from block_id (e.g., "action_abc123" -> "abc123")
      const referenceId = blockId.split('_')[1];

      const supabase = getSupabaseClient();

      // Get bot token for this team
      const { data: installation } = await supabase
        .from('slack_installations')
        .select('bot_token')
        .eq('team_id', payload.team?.id)
        .single();

      if (!installation?.bot_token) {
        console.error('No installation found for team:', payload.team?.id);
        return new Response('', { status: 200 });
      }

      // Handle different action types
      switch (actionId) {
        case 'action_done': {
          // Mark action item as completed
          const { error } = await supabase
            .from('action_items')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', referenceId);

          if (error) {
            console.error('Failed to mark action complete:', error);
          }

          // Record the nudge response
          await recordNudgeResponse(supabase, message.ts, channel.id, 'action_done');

          // Update the Slack message
          await updateSlackMessage(
            installation.bot_token,
            channel.id,
            message.ts,
            [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `:white_check_mark: *Done!* Nice work completing your action item.`,
                },
              },
            ]
          );
          break;
        }

        case 'action_in_progress': {
          // Record progress response
          await recordNudgeResponse(supabase, message.ts, channel.id, 'action_in_progress');

          await updateSlackMessage(
            installation.bot_token,
            channel.id,
            message.ts,
            [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `:arrows_counterclockwise: *Keep going!* You're making progress. I'll check back in later.`,
                },
              },
            ]
          );
          break;
        }

        case 'action_reschedule': {
          // For now, just acknowledge - could open a modal for date picking
          await recordNudgeResponse(supabase, message.ts, channel.id, 'action_reschedule');

          await updateSlackMessage(
            installation.bot_token,
            channel.id,
            message.ts,
            [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `:calendar: Got it! Visit the <${Deno.env.get('PORTAL_URL') || 'http://localhost:5173'}/actions|portal> to update your due date.`,
                },
              },
            ]
          );
          break;
        }

        case 'need_help': {
          // Record that user needs help - could notify coach
          await recordNudgeResponse(supabase, message.ts, channel.id, 'need_help');

          // TODO: Optionally notify the coach here

          await updateSlackMessage(
            installation.bot_token,
            channel.id,
            message.ts,
            [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `:speech_balloon: *Got it!* Consider bringing this up in your next coaching session. Your coach is here to help you work through blockers.`,
                },
              },
            ]
          );
          break;
        }

        case 'progress_great':
        case 'progress_slow':
        case 'progress_stuck': {
          // Handle goal check-in responses
          const progressEmoji = {
            'progress_great': ':rocket:',
            'progress_slow': ':turtle:',
            'progress_stuck': ':construction:',
          }[actionId];

          const progressMessage = {
            'progress_great': "Awesome! Keep that momentum going!",
            'progress_slow': "Progress is progress! Every step counts.",
            'progress_stuck': "That's okay - bring this to your next session. Your coach can help.",
          }[actionId];

          await recordNudgeResponse(supabase, message.ts, channel.id, actionId);

          await updateSlackMessage(
            installation.bot_token,
            channel.id,
            message.ts,
            [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `${progressEmoji} *Thanks for checking in!* ${progressMessage}`,
                },
              },
            ]
          );
          break;
        }

        default:
          console.log('Unknown action:', actionId);
      }

      // Acknowledge the interaction
      return new Response('', { status: 200 });
    }

    // Default acknowledgment
    return new Response('', { status: 200 });

  } catch (error) {
    console.error('Interaction handler error:', error);
    // Still return 200 to prevent Slack retries
    return new Response('', { status: 200 });
  }
});

async function recordNudgeResponse(
  supabase: ReturnType<typeof getSupabaseClient>,
  messageTs: string,
  channelId: string,
  response: string
) {
  try {
    await supabase.rpc('record_nudge_response', {
      p_message_ts: messageTs,
      p_channel_id: channelId,
      p_response: response,
    });
  } catch (error) {
    console.error('Failed to record nudge response:', error);
  }
}
