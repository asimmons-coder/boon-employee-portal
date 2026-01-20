import { useState } from 'react';
import type { Employee, Session, ActionItem, BaselineSurvey, WelcomeSurveyScale, CompetencyScore, ProgramType, View, Checkpoint } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState, isPreFirstSession, isPendingReflectionState } from '../lib/coachingState';
import ActionItems from './ActionItems';
import CoachProfile from './CoachProfile';
import GrowthStory from './GrowthStory';
import KeyTakeaways from './KeyTakeaways';
import CompletionAcknowledgment from './CompletionAcknowledgment';
import PreFirstSessionHome from './PreFirstSessionHome';
import PendingReflectionHome from './PendingReflectionHome';
import ScaleHome from './ScaleHome';
import ActiveGrowHome from './ActiveGrowHome';
import GrowDashboard from './GrowDashboard';

interface DashboardProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  baseline: BaselineSurvey | null;
  welcomeSurveyScale: WelcomeSurveyScale | null;
  programType: ProgramType | null;
  competencyScores: CompetencyScore[];
  onActionUpdate: () => void;
  coachingState: CoachingStateData;
  userEmail: string;
  onNavigate?: (view: View) => void;
  onStartReflection?: () => void;
  checkpoints?: Checkpoint[];
  onStartCheckpoint?: () => void;
}

export default function Dashboard({ profile, sessions, actionItems, baseline, welcomeSurveyScale, programType, competencyScores, onActionUpdate, coachingState, userEmail, onNavigate, onStartReflection, checkpoints: _checkpoints = [], onStartCheckpoint }: DashboardProps) {
  // Note: checkpoints not used directly in Dashboard, but passed through for type consistency
  void _checkpoints;
  const [showCompletionAck, setShowCompletionAck] = useState(true);
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  const isCompleted = isAlumniState(coachingState.state);
  const isPreFirst = isPreFirstSession(coachingState.state);
  const isPendingReflection = isPendingReflectionState(coachingState.state);
  const isScale = coachingState.isScale;

  // Pre-first-session: Show dedicated anticipation-focused Home
  if (isPreFirst) {
    return (
      <PreFirstSessionHome
        profile={profile}
        sessions={sessions}
        baseline={baseline}
        welcomeSurveyScale={welcomeSurveyScale}
        programType={programType}
        userEmail={userEmail}
        onNavigate={onNavigate}
      />
    );
  }

  // Pending reflection: Show reflection CTA-focused Home (for GROW/EXEC)
  if (isPendingReflection && onStartReflection) {
    return (
      <PendingReflectionHome
        profile={profile}
        sessions={sessions}
        baseline={baseline}
        onNavigate={onNavigate}
        onStartReflection={onStartReflection}
      />
    );
  }

  // SCALE users: Show ScaleHome with checkpoint prompt
  if (isScale && !isCompleted) {
    return (
      <ScaleHome
        profile={profile}
        sessions={sessions}
        actionItems={actionItems}
        baseline={baseline}
        checkpointStatus={coachingState.scaleCheckpointStatus}
        onActionUpdate={onActionUpdate}
        userEmail={userEmail}
        onNavigate={onNavigate}
        onStartCheckpoint={onStartCheckpoint}
      />
    );
  }

  // Active GROW users: Show GrowDashboard with program progress and competency focus
  // GROW gets a differentiated experience with fixed program structure
  if (!isCompleted && coachingState.isGrowOrExec && programType === 'GROW') {
    return (
      <GrowDashboard
        profile={profile}
        sessions={sessions}
        actionItems={actionItems}
        coachingState={coachingState}
        onActionUpdate={onActionUpdate}
        userEmail={userEmail}
        onNavigate={onNavigate}
      />
    );
  }

  // Active EXEC users (or GROW fallback): Show ActiveGrowHome with sub-states
  // (Session Scheduled vs No Session Scheduled)
  if (!isCompleted && coachingState.isGrowOrExec) {
    return (
      <ActiveGrowHome
        profile={profile}
        sessions={sessions}
        actionItems={actionItems}
        baseline={baseline}
        coachingState={coachingState}
        onActionUpdate={onActionUpdate}
        userEmail={userEmail}
        onNavigate={onNavigate}
      />
    );
  }

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
          <p className="text-gray-500 mt-2 text-lg font-medium">
            {isCompleted
              ? 'Your leadership journey with Boon'
              : 'Your personal coaching space'
            }
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

      {/* Program Summary */}
      <section className="bg-white rounded-[2.5rem] p-7 md:p-10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">
          {isCompleted ? 'Program Summary' : 'Your Coaching at a Glance'}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Coach */}
          <div className="flex items-center gap-3">
            <img
              src={`https://picsum.photos/seed/${lastSession?.coach_name || 'coach'}/100/100`}
              alt="Coach"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
            />
            <div>
              <p className="text-lg font-black text-boon-text tracking-tight truncate">
                {lastSession?.coach_name?.split(' ')[0] || '—'}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Coach</p>
            </div>
          </div>

          {isCompleted ? (
            <>
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
                <p className="text-lg font-black text-boon-text tracking-tight">
                  {(() => {
                    const first = completedSessions[completedSessions.length - 1];
                    const last = completedSessions[0];
                    if (!first || !last) return '—';
                    const startDate = new Date(first.session_date);
                    const endDate = new Date(last.session_date);
                    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
                    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    return `${startMonth} – ${endMonth}`;
                  })()}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Duration</p>
              </div>
            </>
          ) : (
            <>
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
              <div className="hidden sm:block">
                <p className="text-lg font-bold text-boon-text">
                  {lastSession
                    ? new Date(lastSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Last session</p>
              </div>
              {/* Progress */}
              <div className="hidden sm:block text-right">
                <p className="text-lg font-bold text-gray-500">{coachingState.programProgress}%</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Progress</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Growth Story - for completed users */}
      {isCompleted && (
        <GrowthStory
          sessions={sessions}
          competencyScores={competencyScores}
          baseline={baseline}
        />
      )}

      {/* Your Coach Profile - for active users */}
      {!isCompleted && lastSession && (
        <CoachProfile
          sessions={sessions}
          coachName={lastSession.coach_name}
          programType={programType}
          employeeId={profile?.id || null}
          userEmail={userEmail}
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

        {/* From Your Coach - only show for active users, or completed users with actual summary */}
        {(!isCompleted || lastSession?.summary) && (
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-boon-text">
              {isCompleted ? 'Final Words from Your Coach' : 'From your coach'}
            </h2>
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
        )}
      </div>

      {/* Action Items for active users, Key Takeaways for completed */}
      {isCompleted ? (
        <KeyTakeaways actionItems={actionItems} sessions={sessions} />
      ) : (
        <ActionItems items={actionItems} onUpdate={onActionUpdate} />
      )}

      {/* What's Next - different for completed vs active */}
      {isCompleted ? (
        <div className="space-y-8 pb-8">
          {/* Soft Practice Space Prompt */}
          <section className="bg-gradient-to-br from-boon-bg via-white to-purple-50/30 rounded-[2rem] p-8 border border-gray-100">
            <p className="text-gray-500 text-sm mb-4">
              When hard moments come up, your practice space is still here.
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

          {/* Your Leadership Profile CTA */}
          <div className="grid md:grid-cols-2 gap-8">
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="text-[11px] font-black text-green-600 uppercase tracking-widest mb-2">
                    Leadership Profile
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    See your complete competency profile and how you grew through your program.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate?.('progress')}
                  className="mt-6 text-sm font-black text-boon-blue hover:underline uppercase tracking-widest text-left"
                >
                  View Profile →
                </button>
              </div>
            </section>

            <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="text-[11px] font-black text-purple-600 uppercase tracking-widest mb-2">
                    Session Archive
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Revisit your complete coaching history and session notes.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate?.('sessions')}
                  className="mt-6 text-sm font-black text-boon-blue hover:underline uppercase tracking-widest text-left"
                >
                  View Sessions →
                </button>
              </div>
            </section>
          </div>

          {/* Soft SCALE Prompt - only if SCALE available (checking profile.program or similar) */}
          {profile?.program !== 'SCALE' && (
            <section className="text-center py-4">
              <p className="text-gray-400 text-sm">
                Some people continue with ongoing 1:1 coaching.{' '}
                <a
                  href="mailto:hello@booncoaching.com?subject=Interest%20in%20SCALE%20Program"
                  className="text-gray-500 hover:text-boon-blue underline underline-offset-2"
                >
                  Learn about SCALE →
                </a>
              </p>
            </section>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 pb-8">
          <section className="space-y-5">
            <h2 className="text-xl font-extrabold text-boon-text">What's Next</h2>
            <div className="p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between min-h-[160px] bg-boon-lightBlue/20 border-boon-lightBlue/30">
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
      )}

      {/* Completion Acknowledgment Modal - one-time for completed users */}
      {isCompleted && showCompletionAck && lastSession && (
        <CompletionAcknowledgment
          sessions={sessions}
          coachName={lastSession.coach_name}
          userEmail={userEmail}
          onDismiss={() => setShowCompletionAck(false)}
        />
      )}
    </div>
  );
}
