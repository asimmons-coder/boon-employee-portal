import { useState, useEffect, useCallback } from 'react';
import type { Employee, Session, ActionItem, BaselineSurvey, View, Coach } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { supabase } from '../lib/supabase';
import { fetchCoachByName } from '../lib/dataFetcher';

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
  onActionUpdate: _onActionUpdate,
  userEmail,
  onNavigate,
}: ActiveGrowHomeProps) {
  void _onActionUpdate; // Reserved for future action item updates

  // Sort sessions by date descending to get most recent first
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
  );
  const completedSessions = sortedSessions.filter(s => s.status === 'Completed');
  const upcomingSession = sortedSessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  const coachName = lastSession?.coach_name || upcomingSession?.coach_name || 'Your Coach';
  const coachFirstName = coachName.split(' ')[0];

  // Coach profile state
  const [coachProfile, setCoachProfile] = useState<Coach | null>(null);

  // Fetch coach profile from coaches table
  useEffect(() => {
    const loadCoachProfile = async () => {
      if (!coachName || coachName === 'Your Coach') return;

      const coach = await fetchCoachByName(coachName);
      if (coach) {
        setCoachProfile(coach as Coach);
      }
    };

    loadCoachProfile();
  }, [coachName]);

  // Count sessions with this specific coach
  const sessionsWithCoach = completedSessions.filter(s => s.coach_name === coachName);
  const sessionCountWithCoach = sessionsWithCoach.length;

  // Helper: Get coach photo URL or generate initials placeholder
  const getCoachPhotoUrl = (size: number = 100) => {
    if (coachProfile?.photo_url) {
      return coachProfile.photo_url;
    }
    // Fallback to initials-based placeholder
    const initials = coachName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    // Use a simple SVG data URL for initials
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect fill="%23466FF6" width="${size}" height="${size}"/><text x="50%" y="50%" dy=".35em" fill="white" font-family="system-ui" font-size="${size * 0.4}" font-weight="600" text-anchor="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  // Action items for "Things You're Working On" - from action_items table
  const pendingActions = actionItems.filter(a => a.status === 'pending');

  // State for notes on action items
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Load existing notes from localStorage
  useEffect(() => {
    if (!userEmail) return;
    const savedNotes = localStorage.getItem(`action_notes_${userEmail}`);
    if (savedNotes) {
      try {
        setActionNotes(JSON.parse(savedNotes));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [userEmail]);

  // Save note for an action item
  const saveNote = async (actionId: string, note: string) => {
    setSavingNoteId(actionId);
    const updatedNotes = { ...actionNotes, [actionId]: note };
    setActionNotes(updatedNotes);
    localStorage.setItem(`action_notes_${userEmail}`, JSON.stringify(updatedNotes));

    // Optionally save to Supabase
    try {
      await supabase
        .from('action_item_notes')
        .upsert({
          email: userEmail.toLowerCase(),
          action_id: actionId,
          note: note,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email,action_id' });
    } catch {
      // localStorage saved as fallback
    }

    setSavingNoteId(null);
    setExpandedNoteId(null);
  };

  // Determine sub-state
  const hasUpcomingSession = !!upcomingSession;

  // Calculate days since last session (for time-aware messaging)
  const daysSinceLastSession = lastSession
    ? Math.floor((Date.now() - new Date(lastSession.session_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Session prep reflection state
  const [reflection, setReflection] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load existing reflection for upcoming session
  useEffect(() => {
    const loadReflection = async () => {
      if (!upcomingSession || !userEmail) return;

      try {
        const { data, error } = await supabase
          .from('session_prep')
          .select('intention')
          .eq('email', userEmail.toLowerCase())
          .eq('session_id', upcomingSession.id)
          .single();

        if (!error && data) {
          setReflection(data.intention || '');
        }
      } catch {
        const key = `session_prep_${userEmail}_${upcomingSession.id}`;
        const saved = localStorage.getItem(key);
        if (saved) setReflection(saved);
      }
    };

    loadReflection();
  }, [upcomingSession, userEmail]);

  // Auto-save reflection with debounce
  const saveReflection = useCallback(async (text: string) => {
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
    if (!reflection) return;
    const timer = setTimeout(() => saveReflection(reflection), 1000);
    return () => clearTimeout(timer);
  }, [reflection, saveReflection]);

  // Check if session is within 2 days (joinable window for prominent display)
  const isSessionSoon = (session: Session) => {
    const sessionDate = new Date(session.session_date);
    const now = new Date();
    const diffDays = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 2 && diffDays >= -0.5; // 2 days before to 12 hours after
  };

  const showJoinButton = upcomingSession?.zoom_join_link && isSessionSoon(upcomingSession);

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

  // Coaching themes from sessions - these become "Current Focus"
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

      {/* ═══════════════════════════════════════════════════════════════════
          CURRENT FOCUS - THE HEADLINE (moved to top)
          Uses Georgia (serif) + amber accents for journal feel
          ═══════════════════════════════════════════════════════════════════ */}
      {focusAreas.length > 0 && (
        <section className="bg-gradient-to-br from-boon-amberLight/50 to-white rounded-[2rem] p-8 border border-boon-amber/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Current Focus</h2>
          </div>
          <div className="space-y-4">
            {focusAreas.map((area, i) => (
              <div
                key={i}
                className="group"
              >
                <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text leading-relaxed">{area!.label}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-boon-amber font-medium">
                    {area!.count} {area!.count === 1 ? 'session' : 'sessions'}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">
                    since {new Date(area!.firstDiscussed).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SUB-STATE A: Session Scheduled
          ═══════════════════════════════════════════════════════════════════ */}
      {hasUpcomingSession && (
        <>
          {/* Your Next Session Card - Secondary positioning but contextually prominent when soon */}
          <section className={`rounded-[2rem] p-8 border-2 transition-all ${
            showJoinButton
              ? 'bg-gradient-to-br from-boon-blue/10 via-white to-boon-lightBlue/30 border-boon-blue/40 shadow-xl'
              : 'bg-white border-gray-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Next Session</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-2xl font-bold text-boon-text">
                  {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-500 mt-1">
                  {new Date(upcomingSession.session_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })} with {coachName}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={getCoachPhotoUrl(100)}
                  alt={coachName}
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-100"
                />
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 flex gap-4">
              {showJoinButton ? (
                <a
                  href={upcomingSession.zoom_join_link!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-boon-blue rounded-xl hover:bg-boon-darkBlue transition-all shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Join Session
                </a>
              ) : (
                <>
                  <button className="inline-flex items-center gap-2 text-sm font-bold text-boon-blue hover:underline">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add to calendar
                  </button>
                  <button className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-600 hover:underline">
                    Reschedule
                  </button>
                </>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════════════
              BEFORE YOU MEET - Reflection card with last session context
              Uses Georgia for prompts, amber accents
              ═══════════════════════════════════════════════════════════════════ */}
          <section className="bg-gradient-to-br from-boon-amberLight/30 to-white rounded-[2rem] p-8 border border-boon-amber/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Before you meet with {coachFirstName}</h2>
            </div>

            {/* Last session context */}
            {lastSession?.plan && (
              <div className="mb-6 p-5 bg-white/60 rounded-xl border border-boon-amber/10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Last time, you were working on:</p>
                <p className="font-serif text-gray-700 leading-relaxed italic">"{lastSession.plan}"</p>
              </div>
            )}
            {!lastSession?.plan && lastSession?.goals && (
              <div className="mb-6 p-5 bg-white/60 rounded-xl border border-boon-amber/10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Last time, you were working on:</p>
                <p className="font-serif text-gray-700 leading-relaxed italic">"{lastSession.goals}"</p>
              </div>
            )}

            {/* Reflection prompt */}
            <div className="space-y-3">
              <label className="block">
                <span className="font-serif text-lg text-boon-text">
                  How's it going?
                </span>
              </label>
              <div className="relative">
                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="w-full p-5 rounded-xl border border-boon-amber/20 focus:border-boon-amber focus:ring-0 focus:outline-none font-serif text-base min-h-[120px] resize-none bg-white placeholder-gray-400 transition-all"
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
                    <span className="text-xs text-boon-amber flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {coachFirstName} will see this before your session
              </p>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SUB-STATE B: No Session Scheduled - Booking is HERO
          ═══════════════════════════════════════════════════════════════════ */}
      {!hasUpcomingSession && (
        <>
          {/* Book a Session Card */}
          <section className="bg-gradient-to-br from-boon-blue/10 via-white to-boon-lightBlue/20 rounded-[2rem] p-8 border-2 border-boon-blue/30 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-boon-blue flex items-center justify-center shadow-lg shadow-boon-blue/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-boon-text">{getBookingMessage().title}</h2>
                <p className="text-gray-500 mt-1 text-sm">{getBookingMessage().subtitle}</p>
              </div>
            </div>

            {profile?.booking_link && (
              <a
                href={profile.booking_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-boon-blue text-white font-bold text-base rounded-xl hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/30 active:scale-95"
              >
                Book a Session
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
          </section>

          {/* Where You Left Off */}
          {lastSession?.goals && (
            <section className="bg-gradient-to-br from-boon-amberLight/30 to-white rounded-[2rem] p-8 border border-boon-amber/20">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Where You Left Off</h2>
                <span className="text-xs font-medium text-gray-400">
                  {new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="font-serif text-gray-700 leading-relaxed">{lastSession.goals}</p>
            </section>
          )}

          {/* Your Coach - More prominent when no session scheduled */}
          <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Your Coach</h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <img
                src={getCoachPhotoUrl(200)}
                alt={coachName}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-boon-bg shadow-lg mx-auto sm:mx-0"
              />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-bold text-boon-text">{coachName}</h3>
                <p className="text-sm font-bold text-boon-blue uppercase tracking-widest mt-1">Executive Coach</p>
                {coachProfile?.bio ? (
                  <p className="text-sm text-gray-600 mt-4 leading-relaxed">{coachProfile.bio}</p>
                ) : (
                  <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                    {coachFirstName} specializes in leadership development and emotional intelligence,
                    helping professionals unlock their full potential through personalized coaching.
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-3">
                  <span className="font-semibold text-boon-text">{sessionCountWithCoach} {sessionCountWithCoach === 1 ? 'session' : 'sessions'}</span> together
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          THINGS YOU'RE WORKING ON - From action_items table
          Uses Georgia, amber accents, no strikethrough, with "Add note" option
          ═══════════════════════════════════════════════════════════════════ */}
      {pendingActions.length > 0 && (
        <section className="bg-gradient-to-br from-boon-amberLight/30 to-white rounded-[2rem] p-8 border border-boon-amber/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Things You're Working On</h2>
          </div>
          <div className="space-y-4">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                className="p-5 bg-white/60 rounded-xl border border-boon-amber/10 hover:border-boon-amber/30 transition-all"
              >
                <p style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-gray-700 leading-relaxed">{action.action_text}</p>

                {/* Existing note display */}
                {actionNotes[action.id] && expandedNoteId !== action.id && (
                  <div className="mt-3 p-3 bg-boon-amberLight/30 rounded-lg border border-boon-amber/10">
                    <p className="text-xs font-bold text-boon-amber uppercase tracking-widest mb-1">Your note</p>
                    <p style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-sm text-gray-600 italic">{actionNotes[action.id]}</p>
                  </div>
                )}

                {/* Add/Edit note form */}
                {expandedNoteId === action.id ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      defaultValue={actionNotes[action.id] || ''}
                      placeholder="How's this going? Any progress to note..."
                      style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
                      className="w-full p-3 rounded-lg border border-boon-amber/20 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[80px] resize-none bg-white placeholder-gray-400"
                      id={`note-${action.id}`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const textarea = document.getElementById(`note-${action.id}`) as HTMLTextAreaElement;
                          saveNote(action.id, textarea.value);
                        }}
                        disabled={savingNoteId === action.id}
                        className="px-4 py-2 text-xs font-bold text-white bg-boon-amber rounded-lg hover:bg-boon-amberDark transition-colors disabled:opacity-50"
                      >
                        {savingNoteId === action.id ? 'Saving...' : 'Save note'}
                      </button>
                      <button
                        onClick={() => setExpandedNoteId(null)}
                        className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-gray-400">
                      From {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setExpandedNoteId(action.id)}
                      className="ml-auto text-xs text-boon-amber font-medium hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {actionNotes[action.id] ? 'Edit note' : 'Add note'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coaching at a Glance - Progress indicator */}
      <section className="bg-white rounded-[2rem] p-7 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Coaching at a Glance
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Coach */}
          <div className="flex items-center gap-3">
            <img
              src={getCoachPhotoUrl(100)}
              alt="Coach"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
            />
            <div>
              <p className="text-lg font-bold text-boon-text truncate">
                {coachFirstName}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Coach</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <p className="text-lg font-bold text-boon-text">
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
            <p className="text-lg font-bold text-boon-blue">
              {upcomingSession
                ? new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Next session</p>
          </div>

          {/* Last Session */}
          <div>
            <p className="text-lg font-medium text-gray-500">
              {lastSession
                ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Last session</p>
          </div>
        </div>
      </section>

      {/* Your Coach - Compact version for session scheduled state */}
      {hasUpcomingSession && (
        <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src={getCoachPhotoUrl(100)}
              alt={coachName}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-boon-bg shadow-sm"
            />
            <div className="flex-1">
              <h3 className="font-bold text-boon-text">{coachName}</h3>
              <p className="text-xs text-gray-500">{sessionCountWithCoach} {sessionCountWithCoach === 1 ? 'session' : 'sessions'} together</p>
            </div>
            <button className="px-4 py-2 text-sm font-bold text-boon-blue border border-boon-blue/30 rounded-xl hover:bg-boon-blue/5 transition-colors">
              Message
            </button>
          </div>
        </section>
      )}

      {/* From Your Coach */}
      {lastSession?.summary && (
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">From Your Coach</h2>
          <div className="absolute top-12 left-6 text-5xl text-boon-amber/30 font-serif">"</div>
          <p className="font-serif text-gray-600 leading-relaxed italic relative z-10">
            {lastSession.summary}
          </p>
          <div className="mt-6 flex items-center gap-3 relative z-10">
            <img
              src={getCoachPhotoUrl(100)}
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

      {/* Explore Practice Space - only show contextual prompt if exact participant text exists */}
      <section className="bg-gradient-to-br from-purple-50 to-boon-bg rounded-[2rem] p-8 border border-purple-100/50 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-boon-text mb-2">Practice Space</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Prepare for challenging conversations with AI-powered scenarios.
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
