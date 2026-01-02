import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, auth } from './supabase';
import type { Employee } from './types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ session }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        fetchEmployeeProfile(session.user.email, session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Link auth user to employee record on first sign-in
        await auth.linkAuthUserToEmployee(session.user.email, session.user.id);
        await fetchEmployeeProfile(session.user.email, session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchEmployeeProfile(email: string, userId: string) {
    try {
      // First try to fetch by auth_user_id (more secure)
      let { data, error } = await supabase
        .from('employee_manager')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      // If not found by auth_user_id, try by email (for first-time login)
      if (error || !data) {
        const result = await supabase
          .from('employee_manager')
          .select('*')
          .ilike('company_email', email)
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching employee:', error);
        setEmployee(null);
      } else {
        setEmployee(data as Employee);
      }
    } catch (err) {
      console.error('Error in fetchEmployeeProfile:', err);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await auth.signOut();
    setUser(null);
    setSession(null);
    setEmployee(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, employee, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
