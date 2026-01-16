import { useState, useEffect, useCallback } from 'react';
import type { Employee, Session, ActionItem, BaselineSurvey, View } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { supabase } from '../lib/supabase';
import ActionItems from './ActionItems';

interface ActiveGrowHomeProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  baseline: BaselineSurvey | null;
  coachingState: CoachingStateData;
  onActionUpdate: () => void;
  userEmail: string;
  onNavigate?: (view: View) => void;
}

export default function ActiveGrowHome({
  profile,
  sessions,
  actionItems,
  coachingState,
  onActionUpdate,
  userEmail,
  onNavigate,
}: ActiveGrowHomeProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;
  const pendingActions = actionItems.filter(a => a.status === 'pending');

  const coachName = lastSession?.coach_name || upcomingSession?.coach_name || 'Your Coach';
  const coachFirstName = coachName.split(' ')[0];

  // Determine sub-state
  const hasUpcomingSession = !!upcomingSession;

  // Calculate days since last session (for time-aware messaging)
  const daysSinceLastSession = lastSession
    ? Math.floor((Date.now() - new Date(lastSession.session_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Session prep intention state
  const [intention, setIntention] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
      } catch {
        const key = `session_prep_${userEmail}_${upcomingSession.id}`;
        const saved = localStorage.getItem(key);
        if (saved) setIntention(saved);
      }
    };

    loadIntention();
  }, [upcomingSession, userEmail]);

  // Auto-save intention with debounce
  const saveIntention = useCallback(async (text: string) => {
    if (!upcomingSession || !userEmail) return;

    setIsSaving(true);
    const key = `session_prep_${userEmail}_${upcomingSession.id}`;
    localStorage.setItem(key, text);

    try {
      const { error } = await supabase
        .from('session_prep')
        .upsert({
          email: userEmail.toLowerCase(),
          session_id: upcomingSession.id,
          intention: text,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email,session_id' });

      if (!error) setLastSaved(new Date());
    } catch {
      // localStorage saved as fallback
    }

    setIsSaving(false);
  }, [upcomingSession, userEmail]);

  useEffect(() => {
    if (!intention) return;
    const timer = setTimeout(() => saveIntention(intention), 1000);
    return () => clearTimeout(timer);
  }, [intention, saveIntention]);

  // Calculate countdown to session
  const getCountdown = (date: string) => {
    const sessionDate = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  // Time-aware messaging for no session state
  const getBookingMessage = () => {
    if (daysSinceLastSession <= 14) {
      return {
        title: "Ready for your next session?",
        subtitle: `Continue your coaching journey with ${coachFirstName}.`,
      };
    } else if (daysSinceLastSession <= 28) {
      return {
        title: "It's been a few weeks",
        subtitle: `Your last session was ${lastSession ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'a while ago'}. Ready to continue with ${coachFirstName}?`,
      };
    } else {
      return {
        title: "Pick up where you left off",
        subtitle: `It's been a while since you met with ${coachFirstName}. Your coaching thread is still here when you're ready.`,
      };
    }
  };

  // Coaching themes from sessions
  const themes = [
    { key: 'leadership_management_skills', label: 'Leading with empathy and clarity' },
    { key: 'communication_skills', label: 'Communicating with impact and intention' },
    { key: 'mental_well_being', label: 'Cultivating sustainable mental energy' },
  ];

  const focusAreas = themes.map(theme => {
    const sessionsWithTheme = completedSessions.filter(s => (s as unknown as Record<string, unknown>)[theme.key]);
    if (sessionsWithTheme.length === 0) return null;
    const firstDiscussed = sessionsWithTheme.reduce((earliest, current) => {
      return new Date(current.session_date) < new Date(earliest) ? current.session_date : earliest;
    }, sessionsWithTheme[0].session_date);
    return { label: theme.label, firstDiscussed, count: sessionsWithTheme.length };
  }).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-10 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
            Hi {profile?.first_name || 'there'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            Your personal coaching space
          </p>
        </div>
        {profile?.booking_link && (
          <a
            href={profile.booking_link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-2xl transition-all active:scale-95 ${
              hasUpcomingSession
                ? 'text-boon-blue border-2 border-boon-blue/30 hover:border-boon-blue hover:bg-boon-blue/5'
                : 'text-white bg-boon-blue hover:bg-boon-darkBlue shadow-lg shadow-boon-blue/20'
            }`}
          >
            Book a session
          </a>
        )}
      </header>

      {/* SUB-STATE A: Session Scheduled - Session Prep is HERO */}
      {hasUpcomingSession && (
        <>
          {/* Upcoming Session Card - Prominent */}
          <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-boon-blue flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-boon-blue uppercase tracking-widest">Your Next Session</span>
              <span className="ml-auto text-xs font-bold text-boon-blue bg-boon-lightBlue/50 px-3 py-1 rounded-full">
                {getCountdown(upcomingSession.session_date)}
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-3xl font-extrabold text-boon-text mb-2">
                  {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-500 text-lg">
                  {new Date(upcomingSession.session_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })} with {coachName}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={`https://picsum.photos/seed/${coachName.replace(' ', '')}/100/100`}
                  alt={coachName}
                  className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-boon-blue/10 flex gap-4">
              <button className="inline-flex items-center gap-2 text-sm font-bold text-boon-blue hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to calendar
              </button>
              <button className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 hover:underline">
                Reschedule
              </button>
            </div>
          </section>

          {/* Session Prep - THE HERO ELEMENT */}
          <section className="relative bg-white rounded-[2.5rem] p-8 md:p-10 border-2 border-purple-200 shadow-xl overflow-hidden">
            {/* Emphasis styling */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-boon-blue to-purple-400" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-boon-blue flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-boon-text">Before you meet with {coachFirstName}</h2>
                  <p className="text-sm text-gray-500 mt-1">Walk in with intention</p>
                </div>
              </div>

              {/* Context Section */}
              <div className="mb-8 space-y-4">
                {/* Current Goal */}
                {lastSession?.goals && (
                  <div className="bg-boon-bg/50 p-5 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Goal</p>
                    <p className="text-gray-700 leading-relaxed">{lastSession.goals}</p>
                  </div>
                )}

                {/* Open Action Items */}
                {pendingActions.length > 0 && (
                  <div className="bg-boon-bg/50 p-5 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Open Action Items ({pendingActions.length})
                    </p>
                    <ul className="space-y-2">
                      {pendingActions.slice(0, 4).map((action) => (
                        <li key={action.id} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="w-2 h-2 rounded-full bg-boon-blue mt-1.5 flex-shrink-0" />
                          <span>{action.action_text}</span>
                          {/* Contextual bridge to Practice - placeholder */}
                          {action.action_text.toLowerCase().includes('feedback') && (
                            <button
                              onClick={() => onNavigate?.('practice')}
                              className="ml-auto text-xs text-purple-600 font-medium hover:underline whitespace-nowrap"
                            >
                              Practice this →
                            </button>
                          )}
                        </li>
                      ))}
                      {pendingActions.length > 4 && (
                        <li className="text-xs text-gray-400 pl-5">+{pendingActions.length - 4} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* THE KEY INPUT - Session Intention */}
              <div className="space-y-3">
                <label className="block">
                  <span className="text-lg font-bold text-boon-text">
                    What do you want to make sure you talk about?
                  </span>
                  <span className="text-sm text-gray-400 ml-2">(optional)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="Anything on your mind—big or small"
                    className="w-full p-5 rounded-2xl border-2 border-gray-200 focus:border-boon-blue focus:ring-0 focus:outline-none text-base min-h-[140px] resize-none bg-white shadow-sm placeholder-gray-400 transition-all"
                  />
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
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {coachFirstName} will see this before your session
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* SUB-STATE B: No Session Scheduled - Booking is HERO */}
      {!hasUpcomingSession && (
        <>
          {/* Book a Session Card - HERO ELEMENT */}
          <section className="relative bg-gradient-to-br from-boon-blue/10 via-white to-purple-50 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/30 shadow-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-boon-blue via-purple-400 to-boon-blue" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-boon-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-boon-blue flex items-center justify-center shadow-lg shadow-boon-blue/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-extrabold text-boon-text">{getBookingMessage().title}</h2>
                  <p className="text-gray-500 mt-1">{getBookingMessage().subtitle}</p>
                </div>
              </div>

              {profile?.booking_link && (
                <a
                  href={profile.booking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-boon-blue text-white font-bold text-lg rounded-2xl hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/30 active:scale-95"
                >
                  Book a Session
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              )}
            </div>
          </section>

          {/* Current Goal - from last session */}
          {lastSession?.goals && (
            <section className="bg-gradient-to-br from-boon-bg to-white rounded-[2rem] p-8 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-extrabold text-boon-text">Where You Left Off</h2>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed">{lastSession.goals}</p>
            </section>
          )}

          {/* Your Coach - More prominent when no session scheduled */}
          <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Your Coach</h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <img
                src={`https://picsum.photos/seed/${coachName.replace(' ', '')}/200/200`}
                alt={coachName}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-boon-bg shadow-lg mx-auto sm:mx-0"
              />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-extrabold text-boon-text">{coachName}</h3>
                <p className="text-sm font-bold text-boon-blue uppercase tracking-widest mt-1">Executive Coach</p>
                <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                  {coachFirstName} specializes in leadership development and emotional intelligence,
                  helping professionals unlock their full potential through personalized coaching.
                </p>
                <p className="text-sm text-gray-500 mt-3">
                  <span className="font-semibold text-boon-text">{completedSessions.length} sessions</span> together
                </p>
              </div>
            </div>
          </section>

          {/* Latest Summary */}
          {lastSession && (
            <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-extrabold text-boon-text">Latest Summary</h2>
                <span className="text-xs font-bold text-boon-blue uppercase tracking-widest">
                  {new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed line-clamp-3">
                {lastSession.summary || 'Session summary will appear here after your coach adds notes.'}
              </p>
              <button
                onClick={() => onNavigate?.('sessions')}
                className="mt-4 text-sm font-bold text-boon-blue hover:underline"
              >
                View full summary →
              </button>
            </section>
          )}
        </>
      )}

      {/* Coaching at a Glance - Progress indicator */}
      <section className="bg-white rounded-[2.5rem] p-7 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Coaching at a Glance
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Coach */}
          <div className="flex items-center gap-3">
            <img
              src={`https://picsum.photos/seed/${coachName.replace(' ', '')}/100/100`}
              alt="Coach"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
            />
            <div>
              <p className="text-lg font-black text-boon-text tracking-tight truncate">
                {coachFirstName}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Coach</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <p className="text-lg font-black text-boon-text tracking-tight">
              {coachingState.completedSessionCount} of {coachingState.totalExpectedSessions}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sessions</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-boon-blue rounded-full transition-all"
                style={{ width: `${coachingState.programProgress}%` }}
              />
            </div>
          </div>

          {/* Next Session */}
          <div>
            <p className="text-lg font-black text-boon-blue tracking-tight">
              {upcomingSession
                ? new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Next session</p>
          </div>

          {/* Last Session */}
          <div>
            <p className="text-lg font-bold text-gray-500">
              {lastSession
                ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Last session</p>
          </div>
        </div>
      </section>

      {/* Action Items - persists in both sub-states */}
      <ActionItems items={actionItems} onUpdate={onActionUpdate} onNavigate={onNavigate} />

      {/* Your Coach - Compact version for session scheduled state */}
      {hasUpcomingSession && (
        <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src={`https://picsum.photos/seed/${coachName.replace(' ', '')}/100/100`}
              alt={coachName}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-boon-bg shadow-sm"
            />
            <div className="flex-1">
              <h3 className="font-bold text-boon-text">{coachName}</h3>
              <p className="text-xs text-gray-500">{completedSessions.length} sessions together</p>
            </div>
            <button className="px-4 py-2 text-sm font-bold text-boon-blue border border-boon-blue/30 rounded-xl hover:bg-boon-blue/5 transition-colors">
              Message
            </button>
          </div>
        </section>
      )}

      {/* Themes - What you're working on */}
      {focusAreas.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold text-boon-text">What You're Working On</h2>
          <div className="space-y-3">
            {focusAreas.map((area, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-boon-blue/20 transition-all"
              >
                <h3 className="font-bold text-boon-text leading-snug">{area!.label}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {area!.count} {area!.count === 1 ? 'session' : 'sessions'}
                  </span>
                  <span className="text-gray-200">•</span>
                  <span className="text-xs font-medium text-gray-400">
                    Since {new Date(area!.firstDiscussed).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* From Your Coach */}
      {lastSession?.summary && (
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">From Your Coach</h2>
          <div className="absolute top-12 left-6 text-5xl text-boon-blue opacity-10 font-serif">"</div>
          <p className="text-gray-600 leading-relaxed italic relative z-10">
            {lastSession.summary}
          </p>
          <div className="mt-6 flex items-center gap-3 relative z-10">
            <img
              src={`https://picsum.photos/seed/${coachName.replace(' ', '')}/100/100`}
              alt="Coach"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-boon-bg"
            />
            <div>
              <p className="text-sm font-bold text-boon-text leading-none">{coachName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">Executive Coach</p>
            </div>
          </div>
        </section>
      )}

      {/* Explore Practice Space */}
      <section className="bg-gradient-to-br from-purple-50 to-boon-bg rounded-[2rem] p-8 border border-purple-100/50 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-boon-text mb-2">Practice Space</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Prepare for challenging conversations with AI-powered scenarios tied to your coaching themes.
        </p>
        <button
          onClick={() => onNavigate?.('practice')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
        >
          Explore scenarios
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>
    </div>
  );
}
