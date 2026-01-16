import type { Employee, Session, BaselineSurvey, View } from '../lib/types';

interface PendingReflectionHomeProps {
  profile: Employee | null;
  sessions: Session[];
  baseline: BaselineSurvey | null;
  onNavigate?: (view: View) => void;
  onStartReflection: () => void;
}

export default function PendingReflectionHome({
  profile,
  sessions,
  baseline,
  onNavigate,
  onStartReflection,
}: PendingReflectionHomeProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;
  const coachName = lastSession?.coach_name || 'Your Coach';

  // Program duration
  const firstSession = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1] : null;
  const startDate = firstSession ? new Date(firstSession.session_date) : null;
  const endDate = lastSession ? new Date(lastSession.session_date) : null;
  const durationStr = startDate && endDate
    ? `${startDate.toLocaleDateString('en-US', { month: 'short' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}`
    : '—';

  // Get baseline competency count
  const hasBaseline = !!baseline;

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 animate-fade-in">
      {/* Header */}
      <header className="text-center pt-2">
        <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
          Hi {profile?.first_name || 'there'}
        </h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">
          Your GROW program is complete
        </p>
      </header>

      {/* Reflection CTA - Primary Focus */}
      <section className="bg-gradient-to-br from-boon-blue/10 via-white to-purple-50 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-boon-blue flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-boon-blue uppercase tracking-widest">One Last Step</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-boon-text mb-4">
          Complete your final reflection to unlock your full Leadership Profile
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          You'll see how you've grown across 12 competencies—baseline to now.
        </p>

        <button
          onClick={onStartReflection}
          className="inline-flex items-center gap-3 px-8 py-4 text-lg font-bold rounded-2xl text-white bg-boon-blue hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20 active:scale-95"
        >
          Complete Reflection
          <span className="text-sm font-medium text-boon-lightBlue bg-white/20 px-2 py-0.5 rounded-lg">~3 min</span>
        </button>
      </section>

      {/* Program Summary */}
      <section className="bg-white rounded-[2.5rem] p-7 md:p-10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">
          Program Summary
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Coach */}
          <div className="flex items-center gap-3">
            <img
              src={`https://picsum.photos/seed/${coachName}/100/100`}
              alt="Coach"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
            />
            <div>
              <p className="text-lg font-black text-boon-text tracking-tight truncate">
                {coachName.split(' ')[0]}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Coach</p>
            </div>
          </div>

          {/* Program */}
          <div>
            <p className="text-lg font-black text-boon-blue tracking-tight">GROW</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Program</p>
          </div>

          {/* Sessions */}
          <div>
            <p className="text-lg font-black text-green-600 tracking-tight">
              {completedSessions.length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Total Sessions</p>
          </div>

          {/* Duration */}
          <div>
            <p className="text-lg font-black text-boon-text tracking-tight">{durationStr}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Duration</p>
          </div>
        </div>
      </section>

      {/* Preview of What's Coming */}
      <section className="bg-gradient-to-br from-purple-50 to-boon-bg rounded-[2rem] p-8 border border-purple-100">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">
          What you'll see after completing your reflection
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">Your growth across 12 leadership competencies</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">How you compare to where you started</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-boon-lightBlue flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium">Your complete Leadership Profile</p>
          </div>
        </div>

        {/* Preview hint */}
        {hasBaseline && (
          <div className="mt-6 pt-6 border-t border-purple-200/50">
            <p className="text-sm text-gray-500 italic">
              Your baseline is ready. Complete the reflection to see your final scores.
            </p>
          </div>
        )}
      </section>

      {/* Your Goals (from final session) */}
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

      {/* Areas of Growth */}
      <section className="space-y-5">
        <h2 className="text-xl font-extrabold text-boon-text">Areas of Growth</h2>
        <div className="space-y-3">
          {(() => {
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

            return focusAreas.length > 0 ? focusAreas.map((area, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
              >
                <h3 className="font-bold text-boon-text leading-snug">
                  {area!.label}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {area!.count} {area!.count === 1 ? 'session' : 'sessions'}
                  </span>
                  <span className="text-gray-200">•</span>
                  <span className="text-[11px] font-medium text-gray-400">
                    Explored {new Date(area!.firstDiscussed).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 italic text-sm">Themes from your sessions will appear here.</p>
            );
          })()}
        </div>
      </section>

      {/* Practice Space Prompt */}
      <section className="bg-gradient-to-br from-boon-bg via-white to-purple-50/30 rounded-[2rem] p-8 border border-gray-100">
        <p className="text-gray-500 text-sm mb-4">
          When hard moments come up, your Practice Space is still here.
        </p>
        <button
          onClick={() => onNavigate?.('practice')}
          className="inline-flex items-center gap-2 text-boon-blue font-bold hover:underline"
        >
          Practice a scenario
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* Secondary Reflection CTA */}
      <section className="text-center py-4">
        <button
          onClick={onStartReflection}
          className="inline-flex items-center gap-2 text-boon-blue font-bold hover:underline"
        >
          Complete your reflection to unlock your Leadership Profile
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>
    </div>
  );
}
