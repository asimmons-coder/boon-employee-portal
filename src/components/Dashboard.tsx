import type { Employee, Session, ActionItem, BaselineSurvey } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState, getStateLabel } from '../lib/coachingState';
import ActionItems from './ActionItems';
import SessionPrep from './SessionPrep';
import IntegrationModule from './IntegrationModule';

interface DashboardProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  baseline: BaselineSurvey | null;
  onActionUpdate: () => void;
  coachingState: CoachingStateData;
}

export default function Dashboard({ profile, sessions, actionItems, baseline: _baseline, onActionUpdate, coachingState }: DashboardProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  const isCompleted = isAlumniState(coachingState.state);

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
            {isCompleted ? `Congratulations, ${profile?.first_name || 'Graduate'}!` : `Hi ${profile?.first_name || 'there'}`}
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            {isCompleted ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                {getStateLabel(coachingState.state)}
              </span>
            ) : 'Your personal coaching space'}
          </p>
        </div>
        {!isCompleted && (
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
        )}
      </header>

      {/* Stats Summary */}
      <section className="bg-white rounded-[2.5rem] p-7 md:p-10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">
          {isCompleted ? 'Your Coaching Journey' : 'Your Coaching at a Glance'}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="text-2xl font-black text-boon-blue tracking-tighter truncate">
              {lastSession?.coach_name?.split(' ')[0] || '—'}
            </p>
            <p className="text-[11px] font-bold text-boon-text uppercase tracking-wide mt-1">Coach</p>
          </div>
          {isCompleted ? (
            <div>
              <p className="text-2xl font-black text-green-600 tracking-tighter">
                {completedSessions.length}
              </p>
              <p className="text-[11px] font-bold text-boon-text uppercase tracking-wide mt-1">Sessions Complete</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-black text-boon-blue tracking-tighter">
                {upcomingSession
                  ? new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </p>
              <p className="text-[11px] font-bold text-boon-text uppercase tracking-wide mt-1">Next session</p>
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-lg font-bold text-boon-text">
              {lastSession
                ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              {isCompleted ? 'Final session' : 'Last session'}
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-lg font-bold text-gray-400">
              {isCompleted ? (
                <span className="text-green-600">100%</span>
              ) : (
                `${coachingState.programProgress}%`
              )}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Progress</p>
          </div>
        </div>
      </section>

      {/* Integration Module - Primary for COMPLETED_PROGRAM */}
      {isCompleted && (
        <IntegrationModule
          coachName={lastSession?.coach_name || 'Your Coach'}
          sessions={completedSessions}
        />
      )}

      {/* Your Goals - from most recent session */}
      {lastSession?.goals && (
        <section className="bg-gradient-to-br from-boon-blue/5 to-boon-lightBlue/20 rounded-[2rem] p-8 border border-boon-blue/10">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-extrabold text-boon-text">
              {isCompleted ? 'Your Leadership Goals' : 'Your Goals'}
            </h2>
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
          <h2 className="text-xl font-extrabold text-boon-text">
            {isCompleted ? 'Areas of Growth' : 'Themes'}
          </h2>
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
                    {isCompleted ? 'Explored' : 'Since'} {new Date(area!.firstDiscussed).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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
          <h2 className="text-xl font-extrabold text-boon-text">
            {isCompleted ? 'Final Words from Your Coach' : 'From your coach'}
          </h2>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
            <div className="absolute top-4 left-6 text-5xl text-boon-blue opacity-10 font-serif">"</div>
            <p className="text-gray-600 leading-relaxed italic relative z-10 text-[15px]">
              {lastSession?.summary || (isCompleted
                ? "It's been a privilege to support your growth. Remember: the real work begins now. Trust yourself."
                : "Looking forward to our next session. Keep reflecting on what's working well for you."
              )}
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

      {/* Action Items - only show if not completed or has pending items */}
      {(!isCompleted || actionItems.some(a => a.status === 'pending')) && (
        <ActionItems items={actionItems} onUpdate={onActionUpdate} />
      )}

      {/* Session Prep - only for active program */}
      {!isCompleted && (
        <SessionPrep
          sessions={sessions}
          actionItems={actionItems}
          coachName={lastSession?.coach_name || 'Your Coach'}
        />
      )}

      {/* What's Next - different for completed vs active */}
      <div className="grid md:grid-cols-2 gap-8 md:gap-10 pb-8">
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-boon-text">
            {isCompleted ? 'Continue Growing' : "What's Next"}
          </h2>
          <div className={`p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between min-h-[160px] ${
            isCompleted
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
              : 'bg-boon-lightBlue/20 border-boon-lightBlue/30'
          }`}>
            <p className="text-boon-text font-bold text-lg leading-snug">
              {isCompleted ? (
                <>
                  Your coaching journey continues. Use the{' '}
                  <span className="text-green-600">Practice Space</span>{' '}
                  when it matters most.
                </>
              ) : upcomingSession ? (
                <>
                  Next session: {' '}
                  <span className="text-boon-blue underline decoration-2 underline-offset-4">
                    {new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </span>
                </>
              ) : "Ready for your next step?"}
            </p>
            <p className="text-sm text-gray-600 mt-4 italic font-medium">
              {isCompleted
                ? '"The best leaders never stop learning. Each challenge is an opportunity to apply what you\'ve learned."'
                : '"Think about one situation this week where you felt your energy shift."'
              }
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-boon-text">
            {isCompleted ? 'Your Journey' : 'Latest Summary'}
          </h2>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            {isCompleted ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="text-[11px] font-black text-green-600 uppercase tracking-widest mb-1">
                    {completedSessions.length} Sessions Completed
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    You've built a strong foundation. Your leadership profile reflects your growth across key competencies.
                  </p>
                </div>
                <button className="mt-6 text-sm font-black text-boon-blue hover:underline uppercase tracking-widest text-left">
                  View Leadership Profile →
                </button>
              </div>
            ) : lastSession ? (
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
    </div>
  );
}
