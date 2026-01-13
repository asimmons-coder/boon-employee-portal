// Slack OAuth Edge Function
// Handles both the initial redirect and the callback

import { getSupabaseClient, getEnvVar } from '../_shared/supabase.ts';
import {
  exchangeCodeForToken,
  lookupSlackUserByEmail,
  openDMChannel,
} from '../_shared/slack.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    // Action: Start OAuth flow (redirect to Slack)
    if (action === 'start') {
      const employeeEmail = url.searchParams.get('email');
      if (!employeeEmail) {
        return new Response(
          JSON.stringify({ error: 'Missing email parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientId = getEnvVar('SLACK_CLIENT_ID');
      const redirectUri = `${url.origin}/functions/v1/slack-oauth?action=callback`;

      // Store email in state param (you could also use a signed JWT for security)
      const state = btoa(JSON.stringify({ email: employeeEmail }));

      const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
      slackAuthUrl.searchParams.set('client_id', clientId);
      slackAuthUrl.searchParams.set('scope', 'chat:write,users:read,users:read.email,im:write');
      slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
      slackAuthUrl.searchParams.set('state', state);

      return Response.redirect(slackAuthUrl.toString(), 302);
    }

    // Action: Handle OAuth callback from Slack
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        console.error('Slack OAuth error:', error);
        return redirectToPortal('error=oauth_denied');
      }

      if (!code || !state) {
        return redirectToPortal('error=missing_params');
      }

      // Decode state to get employee email
      let employeeEmail: string;
      try {
        const stateData = JSON.parse(atob(state));
        employeeEmail = stateData.email;
      } catch {
        return redirectToPortal('error=invalid_state');
      }

      // Exchange code for token
      const clientId = getEnvVar('SLACK_CLIENT_ID');
      const clientSecret = getEnvVar('SLACK_CLIENT_SECRET');
      const redirectUri = `${url.origin}/functions/v1/slack-oauth?action=callback`;

      const tokenResponse = await exchangeCodeForToken(
        clientId,
        clientSecret,
        code,
        redirectUri
      );

      if (!tokenResponse.ok || !tokenResponse.access_token) {
        console.error('Token exchange failed:', tokenResponse.error);
        return redirectToPortal('error=token_exchange_failed');
      }

      const { access_token: botToken, team, bot_user_id: botUserId } = tokenResponse;

      if (!team) {
        return redirectToPortal('error=missing_team');
      }

      const supabase = getSupabaseClient();

      // Upsert slack installation
      const { error: installError } = await supabase
        .from('slack_installations')
        .upsert({
          team_id: team.id,
          team_name: team.name,
          bot_token: botToken,
          bot_user_id: botUserId,
          installed_by: employeeEmail,
        }, {
          onConflict: 'team_id',
        });

      if (installError) {
        console.error('Failed to save installation:', installError);
        return redirectToPortal('error=save_failed');
      }

      // Look up the employee's Slack user ID
      const slackUser = await lookupSlackUserByEmail(botToken!, employeeEmail);

      if (!slackUser) {
        console.error('Could not find Slack user for email:', employeeEmail);
        return redirectToPortal('error=user_not_found');
      }

      // Open DM channel
      const dmChannelId = await openDMChannel(botToken!, slackUser.id);

      // Save employee Slack connection
      const { error: connectionError } = await supabase
        .from('employee_slack_connections')
        .upsert({
          employee_email: employeeEmail,
          slack_team_id: team.id,
          slack_user_id: slackUser.id,
          slack_dm_channel_id: dmChannelId,
          nudge_enabled: true,
          nudge_frequency: 'smart',
        }, {
          onConflict: 'employee_email,slack_team_id',
        });

      if (connectionError) {
        console.error('Failed to save connection:', connectionError);
        return redirectToPortal('error=connection_failed');
      }

      // Success! Redirect back to portal
      return redirectToPortal('slack_connected=true');
    }

    // Action: Disconnect Slack
    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = getSupabaseClient();

      // Get user from JWT
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete the connection
      const { error: deleteError } = await supabase
        .from('employee_slack_connections')
        .delete()
        .eq('employee_email', user.email.toLowerCase());

      if (deleteError) {
        console.error('Failed to disconnect:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Check connection status
    if (action === 'status') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = getSupabaseClient();

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: connection } = await supabase
        .from('employee_slack_connections')
        .select('slack_user_id, nudge_enabled, nudge_frequency, preferred_time, timezone')
        .eq('employee_email', user.email.toLowerCase())
        .single();

      return new Response(
        JSON.stringify({
          connected: !!connection,
          settings: connection || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Update nudge settings
    if (action === 'settings' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = getSupabaseClient();

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user?.email) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { nudge_enabled, nudge_frequency, preferred_time, timezone } = body;

      const { error: updateError } = await supabase
        .from('employee_slack_connections')
        .update({
          nudge_enabled,
          nudge_frequency,
          preferred_time,
          timezone,
        })
        .eq('employee_email', user.email.toLowerCase());

      if (updateError) {
        console.error('Failed to update settings:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update settings' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Slack OAuth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function redirectToPortal(params: string): Response {
  const portalUrl = Deno.env.get('PORTAL_URL') || 'http://localhost:5173';
  return Response.redirect(`${portalUrl}/settings?${params}`, 302);
}
