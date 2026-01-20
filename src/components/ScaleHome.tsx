import type { Employee, Session, ActionItem, BaselineSurvey, View } from '../lib/types';
import type { ScaleCheckpointStatus } from '../lib/types';
import ActionItems from './ActionItems';
import SessionPrep from './SessionPrep';
import CoachProfile from './CoachProfile';

interface ScaleHomeProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  baseline: BaselineSurvey | null;
  checkpointStatus: ScaleCheckpointStatus;
  onActionUpdate: () => void;
  userEmail: string;
  onNavigate?: (view: View) => void;
  onStartCheckpoint?: () => void;
  onDismissCheckpoint?: () => void;
}

export default function ScaleHome({
  profile,
  sessions,
  actionItems,
  baseline: _baseline,
  checkpointStatus,
  onActionUpdate,
  userEmail,
  onNavigate,
  onStartCheckpoint,
  onDismissCheckpoint,
}: ScaleHomeProps) {
  // baseline prop reserved for future use
  void _baseline;

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  // Calculate time in program
  const firstSession = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1] : null;
  const monthsInProgram = firstSession
    ? Math.max(1, Math.floor((Date.now() - new Date(firstSession.session_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  // Get current focus from latest checkpoint
  const currentFocus = checkpointStatus.latestCheckpoint?.focus_area;

  // Get themes from sessions
  const themes = [
    { key: 'leadership_management_skills', label: 'Leading with empathy and clarity' },
    { key: 'communication_skills', label: 'Communicating with impact and intention' },
    { key: 'mental_well_being', label: 'Cultivating sustainable mental energy' },
  ];

  const focusAreas = themes.map(theme => {
    const sessionsWithTheme = completedSessions.filter(s => (s as any)[theme.key]);
    if (sessionsWithTheme.length === 0) return null;
    return { label: theme.label, count: sessionsWithTheme.length };
  }).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 animate-fade-in">

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
            Hi {profile?.first_name || 'there'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            Your personal coaching space
          </p>
        </div>
      </header>

      {/* Book Next Session CTA - when no upcoming session */}
      {!upcomingSession && profile?.booking_link && (
        <a
          href={profile.booking_link}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-br from-boon-lightBlue/30 to-white rounded-[2rem] p-6 border-2 border-boon-blue/20 hover:border-boon-blue/40 transition-all group"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-boon-lightBlue rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-boon-text group-hover:text-boon-blue transition-colors">
                Ready for your next session?
              </h2>
              <p className="text-gray-500 mt-1">
                Continue your coaching journey with {lastSession?.coach_name?.split(' ')[0] || 'your coach'}.
              </p>
            </div>
            <svg className="w-6 h-6 text-boon-blue opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
      )}

      {/* Checkpoint Prompt - Prominent when due */}
      {checkpointStatus.isCheckpointDue && onStartCheckpoint && (
        <section className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-[2.5rem] p-8 border-2 border-purple-200 shadow-lg relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-600 rounded-full" />
            <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-purple-600 rounded-full" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-200 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">
                    {checkpointStatus.currentCheckpointNumber === 1 ? 'First check-in' : `Check-in ${checkpointStatus.currentCheckpointNumber}`}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-boon-text mb-2">
                  {checkpointStatus.currentCheckpointNumber === 1
                    ? 'Time for your first check-in'
                    : '6 sessions in. See what\'s shifted.'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {checkpointStatus.currentCheckpointNumber === 1
                    ? 'Establish your baseline and start tracking your evolution over time.'
                    : 'Take 2 minutes to reflect on your progress and set your focus for the next 6 sessions.'}
                </p>

                <button
                  onClick={onStartCheckpoint}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/30 active:scale-95"
                >
                  Start Check-In
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Dismiss button */}
              {onDismissCheckpoint && (
                <button
                  onClick={onDismissCheckpoint}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Remind me later"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* What they'll get */}
            <div className="mt-6 pt-6 border-t border-purple-200/50">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">
                What you'll see
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1.5 bg-white/70 rounded-lg text-xs font-medium text-gray-700">
                  How you've grown
                </span>
                <span className="px-3 py-1.5 bg-white/70 rounded-lg text-xs font-medium text-gray-700">
                  Competency trends
                </span>
                <span className="px-3 py-1.5 bg-white/70 rounded-lg text-xs font-medium text-gray-700">
                  Your focus for next 6 sessions
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Coaching at a Glance - only show after 3+ sessions when stats are meaningful */}
      {completedSessions.length >= 3 && (
        <section className="bg-white rounded-[2.5rem] p-7 md:p-10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">
            Your Coaching at a Glance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Coach - no image, full profile shown below */}
            <div>
              <p className="text-lg font-black text-boon-text tracking-tight truncate">
                {lastSession?.coach_name?.split(' ')[0] || '—'}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Coach</p>
            </div>

            {/* Sessions Completed */}
            <div>
              <p className="text-lg font-black text-boon-blue tracking-tight">
                {completedSessions.length}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sessions</p>
            </div>

            {/* Time in Program */}
            <div>
              <p className="text-lg font-black text-boon-text tracking-tight">
                {monthsInProgram > 0 ? `${monthsInProgram} mo` : '—'}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                {lastSession ? `with ${lastSession.coach_name?.split(' ')[0]}` : 'Duration'}
              </p>
            </div>

            {/* Checkpoints */}
            <div>
              <p className="text-lg font-black text-purple-600 tracking-tight">
                {checkpointStatus.checkpoints.length}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Check-ins</p>
            </div>
          </div>
        </section>
      )}

      {/* Your Coach Profile */}
      {lastSession && (
        <CoachProfile
          sessions={sessions}
          coachName={lastSession.coach_name}
          programType="SCALE"
          employeeId={profile?.id || null}
          userEmail={userEmail}
        />
      )}

      {/* Current Focus - from latest checkpoint */}
      {currentFocus && (
        <section className="bg-gradient-to-br from-purple-50/50 to-boon-lightBlue/20 rounded-[2rem] p-8 border border-purple-100/50">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-extrabold text-boon-text">Current Focus</h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              From check-in {checkpointStatus.latestCheckpoint?.checkpoint_number}
            </span>
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 leading-relaxed">
              {currentFocus}
            </div>
          </div>
        </section>
      )}

      {/* Your Goals - from most recent session */}
      {lastSession?.goals && !currentFocus && (
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

      {/* Themes and From Your Coach - only show grid if either has content */}
      {(focusAreas.length > 0 || lastSession?.summary) && (
        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          {/* Themes - only show if there are focus areas */}
          {focusAreas.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-xl font-extrabold text-boon-text">Themes</h2>
              <div className="space-y-3">
                {focusAreas.map((area, i) => (
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
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* From Your Coach - only show if there's a real summary */}
          {lastSession?.summary && (
            <section className="space-y-5">
              <h2 className="text-xl font-extrabold text-boon-text">From your coach</h2>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
                <div className="absolute top-4 left-6 text-5xl text-boon-blue opacity-10 font-serif">"</div>
                <p className="text-gray-600 leading-relaxed italic relative z-10 text-[15px]">
                  {lastSession.summary}
                </p>
                <div className="mt-8 flex items-center gap-4 relative z-10">
                  <img
                    src={`https://picsum.photos/seed/${lastSession.coach_name || 'coach'}/100/100`}
                    alt="Coach"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-boon-bg shadow-sm"
                  />
                  <div>
                    <p className="text-[13px] font-bold text-boon-text leading-none">
                      {lastSession.coach_name || 'Your Coach'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest font-bold">
                      Executive Coach
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Action Items */}
      <ActionItems items={actionItems} onUpdate={onActionUpdate} />

      {/* Session Prep */}
      <SessionPrep
        sessions={sessions}
        actionItems={actionItems}
        coachName={lastSession?.coach_name || 'Your Coach'}
        userEmail={userEmail}
      />
    </div>
  );
}
