import React, { useState } from 'react';
import { auth } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    // First check if this email exists in employee_manager
    const exists = await auth.checkEmployeeExists(trimmedEmail);
    
    if (!exists) {
      setError("We couldn't find an account with that email. Please check with your HR team to ensure you're enrolled in coaching.");
      setLoading(false);
      return;
    }

    // Send magic link
    const { error: authError } = await auth.sendMagicLink(trimmedEmail);
    
    if (authError) {
      setError('Something went wrong. Please try again.');
      console.error('Auth error:', authError);
    } else {
      setSent(true);
    }
    
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-boon-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-boon-text mb-3">Check your email</h1>
            <p className="text-gray-500 mb-6">
              We sent a sign-in link to <span className="font-semibold text-boon-text">{email}</span>
            </p>
            <p className="text-sm text-gray-400">
              Click the link in your email to access your coaching portal. The link will expire in 24 hours.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="mt-8 text-boon-blue font-bold text-sm hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-boon-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <img
            src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Wordmark_Blue_16_aw7lvc.png"
            alt="Boon Health"
            className="h-9 max-w-[160px] object-contain mx-auto mb-8"
          />
          <h1 className="text-3xl font-black text-boon-text mb-3">Welcome back</h1>
          <p className="text-gray-500">Sign in with your work email to access your coaching portal.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-5 py-4 bg-boon-bg border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none transition-all text-boon-text font-medium"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-4 bg-boon-blue text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-boon-darkBlue disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg shadow-boon-blue/20 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Don't have access? Contact your HR team to enroll in coaching.
        </p>
      </div>
    </div>
  );
}
