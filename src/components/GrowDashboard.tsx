import { useState, useEffect, useCallback } from 'react';
import type { Employee, Session, ActionItem, View, Coach } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import type { ProgramInfo, GrowFocusArea } from '../lib/dataFetcher';
import { supabase } from '../lib/supabase';
import { fetchCoachByName, fetchCoachById, fetchProgramInfo, fetchGrowFocusAreas, parseCoachSpecialties, updateActionItemStatus } from '../lib/dataFetcher';
import ProgramProgressCard from './ProgramProgressCard';
import CompetencyProgressCard from './CompetencyProgressCard';

interface GrowDashboardProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  coachingState: CoachingStateData;
  onActionUpdate: () => void;
  userEmail: string;
  onNavigate?: (view: View) => void;
}

export default function GrowDashboard({
  profile,
  sessions,
  actionItems,
  coachingState,
  onActionUpdate,
  userEmail,
  onNavigate,
}: GrowDashboardProps) {
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  const coachName = lastSession?.coach_name || upcomingSession?.coach_name || 'Your Coach';
  const coachFirstName = coachName.split(' ')[0];

  // GROW-specific state
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [focusAreas, setFocusAreas] = useState<GrowFocusArea[]>([]);
  const [coachProfile, setCoachProfile] = useState<Coach | null>(null);

  // Load GROW-specific data
  useEffect(() => {
    const loadGrowData = async () => {
      // Only require userEmail - profile.program may be null if derived from session
      if (!userEmail) return;

      console.log('[GrowDashboard] Loading data for:', { userEmail, coachName, coachId: profile?.coach_id, program: profile?.program });

      // Fetch program info and focus areas in parallel (program info is optional)
      const [progInfo, areas] = await Promise.all([
        profile?.program ? fetchProgramInfo(profile.program) : Promise.resolve(null),
        fetchGrowFocusAreas(userEmail),
      ]);

      // Try to fetch coach by ID first (more reliable), then fall back to name
      let coach: Coach | null = null;
      if (profile?.coach_id) {
        coach = await fetchCoachById(profile.coach_id);
        console.log('[GrowDashboard] Coach fetch by ID result:', {
          coachId: profile.coach_id,
          coachFound: !!coach,
          coachPhotoUrl: coach?.photo_url
        });
      }

      // Fall back to name lookup if ID lookup didn't work
      if (!coach && coachName !== 'Your Coach') {
        coach = await fetchCoachByName(coachName);
        console.log('[GrowDashboard] Coach fetch by name result:', {
          coachName,
          coachFound: !!coach,
          coachPhotoUrl: coach?.photo_url
        });
      }

      console.log('[GrowDashboard] Final coach result:', {
        coachName,
        coachFound: !!coach,
        coachPhotoUrl: coach?.photo_url,
        fullCoachData: coach
      });

      if (progInfo) setProgramInfo(progInfo);
      if (areas) setFocusAreas(areas);
      if (coach) setCoachProfile(coach as Coach);
    };

    loadGrowData();
  }, [profile?.program, profile?.coach_id, userEmail, coachName]);

  // Count sessions with this specific coach
  const sessionsWithCoach = completedSessions.filter(s => s.coach_name === coachName);
  const sessionCountWithCoach = sessionsWithCoach.length;

  // Helper: Get coach photo URL or generate placeholder
  const getCoachPhotoUrl = () => {
    if (coachProfile?.photo_url) {
      return coachProfile.photo_url;
    }
    // Use picsum.photos as placeholder (same as SCALE coach page)
    return `https://picsum.photos/seed/${coachName.replace(/\s/g, '')}/200/200`;
  };

  // Action items for "Things You're Working On"
  const pendingActions = actionItems.filter(a => a.status === 'pending');

  // Debug: Log action items
  console.log('[GrowDashboard] Action items:', {
    totalReceived: actionItems.length,
    pendingCount: pendingActions.length,
    allItems: actionItems,
    completedSessionsCount: completedSessions.length
  });

  // Handle completing an action item
  async function handleCompleteAction(itemId: string) {
    setUpdatingActionId(itemId);
    const success = await updateActionItemStatus(itemId, 'completed');
    if (success) {
      onActionUpdate();
    }
    setUpdatingActionId(null);
  }

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

  // Check if session is within 2 days
  const isSessionSoon = (session: Session) => {
    const sessionDate = new Date(session.session_date);
    const now = new Date();
    const diffDays = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 2 && diffDays >= -0.5;
  };

  const showJoinButton = upcomingSession?.zoom_join_link && isSessionSoon(upcomingSession);
  const hasUpcomingSession = !!upcomingSession;

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-10 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
            Hi {profile?.first_name || 'there'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            Your GROW coaching journey
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
          PROGRAM PROGRESS CARD - Full width (GROW-specific)
          ═══════════════════════════════════════════════════════════════════ */}
      <ProgramProgressCard
        programInfo={programInfo}
        completedSessions={coachingState.completedSessionCount}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FOCUS AREAS / WHERE WE LEFT OFF - Depends on session completion
          ═══════════════════════════════════════════════════════════════════ */}
      {completedSessions.length === 0 ? (
        // Pre-first session: Show baseline focus areas
        <CompetencyProgressCard focusAreas={focusAreas} />
      ) : (
        // Post-first session: Show where we left off (goals + action items)
        <section className="bg-gradient-to-br from-boon-amberLight/50 to-white rounded-[2rem] p-8 border border-boon-amber/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Where We Left Off</h2>
          </div>

          {/* Current Goal from last session */}
          {lastSession?.goals && (
            <div className="mb-6 p-5 bg-white/60 rounded-xl border border-boon-amber/10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Goal</p>
              <p style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-lg text-boon-text leading-relaxed">
                {lastSession.goals}
              </p>
            </div>
          )}

          {/* Action Items */}
          {pendingActions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Action Items</p>
              {pendingActions.map((action) => {
                const isUpdating = updatingActionId === action.id;
                return (
                  <div
                    key={action.id}
                    className={`p-4 bg-white/60 rounded-xl border border-boon-amber/10 flex items-start gap-3 ${isUpdating ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => handleCompleteAction(action.id)}
                      disabled={isUpdating}
                      className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-boon-blue hover:bg-boon-blue/10 transition-all flex-shrink-0 flex items-center justify-center group"
                      title="Mark as complete"
                    >
                      <svg className="w-2.5 h-2.5 text-transparent group-hover:text-boon-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <p style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-gray-700 leading-relaxed">{action.action_text}</p>
                      <span className="text-xs text-gray-400 mt-2 block">
                        From {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !lastSession?.goals && (
            <p className="text-gray-500 text-sm italic">
              Your goals and action items from coaching sessions will appear here.
            </p>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          YOUR NEXT SESSION - Same as SCALE but in two-column layout
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Next Session Card */}
        <section className={`rounded-[2rem] p-6 border-2 transition-all ${
          showJoinButton
            ? 'bg-gradient-to-br from-boon-blue/10 via-white to-boon-lightBlue/30 border-boon-blue/40 shadow-xl'
            : hasUpcomingSession
            ? 'bg-white border-gray-100 shadow-sm'
            : 'bg-gradient-to-br from-boon-blue/5 to-white border-boon-blue/20'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {hasUpcomingSession ? 'Your Next Session' : 'Book Your Next Session'}
            </span>
          </div>

          {hasUpcomingSession ? (
            <>
              <div className="mb-4">
                <p className="text-xl font-bold text-boon-text">
                  {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {new Date(upcomingSession.session_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })} with {coachFirstName}
                </p>
              </div>

              {upcomingSession.zoom_join_link && (
                <a
                  href={upcomingSession.zoom_join_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    showJoinButton
                      ? 'text-white bg-green-600 hover:bg-green-700 shadow-lg'
                      : 'text-boon-blue bg-boon-lightBlue hover:bg-boon-lightBlue/80'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {showJoinButton ? 'Join Session' : 'Join Link'}
                </a>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Ready to continue your journey with {coachFirstName}?
              </p>
              {profile?.booking_link && (
                <a
                  href={profile.booking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-boon-blue rounded-xl hover:bg-boon-darkBlue transition-all"
                >
                  Book Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              )}
            </>
          )}
        </section>

        {/* Your Coach Card */}
        <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Coach</span>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={getCoachPhotoUrl()}
              alt={coachName}
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-boon-bg shadow-sm"
            />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-boon-text">{coachName}</h3>
              {coachProfile?.headline ? (
                <p className="text-xs text-boon-blue font-bold uppercase tracking-widest mt-0.5">
                  {coachProfile.headline}
                </p>
              ) : (
                <p className="text-xs text-boon-blue font-bold uppercase tracking-widest mt-0.5">Executive Coach</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {sessionCountWithCoach} {sessionCountWithCoach === 1 ? 'session' : 'sessions'} together
              </p>
            </div>
          </div>

          {/* Coach bio - with fallback */}
          <p className="text-sm text-gray-600 mt-4 leading-relaxed line-clamp-3">
            {coachProfile?.bio || `${coachFirstName} specializes in leadership development and helping professionals unlock their potential through personalized coaching.`}
          </p>

          {/* Coach specialties */}
          {(() => {
            const specialties = coachProfile?.special_services
              ? parseCoachSpecialties(coachProfile.special_services, 4)
              : ['Leadership', 'Communication', 'Resilience'];
            return (
              <div className="flex flex-wrap gap-2 mt-4">
                {specialties.map((specialty, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-bold text-boon-blue bg-boon-lightBlue/30 rounded-full"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            );
          })()}
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BEFORE YOU MEET - Reflection card (only when session scheduled)
          ═══════════════════════════════════════════════════════════════════ */}
      {hasUpcomingSession && (
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
          {lastSession?.goals && (
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
                className="w-full p-5 rounded-xl border border-boon-amber/20 focus:border-boon-amber focus:ring-0 focus:outline-none font-serif text-base min-h-[100px] resize-none bg-white placeholder-gray-400 transition-all"
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          THINGS YOU'RE WORKING ON - Action items (only show if no sessions completed)
          Note: After first session, action items appear in "Where We Left Off" section
          ═══════════════════════════════════════════════════════════════════ */}
      {completedSessions.length === 0 && pendingActions.length > 0 && (
        <section className="bg-gradient-to-br from-boon-amberLight/30 to-white rounded-[2rem] p-8 border border-boon-amber/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Things You're Working On</h2>
          </div>
          <div className="space-y-3">
            {pendingActions.map((action) => {
              const isUpdating = updatingActionId === action.id;
              return (
                <div
                  key={action.id}
                  className={`p-4 bg-white/60 rounded-xl border border-boon-amber/10 flex items-start gap-3 ${isUpdating ? 'opacity-50' : ''}`}
                >
                  <button
                    onClick={() => handleCompleteAction(action.id)}
                    disabled={isUpdating}
                    className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-boon-blue hover:bg-boon-blue/10 transition-all flex-shrink-0 flex items-center justify-center group"
                    title="Mark as complete"
                  >
                    <svg className="w-2.5 h-2.5 text-transparent group-hover:text-boon-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <p style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-gray-700 leading-relaxed">{action.action_text}</p>
                    <span className="text-xs text-gray-400 mt-2 block">
                      From {new Date(action.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FROM YOUR COACH - Quote card
          ═══════════════════════════════════════════════════════════════════ */}
      {lastSession?.summary && (
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">From Your Coach</h2>
          <div className="absolute top-12 left-6 text-5xl text-boon-amber/30 font-serif">"</div>
          <p className="font-serif text-gray-600 leading-relaxed italic relative z-10">
            {lastSession.summary}
          </p>
          <div className="mt-6 flex items-center gap-3 relative z-10">
            <img
              src={getCoachPhotoUrl()}
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

      {/* ═══════════════════════════════════════════════════════════════════
          EXPLORE PRACTICE SPACE
          ═══════════════════════════════════════════════════════════════════ */}
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
