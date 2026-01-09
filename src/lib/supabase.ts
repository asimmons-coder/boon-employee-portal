import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  /**
   * Check if an employee exists in the database before sending magic link
   */
  async checkEmployeeExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_employee_exists', {
      lookup_email: email,
    });
    
    if (error) {
      console.error('Error checking employee:', error);
      // Fall back to direct query if function doesn't exist
      const { data: employee } = await supabase
        .from('employee_manager')
        .select('id')
        .ilike('company_email', email)
        .single();
      return !!employee;
    }
    
    return data === true;
  },

  /**
   * Send magic link to employee email
   */
  async sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  },

  /**
   * Link the authenticated user to their employee record (first login only)
   */
  async linkAuthUserToEmployee(email: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('link_auth_user_to_employee', {
      lookup_email: email,
      user_id: userId,
    });
    
    if (error) {
      console.error('Error linking user to employee:', error);
      // Fall back to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from('employee_manager')
        .update({ auth_user_id: userId })
        .ilike('company_email', email)
        .is('auth_user_id', null);
      return !updateError;
    }
    
    return data === true;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
