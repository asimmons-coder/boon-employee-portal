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
    console.log('AuthContext: Getting initial session...');
    auth.getSession().then(({ session }) => {
      console.log('AuthContext: Initial session:', !!session, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        fetchEmployeeProfile(session.user.email, session.user.id);
      } else {
        console.log('AuthContext: No session, setting loading false');
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'hasEmail:', !!session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user?.email) {
        console.log('AuthContext: SIGNED_IN handler - fetching employee...');
        // Link auth user to employee record in background (don't block)
        auth.linkAuthUserToEmployee(session.user.email, session.user.id)
          .catch(err => console.error('Link error:', err));
        // Fetch employee profile
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
    console.log('AuthContext: Fetching employee profile for:', email, userId);
    try {
      // Try to fetch by email (simpler, works for all cases)
      console.log('AuthContext: Querying by email...');
      const { data, error } = await supabase
        .from('employee_manager')
        .select('*')
        .ilike('company_email', email)
        .limit(1);

      console.log('AuthContext: Query result:', {
        hasData: !!data,
        dataLength: data?.length,
        error: error?.message
      });

      if (error) {
        console.error('Error fetching employee:', error);
        setEmployee(null);
      } else if (data && data.length > 0) {
        console.log('AuthContext: Employee found:', data[0]?.company_email);
        setEmployee(data[0] as Employee);
      } else {
        console.log('AuthContext: No employee found for email:', email);
        setEmployee(null);
      }
    } catch (err) {
      console.error('Error in fetchEmployeeProfile:', err);
      setEmployee(null);
    } finally {
      console.log('AuthContext: Setting loading false');
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
