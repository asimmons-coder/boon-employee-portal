import type { Employee, Session, BaselineSurvey, CompetencyScore, ReflectionResponse } from './types';

/**
 * GROW Coaching State Machine
 *
 * States represent the progression through a coaching program:
 * 1. NOT_SIGNED_UP - No program enrollment
 * 2. SIGNED_UP_NOT_MATCHED - Enrolled but no coach assigned
 * 3. MATCHED_PRE_FIRST_SESSION - Has coach, awaiting first session
 * 4. ACTIVE_PROGRAM - In active coaching (has completed sessions)
 * 5. PENDING_REFLECTION - Final session done, awaiting reflection submission
 * 6. COMPLETED_PROGRAM - Program finished (reflection submitted)
 */

export type CoachingState =
  | 'NOT_SIGNED_UP'
  | 'SIGNED_UP_NOT_MATCHED'
  | 'MATCHED_PRE_FIRST_SESSION'
  | 'ACTIVE_PROGRAM'
  | 'PENDING_REFLECTION'
  | 'COMPLETED_PROGRAM';

export interface CoachingStateData {
  state: CoachingState;
  // Derived data useful for UI
  hasProgram: boolean;
  hasCoach: boolean;
  hasBaseline: boolean;
  hasCompletedSessions: boolean;
  hasUpcomingSession: boolean;
  completedSessionCount: number;
  totalExpectedSessions: number;
  upcomingSession: Session | null;
  lastSession: Session | null;
  programProgress: number; // 0-100 percentage
  isGrowOrExec: boolean;
  hasEndOfProgramScores: boolean;
  hasReflection: boolean;
  isPendingReflection: boolean;
}

// Program session expectations
const PROGRAM_SESSION_COUNTS: Record<string, number> = {
  GROW: 12,
  EXEC: 12,
  SCALE: 6,
};

/**
 * Determines if all sessions are done (final session completed, no upcoming)
 */
function areAllSessionsDone(
  sessions: Session[],
  programType: string | null
): boolean {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSessions = sessions.filter(s => s.status === 'Upcoming');
  const expectedSessions = programType ? PROGRAM_SESSION_COUNTS[programType] || 12 : 12;

  return completedSessions.length >= expectedSessions && upcomingSessions.length === 0;
}

/**
 * Determines if a program is fully completed (sessions done + reflection submitted)
 * 1. Employee status contains 'completed', 'graduated', or 'finished'
 * 2. Has end_of_program competency scores (implies reflection done)
 * 3. Has reflection response submitted
 */
function isProgramFullyCompleted(
  employee: Employee | null,
  competencyScores: CompetencyScore[],
  reflection: ReflectionResponse | null
): boolean {
  if (!employee) return false;

  // Check employee status field
  const status = employee.status?.toLowerCase() || '';
  if (status.includes('completed') || status.includes('graduated') || status.includes('finished')) {
    return true;
  }

  // Check for end_of_program competency scores (implies reflection done)
  const hasEndOfProgramScores = competencyScores.some(
    cs => cs.score_type === 'end_of_program'
  );
  if (hasEndOfProgramScores) {
    return true;
  }

  // Check for reflection response
  if (reflection) {
    return true;
  }

  return false;
}

/**
 * Determines if employee has a coach assigned
 */
function hasCoachAssigned(employee: Employee | null, sessions: Session[]): boolean {
  // Has explicit coach_id
  if (employee?.coach_id) return true;

  // Has sessions (implies coach assignment)
  if (sessions.length > 0) return true;

  return false;
}

/**
 * Extracts program type from program field
 * Handles formats like "GROW", "GROW - Cohort 1", etc.
 */
function extractProgramType(program: string | null): string | null {
  if (!program) return null;

  const upper = program.toUpperCase();
  if (upper === 'GROW' || upper.startsWith('GROW ') || upper.startsWith('GROW-')) {
    return 'GROW';
  }
  if (upper === 'EXEC' || upper.startsWith('EXEC ') || upper.startsWith('EXEC-')) {
    return 'EXEC';
  }
  if (upper === 'SCALE' || upper.startsWith('SCALE ') || upper.startsWith('SCALE-')) {
    return 'SCALE';
  }

  return null;
}

/**
 * Main state determination function
 * Single source of truth for coaching state
 */
export function getCoachingState(
  employee: Employee | null,
  sessions: Session[],
  baseline: BaselineSurvey | null,
  competencyScores: CompetencyScore[] = [],
  reflection: ReflectionResponse | null = null
): CoachingStateData {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming') || null;
  const lastSession = completedSessions.length > 0
    ? completedSessions.sort((a, b) =>
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      )[0]
    : null;

  const hasProgram = !!employee?.program;
  const hasCoach = hasCoachAssigned(employee, sessions);
  const hasBaseline = !!baseline;
  const hasCompletedSessions = completedSessions.length > 0;
  const hasUpcomingSession = !!upcomingSession;

  const programType = extractProgramType(employee?.program || null);
  const isGrowOrExec = programType === 'GROW' || programType === 'EXEC';
  const totalExpectedSessions = programType ? PROGRAM_SESSION_COUNTS[programType] || 12 : 12;
  const programProgress = Math.min(100, Math.round((completedSessions.length / totalExpectedSessions) * 100));

  const hasEndOfProgramScores = competencyScores.some(cs => cs.score_type === 'end_of_program');
  const hasReflection = !!reflection || hasEndOfProgramScores;
  const allSessionsDone = areAllSessionsDone(sessions, programType);
  const isFullyCompleted = isProgramFullyCompleted(employee, competencyScores, reflection);

  // Determine state
  let state: CoachingState;

  if (!employee || !hasProgram) {
    state = 'NOT_SIGNED_UP';
  } else if (isFullyCompleted) {
    state = 'COMPLETED_PROGRAM';
  } else if (allSessionsDone && !hasReflection) {
    // Sessions done but reflection not submitted
    state = 'PENDING_REFLECTION';
  } else if (!hasCoach) {
    state = 'SIGNED_UP_NOT_MATCHED';
  } else if (!hasCompletedSessions) {
    state = 'MATCHED_PRE_FIRST_SESSION';
  } else {
    state = 'ACTIVE_PROGRAM';
  }

  const isPendingReflection = state === 'PENDING_REFLECTION';

  return {
    state,
    hasProgram,
    hasCoach,
    hasBaseline,
    hasCompletedSessions,
    hasUpcomingSession,
    completedSessionCount: completedSessions.length,
    totalExpectedSessions,
    upcomingSession,
    lastSession,
    programProgress,
    isGrowOrExec,
    hasEndOfProgramScores,
    hasReflection,
    isPendingReflection,
  };
}

/**
 * Helper to check if state allows booking new sessions
 */
export function canBookSessions(state: CoachingState): boolean {
  return state === 'MATCHED_PRE_FIRST_SESSION' || state === 'ACTIVE_PROGRAM';
}

/**
 * Helper to check if program is in completed/alumni state
 */
export function isAlumniState(state: CoachingState): boolean {
  return state === 'COMPLETED_PROGRAM';
}

/**
 * Helper to check if user is pre-first-session (matched but no sessions yet)
 */
export function isPreFirstSession(state: CoachingState): boolean {
  return state === 'MATCHED_PRE_FIRST_SESSION';
}

/**
 * Helper to check if user is pending reflection (sessions done, reflection not submitted)
 */
export function isPendingReflectionState(state: CoachingState): boolean {
  return state === 'PENDING_REFLECTION';
}

/**
 * Get display label for state
 */
export function getStateLabel(state: CoachingState): string {
  switch (state) {
    case 'NOT_SIGNED_UP':
      return 'Get Started';
    case 'SIGNED_UP_NOT_MATCHED':
      return 'Finding Your Coach';
    case 'MATCHED_PRE_FIRST_SESSION':
      return 'Ready to Begin';
    case 'ACTIVE_PROGRAM':
      return 'Active Coaching';
    case 'PENDING_REFLECTION':
      return 'Final Reflection';
    case 'COMPLETED_PROGRAM':
      return 'Program Graduate';
  }
}
