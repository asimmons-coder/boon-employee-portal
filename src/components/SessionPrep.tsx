import { useState, useEffect, useCallback } from 'react';
import type { Session, ActionItem } from '../lib/types';
import { supabase } from '../lib/supabase';

interface SessionPrepProps {
  sessions: Session[];
  actionItems: ActionItem[];
  coachName: string;
  userEmail: string;
}

export default function SessionPrep({ sessions, actionItems, coachName, userEmail }: SessionPrepProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');
  const pendingActions = actionItems.filter(a => a.status === 'pending');
  const lastSession = completedSessions[0];

  // Session prep intention state
  const [intention, setIntention] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const coachFirstName = coachName.split(' ')[0];

  // Load existing intention for upcoming session
  useEffect(() => {
    const loadIntention = async () => {
      if (!upcomingSession || !userEmail) return;

      try {
        const { data, error } = await supabase
          .from('session_prep')
          .select('intention')
          .eq('email', userEmail.toLowerCase())
          .eq('session_id', upcomingSession.id)
          .single();

        if (!error && data) {
          setIntention(data.intention || '');
        }
      } catch (e) {
        // Try localStorage fallback
        const key = `session_prep_${userEmail}_${upcomingSession.id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          setIntention(saved);
        }
      }
    };

    loadIntention();
  }, [upcomingSession, userEmail]);

  // Auto-save intention with debounce
  const saveIntention = useCallback(async (text: string) => {
    if (!upcomingSession || !userEmail) return;

    setIsSaving(true);

    // Save to localStorage immediately
    const key = `session_prep_${userEmail}_${upcomingSession.id}`;
    localStorage.setItem(key, text);

    try {
      // Try to save to Supabase
      const { error } = await supabase
        .from('session_prep')
        .upsert({
          email: userEmail.toLowerCase(),
          session_id: upcomingSession.id,
          intention: text,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'email,session_id'
        });

      if (!error) {
        setLastSaved(new Date());
      }
    } catch (e) {
      // Supabase save failed, localStorage is still saved
      console.log('Session prep saved locally');
    }

    setIsSaving(false);
  }, [upcomingSession, userEmail]);

  // Debounced auto-save
  useEffect(() => {
    if (!intention) return;

    const timer = setTimeout(() => {
      saveIntention(intention);
    }, 1000);

    return () => clearTimeout(timer);
  }, [intention, saveIntention]);

  // If no upcoming session, show a different message
  if (!upcomingSession) {
    return (
      <section className="relative bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-boon-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-boon-blue flex items-center justify-center flex-shrink-0 shadow-lg shadow-boon-blue/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-boon-text">No upcoming session</h2>
              <p className="text-sm text-gray-500">Book a session to continue your coaching journey</p>
            </div>
          </div>
          <a
            href={sessions[0]?.coach_name ? `mailto:${coachName.toLowerCase().replace(' ', '.')}@booncoaching.com` : '#'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-boon-blue text-white font-bold rounded-xl hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20"
          >
            Book a session
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-boon-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-boon-blue flex items-center justify-center flex-shrink-0 shadow-lg shadow-boon-blue/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-boon-text">Before you meet with {coachFirstName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Session on {new Date(upcomingSession.session_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Context Section - Collapsed by default */}
        <div className="mb-8 space-y-4">
          {/* Current Goal - if exists */}
          {lastSession?.goals && (
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Goal</p>
              <p className="text-sm text-gray-700 line-clamp-2">{lastSession.goals}</p>
            </div>
          )}

          {/* Open Action Items - if any */}
          {pendingActions.length > 0 && (
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Open Action Items ({pendingActions.length})
              </p>
              <ul className="space-y-2">
                {pendingActions.slice(0, 3).map((action) => (
                  <li key={action.id} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-boon-blue mt-2 flex-shrink-0" />
                    <span className="line-clamp-1">{action.action_text}</span>
                  </li>
                ))}
                {pendingActions.length > 3 && (
                  <li className="text-xs text-gray-400 pl-3.5">+{pendingActions.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* THE KEY INPUT - Session Intention */}
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-bold text-boon-text">
              What do you want to make sure you talk about?
            </span>
            <span className="text-xs text-gray-400 ml-2">(optional)</span>
          </label>
          <div className="relative">
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="Anything on your mind—big or small"
              className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-boon-blue focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none bg-white shadow-sm placeholder-gray-400 transition-all"
            />
            {/* Save status indicator */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {coachFirstName} will see this before your session
          </p>
        </div>
      </div>
    </section>
  );
}
