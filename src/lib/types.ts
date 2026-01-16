// Types matching your Supabase schema
// Update these if your actual column names differ

export interface Employee {
  id: string;
  company_email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  manager_name: string | null;
  client_id: string | null;
  coach_id: string | null;
  auth_user_id: string | null;
  status: string | null;
  program: string | null; // Links to programs table
  booking_link: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  employee_id: string;
  employee_name: string;
  session_date: string;
  status: 'Completed' | 'Upcoming' | 'Cancelled' | 'No Show';
  coach_name: string;
  leadership_management_skills: boolean;
  communication_skills: boolean;
  mental_well_being: boolean;
  other_themes: string | null;
  summary: string | null;
  goals: string | null;
  plan: string | null;
  duration_minutes: number | null;
  company_id: string | null;
  account_name: string | null;
  program_name: string | null;
  program_title: string | null;
  appointment_number: number | null;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  email: string;
  date: string;
  coach_satisfaction: number | null;
  nps: number | null;
  wellbeing_satisfaction: number | null;
  wellbeing_productivity: number | null;
  wellbeing_balance: number | null;
  wellbeing_resilience: number | null;
  // Grow-specific competencies (optional, only for Grow clients)
  strategic_thinking: number | null;
  decision_making: number | null;
  people_management: number | null;
  influence: number | null;
  emotional_intelligence: number | null;
  adaptability: number | null;
}

// Baseline survey from welcome_survey_baseline table
// Contains both wellbeing metrics AND competency baselines
export interface BaselineSurvey {
  id: string;
  email: string;
  created_at: string;
  // Open-ended goals from welcome survey (what they want to work on)
  coaching_goals: string | null;
  // Wellbeing metrics (actual column names)
  satisfaction: number | null;
  productivity: number | null;
  work_life_balance: number | null;
  motivation: number | null;
  // 12 Core competencies (comp_ prefix)
  comp_adaptability_and_resilience: number | null;
  comp_building_relationships_at_work: number | null;
  comp_change_management: number | null;
  comp_delegation_and_accountability: number | null;
  comp_effective_communication: number | null;
  comp_effective_planning_and_execution: number | null;
  comp_emotional_intelligence: number | null;
  comp_giving_and_receiving_feedback: number | null;
  comp_persuasion_and_influence: number | null;
  comp_self_confidence_and_imposter_syndrome: number | null;
  comp_strategic_thinking: number | null;
  comp_time_management_and_productivity: number | null;
}

// Competency score from competency_scores table (current/end-of-program scores)
export interface CompetencyScore {
  id: string;
  email: string;
  created_at: string;
  competency_name: string;
  score: number;
  score_label: 'Applying' | 'Growing' | 'Excelling' | string;
  score_type: 'end_of_program' | string;
  program_title: string | null;
}

// Program type enum
export type ProgramType = 'SCALE' | 'GROW' | 'EXEC';

export interface Coach {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  photo_url: string | null;
  specialties: string[];
}

export interface ActionItem {
  id: string;
  email: string;
  session_id: number | null;
  coach_name: string;
  action_text: string;
  due_date: string | null;
  status: 'pending' | 'completed' | 'dismissed';
  created_at: string;
  completed_at: string | null;
}

export interface CheckIn {
  id: string;
  employee_email: string;
  action_item_id: string;
  response_text: string;
  created_at: string;
}

export interface SlackConnection {
  slack_user_id: string;
  nudge_enabled: boolean;
  nudge_frequency: 'smart' | 'daily' | 'weekly' | 'none';
  preferred_time: string;
  timezone: string;
}

export interface SlackConnectionStatus {
  connected: boolean;
  settings: SlackConnection | null;
}

export interface SlackNudge {
  id: string;
  employee_email: string;
  nudge_type: 'action_reminder' | 'goal_checkin' | 'session_prep' | 'weekly_digest' | 'streak_celebration';
  reference_id: string | null;
  status: 'sent' | 'delivered' | 'responded' | 'dismissed' | 'failed';
  response: string | null;
  sent_at: string;
  responded_at: string | null;
}

export type View = 'dashboard' | 'sessions' | 'progress' | 'practice' | 'coach' | 'resources' | 'reflection' | 'settings';

// SCALE Checkpoint data (longitudinal tracking every 6 sessions)
export interface Checkpoint {
  id: string;
  email: string;
  checkpoint_number: number; // 1, 2, 3, ...
  session_count_at_checkpoint: number; // 6, 12, 18, ...
  // Competency scores as JSON object
  competency_scores: {
    adaptability_and_resilience: number;
    building_relationships_at_work: number;
    change_management: number;
    delegation_and_accountability: number;
    effective_communication: number;
    effective_planning_and_execution: number;
    emotional_intelligence: number;
    giving_and_receiving_feedback: number;
    persuasion_and_influence: number;
    self_confidence_and_imposter_syndrome: number;
    strategic_thinking: number;
    time_management_and_productivity: number;
  };
  reflection_text: string | null; // "What's shifted"
  focus_area: string | null; // "What to focus on next"
  nps_score: number | null;
  testimonial_consent: boolean;
  created_at: string;
}

// SCALE checkpoint tracking data
export interface ScaleCheckpointStatus {
  isScaleUser: boolean;
  currentCheckpointNumber: number;
  sessionsSinceLastCheckpoint: number;
  nextCheckpointDueAtSession: number;
  isCheckpointDue: boolean;
  checkpoints: Checkpoint[];
  latestCheckpoint: Checkpoint | null;
}

// Post-program reflection data
export interface ReflectionResponse {
  id: string;
  email: string;
  created_at: string;
  // Competency post-assessment (same 12 as baseline)
  comp_adaptability_and_resilience: number | null;
  comp_building_relationships_at_work: number | null;
  comp_change_management: number | null;
  comp_delegation_and_accountability: number | null;
  comp_effective_communication: number | null;
  comp_effective_planning_and_execution: number | null;
  comp_emotional_intelligence: number | null;
  comp_giving_and_receiving_feedback: number | null;
  comp_persuasion_and_influence: number | null;
  comp_self_confidence_and_imposter_syndrome: number | null;
  comp_strategic_thinking: number | null;
  comp_time_management_and_productivity: number | null;
  // NPS
  nps_score: number | null;
  // Qualitative
  qualitative_shift: string | null;
  qualitative_other: string | null;
  // Testimonial consent
  testimonial_consent: boolean;
}
