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
  // Actual column names in employee_manager table
  company_name: string | null;
  coaching_program: string | null;
  company_id: string | null;  // Foreign key to companies table
}

export interface Session {
  id: string;
  employee_id: string;
  employee_email: string;
  employee_name: string;
  session_date: string;
  status: 'Completed' | 'Upcoming' | 'Scheduled' | 'Cancelled' | 'No Show';
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
  // Zoom integration
  zoom_join_link: string | null;
  // Pre-session note from employee
  employee_pre_session_note: string | null;
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
  employee_id?: string;
  created_at: string;
  // Open-ended goals from welcome survey (what they want to work on)
  coaching_goals: string | null;
  // Match summary - AI-generated description of why coach was matched
  match_summary?: string | null;
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

// Welcome survey for SCALE users
export interface WelcomeSurveyScale {
  id: string;
  email: string;
  employee_id?: string;
  created_at: string;
  // Open-ended goals from welcome survey (what they want to work on)
  coaching_goals: string | null;
  // Match summary - AI-generated description of why coach was matched
  match_summary?: string | null;
  // Additional topics - free text about what they want to work on
  additional_topics?: string | null;
  // Wellbeing baseline metrics (1-10 scale)
  satisfaction?: number | null;
  productivity?: number | null;
  work_life_balance?: number | null;
  // 18 Focus area boolean fields
  focus_work_relationships: boolean;
  focus_work_life_balance: boolean;
  focus_leadership_development: boolean;
  focus_realizing_potential: boolean;
  focus_work_performance: boolean;
  focus_work_stress: boolean;
  focus_new_environment: boolean;
  focus_adapting_to_change: boolean;
  focus_dealing_with_uncertainty: boolean;
  focus_bouncing_back: boolean;
  focus_relationship_with_self: boolean;
  focus_inner_confidence: boolean;
  focus_positive_habits: boolean;
  focus_personal_accountability: boolean;
  focus_professional_development: boolean;
  focus_persevering_through_change: boolean;
  focus_relationships_self_others: boolean;
  focus_coping_stress_anxiety: boolean;
}

// Focus area display labels for SCALE welcome survey
export const SCALE_FOCUS_AREA_LABELS: Record<string, string> = {
  focus_work_relationships: "Work Relationships",
  focus_work_life_balance: "Work-Life Balance",
  focus_leadership_development: "Leadership Development",
  focus_realizing_potential: "Realizing Potential",
  focus_work_performance: "Work Performance",
  focus_work_stress: "Work Stress",
  focus_new_environment: "New Environment",
  focus_adapting_to_change: "Adapting to Change",
  focus_dealing_with_uncertainty: "Dealing with Uncertainty",
  focus_bouncing_back: "Bouncing Back",
  focus_relationship_with_self: "Relationship with Self",
  focus_inner_confidence: "Inner Confidence",
  focus_positive_habits: "Positive Habits",
  focus_personal_accountability: "Personal Accountability",
  focus_professional_development: "Professional Development",
  focus_persevering_through_change: "Persevering Through Change",
  focus_relationships_self_others: "Relationships with Self & Others",
  focus_coping_stress_anxiety: "Coping with Stress & Anxiety",
};

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
  // New fields from coaches table
  icf_level: 'PCC' | 'MCC' | 'ACC' | null;
  practitioner_type: 'Industry Practitioner' | 'HR/L&D Career' | 'Mixed Background' | null;
  industries: string[] | null;
  companies: string[] | null;
  special_services: string | null; // Semicolon-separated
  seniority_score: number | null;
  is_scale_coach: boolean;
  is_grow_coach: boolean;
  is_exec_coach: boolean;
  // Display fields
  headline: string | null; // Former corporate experience e.g. "Former SVP/GM at Sephora, Gap, Old Navy"
  notable_credentials: string | null; // Certifications e.g. "ICF PCC, Executive Coach"
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

export interface CoachingWin {
  id: string;
  employee_id: number;
  coach_id: string | null;
  session_number: number | null;
  win_text: string;
  source: 'check_in_survey' | 'manual' | 'coach_logged';
  is_private: boolean;
  survey_response_id: string | null;
  created_at: string;
  updated_at: string;
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

// ============================================
// NATIVE SURVEY SYSTEM
// ============================================

export type SurveyType = 'scale_feedback' | 'scale_end' | 'grow_baseline' | 'grow_end';

export type CoachQuality = 'made_me_feel_safe' | 'listened_well' | 'provided_tools' | 'challenged_me';

export const COACH_QUALITY_LABELS: Record<CoachQuality, string> = {
  made_me_feel_safe: 'Made me feel safe',
  listened_well: 'Listened well',
  provided_tools: 'Provided me with concrete tools',
  challenged_me: 'Challenged me',
};

export interface CoreCompetency {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

// Score levels for competencies: 1=Learning → 5=Mastering
export type CompetencyScoreLevel = 1 | 2 | 3 | 4 | 5;

export const COMPETENCY_SCORE_LABELS: Record<CompetencyScoreLevel, string> = {
  1: 'Learning',
  2: 'Growing',
  3: 'Applying',
  4: 'Excelling',
  5: 'Mastering',
};

export interface SurveyCompetencyScore {
  id: string;
  survey_submission_id: string;
  email: string;
  competency_name: string;
  score: CompetencyScoreLevel;
  score_type: 'pre' | 'post';
  created_at: string;
}

export interface NativeSurveySubmission {
  id: string;
  email: string;
  survey_type: SurveyType;
  session_id: string | null;
  session_number: number | null;
  company_id: string | null;
  coach_name: string | null;
  // Ratings
  coach_satisfaction: number | null; // 1-10
  nps: number | null; // 0-10
  // Coach rematch
  wants_rematch: boolean | null;
  rematch_reason: string | null;
  // Coach qualities (multi-select)
  coach_qualities: CoachQuality[] | null;
  // Next session
  has_booked_next_session: boolean | null;
  // Open-ended
  feedback_suggestions: string | null;
  outcomes: string | null;
  // Testimonial
  open_to_testimonial: boolean | null;
  // GROW baseline/end specific
  focus_areas: string[] | null; // max 3 competencies
  // Meta
  submitted_at: string;
  created_at: string;
}

export interface PendingSurvey {
  session_id: string;
  session_number: number;
  session_date: string;
  coach_name: string;
  survey_type: SurveyType;
}

// Survey form data (for submission)
export interface ScaleFeedbackFormData {
  coach_satisfaction: number;
  wants_rematch?: boolean;
  rematch_reason?: string;
  coach_qualities: CoachQuality[];
  has_booked_next_session: boolean;
  nps: number;
  feedback_suggestions?: string;
}

export interface ScaleEndFormData extends ScaleFeedbackFormData {
  outcomes: string;
  open_to_testimonial: boolean;
}

export interface GrowBaselineFormData {
  competency_scores: Record<string, CompetencyScoreLevel>;
  focus_areas: string[]; // max 3
}

export interface GrowEndFormData {
  competency_scores: Record<string, CompetencyScoreLevel>;
  nps: number;
  outcomes: string;
  open_to_testimonial: boolean;
}
