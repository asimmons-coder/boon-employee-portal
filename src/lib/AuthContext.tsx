import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth, supabase } from './supabase';
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
    // Check for dev mode bypass
    const devEmail = localStorage.getItem('boon_dev_email');

    // Get initial session
    auth.getSession().then(async ({ session }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        fetchEmployeeProfile(session.user.email, session.access_token);
      } else if (devEmail) {
        // Dev mode: fetch employee directly without auth
        await fetchEmployeeProfileDevMode(devEmail);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Link auth user to employee record in background (don't block)
        auth.linkAuthUserToEmployee(session.user.email, session.user.id)
          .catch(err => console.error('Link error:', err));
        // Fetch employee profile using the user's access token
        await fetchEmployeeProfile(session.user.email, session.access_token);
      } else if (event === 'SIGNED_OUT') {
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchEmployeeProfile(email: string, accessToken: string) {
    try {
      // Use raw fetch with user's JWT token for RLS
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employee_manager?company_email=ilike.${encodeURIComponent(email)}&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching employee:', data);
        setEmployee(null);
      } else if (data && data.length > 0) {
        setEmployee(data[0] as Employee);
      } else {
        setEmployee(null);
      }
    } catch (err) {
      console.error('Error in fetchEmployeeProfile:', err);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }

  // Dev mode: fetch employee directly using anon key (bypasses RLS)
  async function fetchEmployeeProfileDevMode(email: string) {
    try {
      const { data, error } = await supabase
        .from('employee_manager')
        .select('*')
        .ilike('company_email', email)
        .limit(1);

      if (error) {
        console.error('Dev mode fetch error:', error);
        setEmployee(null);
      } else if (data && data.length > 0) {
        setEmployee(data[0] as Employee);
        // Create a mock session for dev mode
        setSession({ user: { email } } as any);
      } else {
        setEmployee(null);
      }
    } catch (err) {
      console.error('Error in fetchEmployeeProfileDevMode:', err);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await auth.signOut();
    // Clear dev mode
    localStorage.removeItem('boon_dev_email');
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
