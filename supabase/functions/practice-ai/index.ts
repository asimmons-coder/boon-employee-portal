// Practice AI Edge Function
// Handles AI-powered practice scenarios using Claude API
//
// Endpoints:
// - POST /generate-plan: Generate strategic plan for a scenario
// - POST /roleplay: Handle roleplay conversation turns
// - POST /evaluate: Evaluate roleplay performance

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface GeneratePlanRequest {
  action: 'generate-plan';
  scenario: {
    title: string;
    description: string;
    explanation: string;
    basePrompt: string;
  };
  context: string;
}

interface RoleplayRequest {
  action: 'roleplay';
  scenario: {
    title: string;
    description: string;
    basePrompt: string;
  };
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  plan?: string;
}

interface EvaluateRequest {
  action: 'evaluate';
  scenario: {
    title: string;
    description: string;
  };
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  plan?: string;
}

type RequestBody = GeneratePlanRequest | RoleplayRequest | EvaluateRequest;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callClaudeWithHistory(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function generatePlanPrompt(scenario: GeneratePlanRequest['scenario'], context: string): { system: string; user: string } {
  const system = `You are a leadership and management coach helping professionals prepare for difficult workplace conversations and situations. You provide practical, actionable advice grounded in proven management frameworks.

Your responses should be:
- Direct and practical, not academic
- Focused on specific language and behaviors
- Empathetic but professional
- Structured for easy reference during actual conversations`;

  const user = `I need help preparing for this situation:

**Scenario:** ${scenario.title}
${scenario.description}

**Background Context:**
${scenario.explanation}

**My Specific Situation:**
${context || "No additional context provided."}

Please provide a comprehensive action plan with the following sections:

**1. What's Really Happening**
Briefly analyze the underlying dynamics at play.

**2. Your Mindset Going In**
Key mental frames to hold during this conversation.

**3. Opening the Conversation**
Specific language for how to start (2-3 options).

**4. Key Points to Cover**
The main things you need to address, with suggested phrasing.

**5. Handling Likely Responses**
Anticipate their reactions and how to respond to each.

**6. Closing Strong**
How to end the conversation productively.

**7. Rapid Action Script**
A condensed "cheat sheet" version - just the key phrases and sequence you can quickly reference during the actual conversation. Format this as a simple numbered list of exactly what to say/do.`;

  return { system, user };
}

function roleplaySystemPrompt(scenario: RoleplayRequest['scenario'], plan?: string): string {
  return `You are playing the role of a person in a workplace scenario for practice purposes. The scenario is:

**${scenario.title}**
${scenario.description}

Your job is to realistically portray the other person in this conversation. Be realistic - show natural human reactions including resistance, confusion, or emotion when appropriate. Don't make it too easy.

${plan ? `The user has prepared this plan (but you shouldn't reference it directly - just react naturally to what they say):
${plan}` : ''}

Guidelines:
- Stay in character throughout
- Respond naturally as that person would
- Show realistic reactions (don't be a pushover, but don't be impossible either)
- Keep responses conversational (2-4 sentences typically)
- Use *asterisks* sparingly for actions/emotions when it adds context
- If they handle things well, show gradual openness
- If they handle things poorly, show realistic pushback`;
}

function evaluationPrompt(
  scenario: EvaluateRequest['scenario'],
  messages: EvaluateRequest['messages'],
  plan?: string
): { system: string; user: string } {
  const system = `You are an expert leadership coach evaluating a practice conversation. Provide honest, constructive feedback that helps the person improve their communication skills.`;

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'MANAGER' : 'OTHER PERSON'}: ${m.text}`)
    .join('\n\n');

  const user = `Please evaluate this practice conversation for the scenario "${scenario.title}":

${scenario.description}

${plan ? `**The user's prepared plan:**
${plan}

` : ''}**The conversation:**
${conversationText}

Please provide:

**Adherence Score: X/5**
How well did they follow best practices for this type of conversation?

**Tone Analysis: [Description]**
Characterize their overall tone and presence.

**What Went Well:**
- Bullet points of effective moments

**What Can Be Improved:**
- Specific areas for growth with actionable suggestions

**Better Script:**
Provide 1-2 example phrases they could have used at key moments to be more effective.`;

  return { system, user };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();

    switch (body.action) {
      case 'generate-plan': {
        const { system, user } = generatePlanPrompt(body.scenario, body.context);
        const plan = await callClaude(system, user);
        return new Response(
          JSON.stringify({ success: true, plan }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'roleplay': {
        const systemPrompt = roleplaySystemPrompt(body.scenario, body.plan);

        // Convert messages to Claude format
        const claudeMessages = body.messages.map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.text,
        }));

        // If empty, start the conversation
        if (claudeMessages.length === 0) {
          claudeMessages.push({
            role: 'user',
            content: '[The manager approaches to have this conversation. React naturally as the other person would when they see the manager approaching.]'
          });
        }

        const response = await callClaudeWithHistory(systemPrompt, claudeMessages);
        return new Response(
          JSON.stringify({ success: true, response }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'evaluate': {
        const { system, user } = evaluationPrompt(body.scenario, body.messages, body.plan);
        const evaluation = await callClaude(system, user);
        return new Response(
          JSON.stringify({ success: true, evaluation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Practice AI error:', error);
    return new Response(
      JSON.stringify({ error: 'Request failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
