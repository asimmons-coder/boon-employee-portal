import { supabase } from './supabase';
import type { Employee, Session, SurveyResponse, BaselineSurvey, CompetencyScore, ProgramType, ActionItem, SlackConnectionStatus, SlackNudge } from './types';

/**
 * Fetch employee profile by email
 */
export async function fetchEmployeeProfile(email: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employee_manager')
    .select('*')
    .ilike('company_email', email)
    .single();

  if (error) {
    console.error('Error fetching employee profile:', error);
    return null;
  }

  return data as Employee;
}

/**
 * Fetch all sessions for an employee by their employee_manager ID
 */
export async function fetchSessions(employeeId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('session_tracking')
    .select('*')
    .eq('employee_id', employeeId)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return (data as Session[]) || [];
}

/**
 * Fetch survey responses (progress data) for an employee
 */
export async function fetchProgressData(email: string): Promise<SurveyResponse[]> {
  const { data, error } = await supabase
    .from('survey_submissions')
    .select('*')
    .ilike('email', email)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching progress data:', error);
    return [];
  }

  return (data as SurveyResponse[]) || [];
}

/**
 * Fetch baseline survey from welcome_survey_baseline table
 * Contains both wellbeing metrics and competency baselines
 */
export async function fetchBaseline(email: string): Promise<BaselineSurvey | null> {
  const { data, error } = await supabase
    .from('welcome_survey_baseline')
    .select('*')
    .ilike('email', email)
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching baseline:', error);
    return null;
  }

  console.log('Baseline data fetched:', data);
  return (data && data.length > 0) ? data[0] as BaselineSurvey : null;
}

/**
 * Fetch competency scores for a user (current/end-of-program scores)
 */
export async function fetchCompetencyScores(email: string): Promise<CompetencyScore[]> {
  const { data, error } = await supabase
    .from('competency_scores')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('Error fetching competency scores:', error);
    }
    return [];
  }

  return (data as CompetencyScore[]) || [];
}

/**
 * Fetch program type for an employee via their program field
 * The program field might contain a UUID, a program name, or the program type directly
 * Examples: "GROW", "GROW - Cohort 1", "TWC SLX Program 2025", UUID
 */
export async function fetchProgramType(programId: string | null): Promise<ProgramType | null> {
  if (!programId) return null;

  const upperProgram = programId.toUpperCase();

  // Check if it starts with a known program type (e.g., "GROW - Cohort 1")
  if (upperProgram === 'SCALE' || upperProgram.startsWith('SCALE ') || upperProgram.startsWith('SCALE-')) {
    return 'SCALE';
  }
  if (upperProgram === 'GROW' || upperProgram.startsWith('GROW ') || upperProgram.startsWith('GROW-')) {
    return 'GROW';
  }
  if (upperProgram === 'EXEC' || upperProgram.startsWith('EXEC ') || upperProgram.startsWith('EXEC-')) {
    return 'EXEC';
  }

  // Try to look up by ID first (if it looks like a UUID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(programId);

  if (isUuid) {
    const { data, error } = await supabase
      .from('programs')
      .select('program_type')
      .eq('id', programId)
      .single();

    if (!error && data?.program_type) {
      return data.program_type as ProgramType;
    }
  }

  // Try to look up by name/title
  const { data: byName, error: nameError } = await supabase
    .from('programs')
    .select('program_type')
    .ilike('name', `%${programId}%`)
    .limit(1)
    .single();

  if (!nameError && byName?.program_type) {
    return byName.program_type as ProgramType;
  }

  console.log('Could not determine program type for:', programId);
  return null;
}

/**
 * Fetch the latest survey response for progress comparison
 */
export async function fetchLatestSurveyResponse(email: string): Promise<SurveyResponse | null> {
  const { data, error } = await supabase
    .from('survey_submissions')
    .select('*')
    .ilike('email', email)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching latest survey:', error);
    }
    return null;
  }

  return data as SurveyResponse;
}

/**
 * Fetch action items for an employee
 */
export async function fetchActionItems(email: string): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist yet
    if (error.code !== '42P01') {
      console.error('Error fetching action items:', error);
    }
    return [];
  }

  return (data as ActionItem[]) || [];
}

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  itemId: string,
  status: 'pending' | 'completed' | 'dismissed'
): Promise<boolean> {
  const { error } = await supabase
    .from('action_items')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', itemId);

  if (error) {
    console.error('Error updating action item:', error);
    return false;
  }

  return true;
}

/**
 * Submit session feedback
 */
export async function submitSessionFeedback(
  sessionId: string,
  rating: number,
  feedback: string
): Promise<boolean> {
  // This could insert into a feedback table or update the session record
  const { error } = await supabase
    .from('session_feedback')
    .insert({
      session_id: sessionId,
      rating,
      feedback,
      created_at: new Date().toISOString(),
    });

  if (error) {
    // Table might not exist, log but don't fail
    console.error('Error submitting feedback:', error);
    return false;
  }

  return true;
}

/**
 * Fetch coach details by name (for now - could be by ID later)
 */
export async function fetchCoachByName(coachName: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .ilike('name', coachName)
    .single();

  if (error) {
    // Coaches table might not exist
    console.error('Error fetching coach:', error);
    return null;
  }

  return data;
}

// ============================================
// SLACK INTEGRATION
// ============================================

const SLACK_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-oauth`
  : '/functions/v1/slack-oauth';

/**
 * Get Slack connection status for the current user
 */
export async function fetchSlackConnectionStatus(): Promise<SlackConnectionStatus> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { connected: false, settings: null };
    }

    const response = await fetch(`${SLACK_FUNCTION_URL}?action=status`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch Slack status');
      return { connected: false, settings: null };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Slack connection:', error);
    return { connected: false, settings: null };
  }
}

/**
 * Get the URL to start Slack OAuth flow
 */
export function getSlackConnectUrl(email: string): string {
  return `${SLACK_FUNCTION_URL}?action=start&email=${encodeURIComponent(email)}`;
}

/**
 * Disconnect Slack integration
 */
export async function disconnectSlack(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return false;
    }

    const response = await fetch(`${SLACK_FUNCTION_URL}?action=disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    return false;
  }
}

/**
 * Update Slack nudge settings
 */
export async function updateSlackSettings(settings: {
  nudge_enabled?: boolean;
  nudge_frequency?: 'smart' | 'daily' | 'weekly' | 'none';
  preferred_time?: string;
  timezone?: string;
}): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return false;
    }

    const response = await fetch(`${SLACK_FUNCTION_URL}?action=settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating Slack settings:', error);
    return false;
  }
}

/**
 * Fetch nudge history for the current user
 */
export async function fetchNudgeHistory(email: string): Promise<SlackNudge[]> {
  const { data, error } = await supabase
    .from('slack_nudges')
    .select('*')
    .ilike('employee_email', email)
    .order('sent_at', { ascending: false })
    .limit(20);

  if (error) {
    // Table might not exist
    console.error('Error fetching nudge history:', error);
    return [];
  }

  return (data as SlackNudge[]) || [];
}
