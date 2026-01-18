import { supabase } from './supabase';
import type { Employee, Session, SurveyResponse, BaselineSurvey, WelcomeSurveyScale, CompetencyScore, ProgramType, ActionItem, SlackConnectionStatus, SlackNudge, ReflectionResponse, Checkpoint } from './types';

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
    .order('created_at', { ascending: true });

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

  return (data && data.length > 0) ? data[0] as BaselineSurvey : null;
}

/**
 * Fetch welcome survey for SCALE users
 * Contains coaching goals and focus area selections
 */
export async function fetchWelcomeSurveyScale(email: string): Promise<WelcomeSurveyScale | null> {
  const { data, error } = await supabase
    .from('welcome_survey_scale')
    .select('*')
    .ilike('email', email)
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    // Table might not exist yet
    if (error.code !== '42P01' && error.code !== 'PGRST116') {
      console.error('Error fetching SCALE welcome survey:', error);
    }
    return null;
  }

  return (data && data.length > 0) ? data[0] as WelcomeSurveyScale : null;
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
    .order('created_at', { ascending: false })
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

// ============================================
// POST-PROGRAM REFLECTION
// ============================================

/**
 * Fetch reflection response for a user (post-program assessment)
 */
export async function fetchReflection(email: string): Promise<ReflectionResponse | null> {
  const { data, error } = await supabase
    .from('reflection_responses')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    // Table might not exist yet
    if (error.code !== '42P01' && error.code !== 'PGRST116') {
      console.error('Error fetching reflection:', error);
    }
    return null;
  }

  return (data && data.length > 0) ? data[0] as ReflectionResponse : null;
}

/**
 * Submit post-program reflection
 */
export async function submitReflection(
  email: string,
  reflection: Omit<ReflectionResponse, 'id' | 'email' | 'created_at'>
): Promise<{ success: boolean; data?: ReflectionResponse; error?: string }> {
  const { data, error } = await supabase
    .from('reflection_responses')
    .insert({
      email: email.toLowerCase(),
      ...reflection,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting reflection:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ReflectionResponse };
}

// ============================================
// SCALE CHECKPOINTS (Longitudinal Tracking)
// ============================================

/**
 * Fetch all checkpoints for a SCALE user
 */
export async function fetchCheckpoints(email: string): Promise<Checkpoint[]> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .ilike('email', email)
    .order('checkpoint_number', { ascending: true });

  if (error) {
    // Table might not exist yet
    if (error.code !== '42P01' && error.code !== 'PGRST116') {
      console.error('Error fetching checkpoints:', error);
    }
    return [];
  }

  return (data as Checkpoint[]) || [];
}

/**
 * Fetch the latest checkpoint for a SCALE user
 */
export async function fetchLatestCheckpoint(email: string): Promise<Checkpoint | null> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .ilike('email', email)
    .order('checkpoint_number', { ascending: false })
    .limit(1);

  if (error) {
    // Table might not exist yet
    if (error.code !== '42P01' && error.code !== 'PGRST116') {
      console.error('Error fetching latest checkpoint:', error);
    }
    return null;
  }

  return (data && data.length > 0) ? data[0] as Checkpoint : null;
}

/**
 * Submit a SCALE checkpoint
 */
export async function submitCheckpoint(
  email: string,
  checkpoint: Omit<Checkpoint, 'id' | 'email' | 'created_at'>
): Promise<{ success: boolean; data?: Checkpoint; error?: string }> {
  const { data, error } = await supabase
    .from('checkpoints')
    .insert({
      email: email.toLowerCase(),
      ...checkpoint,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting checkpoint:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Checkpoint };
}

// ============================================
// NATIVE SURVEY SYSTEM
// ============================================

import type {
  CoreCompetency,
  PendingSurvey,
  SurveyType,
  SurveyCompetencyScore,
  CompetencyScoreLevel,
  CoachQuality
} from './types';

/**
 * Fetch all active core competencies
 */
export async function fetchCoreCompetencies(): Promise<CoreCompetency[]> {
  const { data, error } = await supabase
    .from('core_competencies')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching competencies:', error);
    return [];
  }

  return (data as CoreCompetency[]) || [];
}

/**
 * Check for pending survey after login
 * Returns the OLDEST session that needs a survey (so users complete in order)
 */
export async function fetchPendingSurvey(email: string, programType?: string | null): Promise<PendingSurvey | null> {
  // First, try the RPC function
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_pending_survey', { user_email: email });

  if (!rpcError && rpcData && rpcData.length > 0) {
    return rpcData[0] as PendingSurvey;
  }

  // Fallback: manual query for pending surveys
  // Get completed sessions at survey milestones without matching survey
  // Order by ascending (oldest first) so users complete surveys in order
  const { data: sessions, error: sessionsError } = await supabase
    .from('session_tracking')
    .select('id, employee_email, session_date, appointment_number, coach_name, program_name')
    .ilike('employee_email', email)
    .eq('status', 'Completed')
    .in('appointment_number', [1, 3, 6, 12, 18, 24, 30, 36])
    .order('session_date', { ascending: true });

  if (sessionsError || !sessions || sessions.length === 0) {
    return null;
  }

  // Check which sessions don't have a survey yet
  for (const session of sessions) {
    const { data: existingSurvey } = await supabase
      .from('survey_submissions')
      .select('id')
      .ilike('email', email)
      .eq('session_id', session.id)
      .limit(1);

    if (!existingSurvey || existingSurvey.length === 0) {
      // Determine survey type based on program
      // GROW uses grow surveys, SCALE uses scale_feedback
      const sessionProgram = session.program_name || programType;
      const isGrow = sessionProgram?.toUpperCase() === 'GROW';

      // For GROW, check if baseline exists - if not, show baseline survey
      // Otherwise show regular feedback
      let surveyType: SurveyType = 'scale_feedback';

      if (isGrow) {
        // Check if user has completed baseline survey
        const hasBaseline = await hasCompletedBaselineSurvey(email);
        surveyType = hasBaseline ? 'scale_feedback' : 'grow_baseline';
      }

      return {
        session_id: session.id,
        session_number: session.appointment_number,
        session_date: session.session_date,
        coach_name: session.coach_name || 'Your Coach',
        survey_type: surveyType,
      };
    }
  }

  return null;
}

/**
 * Fetch survey by session ID (for /feedback?session_id=xxx route)
 */
export async function fetchSurveyContext(sessionId: string): Promise<{
  session_id: string;
  session_number: number;
  session_date: string;
  coach_name: string;
  employee_email: string;
} | null> {
  const { data, error } = await supabase
    .from('session_tracking')
    .select('id, appointment_number, session_date, coach_name, employee_email')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    console.error('Error fetching survey context:', error);
    return null;
  }

  return {
    session_id: data.id,
    session_number: data.appointment_number,
    session_date: data.session_date,
    coach_name: data.coach_name || 'Your Coach',
    employee_email: data.employee_email,
  };
}

/**
 * Submit a SCALE feedback survey
 */
export async function submitScaleFeedbackSurvey(
  email: string,
  sessionId: string,
  sessionNumber: number,
  coachName: string,
  data: {
    coach_satisfaction: number;
    wants_rematch?: boolean;
    rematch_reason?: string;
    coach_qualities: CoachQuality[];
    has_booked_next_session: boolean;
    nps: number;
    feedback_text?: string;
    // Extra fields for SCALE_END
    outcomes?: string;
    open_to_testimonial?: boolean;
  },
  surveyType: 'scale_feedback' | 'scale_end' = 'scale_feedback'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('survey_submissions')
    .insert({
      email: email.toLowerCase(),
      survey_type: surveyType,
      session_id: sessionId,
      session_number: sessionNumber,
      coach_name: coachName,
      coach_satisfaction: data.coach_satisfaction,
      wants_rematch: data.wants_rematch || false,
      rematch_reason: data.rematch_reason || null,
      coach_qualities: data.coach_qualities,
      has_booked_next_session: data.has_booked_next_session,
      nps: data.nps,
      feedback_text: data.feedback_text || null,
      outcomes: data.outcomes || null,
      open_to_testimonial: data.open_to_testimonial || false,
      submitted_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error submitting survey:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Submit a GROW baseline survey (pre-program competency assessment)
 */
export async function submitGrowBaselineSurvey(
  email: string,
  competencyScores: Record<string, CompetencyScoreLevel>,
  focusAreas: string[]
): Promise<{ success: boolean; error?: string }> {
  // Insert the main survey submission
  const { data: submission, error: submissionError } = await supabase
    .from('survey_submissions')
    .insert({
      email: email.toLowerCase(),
      survey_type: 'grow_baseline',
      focus_areas: focusAreas,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (submissionError || !submission) {
    console.error('Error submitting baseline survey:', submissionError);
    return { success: false, error: submissionError?.message || 'Failed to create survey' };
  }

  // Insert competency scores
  const competencyRecords = Object.entries(competencyScores).map(([name, score]) => ({
    survey_submission_id: submission.id,
    email: email.toLowerCase(),
    competency_name: name,
    score,
    score_type: 'pre',
  }));

  const { error: scoresError } = await supabase
    .from('survey_competency_scores')
    .insert(competencyRecords);

  if (scoresError) {
    console.error('Error submitting competency scores:', scoresError);
    return { success: false, error: scoresError.message };
  }

  return { success: true };
}

/**
 * Submit a GROW end survey (post-program competency assessment + NPS)
 */
export async function submitGrowEndSurvey(
  email: string,
  competencyScores: Record<string, CompetencyScoreLevel>,
  data: {
    nps: number;
    outcomes: string;
    open_to_testimonial: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  // Insert the main survey submission
  const { data: submission, error: submissionError } = await supabase
    .from('survey_submissions')
    .insert({
      email: email.toLowerCase(),
      survey_type: 'grow_end',
      nps: data.nps,
      outcomes: data.outcomes,
      open_to_testimonial: data.open_to_testimonial,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (submissionError || !submission) {
    console.error('Error submitting end survey:', submissionError);
    return { success: false, error: submissionError?.message || 'Failed to create survey' };
  }

  // Insert competency scores (post-program)
  const competencyRecords = Object.entries(competencyScores).map(([name, score]) => ({
    survey_submission_id: submission.id,
    email: email.toLowerCase(),
    competency_name: name,
    score,
    score_type: 'post',
  }));

  const { error: scoresError } = await supabase
    .from('survey_competency_scores')
    .insert(competencyRecords);

  if (scoresError) {
    console.error('Error submitting competency scores:', scoresError);
    return { success: false, error: scoresError.message };
  }

  return { success: true };
}

/**
 * Fetch user's competency scores (for progress comparison)
 */
export async function fetchUserCompetencyScores(email: string): Promise<SurveyCompetencyScore[]> {
  const { data, error } = await supabase
    .from('survey_competency_scores')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching competency scores:', error);
    return [];
  }

  return (data as SurveyCompetencyScore[]) || [];
}

/**
 * Check if user has completed baseline survey (for GROW program)
 */
export async function hasCompletedBaselineSurvey(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('survey_submissions')
    .select('id')
    .ilike('email', email)
    .eq('survey_type', 'grow_baseline')
    .limit(1);

  if (error) {
    console.error('Error checking baseline survey:', error);
    return false;
  }

  return data && data.length > 0;
}
