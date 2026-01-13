// Shared Slack utilities for Edge Functions

export interface SlackMessage {
  channel: string;
  blocks: unknown[];
  text?: string;
}

export interface SlackUser {
  id: string;
  name: string;
  email?: string;
}

/**
 * Send a message to Slack
 */
export async function sendSlackMessage(
  botToken: string,
  message: SlackMessage
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: message.channel,
      blocks: message.blocks,
      text: message.text || 'Coaching update',
    }),
  });

  return response.json();
}

/**
 * Update an existing Slack message
 */
export async function updateSlackMessage(
  botToken: string,
  channel: string,
  ts: string,
  blocks: unknown[]
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      ts,
      blocks,
    }),
  });

  return response.json();
}

/**
 * Look up a Slack user by email
 */
export async function lookupSlackUserByEmail(
  botToken: string,
  email: string
): Promise<SlackUser | null> {
  const response = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
    {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    }
  );

  const data = await response.json();

  if (data.ok && data.user) {
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.profile?.email,
    };
  }

  return null;
}

/**
 * Open a DM channel with a user
 */
export async function openDMChannel(
  botToken: string,
  userId: string
): Promise<string | null> {
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      users: userId,
    }),
  });

  const data = await response.json();

  if (data.ok && data.channel) {
    return data.channel.id;
  }

  return null;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  ok: boolean;
  access_token?: string;
  team?: { id: string; name: string };
  bot_user_id?: string;
  error?: string;
}> {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  return response.json();
}

/**
 * Verify Slack request signature
 */
export async function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const baseString = `v0:${timestamp}:${body}`;
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(baseString)
  );

  const computedSignature = 'v0=' + Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature;
}

/**
 * Render a template with variables
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== null && value !== undefined ? String(value) : '';
  });
}

/**
 * Render Block Kit blocks with variables
 */
export function renderBlocks(
  blocks: unknown[],
  variables: Record<string, string | number | null | undefined>
): unknown[] {
  const json = JSON.stringify(blocks);
  const rendered = renderTemplate(json, variables);
  return JSON.parse(rendered);
}
