import { supabase } from './supabase';
import type { Employee, Session, SurveyResponse, BaselineSurvey, WelcomeSurveyScale, CompetencyScore, ProgramType, ActionItem, SlackConnectionStatus, SlackNudge, ReflectionResponse, Checkpoint, Coach } from './types';

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
 * Fetch all sessions for an employee
 * Tries multiple lookup methods to handle different data scenarios:
 * 1. By employee_id (direct link)
 * 2. By employee_email (case-insensitive)
 * 3. Via RPC function (bypasses potential RLS issues)
 */
export async function fetchSessions(employeeId: string, employeeEmail?: string): Promise<Session[]> {
  console.log('[fetchSessions] Starting lookup for:', { employeeId, employeeEmail });

  // Try by employee_id first
  const { data: idData, error: idError } = await supabase
    .from('session_tracking')
    .select('*')
    .eq('employee_id', employeeId)
    .order('session_date', { ascending: false });

  console.log('[fetchSessions] By employee_id:', {
    found: idData?.length || 0,
    error: idError?.message || 'none'
  });

  if (!idError && idData && idData.length > 0) {
    return idData as Session[];
  }

  // Fallback 1: Try by employee_email (case-insensitive)
  if (employeeEmail) {
    const { data: emailData, error: emailError } = await supabase
      .from('session_tracking')
      .select('*')
      .ilike('employee_email', employeeEmail)
      .order('session_date', { ascending: false });

    console.log('[fetchSessions] By employee_email ilike:', {
      searchEmail: employeeEmail,
      found: emailData?.length || 0,
      error: emailError?.message || 'none'
    });

    if (!emailError && emailData && emailData.length > 0) {
      return emailData as Session[];
    }

    // Fallback 2: Try exact email match (different case handling)
    const { data: exactData, error: exactError } = await supabase
      .from('session_tracking')
      .select('*')
      .eq('employee_email', employeeEmail.toLowerCase())
      .order('session_date', { ascending: false });

    console.log('[fetchSessions] By employee_email exact lowercase:', {
      searchEmail: employeeEmail.toLowerCase(),
      found: exactData?.length || 0,
      error: exactError?.message || 'none'
    });

    if (!exactError && exactData && exactData.length > 0) {
      return exactData as Session[];
    }

    // Fallback 3: Try RPC function that uses SECURITY DEFINER to bypass RLS
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_sessions_for_user', { user_email: employeeEmail });

    console.log('[fetchSessions] By RPC get_sessions_for_user:', {
      found: rpcData?.length || 0,
      error: rpcError?.message || 'none',
      code: rpcError?.code || 'none'
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData as Session[];
    }

    // Final debug: Check if sessions exist at all for this email pattern
    // This query uses a wildcard to see if any sessions match even partially
    const { data: debugData, error: debugError } = await supabase
      .from('session_tracking')
      .select('id, employee_email, employee_id, status, coach_name')
      .or(`employee_email.ilike.%${employeeEmail.split('@')[0]}%,employee_id.eq.${employeeId}`)
      .limit(5);

    console.log('[fetchSessions] DEBUG - Partial match search:', {
      searchPattern: `%${employeeEmail.split('@')[0]}%`,
      found: debugData?.length || 0,
      data: debugData,
      error: debugError?.message || 'none'
    });
  }

  console.log('[fetchSessions] No sessions found for user');
  return [];
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
  console.log('[fetchWelcomeSurveyScale] Looking up for email:', email);

  const { data, error } = await supabase
    .from('welcome_survey_scale')
    .select('*')
    .ilike('email', email)
    .order('id', { ascending: false })
    .limit(1);

  console.log('[fetchWelcomeSurveyScale] Result:', {
    found: data?.length || 0,
    error: error?.message || 'none',
    errorCode: error?.code || 'none',
  });

  if (error) {
    // Table might not exist yet
    if (error.code !== '42P01' && error.code !== 'PGRST116') {
      console.error('Error fetching SCALE welcome survey:', error);
    }
    return null;
  }

  if (data && data.length > 0) {
    console.log('[fetchWelcomeSurveyScale] Found data:', {
      email: data[0].email,
      satisfaction: data[0].satisfaction,
      productivity: data[0].productivity,
      work_life_balance: data[0].work_life_balance,
    });
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
  console.log('[fetchProgramType] Input programId:', programId);

  if (!programId) {
    console.log('[fetchProgramType] No programId, returning null');
    return null;
  }

  const upperProgram = programId.toUpperCase();
  console.log('[fetchProgramType] Checking upperProgram:', upperProgram);

  // Check if it starts with a known program type (e.g., "GROW - Cohort 1")
  if (upperProgram === 'SCALE' || upperProgram.startsWith('SCALE ') || upperProgram.startsWith('SCALE-') || upperProgram.includes(' SCALE')) {
    console.log('[fetchProgramType] Matched SCALE pattern');
    return 'SCALE';
  }
  if (upperProgram === 'GROW' || upperProgram.startsWith('GROW ') || upperProgram.startsWith('GROW-') || upperProgram.includes(' GROW')) {
    console.log('[fetchProgramType] Matched GROW pattern');
    return 'GROW';
  }
  if (upperProgram === 'EXEC' || upperProgram.startsWith('EXEC ') || upperProgram.startsWith('EXEC-') || upperProgram.includes(' EXEC')) {
    console.log('[fetchProgramType] Matched EXEC pattern');
    return 'EXEC';
  }
  // Check for SLX which is SCALE
  if (upperProgram.includes('SLX')) {
    console.log('[fetchProgramType] Matched SLX -> SCALE');
    return 'SCALE';
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
 * Fetch coach details by name
 */
export async function fetchCoachByName(coachName: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .ilike('name', coachName)
    .single();

  if (error) {
    // Coaches table might not exist
    if (error.code !== 'PGRST116') {
      console.error('Error fetching coach by name:', error);
    }
    return null;
  }

  return data as Coach;
}

/**
 * Fetch coach details by ID
 */
export async function fetchCoachById(coachId: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', coachId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching coach by id:', error);
    }
    return null;
  }

  return data as Coach;
}

/**
 * Parse special_services string into prioritized specialty tags
 * Priority: ADHD, Neurodivergence, LGBTQIA+, Working Mothers, then Leadership, Stress, etc.
 */
export function parseCoachSpecialties(specialServices: string | null, maxTags: number = 4): string[] {
  if (!specialServices) return [];

  const allSpecialties = specialServices.split(';').map(s => s.trim()).filter(Boolean);

  // Priority specialties (show these first if present)
  const priorityKeywords = [
    'ADHD',
    'Neurodiverg',
    'LGBTQ',
    'Working Mother',
    'Working Parent',
    'Women in Leadership',
  ];

  const priorityMatches: string[] = [];
  const otherSpecialties: string[] = [];

  allSpecialties.forEach(specialty => {
    const isPriority = priorityKeywords.some(keyword =>
      specialty.toLowerCase().includes(keyword.toLowerCase())
    );
    if (isPriority) {
      priorityMatches.push(specialty);
    } else {
      otherSpecialties.push(specialty);
    }
  });

  // Combine priority first, then others, limited to maxTags
  return [...priorityMatches, ...otherSpecialties].slice(0, maxTags);
}

/**
 * Get coach title line based on product certifications and ICF level
 */
export function getCoachTitleLine(coach: Coach | null, programType?: ProgramType | null): string {
  if (!coach) return 'Executive Coach';

  // Determine product type
  let productLabel = 'COACH';
  if (programType === 'EXEC' || coach.is_exec_coach) {
    productLabel = 'EXECUTIVE COACH';
  } else if (programType === 'GROW' || coach.is_grow_coach) {
    productLabel = 'LEADERSHIP COACH';
  } else if (programType === 'SCALE' || coach.is_scale_coach) {
    productLabel = 'COACH';
  }

  // Add ICF level if available
  if (coach.icf_level) {
    return `${productLabel} · ${coach.icf_level}`;
  }

  return productLabel;
}

/**
 * Get coach background line for Industry Practitioners
 */
export function getCoachBackgroundLine(coach: Coach | null): string | null {
  if (!coach) return null;

  // Only show for Industry Practitioners with companies
  if (coach.practitioner_type !== 'Industry Practitioner') return null;
  if (!coach.companies || coach.companies.length === 0) return null;

  // Get primary industry label
  const industryLabel = coach.industries?.[0] || 'Executive';

  // Format: "Former [industry] · [companies]"
  const companiesStr = coach.companies.slice(0, 3).join(' · ');
  return `Former ${industryLabel} · ${companiesStr}`;
}

/**
 * Fetch match summary for a coach-employee pairing
 * Tries welcome_survey_scale first, then welcome_survey_baseline
 * Uses employee_id for lookup, with email fallback
 */
export async function fetchMatchSummary(employeeId: string, email?: string): Promise<string | null> {
  console.log('[fetchMatchSummary] Looking up match_summary for employee_id:', employeeId, 'email:', email);

  // Try welcome_survey_scale by employee_id first
  const { data: scaleData, error: scaleError } = await supabase
    .from('welcome_survey_scale')
    .select('match_summary, employee_id, email')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('[fetchMatchSummary] welcome_survey_scale by employee_id result:', { scaleData, scaleError });

  if (!scaleError && scaleData && scaleData.length > 0 && scaleData[0].match_summary) {
    console.log('[fetchMatchSummary] Found in welcome_survey_scale:', scaleData[0].match_summary);
    return scaleData[0].match_summary;
  }

  // Try welcome_survey_scale by email as fallback
  if (email) {
    const { data: scaleByEmail, error: scaleEmailError } = await supabase
      .from('welcome_survey_scale')
      .select('match_summary, employee_id, email')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('[fetchMatchSummary] welcome_survey_scale by email result:', { scaleByEmail, scaleEmailError });

    if (!scaleEmailError && scaleByEmail && scaleByEmail.length > 0 && scaleByEmail[0].match_summary) {
      console.log('[fetchMatchSummary] Found in welcome_survey_scale by email:', scaleByEmail[0].match_summary);
      return scaleByEmail[0].match_summary;
    }
  }

  // Fallback to welcome_survey_baseline by employee_id
  const { data: baselineData, error: baselineError } = await supabase
    .from('welcome_survey_baseline')
    .select('match_summary, employee_id, email')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('[fetchMatchSummary] welcome_survey_baseline result:', { baselineData, baselineError });

  if (!baselineError && baselineData && baselineData.length > 0 && baselineData[0].match_summary) {
    console.log('[fetchMatchSummary] Found in welcome_survey_baseline:', baselineData[0].match_summary);
    return baselineData[0].match_summary;
  }

  // Try welcome_survey_baseline by email as fallback
  if (email) {
    const { data: baselineByEmail, error: baselineEmailError } = await supabase
      .from('welcome_survey_baseline')
      .select('match_summary, employee_id, email')
      .eq('email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('[fetchMatchSummary] welcome_survey_baseline by email result:', { baselineByEmail, baselineEmailError });

    if (!baselineEmailError && baselineByEmail && baselineByEmail.length > 0 && baselineByEmail[0].match_summary) {
      console.log('[fetchMatchSummary] Found in welcome_survey_baseline by email:', baselineByEmail[0].match_summary);
      return baselineByEmail[0].match_summary;
    }
  }

  console.log('[fetchMatchSummary] No match_summary found for employee_id:', employeeId);
  return null;
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

// Program-specific milestone arrays
const SCALE_MILESTONES = [1, 3, 6, 12, 18, 24, 30, 36];
const GROW_MILESTONES = [1, 6];

/**
 * Check for pending survey after login
 * Returns the OLDEST session that needs a survey (so users complete in order)
 * Handles GROW vs SCALE program types with different milestone arrays
 */
export async function fetchPendingSurvey(email: string, programType?: string | null): Promise<PendingSurvey | null> {
  // First, try the RPC function (uses the comprehensive pending_surveys view)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_pending_survey', { user_email: email });

  if (!rpcError && rpcData && rpcData.length > 0) {
    return rpcData[0] as PendingSurvey;
  }

  // Fallback: manual query for pending surveys
  // Determine program type first
  const normalizedProgram = programType?.toUpperCase() || '';
  const isGrow = normalizedProgram === 'GROW' || normalizedProgram.startsWith('GROW');
  const milestones = isGrow ? GROW_MILESTONES : SCALE_MILESTONES;

  // Get completed sessions count for end-of-program detection
  const { data: completedCount } = await supabase
    .from('session_tracking')
    .select('id', { count: 'exact' })
    .ilike('employee_email', email)
    .eq('status', 'Completed');

  const totalCompleted = completedCount?.length || 0;

  // Check for end-of-program survey first
  // Default sessions_per_employee is 6 for GROW, 36 for SCALE
  const sessionsPerEmployee = isGrow ? 6 : 36;

  if (totalCompleted >= sessionsPerEmployee) {
    // Check if they've already submitted an end survey
    const { data: existingEndSurvey } = await supabase
      .from('survey_submissions')
      .select('id')
      .ilike('email', email)
      .in('survey_type', ['scale_end', 'grow_end'])
      .limit(1);

    if (!existingEndSurvey || existingEndSurvey.length === 0) {
      // Get the most recent session for context
      const { data: latestSession } = await supabase
        .from('session_tracking')
        .select('id, session_date, appointment_number, coach_name')
        .ilike('employee_email', email)
        .eq('status', 'Completed')
        .order('session_date', { ascending: false })
        .limit(1);

      if (latestSession && latestSession.length > 0) {
        return {
          session_id: latestSession[0].id,
          session_number: latestSession[0].appointment_number,
          session_date: latestSession[0].session_date,
          coach_name: latestSession[0].coach_name || 'Your Coach',
          survey_type: isGrow ? 'grow_end' : 'scale_end',
        };
      }
    }
  }

  // Get completed sessions at survey milestones without matching survey
  // Order by ascending (oldest first) so users complete surveys in order
  const { data: sessions, error: sessionsError } = await supabase
    .from('session_tracking')
    .select('id, employee_email, session_date, appointment_number, coach_name, program_name')
    .ilike('employee_email', email)
    .eq('status', 'Completed')
    .in('appointment_number', milestones)
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
      // All milestone surveys use scale_feedback for now
      // (GROW and SCALE use same questions for regular feedback)
      return {
        session_id: session.id,
        session_number: session.appointment_number,
        session_date: session.session_date,
        coach_name: session.coach_name || 'Your Coach',
        survey_type: 'scale_feedback',
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

// ============================================
// GROW DASHBOARD DATA FETCHERS
// ============================================

export interface ProgramInfo {
  program_title: string | null;
  program_type: string;
  sessions_per_employee: number;
  program_start_date: string | null;
  program_end_date: string | null;
}

/**
 * Fetch program configuration for a participant
 * Looks up via employee's program field -> programs table
 */
export async function fetchProgramInfo(programId: string | null): Promise<ProgramInfo | null> {
  if (!programId) return null;

  const upperProgram = programId.toUpperCase();

  // Determine program type from name pattern first
  let programType = 'SCALE';
  if (upperProgram === 'GROW' || upperProgram.startsWith('GROW ') || upperProgram.startsWith('GROW-')) {
    programType = 'GROW';
  } else if (upperProgram === 'EXEC' || upperProgram.startsWith('EXEC ') || upperProgram.startsWith('EXEC-')) {
    programType = 'EXEC';
  }

  // Try to look up by ID first (if it looks like a UUID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(programId);

  if (isUuid) {
    const { data, error } = await supabase
      .from('programs')
      .select('name, program_type, sessions_per_employee, program_end_date')
      .eq('id', programId)
      .single();

    if (!error && data) {
      return {
        program_title: data.name || programId,
        program_type: data.program_type || programType,
        sessions_per_employee: data.sessions_per_employee || (programType === 'GROW' ? 6 : 36),
        program_start_date: null,
        program_end_date: data.program_end_date || null,
      };
    }
  }

  // Try to look up by name/title
  const { data: byName, error: nameError } = await supabase
    .from('programs')
    .select('name, program_type, sessions_per_employee, program_end_date')
    .ilike('name', `%${programId}%`)
    .limit(1)
    .single();

  if (!nameError && byName) {
    return {
      program_title: byName.name || programId,
      program_type: byName.program_type || programType,
      sessions_per_employee: byName.sessions_per_employee || (programType === 'GROW' ? 6 : 36),
      program_start_date: null,
      program_end_date: byName.program_end_date || null,
    };
  }

  // Return defaults based on inferred program type
  return {
    program_title: programId,
    program_type: programType,
    sessions_per_employee: programType === 'GROW' ? 6 : 36,
    program_start_date: null,
    program_end_date: null,
  };
}

export interface GrowFocusArea {
  competency_name: string;
  baseline_score: CompetencyScoreLevel;
}

/**
 * Fetch participant's GROW focus areas and baseline scores
 * Gets the 3 focus areas they selected plus their baseline scores
 */
export async function fetchGrowFocusAreas(email: string): Promise<GrowFocusArea[]> {
  // First, try to get focus areas from survey_submissions (native survey)
  const { data: surveyData } = await supabase
    .from('survey_submissions')
    .select('focus_areas')
    .ilike('email', email)
    .eq('survey_type', 'grow_baseline')
    .order('submitted_at', { ascending: false })
    .limit(1);

  let focusAreas: string[] = [];

  if (surveyData && surveyData.length > 0 && surveyData[0].focus_areas) {
    focusAreas = surveyData[0].focus_areas;
  } else {
    // Fallback: Try to get from welcome_survey_baseline coaching_priorities
    const { data: baselineData } = await supabase
      .from('welcome_survey_baseline')
      .select('coaching_priorities')
      .ilike('email', email)
      .limit(1);

    if (baselineData && baselineData.length > 0 && baselineData[0].coaching_priorities) {
      // coaching_priorities might be a string or array
      const priorities = baselineData[0].coaching_priorities;
      if (Array.isArray(priorities)) {
        focusAreas = priorities.slice(0, 3);
      } else if (typeof priorities === 'string') {
        focusAreas = priorities.split(',').map((p: string) => p.trim()).slice(0, 3);
      }
    }
  }

  if (focusAreas.length === 0) {
    return [];
  }

  // Get baseline scores for focus areas from survey_competency_scores
  const { data: scores } = await supabase
    .from('survey_competency_scores')
    .select('competency_name, score')
    .ilike('email', email)
    .eq('score_type', 'pre')
    .in('competency_name', focusAreas);

  // Build result with scores (default to 3 if no score found)
  return focusAreas.map(competency => {
    const scoreData = scores?.find(s => s.competency_name === competency);
    return {
      competency_name: competency,
      baseline_score: (scoreData?.score || 3) as CompetencyScoreLevel,
    };
  });
}

/**
 * Fetch all baseline competency scores for a participant
 * Used to display full competency profile on GROW dashboard
 */
export async function fetchAllBaselineScores(email: string): Promise<SurveyCompetencyScore[]> {
  const { data, error } = await supabase
    .from('survey_competency_scores')
    .select('*')
    .ilike('email', email)
    .eq('score_type', 'pre')
    .order('competency_name', { ascending: true });

  if (error) {
    console.error('Error fetching baseline scores:', error);
    return [];
  }

  return (data as SurveyCompetencyScore[]) || [];
}

// ============================================
// COACHING WINS
// ============================================

import type { CoachingWin } from './types';

/**
 * Fetch coaching wins for an employee
 * Returns wins ordered by most recent first
 * Uses RPC function which joins through employee_manager to find wins by email
 */
export async function fetchCoachingWins(email: string): Promise<CoachingWin[]> {
  console.log('[fetchCoachingWins] Fetching wins for email:', email);

  // Use RPC function which joins through employee_manager
  // (coaching_wins table doesn't have email column, only employee_id)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_coaching_wins_for_user', { user_email: email });

  if (!rpcError && rpcData) {
    console.log('[fetchCoachingWins] RPC succeeded, found:', rpcData.length);
    return (rpcData as CoachingWin[]) || [];
  }

  // Log RPC error
  if (rpcError) {
    // Only log if not a "function doesn't exist" error
    if (rpcError.code !== '42883' && rpcError.code !== 'PGRST202') {
      console.error('[fetchCoachingWins] RPC failed:', rpcError);
    }
  }

  return [];
}

/**
 * Add a new coaching win (manual entry from progress page or survey)
 * Uses RPC function which handles the insert with SECURITY DEFINER
 */
export async function addCoachingWin(
  email: string,
  employeeId: string | number,
  winText: string,
  sessionNumber?: number,
  isPrivate: boolean = false,
  source: 'manual' | 'check_in_survey' = 'manual'
): Promise<{ success: boolean; data?: CoachingWin; error?: string }> {
  // Convert employeeId to number (Supabase returns BIGINT as string sometimes)
  const numericEmployeeId = typeof employeeId === 'string' ? parseInt(employeeId, 10) : employeeId;

  console.log('[addCoachingWin] Adding win for:', { email, employeeId: numericEmployeeId, winText: winText.substring(0, 50) });

  // Use RPC function which handles the insert with proper permissions
  // (coaching_wins table doesn't have email column, only employee_id)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('add_coaching_win_for_user', {
      user_email: email,
      user_employee_id: numericEmployeeId,
      win_text_value: winText.trim(),
      session_num: sessionNumber || null,
      is_private_value: isPrivate,
      source_value: source,
    });

  if (!rpcError && rpcData) {
    console.log('[addCoachingWin] RPC succeeded');
    return { success: true, data: rpcData as CoachingWin };
  }

  // Log RPC error
  if (rpcError) {
    console.error('[addCoachingWin] RPC failed:', rpcError);
    return { success: false, error: rpcError.message };
  }

  return { success: false, error: 'Failed to add coaching win' };
}
