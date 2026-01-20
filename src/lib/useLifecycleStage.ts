import type { Employee, Session, BaselineSurvey } from './types';

export type LifecycleStage =
  | 'welcome'        // Never signed up - needs to take welcome survey
  | 'matching'       // Completed survey, pending coach match
  | 'getting-started' // Has coach, but no completed sessions yet
  | 'active';        // Has completed at least one session

export interface LifecycleData {
  stage: LifecycleStage;
  hasBaseline: boolean;
  hasCoach: boolean;
  hasUpcomingSession: boolean;
  hasCompletedSessions: boolean;
  upcomingSession: Session | null;
  completedSessionCount: number;
}

export function determineLifecycleStage(
  employee: Employee | null,
  sessions: Session[],
  baseline: BaselineSurvey | null
): LifecycleData {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled') || null;

  const hasBaseline = !!baseline;
  const hasCoach = !!employee?.coach_id || sessions.length > 0;
  const hasUpcomingSession = !!upcomingSession;
  const hasCompletedSessions = completedSessions.length > 0;

  let stage: LifecycleStage;

  if (hasCompletedSessions) {
    // Stage 4: Active coaching - has completed at least one session
    stage = 'active';
  } else if (hasCoach) {
    // Stage 3: Getting started - has coach but no completed sessions
    stage = 'getting-started';
  } else if (hasBaseline) {
    // Stage 2: Matching - completed survey, waiting for coach
    stage = 'matching';
  } else {
    // Stage 1: Welcome - needs to take welcome survey
    stage = 'welcome';
  }

  return {
    stage,
    hasBaseline,
    hasCoach,
    hasUpcomingSession,
    hasCompletedSessions,
    upcomingSession,
    completedSessionCount: completedSessions.length,
  };
}
