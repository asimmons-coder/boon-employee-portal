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
  program_type: string | null;
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

export interface BaselineSurvey {
  id: string;
  email: string;
  satisfaction: number | null;
  productivity: number | null;
  work_life_balance: number | null;
  resilience: number | null;
  focus_leadership: boolean;
  focus_communication: boolean;
  focus_wellbeing: boolean;
}

// Grow clients have additional core competencies
export interface GrowBaselineSurvey extends BaselineSurvey {
  // Core competency self-ratings (1-5 scale)
  strategic_thinking: number | null;
  decision_making: number | null;
  people_management: number | null;
  influence: number | null;
  emotional_intelligence: number | null;
  adaptability: number | null;
}

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
