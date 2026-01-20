import { useState, useEffect, useCallback } from 'react';
import type { Employee, Session, BaselineSurvey, WelcomeSurveyScale, ProgramType, View, Coach } from '../lib/types';
import { SCALE_FOCUS_AREA_LABELS } from '../lib/types';
import { supabase } from '../lib/supabase';
import { fetchCoachByName, fetchCoachById, fetchMatchSummary } from '../lib/dataFetcher';

interface PreFirstSessionHomeProps {
  profile: Employee | null;
  sessions: Session[];
  baseline: BaselineSurvey | null;
  welcomeSurveyScale: WelcomeSurveyScale | null;
  programType: ProgramType | null;
  userEmail: string;
  onNavigate?: (view: View) => void;
}

export default function PreFirstSessionHome({
  profile,
  sessions,
  baseline,
  welcomeSurveyScale,
  programType,
  userEmail,
  onNavigate,
}: PreFirstSessionHomeProps) {
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');

  // Coach state - full coach data from coaches table
  const [coach, setCoach] = useState<Coach | null>(null);
  const [coachName, setCoachName] = useState<string>(
    upcomingSession?.coach_name || sessions[0]?.coach_name || 'Your Coach'
  );
  const [matchSummary, setMatchSummary] = useState<string | null>(null);

  // Fetch coach details
  useEffect(() => {
    const loadCoachDetails = async () => {
      // If we have coach name from sessions, fetch by name
      const nameFromSession = sessions[0]?.coach_name || upcomingSession?.coach_name;
      if (nameFromSession) {
        setCoachName(nameFromSession);
        const coachData = await fetchCoachByName(nameFromSession);
        if (coachData) setCoach(coachData);
        return;
      }

      // Otherwise try to fetch from coaches table using coach_id
      if (profile?.coach_id) {
        const coachData = await fetchCoachById(profile.coach_id);
        if (coachData) {
          setCoach(coachData);
          setCoachName(coachData.name);
        }
      }
    };

    loadCoachDetails();
  }, [profile?.coach_id, sessions, upcomingSession?.coach_name]);

  // Fetch match summary using employee_id with email fallback
  useEffect(() => {
    const loadMatchSummary = async () => {
      if (!profile?.id) return;
      const summary = await fetchMatchSummary(profile.id, userEmail);
      setMatchSummary(summary);
    };

    loadMatchSummary();
  }, [profile?.id, userEmail]);

  const coachFirstName = coachName.split(' ')[0];

  // Coach display data
  const coachPhotoUrl = coach?.photo_url || `https://picsum.photos/seed/${coachName.replace(' ', '')}/200/200`;
  const displayMatchSummary = matchSummary || 'Your coach is here to help you achieve your goals.';

  // Pre-session note state
  const [preSessionNote, setPreSessionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load existing pre-session note
  useEffect(() => {
    const loadNote = async () => {
      if (!userEmail) return;

      // Use session ID if available, otherwise use 'first' as placeholder
      const sessionKey = upcomingSession?.id || 'first';

      try {
        // Try to load from database first
        const { data } = await supabase
          .from('session_prep')
          .select('intention')
          .eq('email', userEmail.toLowerCase())
          .order('updated_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0 && data[0].intention) {
          setPreSessionNote(data[0].intention);
          return;
        }
      } catch {
        // Ignore database errors
      }

      // Try localStorage fallback
      const key = `pre_session_note_${userEmail}_${sessionKey}`;
      const saved = localStorage.getItem(key);
      if (saved) setPreSessionNote(saved);
    };

    loadNote();
  }, [upcomingSession, userEmail]);

  // Auto-save pre-session note
  const saveNote = useCallback(async (text: string) => {
    if (!userEmail) return;

    setIsSaving(true);
    const sessionKey = upcomingSession?.id || 'first';
    const key = `pre_session_note_${userEmail}_${sessionKey}`;
    localStorage.setItem(key, text);

    try {
      // Save to database - use session_id if available, otherwise save with null
      await supabase
        .from('session_prep')
        .upsert({
          email: userEmail.toLowerCase(),
          session_id: upcomingSession?.id || null,
          intention: text,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email,session_id' });

      setLastSaved(new Date());
    } catch {
      // localStorage saved as fallback
      setLastSaved(new Date());
    }

    setIsSaving(false);
  }, [upcomingSession, userEmail]);

  useEffect(() => {
    if (!preSessionNote) return;
    const timer = setTimeout(() => saveNote(preSessionNote), 1000);
    return () => clearTimeout(timer);
  }, [preSessionNote, saveNote]);

  // Determine if we have survey data to show
  const isScaleUser = programType === 'SCALE';
  const hasWelcomeSurvey = isScaleUser ? welcomeSurveyScale !== null : baseline !== null;

  // Get coaching goals from the appropriate survey
  const coachingGoals = isScaleUser ? welcomeSurveyScale?.coaching_goals : baseline?.coaching_goals;

  // Get focus areas from SCALE survey (selected boolean fields)
  const scaleFocusAreas = welcomeSurveyScale ? Object.entries(SCALE_FOCUS_AREA_LABELS)
    .filter(([key]) => welcomeSurveyScale[key as keyof WelcomeSurveyScale] === true)
    .map(([, label]) => label)
  : [];

  // Get focus areas from GROW baseline (lowest-scored competencies they want to improve)
  const competencyLabels: Record<string, string> = {
    comp_adaptability_and_resilience: 'Adaptability & Resilience',
    comp_building_relationships_at_work: 'Building Relationships',
    comp_change_management: 'Change Management',
    comp_delegation_and_accountability: 'Delegation & Accountability',
    comp_effective_communication: 'Effective Communication',
    comp_effective_planning_and_execution: 'Planning & Execution',
    comp_emotional_intelligence: 'Emotional Intelligence',
    comp_giving_and_receiving_feedback: 'Giving & Receiving Feedback',
    comp_persuasion_and_influence: 'Persuasion & Influence',
    comp_self_confidence_and_imposter_syndrome: 'Self-Confidence',
    comp_strategic_thinking: 'Strategic Thinking',
    comp_time_management_and_productivity: 'Time Management',
  };

  // Get the 3 lowest-scored competencies as growth areas (for GROW/EXEC)
  const growCompetencyAreas = baseline ? Object.entries(competencyLabels)
    .map(([key, label]) => ({
      key,
      label,
      score: baseline[key as keyof typeof baseline] as number | null,
    }))
    .filter(c => c.score !== null && c.score > 0)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 3)
    .map(c => c.label)
  : [];

  // Use appropriate focus areas based on program type
  const focusAreas = isScaleUser ? scaleFocusAreas : growCompetencyAreas;

  // Check if session is within 30 minutes (joinable window: 30 min before to 60 min after)
  const isSessionJoinable = (session: Session) => {
    if (!session.zoom_join_link) return false;
    const sessionDate = new Date(session.session_date);
    const now = new Date();
    const diffMinutes = (sessionDate.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 30 && diffMinutes >= -60;
  };

  const showJoinButton = upcomingSession ? isSessionJoinable(upcomingSession) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 animate-fade-in">
      {/* Header */}
      <header className="text-center pt-2">
        <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
          Hi {profile?.first_name || 'there'}
        </h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">
          Your coaching journey is about to begin
        </p>
      </header>

      {/* First Session Card - Show scheduled session or Book CTA */}
      {upcomingSession ? (
        <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-boon-blue flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-boon-blue uppercase tracking-widest">Your First Session</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-3xl font-extrabold text-boon-text mb-2">
                {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
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
                src={coachPhotoUrl}
                alt={coachName}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
              />
            </div>
          </div>

          {/* Session Actions */}
          <div className="mt-6 pt-6 border-t border-boon-blue/10 flex gap-4">
            {showJoinButton && upcomingSession?.zoom_join_link ? (
              <a
                href={upcomingSession.zoom_join_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join Session
              </a>
            ) : (
              <button className="inline-flex items-center gap-2 text-sm font-bold text-boon-blue hover:underline">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to calendar
              </button>
            )}
          </div>
        </section>
      ) : profile?.booking_link ? (
        /* No upcoming session yet - show Book Your Session CTA */
        <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-boon-blue flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-boon-blue uppercase tracking-widest">Book Your First Session</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-2xl font-extrabold text-boon-text mb-2">
                Ready to meet {coachFirstName}?
              </p>
              <p className="text-gray-500 text-lg">
                Schedule your first coaching session at a time that works for you
              </p>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={coachPhotoUrl}
                alt={coachName}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-boon-blue/10">
            <a
              href={profile.booking_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-boon-blue rounded-xl hover:bg-boon-navy transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Your Session
            </a>
          </div>
        </section>
      ) : null}

      {/* Meet Your Coach */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Meet Your Coach</h2>

        <div className="flex flex-col sm:flex-row gap-6">
          <img
            src={coachPhotoUrl}
            alt={coachName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-boon-bg shadow-lg mx-auto sm:mx-0"
          />

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-extrabold text-boon-text">{coachName}</h3>

            {/* Headline - former corporate experience */}
            {coach?.headline && (
              <p className="text-sm font-bold text-boon-blue uppercase tracking-widest mt-1">
                {coach.headline}
              </p>
            )}

            {/* Notable Credentials - certifications */}
            {coach?.notable_credentials && (
              <p className="text-sm text-gray-500 mt-1">
                {coach.notable_credentials}
              </p>
            )}

            {/* Match Summary */}
            <p className="text-sm text-gray-700 mt-3 bg-boon-bg/50 px-4 py-3 rounded-xl border border-gray-100">
              {displayMatchSummary}
            </p>
          </div>
        </div>
      </section>

      {/* What You Shared - Reflect back their survey data */}
      {hasWelcomeSurvey && (
        <section className="bg-gradient-to-br from-purple-50 to-boon-bg rounded-[2rem] p-8 border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              What You Shared
            </h2>
          </div>

          {/* Show coaching goals if they exist */}
          {coachingGoals && (
            <div className="mb-6">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">
                What you're hoping to work on
              </p>
              <p className="text-gray-700 bg-white/60 p-4 rounded-xl border border-purple-100/50 italic leading-relaxed">
                "{coachingGoals}"
              </p>
            </div>
          )}

          {/* Show focus areas (from SCALE survey or GROW competencies) */}
          {focusAreas.length > 0 && (
            <div>
              {!coachingGoals && (
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">
                  {isScaleUser ? 'Focus areas you selected' : 'Areas you identified for growth'}
                </p>
              )}
              {coachingGoals && (
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Focus areas from your assessment
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1.5 text-sm font-medium bg-white/70 text-purple-700 rounded-full border border-purple-200/50"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation message */}
          <p className="text-sm text-gray-500 mt-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {coachFirstName} will use this to personalize your first conversation
          </p>
        </section>
      )}

      {/* Pre-Session Note - Always show */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-extrabold text-boon-text mb-2">
          Before you meet {coachFirstName}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Anything specific (beyond your welcome survey) you want to make sure {coachFirstName} knows before your first conversation?
        </p>

        <div className="relative">
          <textarea
            value={preSessionNote}
            onChange={(e) => setPreSessionNote(e.target.value)}
            placeholder="Optional—share anything that might be helpful"
            className="w-full p-5 rounded-2xl border-2 border-gray-100 focus:border-boon-blue focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none bg-boon-bg placeholder-gray-400 transition-all"
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
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {coachFirstName} will see this before your session
        </p>
      </section>

      {/* Explore Your Toolkit */}
      <section className="bg-gradient-to-br from-boon-bg via-white to-purple-50/30 rounded-[2rem] p-8 border border-gray-100 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-boon-text mb-2">Explore Your Toolkit</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          While you wait, explore the Practice Space—AI-powered scenarios to help you prepare for real leadership moments.
        </p>
        <button
          onClick={() => onNavigate?.('practice')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
        >
          Explore Practice Space
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* Support */}
      <div className="text-center pb-8">
        <p className="text-sm text-gray-400">
          Questions about what to expect?{' '}
          <a href="mailto:support@boon-health.com" className="text-boon-blue hover:underline">
            Reach out anytime
          </a>
        </p>
      </div>
    </div>
  );
}
