import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to auth changes - this will fire when session is established
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthCallback: Auth event:', event, 'Session:', !!session);

      if (event === 'SIGNED_IN' && session) {
        console.log('AuthCallback: Redirecting to dashboard');
        navigate('/', { replace: true });
      }
    });

    // Process tokens from URL
    async function processTokens() {
      try {
        // Check for error in URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const errorDesc = urlParams.get('error_description');

        if (errorDesc) {
          setError(errorDesc);
          return;
        }

        // Get the URL hash (Supabase puts tokens there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('Found tokens in URL, setting session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          console.log('setSession result:', { hasSession: !!data.session, error: error?.message });

          if (error) {
            throw error;
          }

          // Redirect immediately after session is set
          if (data.session) {
            console.log('Session established, redirecting to dashboard');
            navigate('/', { replace: true });
            return;
          }
        } else {
          // No tokens - check if already have a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Existing session found, redirecting');
            navigate('/', { replace: true });
          } else {
            setError('No authentication tokens found. Please try signing in again.');
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Something went wrong');
      }
    }

    processTokens();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-boon-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-boon-text mb-3">Sign in failed</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-boon-blue text-white rounded-2xl font-bold text-sm hover:bg-boon-darkBlue transition-all"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-boon-bg flex items-center justify-center p-6">
      <div className="text-center">
        <img
          src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Icon_Blue_10_i8hkao.png"
          className="w-12 h-12 animate-bounce mx-auto mb-4"
          alt="Loading..."
        />
        <p className="text-boon-blue font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
