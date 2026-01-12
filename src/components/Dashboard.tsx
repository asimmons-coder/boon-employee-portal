import type { Employee, Session, ActionItem, BaselineSurvey } from '../lib/types';
import ActionItems from './ActionItems';
import SessionPrep from './SessionPrep';

interface DashboardProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  baseline: BaselineSurvey | null;
  onActionUpdate: () => void;
}

export default function Dashboard({ profile, sessions, actionItems, baseline, onActionUpdate }: DashboardProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  // Determine user state for welcome experience
  const hasCompletedSessions = completedSessions.length > 0;
  const hasCoach = !!profile?.coach_id || sessions.length > 0;
  const hasBaseline = !!baseline;
  const isPreCoaching = !hasCompletedSessions;

  const themes = [
    { key: 'leadership_management_skills', label: 'Leading with empathy and clarity' },
    { key: 'communication_skills', label: 'Communicating with impact and intention' },
    { key: 'mental_well_being', label: 'Cultivating sustainable mental energy' },
  ];

  const focusAreas = themes.map(theme => {
    const sessionsWithTheme = completedSessions.filter(s => (s as any)[theme.key]);
    if (sessionsWithTheme.length === 0) return null;
    const firstDiscussed = sessionsWithTheme.reduce((earliest, current) => {
      return new Date(current.session_date) < new Date(earliest) ? current.session_date : earliest;
    }, sessionsWithTheme[0].session_date);
    return { label: theme.label, firstDiscussed, count: sessionsWithTheme.length };
  }).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 animate-fade-in">
      
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
            Hi {profile?.first_name || 'there'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Your personal coaching space</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {profile?.booking_link && (
            <a
              href={profile.booking_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-2xl text-white bg-boon-blue hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20 active:scale-95"
            >
              Book a session
            </a>
          )}
        </div>
      </header>

      {/* Pre-coaching Welcome States */}
      {isPreCoaching && (
        <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-12 border border-boon-blue/10 text-center">
          {/* State 1: Has upcoming session - ready for first session */}
          {upcomingSession && (
            <>
              <div className="w-20 h-20 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-boon-text mb-3">You're all set!</h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Your first coaching session is scheduled for{' '}
                <span className="font-bold text-boon-blue">
                  {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric'
                  })}
                </span>
                {upcomingSession.coach_name && (
                  <> with <span className="font-bold">{upcomingSession.coach_name}</span></>
                )}.
              </p>
              <div className="bg-white rounded-2xl p-6 max-w-md mx-auto border border-gray-100">
                <h3 className="font-bold text-boon-text mb-3 text-left">Before your session:</h3>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-boon-blue mt-0.5">✓</span>
                    Think about what you'd like to focus on
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-boon-blue mt-0.5">✓</span>
                    Consider recent challenges or wins at work
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-boon-blue mt-0.5">✓</span>
                    Come with an open mind—this is your space
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* State 2: Has coach but no upcoming session - needs to book */}
          {!upcomingSession && hasCoach && (
            <>
              <div className="w-20 h-20 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-boon-text mb-3">Ready to get started?</h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                You're matched with a coach! Book your first session to begin your coaching journey.
              </p>
              {profile?.booking_link && (
                <a
                  href={profile.booking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-2xl text-white bg-boon-blue hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20"
                >
                  Book your first session
                </a>
              )}
            </>
          )}

          {/* State 3: Completed survey, waiting for coach match */}
          {!upcomingSession && !hasCoach && hasBaseline && (
            <>
              <div className="w-20 h-20 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-boon-text mb-3">Finding your perfect coach</h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Thanks for completing your welcome survey! We're matching you with a coach who fits your goals and style. You'll hear from us soon.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-100">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Matching in progress
              </div>
            </>
          )}

          {/* State 4: Never started - needs to take welcome survey */}
          {!upcomingSession && !hasCoach && !hasBaseline && (
            <>
              <div className="w-20 h-20 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-boon-text mb-3">Welcome to Boon!</h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                You're about to start a transformative coaching journey. Let's begin with a quick survey to understand your goals and match you with the right coach.
              </p>
              <a
                href="#" // TODO: Replace with actual welcome survey link
                className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-2xl text-white bg-boon-blue hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20"
              >
                Start welcome survey
              </a>
              <p className="text-xs text-gray-400 mt-4">Takes about 5 minutes</p>
            </>
          )}
        </section>
      )}

      {/* Regular Dashboard Content - only show after first completed session */}
      {!isPreCoaching && (
        <>
      {/* Stats Summary */}
      <section className="bg-white rounded-[2.5rem] p-7 md:p-10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">Your Coaching at a Glance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="text-2xl font-black text-boon-blue tracking-tighter truncate">
              {lastSession?.coach_name?.split(' ')[0] || '—'}
            </p>
            <p className="text-[11px] font-bold text-boon-text uppercase tracking-wide mt-1">Coach</p>
          </div>
          <div>
            <p className="text-2xl font-black text-boon-blue tracking-tighter">
              {upcomingSession 
                ? new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                : '—'}
            </p>
            <p className="text-[11px] font-bold text-boon-text uppercase tracking-wide mt-1">Next session</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-lg font-bold text-boon-text">
              {lastSession 
                ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Last session</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-lg font-bold text-gray-400">{completedSessions.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Completed</p>
          </div>
        </div>
      </section>

      {/* Your Goals - from most recent session */}
      {lastSession?.goals && (
        <section className="bg-gradient-to-br from-boon-blue/5 to-boon-lightBlue/20 rounded-[2rem] p-8 border border-boon-blue/10">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-extrabold text-boon-text">Your Goals</h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              From {new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {lastSession.goals}
            </div>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-8 md:gap-10">
        {/* Working On */}
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-boon-text">Themes</h2>
          <div className="space-y-3">
            {focusAreas.length > 0 ? focusAreas.map((area, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-boon-blue/20 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <h3 className="font-bold text-boon-text group-hover:text-boon-blue transition-colors leading-snug">
                  {area!.label}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {area!.count} {area!.count === 1 ? 'session' : 'sessions'}
                  </span>
                  <span className="text-gray-200">•</span>
                  <span className="text-[11px] font-medium text-gray-400">
                    Since {new Date(area!.firstDiscussed).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 italic text-sm">Themes will appear here as you progress.</p>
            )}
          </div>
        </section>

        {/* From Your Coach */}
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-boon-text">From your coach</h2>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
            <div className="absolute top-4 left-6 text-5xl text-boon-blue opacity-10 font-serif">"</div>
            <p className="text-gray-600 leading-relaxed italic relative z-10 text-[15px]">
              {lastSession?.summary || "Looking forward to our next session. Keep reflecting on what's working well for you."}
            </p>
            <div className="mt-8 flex items-center gap-4 relative z-10">
              <img 
                src={`https://picsum.photos/seed/${lastSession?.coach_name || 'coach'}/100/100`} 
                alt="Coach" 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-boon-bg shadow-sm" 
              />
              <div>
                <p className="text-[13px] font-bold text-boon-text leading-none">
                  {lastSession?.coach_name || 'Your Coach'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-bold">
                  Executive Coach
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Action Items */}
      <ActionItems items={actionItems} onUpdate={onActionUpdate} />

      {/* Session Prep */}
      <SessionPrep
        sessions={sessions}
        actionItems={actionItems}
        coachName={lastSession?.coach_name || 'Your Coach'}
      />

      {/* Next Step & Summary Row */}
      <div className="grid md:grid-cols-2 gap-8 md:gap-10 pb-8">
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-boon-text">What's Next</h2>
          <div className="bg-boon-lightBlue/20 p-8 rounded-[2rem] border border-boon-lightBlue/30 shadow-sm flex flex-col justify-between min-h-[160px]">
            <p className="text-boon-text font-bold text-lg leading-snug">
              {upcomingSession ? (
                <>
                  Next session: {' '}
                  <span className="text-boon-blue underline decoration-2 underline-offset-4">
                    {new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </span>
                </>
              ) : "Ready for your next step?"}
            </p>
            <p className="text-sm text-gray-600 mt-4 italic font-medium">
              "Think about one situation this week where you felt your energy shift."
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-boon-text">Latest Summary</h2>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            {lastSession ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="text-[11px] font-black text-boon-blue uppercase tracking-widest mb-1">
                    {new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    {lastSession.summary || 'Session summary will appear here after your coach adds notes.'}
                  </p>
                </div>
                <button className="mt-6 text-sm font-black text-boon-blue hover:underline uppercase tracking-widest text-left">
                  Full Summary →
                </button>
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">No summaries yet.</p>
            )}
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
