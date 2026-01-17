import { describe, it, expect } from 'vitest';
import {
  getCoachingState,
  canBookSessions,
  isAlumniState,
  getStateLabel,
  type CoachingState,
} from './coachingState';
import type { Employee, Session, BaselineSurvey, CompetencyScore } from './types';

// Test fixtures
const createEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  company_email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  job_title: 'Manager',
  manager_name: null,
  client_id: 'client-1',
  coach_id: null,
  auth_user_id: 'auth-1',
  status: null,
  program: null,
  booking_link: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  employee_id: 'emp-1',
  employee_name: 'Test User',
  session_date: '2024-02-01T10:00:00Z',
  status: 'Completed',
  coach_name: 'Coach Smith',
  leadership_management_skills: false,
  communication_skills: false,
  mental_well_being: false,
  other_themes: null,
  summary: null,
  goals: null,
  plan: null,
  duration_minutes: 60,
  company_id: null,
  account_name: null,
  program_name: null,
  program_title: null,
  appointment_number: 1,
  created_at: '2024-02-01T10:00:00Z',
  zoom_join_link: null,
  ...overrides,
});

const createBaseline = (overrides: Partial<BaselineSurvey> = {}): BaselineSurvey => ({
  id: 'baseline-1',
  email: 'test@example.com',
  created_at: '2024-01-15T00:00:00Z',
  coaching_goals: null,
  satisfaction: 4,
  productivity: 3,
  work_life_balance: 3,
  motivation: 4,
  comp_adaptability_and_resilience: 3,
  comp_building_relationships_at_work: 4,
  comp_change_management: 2,
  comp_delegation_and_accountability: 3,
  comp_effective_communication: 4,
  comp_effective_planning_and_execution: 3,
  comp_emotional_intelligence: 3,
  comp_giving_and_receiving_feedback: 2,
  comp_persuasion_and_influence: 3,
  comp_self_confidence_and_imposter_syndrome: 2,
  comp_strategic_thinking: 3,
  comp_time_management_and_productivity: 3,
  ...overrides,
});

const createCompetencyScore = (overrides: Partial<CompetencyScore> = {}): CompetencyScore => ({
  id: 'score-1',
  email: 'test@example.com',
  created_at: '2024-06-01T00:00:00Z',
  competency_name: 'Effective Communication',
  score: 4,
  score_label: 'Excelling',
  score_type: 'end_of_program',
  program_title: 'GROW - Cohort 1',
  ...overrides,
});

describe('getCoachingState', () => {
  describe('NOT_SIGNED_UP state', () => {
    it('returns NOT_SIGNED_UP when employee is null', () => {
      const result = getCoachingState(null, [], null);
      expect(result.state).toBe('NOT_SIGNED_UP');
      expect(result.hasProgram).toBe(false);
    });

    it('returns NOT_SIGNED_UP when employee has no program', () => {
      const employee = createEmployee({ program: null });
      const result = getCoachingState(employee, [], null);
      expect(result.state).toBe('NOT_SIGNED_UP');
      expect(result.hasProgram).toBe(false);
    });
  });

  describe('SIGNED_UP_NOT_MATCHED state', () => {
    it('returns SIGNED_UP_NOT_MATCHED when has program but no coach', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1', coach_id: null });
      const result = getCoachingState(employee, [], null);
      expect(result.state).toBe('SIGNED_UP_NOT_MATCHED');
      expect(result.hasProgram).toBe(true);
      expect(result.hasCoach).toBe(false);
    });
  });

  describe('MATCHED_PRE_FIRST_SESSION state', () => {
    it('returns MATCHED_PRE_FIRST_SESSION when has coach but no completed sessions', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1', coach_id: 'coach-1' });
      const result = getCoachingState(employee, [], createBaseline());
      expect(result.state).toBe('MATCHED_PRE_FIRST_SESSION');
      expect(result.hasCoach).toBe(true);
      expect(result.hasCompletedSessions).toBe(false);
    });

    it('returns MATCHED_PRE_FIRST_SESSION when has upcoming session but no completed', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1', coach_id: 'coach-1' });
      const upcomingSession = createSession({ status: 'Upcoming' });
      const result = getCoachingState(employee, [upcomingSession], createBaseline());
      expect(result.state).toBe('MATCHED_PRE_FIRST_SESSION');
      expect(result.hasUpcomingSession).toBe(true);
      expect(result.hasCompletedSessions).toBe(false);
    });
  });

  describe('ACTIVE_PROGRAM state', () => {
    it('returns ACTIVE_PROGRAM when has completed sessions', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1', coach_id: 'coach-1' });
      const completedSession = createSession({ status: 'Completed' });
      const result = getCoachingState(employee, [completedSession], createBaseline());
      expect(result.state).toBe('ACTIVE_PROGRAM');
      expect(result.hasCompletedSessions).toBe(true);
      expect(result.completedSessionCount).toBe(1);
    });

    it('calculates program progress correctly', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1' });
      const sessions = Array.from({ length: 6 }, (_, i) =>
        createSession({ id: `session-${i}`, status: 'Completed' })
      );
      const result = getCoachingState(employee, sessions, createBaseline());
      expect(result.state).toBe('ACTIVE_PROGRAM');
      expect(result.programProgress).toBe(50); // 6/12 = 50%
      expect(result.completedSessionCount).toBe(6);
    });

    it('identifies last session correctly', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1' });
      const olderSession = createSession({ id: 'old', session_date: '2024-01-01T10:00:00Z' });
      const newerSession = createSession({ id: 'new', session_date: '2024-03-01T10:00:00Z' });
      const result = getCoachingState(employee, [olderSession, newerSession], null);
      expect(result.lastSession?.id).toBe('new');
    });
  });

  describe('COMPLETED_PROGRAM state', () => {
    it('returns COMPLETED_PROGRAM when employee status is completed', () => {
      const employee = createEmployee({
        program: 'GROW - Cohort 1',
        status: 'completed',
      });
      const sessions = [createSession()];
      const result = getCoachingState(employee, sessions, createBaseline());
      expect(result.state).toBe('COMPLETED_PROGRAM');
    });

    it('returns COMPLETED_PROGRAM when status contains "graduated"', () => {
      const employee = createEmployee({
        program: 'GROW - Cohort 1',
        status: 'Program Graduated',
      });
      const result = getCoachingState(employee, [createSession()], null);
      expect(result.state).toBe('COMPLETED_PROGRAM');
    });

    it('returns COMPLETED_PROGRAM when has end_of_program competency scores', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1' });
      const sessions = Array.from({ length: 10 }, (_, i) =>
        createSession({ id: `session-${i}` })
      );
      const competencyScores = [createCompetencyScore({ score_type: 'end_of_program' })];
      const result = getCoachingState(employee, sessions, createBaseline(), competencyScores);
      expect(result.state).toBe('COMPLETED_PROGRAM');
      expect(result.hasEndOfProgramScores).toBe(true);
    });

    it('returns COMPLETED_PROGRAM when all 12 GROW sessions completed with no upcoming', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1' });
      const sessions = Array.from({ length: 12 }, (_, i) =>
        createSession({ id: `session-${i}`, status: 'Completed' })
      );
      const result = getCoachingState(employee, sessions, createBaseline());
      expect(result.state).toBe('COMPLETED_PROGRAM');
      expect(result.programProgress).toBe(100);
    });

    it('returns ACTIVE_PROGRAM when 12 sessions but has upcoming', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1' });
      const completedSessions = Array.from({ length: 12 }, (_, i) =>
        createSession({ id: `session-${i}`, status: 'Completed' })
      );
      const upcomingSession = createSession({ id: 'upcoming', status: 'Upcoming' });
      const result = getCoachingState(
        employee,
        [...completedSessions, upcomingSession],
        createBaseline()
      );
      expect(result.state).toBe('ACTIVE_PROGRAM');
    });
  });

  describe('Program type detection', () => {
    it('identifies GROW program', () => {
      const employee = createEmployee({ program: 'GROW - Cohort 1' });
      const result = getCoachingState(employee, [createSession()], null);
      expect(result.isGrowOrExec).toBe(true);
      expect(result.totalExpectedSessions).toBe(12);
    });

    it('identifies EXEC program', () => {
      const employee = createEmployee({ program: 'EXEC Leadership 2024' });
      const result = getCoachingState(employee, [createSession()], null);
      expect(result.isGrowOrExec).toBe(true);
      expect(result.totalExpectedSessions).toBe(12);
    });

    it('identifies SCALE program with 6 sessions', () => {
      const employee = createEmployee({ program: 'SCALE' });
      const result = getCoachingState(employee, [createSession()], null);
      expect(result.isGrowOrExec).toBe(false);
      expect(result.totalExpectedSessions).toBe(6);
    });
  });
});

describe('canBookSessions', () => {
  it('returns true for MATCHED_PRE_FIRST_SESSION', () => {
    expect(canBookSessions('MATCHED_PRE_FIRST_SESSION')).toBe(true);
  });

  it('returns true for ACTIVE_PROGRAM', () => {
    expect(canBookSessions('ACTIVE_PROGRAM')).toBe(true);
  });

  it('returns false for COMPLETED_PROGRAM', () => {
    expect(canBookSessions('COMPLETED_PROGRAM')).toBe(false);
  });

  it('returns false for NOT_SIGNED_UP', () => {
    expect(canBookSessions('NOT_SIGNED_UP')).toBe(false);
  });

  it('returns false for SIGNED_UP_NOT_MATCHED', () => {
    expect(canBookSessions('SIGNED_UP_NOT_MATCHED')).toBe(false);
  });
});

describe('isAlumniState', () => {
  it('returns true only for COMPLETED_PROGRAM', () => {
    const states: CoachingState[] = [
      'NOT_SIGNED_UP',
      'SIGNED_UP_NOT_MATCHED',
      'MATCHED_PRE_FIRST_SESSION',
      'ACTIVE_PROGRAM',
      'COMPLETED_PROGRAM',
    ];

    states.forEach(state => {
      expect(isAlumniState(state)).toBe(state === 'COMPLETED_PROGRAM');
    });
  });
});

describe('getStateLabel', () => {
  it('returns correct labels for all states', () => {
    expect(getStateLabel('NOT_SIGNED_UP')).toBe('Get Started');
    expect(getStateLabel('SIGNED_UP_NOT_MATCHED')).toBe('Finding Your Coach');
    expect(getStateLabel('MATCHED_PRE_FIRST_SESSION')).toBe('Ready to Begin');
    expect(getStateLabel('ACTIVE_PROGRAM')).toBe('Active Coaching');
    expect(getStateLabel('COMPLETED_PROGRAM')).toBe('Program Graduate');
  });
});
