import { supabase } from './supabase';
import type { Employee, Session, SurveyResponse, BaselineSurvey, ActionItem } from './types';

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
 * Fetch baseline survey for an employee
 */
export async function fetchBaseline(email: string): Promise<BaselineSurvey | null> {
  const { data, error } = await supabase
    .from('welcome_survey_scale')
    .select('*')
    .ilike('email', email)
    .single();

  if (error) {
    // Not an error if baseline doesn't exist - employee may not have filled it out
    if (error.code !== 'PGRST116') {
      console.error('Error fetching baseline:', error);
    }
    return null;
  }

  return data as BaselineSurvey;
}

/**
 * Fetch action items for an employee
 */
export async function fetchActionItems(email: string): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .ilike('employee_email', email)
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
