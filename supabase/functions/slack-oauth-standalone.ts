// Slack OAuth Edge Function (Self-contained for Supabase Dashboard)
// Deploy as: slack-oauth

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============ Shared Utilities (inlined) ============

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

function getEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

async function exchangeCodeForToken(clientId: string, clientSecret: string, code: string, redirectUri: string) {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  return response.json();
}

async function lookupSlackUserByEmail(botToken: string, email: string) {
  const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = await response.json();
  return data.ok && data.user ? { id: data.user.id, name: data.user.name } : null;
}

async function openDMChannel(botToken: string, userId: string) {
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: userId }),
  });
  const data = await response.json();
  return data.ok && data.channel ? data.channel.id : null;
}

// ============ Main Handler ============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    // Start OAuth flow
    if (action === 'start') {
      const employeeEmail = url.searchParams.get('email');
      if (!employeeEmail) {
        return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const clientId = getEnvVar('SLACK_CLIENT_ID');
      const redirectUri = `${url.origin}/functions/v1/slack-oauth?action=callback`;
      const state = btoa(JSON.stringify({ email: employeeEmail }));
      const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
      slackAuthUrl.searchParams.set('client_id', clientId);
      slackAuthUrl.searchParams.set('scope', 'chat:write,users:read,users:read.email,im:write');
      slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
      slackAuthUrl.searchParams.set('state', state);
      return Response.redirect(slackAuthUrl.toString(), 302);
    }

    // OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const portalUrl = Deno.env.get('PORTAL_URL') || 'https://my.boon-health.com';

      if (error) return Response.redirect(`${portalUrl}/settings?error=oauth_denied`, 302);
      if (!code || !state) return Response.redirect(`${portalUrl}/settings?error=missing_params`, 302);

      let employeeEmail: string;
      try { employeeEmail = JSON.parse(atob(state)).email; } catch { return Response.redirect(`${portalUrl}/settings?error=invalid_state`, 302); }

      const clientId = getEnvVar('SLACK_CLIENT_ID');
      const clientSecret = getEnvVar('SLACK_CLIENT_SECRET');
      const redirectUri = `${url.origin}/functions/v1/slack-oauth?action=callback`;

      const tokenResponse = await exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
      if (!tokenResponse.ok || !tokenResponse.access_token) {
        console.error('Token exchange failed:', tokenResponse.error);
        return Response.redirect(`${portalUrl}/settings?error=token_failed`, 302);
      }

      const { access_token: botToken, team, bot_user_id: botUserId } = tokenResponse;
      if (!team) return Response.redirect(`${portalUrl}/settings?error=missing_team`, 302);

      const supabase = getSupabaseClient();

      await supabase.from('slack_installations').upsert({
        team_id: team.id, team_name: team.name, bot_token: botToken, bot_user_id: botUserId, installed_by: employeeEmail,
      }, { onConflict: 'team_id' });

      const slackUser = await lookupSlackUserByEmail(botToken, employeeEmail);
      if (!slackUser) return Response.redirect(`${portalUrl}/settings?error=user_not_found`, 302);

      const dmChannelId = await openDMChannel(botToken, slackUser.id);

      await supabase.from('employee_slack_connections').upsert({
        employee_email: employeeEmail, slack_team_id: team.id, slack_user_id: slackUser.id,
        slack_dm_channel_id: dmChannelId, nudge_enabled: true, nudge_frequency: 'smart',
      }, { onConflict: 'employee_email,slack_team_id' });

      return Response.redirect(`${portalUrl}/settings?slack_connected=true`, 302);
    }

    // Disconnect
    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabase = getSupabaseClient();
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user?.email) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      await supabase.from('employee_slack_connections').delete().eq('employee_email', user.email.toLowerCase());
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Status check
    if (action === 'status') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabase = getSupabaseClient();
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user?.email) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: connection } = await supabase
        .from('employee_slack_connections')
        .select('slack_user_id, nudge_enabled, nudge_frequency, preferred_time, timezone')
        .eq('employee_email', user.email.toLowerCase())
        .single();

      return new Response(JSON.stringify({ connected: !!connection, settings: connection || null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update settings
    if (action === 'settings' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const supabase = getSupabaseClient();
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user?.email) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { nudge_enabled, nudge_frequency, preferred_time, timezone } = await req.json();
      await supabase.from('employee_slack_connections').update({ nudge_enabled, nudge_frequency, preferred_time, timezone }).eq('employee_email', user.email.toLowerCase());

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Slack OAuth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
