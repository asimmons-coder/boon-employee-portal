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
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const pendingActions = actionItems.filter(a => a.status === 'pending');
  const lastSession = completedSessions[0];

  // Session prep intention state
  const [intention, setIntention] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const coachFirstName = coachName.split(' ')[0];

  // Check if session is within 24 hours
  const isWithin24Hours = upcomingSession ? (() => {
    const sessionTime = new Date(upcomingSession.session_date).getTime();
    const now = Date.now();
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
    return hoursUntilSession <= 24 && hoursUntilSession > -1; // Show from 24h before until 1h after start
  })() : false;

  // Format session date/time nicely
  const formatSessionDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { dayName, monthDay, time, full: `${dayName}, ${monthDay}` };
  };

  // Load existing note from session_tracking
  useEffect(() => {
    if (upcomingSession?.employee_pre_session_note) {
      setIntention(upcomingSession.employee_pre_session_note);
    }
  }, [upcomingSession]);

  // Save intention to session_tracking.employee_pre_session_note
  const saveIntention = useCallback(async () => {
    if (!upcomingSession) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('session_tracking')
        .update({ employee_pre_session_note: intention })
        .eq('id', upcomingSession.id);

      if (!error) {
        setLastSaved(new Date());
      } else {
        console.error('Error saving pre-session note:', error);
      }
    } catch (e) {
      console.error('Failed to save pre-session note:', e);
    }

    setIsSaving(false);
  }, [upcomingSession, intention]);

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

  const sessionDateTime = upcomingSession ? formatSessionDateTime(upcomingSession.session_date) : null;

  return (
    <section className="relative bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-boon-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* Header with prominent session info */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-boon-blue flex items-center justify-center flex-shrink-0 shadow-lg shadow-boon-blue/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-boon-text">Session with {coachFirstName}</h2>
              <p className="text-sm text-gray-600 mt-0.5 font-medium">
                {sessionDateTime?.dayName}, {sessionDateTime?.monthDay} at {sessionDateTime?.time}
              </p>
            </div>
          </div>

          {/* Join Session Button - appears 24h before */}
          {isWithin24Hours && upcomingSession.zoom_join_link && (
            <a
              href={upcomingSession.zoom_join_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/30 animate-pulse hover:animate-none"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Join Session
            </a>
          )}
        </div>

        {/* Prepare for your session label */}
        <p className="text-xs font-bold text-boon-blue uppercase tracking-widest mb-4">Prepare for your session</p>

        {/* Context Section */}
        <div className="mb-8 space-y-4">
          {/* Current Goal - if exists */}
          {lastSession?.goals && (
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Goal</p>
              <p className="text-sm text-gray-700">{lastSession.goals}</p>
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
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="Anything on your mind—big or small"
            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-boon-blue focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none bg-white shadow-sm placeholder-gray-400 transition-all"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {coachFirstName} will see this before your session
            </p>
            <div className="flex items-center gap-3">
              {lastSaved && !isSaving && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              <button
                onClick={saveIntention}
                disabled={isSaving || !intention.trim()}
                className="px-4 py-2 bg-boon-blue text-white text-sm font-semibold rounded-xl hover:bg-boon-darkBlue transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
