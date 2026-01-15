import { supabase } from './supabase';
import type { PracticeScenario } from '../data/scenarios';

interface GeneratePlanResponse {
  success: boolean;
  plan?: string;
  error?: string;
}

interface RoleplayResponse {
  success: boolean;
  response?: string;
  error?: string;
}

interface EvaluateResponse {
  success: boolean;
  evaluation?: string;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Generate a strategic plan for a scenario
 */
export async function generatePlan(
  scenario: PracticeScenario,
  context: string
): Promise<{ plan: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<GeneratePlanResponse>('practice-ai', {
      body: {
        action: 'generate-plan',
        scenario: {
          title: scenario.title,
          description: scenario.description,
          explanation: scenario.explanation,
          basePrompt: scenario.basePrompt,
        },
        context,
      },
    });

    if (error) {
      console.error('Generate plan error:', error);
      return { plan: null, error: error.message };
    }

    if (!data?.success) {
      return { plan: null, error: data?.error || 'Failed to generate plan' };
    }

    return { plan: data.plan || null, error: null };
  } catch (err) {
    console.error('Generate plan exception:', err);
    return { plan: null, error: 'Network error - please try again' };
  }
}

/**
 * Get a roleplay response from the AI
 */
export async function getRoleplayResponse(
  scenario: PracticeScenario,
  messages: ChatMessage[],
  plan?: string
): Promise<{ response: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<RoleplayResponse>('practice-ai', {
      body: {
        action: 'roleplay',
        scenario: {
          title: scenario.title,
          description: scenario.description,
          basePrompt: scenario.basePrompt,
        },
        messages,
        plan,
      },
    });

    if (error) {
      console.error('Roleplay error:', error);
      return { response: null, error: error.message };
    }

    if (!data?.success) {
      return { response: null, error: data?.error || 'Failed to get response' };
    }

    return { response: data.response || null, error: null };
  } catch (err) {
    console.error('Roleplay exception:', err);
    return { response: null, error: 'Network error - please try again' };
  }
}

/**
 * Evaluate a roleplay conversation
 */
export async function evaluateRoleplay(
  scenario: PracticeScenario,
  messages: ChatMessage[],
  plan?: string
): Promise<{ evaluation: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<EvaluateResponse>('practice-ai', {
      body: {
        action: 'evaluate',
        scenario: {
          title: scenario.title,
          description: scenario.description,
        },
        messages,
        plan,
      },
    });

    if (error) {
      console.error('Evaluate error:', error);
      return { evaluation: null, error: error.message };
    }

    if (!data?.success) {
      return { evaluation: null, error: data?.error || 'Failed to evaluate' };
    }

    return { evaluation: data.evaluation || null, error: null };
  } catch (err) {
    console.error('Evaluate exception:', err);
    return { evaluation: null, error: 'Network error - please try again' };
  }
}
