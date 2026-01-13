// Slack Interactions Edge Function (Self-contained for Supabase Dashboard)
// Deploy as: slack-interactions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function verifySlackSignature(signingSecret: string, signature: string, timestamp: string, body: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`v0:${timestamp}:${body}`));
  const computed = 'v0=' + Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === signature;
}

async function updateSlackMessage(botToken: string, channel: string, ts: string, blocks: unknown[]) {
  await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, ts, blocks, text: 'Updated' }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const body = await req.text();
    const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET') || '';
    const signature = req.headers.get('x-slack-signature') || '';
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';

    // Verify signature (skip in dev if secret not set)
    if (signingSecret && !(await verifySlackSignature(signingSecret, signature, timestamp, body))) {
      console.error('Invalid Slack signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const params = new URLSearchParams(body);
    const payloadStr = params.get('payload');
    if (!payloadStr) return new Response('Missing payload', { status: 400 });

    const payload = JSON.parse(payloadStr);
    const { type, actions, message, channel } = payload;

    // URL verification
    if (type === 'url_verification') {
      return new Response(JSON.stringify({ challenge: payload.challenge }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Handle button clicks
    if (type === 'block_actions' && actions?.length > 0) {
      const action = actions[0];
      const actionId = action.action_id;
      const blockId = action.block_id || '';
      const referenceId = blockId.split('_')[1];

      const supabase = getSupabaseClient();

      // Get bot token
      const { data: installation } = await supabase
        .from('slack_installations')
        .select('bot_token')
        .eq('team_id', payload.team?.id)
        .single();

      if (!installation?.bot_token) {
        console.error('No installation found');
        return new Response('', { status: 200 });
      }

      // Record response
      if (message?.ts && channel?.id) {
        await supabase.rpc('record_nudge_response', {
          p_message_ts: message.ts,
          p_channel_id: channel.id,
          p_response: actionId,
        });
      }

      const portalUrl = Deno.env.get('PORTAL_URL') || 'https://my.boon-health.com';

      // Handle actions
      switch (actionId) {
        case 'action_done':
          if (referenceId) {
            await supabase.from('action_items').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', referenceId);
          }
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: ':white_check_mark: *Done!* Nice work completing your action item.' } }
          ]);
          break;

        case 'action_in_progress':
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: ':arrows_counterclockwise: *Keep going!* You\'re making progress.' } }
          ]);
          break;

        case 'action_reschedule':
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: `:calendar: Visit the <${portalUrl}/actions|portal> to update your due date.` } }
          ]);
          break;

        case 'need_help':
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: ':speech_balloon: Consider bringing this up in your next coaching session.' } }
          ]);
          break;

        case 'progress_great':
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: ':rocket: *Awesome!* Keep that momentum going!' } }
          ]);
          break;

        case 'progress_slow':
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: ':turtle: *Progress is progress!* Every step counts.' } }
          ]);
          break;

        case 'progress_stuck':
          await updateSlackMessage(installation.bot_token, channel.id, message.ts, [
            { type: 'section', text: { type: 'mrkdwn', text: ':construction: *That\'s okay* - bring this to your next session. Your coach can help.' } }
          ]);
          break;
      }

      return new Response('', { status: 200 });
    }

    return new Response('', { status: 200 });

  } catch (error) {
    console.error('Interaction error:', error);
    return new Response('', { status: 200 }); // Return 200 to prevent Slack retries
  }
});
