import { useState } from 'react';
import type { SurveyResponse, BaselineSurvey, CompetencyScore, ProgramType, Session, ActionItem, Checkpoint, WelcomeSurveyScale } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState, isPreFirstSession, isPendingReflectionState } from '../lib/coachingState';
import GrowthTimeline from './GrowthTimeline';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

interface ProgressPageProps {
  progress: SurveyResponse[];
  baseline: BaselineSurvey | null;
  welcomeSurveyScale: WelcomeSurveyScale | null;
  competencyScores: CompetencyScore[];
  sessions: Session[];
  actionItems: ActionItem[];
  programType: ProgramType | null;
  coachingState: CoachingStateData;
  onStartReflection?: () => void;
  checkpoints?: Checkpoint[];
  onStartCheckpoint?: () => void;
}

// The 12 competencies with their database column keys
const COMPETENCIES = [
  { key: 'adaptability_and_resilience', label: 'Adaptability & Resilience', shortLabel: 'Adaptability' },
  { key: 'building_relationships_at_work', label: 'Building Relationships', shortLabel: 'Relationships' },
  { key: 'change_management', label: 'Change Management', shortLabel: 'Change Mgmt' },
  { key: 'delegation_and_accountability', label: 'Delegation & Accountability', shortLabel: 'Delegation' },
  { key: 'effective_communication', label: 'Effective Communication', shortLabel: 'Communication' },
  { key: 'effective_planning_and_execution', label: 'Planning & Execution', shortLabel: 'Planning' },
  { key: 'emotional_intelligence', label: 'Emotional Intelligence', shortLabel: 'EQ' },
  { key: 'giving_and_receiving_feedback', label: 'Giving & Receiving Feedback', shortLabel: 'Feedback' },
  { key: 'persuasion_and_influence', label: 'Persuasion & Influence', shortLabel: 'Influence' },
  { key: 'self_confidence_and_imposter_syndrome', label: 'Self Confidence', shortLabel: 'Confidence' },
  { key: 'strategic_thinking', label: 'Strategic Thinking', shortLabel: 'Strategic' },
  { key: 'time_management_and_productivity', label: 'Time Management', shortLabel: 'Time Mgmt' },
];

// Map competency_scores.competency_name to our keys
function mapCompetencyName(name: string): string {
  return name.toLowerCase().replace(/ /g, '_').replace(/&/g, 'and');
}

// Get score label color
function getScoreLabelColor(label: string): string {
  switch (label?.toLowerCase()) {
    case 'excelling': return 'text-green-600 bg-green-100';
    case 'growing': return 'text-blue-600 bg-blue-100';
    case 'applying': return 'text-amber-600 bg-amber-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

// Get bar color based on score
function getBarColor(score: number): string {
  if (score >= 4) return '#10B981'; // green
  if (score >= 3) return '#3B82F6'; // blue
  if (score >= 2) return '#F59E0B'; // amber
  return '#EF4444'; // red
}

// Boon benchmark averages for SCALE users (1-10 scale)
const BOON_BENCHMARKS = {
  satisfaction: 6.8,
  productivity: 6.9,
  work_life_balance: 6.2,
};

export default function ProgressPage({
  progress,
  baseline,
  welcomeSurveyScale,
  competencyScores,
  sessions,
  actionItems,
  programType,
  coachingState,
  onStartReflection,
  checkpoints = [],
  onStartCheckpoint
}: ProgressPageProps) {
  const [activeTab, setActiveTab] = useState<'competencies' | 'wellbeing'>('competencies');
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const completedActions = actionItems.filter(a => a.status === 'completed');

  const isGrowOrExec = programType === 'GROW' || programType === 'EXEC';
  // SCALE detection: either explicit programType OR has welcomeSurveyScale data
  const isScale = programType === 'SCALE' || (programType === null && !!welcomeSurveyScale);
  const isCompleted = isAlumniState(coachingState.state);
  const isPreFirst = isPreFirstSession(coachingState.state);
  const isPendingReflection = isPendingReflectionState(coachingState.state);

  // Get coach name for pre-first-session messaging
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');
  const coachFirstName = upcomingSession?.coach_name?.split(' ')[0] || 'your coach';

  // Pre-first-session: Show different content for SCALE vs GROW
  if (isPreFirst) {
    console.log('[Progress] 🔍 Pre-first-session state detected');
    console.log('[Progress] programType:', programType, '| isScale:', isScale);
    console.log('[Progress] welcomeSurveyScale:', welcomeSurveyScale ? 'EXISTS' : 'NULL');
    if (welcomeSurveyScale) {
      console.log('[Progress] welcomeSurveyScale data:', {
        satisfaction: welcomeSurveyScale.satisfaction,
        productivity: welcomeSurveyScale.productivity,
        work_life_balance: welcomeSurveyScale.work_life_balance,
        additional_topics: welcomeSurveyScale.additional_topics,
      });
    }
    console.log('[Progress] Will show SCALE view?', isScale && !!welcomeSurveyScale);

    // SCALE pre-first-session: Show "Your Coaching Journey" with baseline metrics
    if (isScale && welcomeSurveyScale) {
      // Calculate % vs Boon average for each metric
      const calculateVsBenchmark = (value: number | null | undefined, benchmark: number) => {
        if (!value) return null;
        const diff = ((value - benchmark) / benchmark) * 100;
        return Math.round(diff);
      };

      const wellbeingMetrics = [
        {
          key: 'satisfaction',
          label: 'Satisfaction',
          value: welcomeSurveyScale.satisfaction,
          benchmark: BOON_BENCHMARKS.satisfaction,
        },
        {
          key: 'productivity',
          label: 'Productivity',
          value: welcomeSurveyScale.productivity,
          benchmark: BOON_BENCHMARKS.productivity,
        },
        {
          key: 'work_life_balance',
          label: 'Work/Life Balance',
          value: welcomeSurveyScale.work_life_balance,
          benchmark: BOON_BENCHMARKS.work_life_balance,
        },
      ];

      // Get coaching goals from welcomeSurveyScale
      const coachingGoal = welcomeSurveyScale.coaching_goals || welcomeSurveyScale.additional_topics;

      // Format session date for display
      const sessionDate = upcomingSession?.session_date
        ? new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }) + ' at ' + new Date(upcomingSession.session_date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null;

      // Coach info for timeline
      const coachInfo = upcomingSession?.coach_name
        ? `${upcomingSession.coach_name}${coachFirstName !== upcomingSession.coach_name ? '' : ''}`
        : coachFirstName;

      return (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <header className="text-center">
            <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Your Coaching Journey</h1>
            <p className="text-gray-500 mt-2 font-medium">Here's what you're working toward</p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              SCALE Program
            </div>
          </header>

          {/* What You Want to Work On - Dark card */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-8 text-white">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">What You Want to Work On</p>
            <div className="mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            {coachingGoal ? (
              <>
                <p className="text-xl font-bold leading-relaxed mb-4">
                  "{coachingGoal}"
                </p>
                <p className="text-gray-400 text-sm">
                  You'll refine this with your coach in your first session
                </p>
              </>
            ) : (
              <p className="text-gray-400">
                You'll define your goals in your first session with {coachFirstName}
              </p>
            )}
          </section>

          {/* Your Journey - Timeline */}
          <section className="bg-white rounded-[2rem] p-8 border border-gray-100">
            <h2 className="text-lg font-extrabold text-boon-text mb-6">Your Journey</h2>

            <div className="space-y-0">
              {/* Welcome Survey - Completed */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="w-0.5 h-12 bg-green-500"></div>
                </div>
                <div className="pb-8">
                  <h3 className="font-bold text-boon-text">Welcome Survey</h3>
                  <p className="text-sm text-gray-500">Shared your goals and baseline</p>
                </div>
              </div>

              {/* Matched with Coach - Completed */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="w-0.5 h-12 bg-green-500"></div>
                </div>
                <div className="pb-8">
                  <h3 className="font-bold text-boon-text">Matched with Your Coach</h3>
                  <p className="text-sm text-gray-500">{coachInfo}</p>
                </div>
              </div>

              {/* First Session - Current */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-boon-blue flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                  <div className="w-0.5 h-12 bg-gray-200"></div>
                </div>
                <div className="pb-8">
                  <h3 className="font-bold text-boon-blue">First Session</h3>
                  <p className="text-sm text-gray-500">Dive deeper into your goals and build your plan</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-boon-lightBlue text-boon-blue text-xs font-bold rounded-full">
                    You're here
                  </span>
                </div>
              </div>

              {/* Ongoing Coaching - Future */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  </div>
                  <div className="w-0.5 h-12 bg-gray-200"></div>
                </div>
                <div className="pb-8">
                  <h3 className="font-bold text-gray-400">Ongoing Coaching</h3>
                  <p className="text-sm text-gray-400">Regular sessions + check-ins on your progress</p>
                </div>
              </div>

              {/* Wins & Breakthroughs - Future */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-400">Wins & Breakthroughs</h3>
                  <p className="text-sm text-gray-400">Celebrate what you've accomplished</p>
                </div>
              </div>
            </div>
          </section>

          {/* Your Wins - Empty state */}
          <section className="bg-white rounded-[2rem] p-8 border-2 border-dashed border-gray-200 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h2 className="text-lg font-extrabold text-boon-text mb-2">Your Wins</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              This is where you'll track breakthroughs and accomplishments as you progress through coaching.
            </p>
          </section>

          {/* Your Starting Point - Metric cards */}
          <section className="bg-white rounded-[2rem] p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-boon-text">Your Starting Point</h2>
              <span className="text-xs text-gray-400">From welcome survey</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {wellbeingMetrics.map(metric => {
                const vsBenchmark = calculateVsBenchmark(metric.value, metric.benchmark);
                return (
                  <div key={metric.key} className="text-center p-4 bg-gray-50 rounded-2xl">
                    <div className="text-3xl font-black text-boon-text">
                      {metric.value ?? '—'}
                      <span className="text-base font-normal text-gray-400">/10</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{metric.label}</p>
                    {vsBenchmark !== null && (
                      <p className={`text-xs font-bold mt-1 ${vsBenchmark >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {vsBenchmark >= 0 ? '+' : ''}{vsBenchmark}% vs avg
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-gray-400 border-t border-gray-100 pt-4">
              We'll check in on these periodically to see how things evolve
            </p>
          </section>

          {/* You're all set - CTA */}
          {upcomingSession && (
            <section className="bg-boon-blue rounded-[2rem] p-8 text-center text-white">
              <h2 className="text-xl font-extrabold mb-2">You're all set</h2>
              <p className="text-blue-100 mb-6">
                Your first session is scheduled — the real work begins soon
              </p>
              {sessionDate && (
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 rounded-xl">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-bold">{sessionDate}</span>
                </div>
              )}
            </section>
          )}
        </div>
      );
    }

    // GROW/EXEC pre-first-session: Show the existing anticipation state
    return (
      <div className="space-y-8 animate-fade-in">
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Progress</h1>
          <p className="text-gray-500 mt-2 font-medium">Track your leadership growth over time.</p>
        </header>

        {/* Anticipation State */}
        <section className="bg-gradient-to-br from-purple-50 to-boon-lightBlue/20 rounded-[2.5rem] p-10 md:p-14 border border-purple-100 text-center">
          <div className="w-20 h-20 mx-auto mb-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-boon-text mb-4">
            Your Leadership Profile
          </h2>
          <p className="text-gray-600 text-lg max-w-lg mx-auto leading-relaxed mb-6">
            Your leadership profile will emerge as you work with {coachFirstName}.
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            After your first session, you'll see insights on your competencies, growth patterns, and wellbeing metrics here.
          </p>
        </section>

        {/* What to Expect */}
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100">
          <h3 className="text-lg font-extrabold text-boon-text mb-6">What You'll Track</h3>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-bold text-boon-text text-sm mb-2">12 Competencies</h4>
              <p className="text-gray-500 text-xs">Leadership skills like communication, delegation, and emotional intelligence.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="font-bold text-boon-text text-sm mb-2">Growth Trends</h4>
              <p className="text-gray-500 text-xs">Visual comparisons between your baseline and current levels.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-boon-lightBlue rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-boon-text text-sm mb-2">Wellbeing Metrics</h4>
              <p className="text-gray-500 text-xs">Track satisfaction, productivity, balance, and motivation over time.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // SCALE: Show longitudinal view with checkpoint history
  if (isScale) {
    // Get the latest checkpoint for current scores
    const latestCheckpoint = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;

    // Build competency data from checkpoints for trend tracking
    const scaleCompetencyData = COMPETENCIES.map(comp => {
      const baselineKey = `comp_${comp.key}` as keyof BaselineSurvey;
      const baselineValue = baseline?.[baselineKey] as number | null;

      // Get scores from all checkpoints for trendline
      const trendScores = checkpoints.map(cp => ({
        checkpointNumber: cp.checkpoint_number,
        score: cp.competency_scores[comp.key as keyof typeof cp.competency_scores] || 0,
        date: cp.created_at,
      }));

      // Current is from latest checkpoint
      const currentScore = latestCheckpoint
        ? latestCheckpoint.competency_scores[comp.key as keyof typeof latestCheckpoint.competency_scores]
        : baselineValue || 0;

      // Calculate trend (comparing last two checkpoints, or baseline to first)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (trendScores.length >= 2) {
        const diff = trendScores[trendScores.length - 1].score - trendScores[trendScores.length - 2].score;
        trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
      } else if (trendScores.length === 1 && baselineValue) {
        const diff = trendScores[0].score - baselineValue;
        trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
      }

      return {
        key: comp.key,
        label: comp.label,
        shortLabel: comp.shortLabel,
        baseline: baselineValue || 0,
        current: currentScore || 0,
        trend,
        trendScores,
      };
    });

    // Calculate time in program
    const firstSession = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1] : null;
    const monthsInProgram = firstSession
      ? Math.max(1, Math.floor((Date.now() - new Date(firstSession.session_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;

    // Build radar data with multiple checkpoint layers
    const scaleRadarData = COMPETENCIES.map(comp => {
      const baselineKey = `comp_${comp.key}` as keyof BaselineSurvey;
      const result: Record<string, any> = {
        competency: comp.shortLabel,
        baseline: baseline?.[baselineKey] as number || 0,
        fullMark: 5,
      };

      // Add each checkpoint as a layer
      checkpoints.forEach(cp => {
        result[`checkpoint${cp.checkpoint_number}`] = cp.competency_scores[comp.key as keyof typeof cp.competency_scores] || 0;
      });

      return result;
    });

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Progress</h1>
          <p className="text-gray-500 mt-2 font-medium">Track your leadership growth over time.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            SCALE Program
          </div>
        </header>

        {/* Checkpoint Due Banner */}
        {coachingState.scaleCheckpointStatus.isCheckpointDue && onStartCheckpoint && (
          <section className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-[2rem] p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-boon-text">Time for a check-in</h2>
                  <p className="text-sm text-gray-600">Add a new data point to your growth curve.</p>
                </div>
              </div>
              <button
                onClick={onStartCheckpoint}
                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all"
              >
                Start Check-In
              </button>
            </div>
          </section>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-boon-text">{completedSessions.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sessions</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-boon-text">{monthsInProgram > 0 ? `${monthsInProgram}` : '—'}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Months</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-purple-600">{checkpoints.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Check-ins</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-gray-400">
              {coachingState.scaleCheckpointStatus.isCheckpointDue
                ? 'Now'
                : `Session ${coachingState.scaleCheckpointStatus.nextCheckpointDueAtSession}`
              }
            </p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Next Check-in</p>
          </div>
        </div>

        {/* Growth Timeline */}
        {(checkpoints.length > 0 || baseline) && (
          <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
            <h2 className="text-lg font-extrabold text-boon-text mb-6">Growth Timeline</h2>
            <GrowthTimeline
              checkpoints={checkpoints}
              baseline={baseline}
              onCheckpointClick={(cp) => setExpandedCheckpoint(expandedCheckpoint === cp.id ? null : cp.id)}
            />
          </section>
        )}

        {/* Competency Grid with Trends */}
        <section>
          <h2 className="text-lg font-extrabold text-boon-text mb-4">Core Leadership Competencies</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scaleCompetencyData.map(comp => (
              <div
                key={comp.key}
                className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-boon-text text-sm leading-tight">{comp.label}</h3>
                  <div className="flex items-center gap-1">
                    {comp.trend === 'up' && (
                      <span className="text-green-600 text-sm font-bold">↑</span>
                    )}
                    {comp.trend === 'down' && (
                      <span className="text-red-500 text-sm font-bold">↓</span>
                    )}
                    {comp.trend === 'stable' && (
                      <span className="text-gray-400 text-sm font-bold">→</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Current Score */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase tracking-wide">Current</span>
                      <span className="font-bold text-purple-600">{comp.current || '—'}/5</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(comp.current || 0) * 20}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini Trend Dots */}
                  {comp.trendScores.length > 0 && (
                    <div className="flex items-center gap-1 pt-2">
                      <span className="text-[10px] text-gray-400 mr-2">History:</span>
                      {baseline && (
                        <div
                          className="w-2 h-2 rounded-full bg-gray-300"
                          title={`Baseline: ${comp.baseline}/5`}
                        />
                      )}
                      {comp.trendScores.map((ts, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            ts.score >= 4 ? 'bg-green-500' :
                            ts.score >= 3 ? 'bg-purple-500' :
                            'bg-amber-500'
                          }`}
                          title={`Check-in ${ts.checkpointNumber}: ${ts.score}/5`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Radar Chart with Multiple Checkpoints */}
        {(checkpoints.length > 0 || baseline) && (
          <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
            <h2 className="text-lg font-extrabold text-boon-text mb-6 text-center">
              Competency Evolution
            </h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={scaleRadarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={{ fill: '#374151', fontSize: 9, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 5]}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                  />
                  {/* Baseline */}
                  <Radar
                    name="Baseline"
                    dataKey="baseline"
                    stroke="#9ca3af"
                    fill="#9ca3af"
                    fillOpacity={0.15}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  {/* Checkpoints - each with progressively darker purple */}
                  {checkpoints.map((cp, idx) => (
                    <Radar
                      key={cp.id}
                      name={`Check-in ${cp.checkpoint_number}`}
                      dataKey={`checkpoint${cp.checkpoint_number}`}
                      stroke={`hsl(270, ${60 + idx * 10}%, ${60 - idx * 10}%)`}
                      fill={`hsl(270, ${60 + idx * 10}%, ${60 - idx * 10}%)`}
                      fillOpacity={0.1 + idx * 0.1}
                      strokeWidth={idx === checkpoints.length - 1 ? 2 : 1}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ paddingTop: 20 }}
                    formatter={(value) => (
                      <span className="text-sm font-semibold text-gray-600">{value}</span>
                    )}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Each layer shows your competency profile at a different check-in. Darker purple = more recent.
            </p>
          </section>
        )}

        {/* Checkpoint History */}
        {checkpoints.length > 0 && (
          <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
            <h2 className="text-lg font-extrabold text-boon-text mb-6">Check-in History</h2>
            <div className="space-y-4">
              {[...checkpoints].reverse().map(cp => (
                <div
                  key={cp.id}
                  className={`border rounded-2xl transition-all ${
                    expandedCheckpoint === cp.id ? 'border-purple-300 bg-purple-50/30' : 'border-gray-100 bg-white'
                  }`}
                >
                  <button
                    onClick={() => setExpandedCheckpoint(expandedCheckpoint === cp.id ? null : cp.id)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <span className="font-bold text-purple-600">{cp.checkpoint_number}</span>
                      </div>
                      <div>
                        <p className="font-bold text-boon-text">Check-in {cp.checkpoint_number}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(cp.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          {' · '}Session {cp.session_count_at_checkpoint}
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedCheckpoint === cp.id ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedCheckpoint === cp.id && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                      {cp.focus_area && (
                        <div className="mb-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Focus Area</p>
                          <p className="text-gray-700">{cp.focus_area}</p>
                        </div>
                      )}
                      {cp.reflection_text && (
                        <div className="mb-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reflection</p>
                          <p className="text-gray-600 italic">"{cp.reflection_text}"</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Competency Scores</p>
                        <div className="flex flex-wrap gap-2">
                          {COMPETENCIES.map(comp => {
                            const score = cp.competency_scores[comp.key as keyof typeof cp.competency_scores];
                            return (
                              <span
                                key={comp.key}
                                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                  score >= 4 ? 'bg-green-100 text-green-700' :
                                  score >= 3 ? 'bg-purple-100 text-purple-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {comp.shortLabel}: {score}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Insights */}
        <section className="bg-gradient-to-br from-purple-50 to-boon-lightBlue/20 p-8 rounded-[2rem] border border-purple-100">
          <h2 className="text-lg font-extrabold text-boon-text mb-6">Insights</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: '📈',
                title: 'Biggest Growth',
                desc: (() => {
                  if (checkpoints.length < 1 || !baseline) return 'Complete check-ins to see your growth trends.';
                  const latestCp = checkpoints[checkpoints.length - 1];
                  let biggestGrowth = { key: '', growth: 0 };
                  COMPETENCIES.forEach(comp => {
                    const baselineKey = `comp_${comp.key}` as keyof BaselineSurvey;
                    const baselineVal = baseline?.[baselineKey] as number || 0;
                    const currentVal = latestCp.competency_scores[comp.key as keyof typeof latestCp.competency_scores] || 0;
                    const growth = baselineVal > 0 ? ((currentVal - baselineVal) / baselineVal) * 100 : 0;
                    if (growth > biggestGrowth.growth) {
                      biggestGrowth = { key: comp.label, growth };
                    }
                  });
                  return biggestGrowth.growth > 0
                    ? `${biggestGrowth.key} (+${Math.round(biggestGrowth.growth)}% since baseline)`
                    : 'Building consistency across all areas.';
                })()
              },
              {
                icon: '⭐',
                title: 'Consistent Strength',
                desc: (() => {
                  if (checkpoints.length < 2) return 'More check-ins will reveal your consistent strengths.';
                  // Find competency with highest average across checkpoints
                  let strongest = { key: '', avg: 0 };
                  COMPETENCIES.forEach(comp => {
                    const avg = checkpoints.reduce((sum, cp) => {
                      return sum + (cp.competency_scores[comp.key as keyof typeof cp.competency_scores] || 0);
                    }, 0) / checkpoints.length;
                    if (avg > strongest.avg) {
                      strongest = { key: comp.label, avg };
                    }
                  });
                  return strongest.avg >= 4
                    ? `${strongest.key} (${strongest.avg.toFixed(1)}+ across check-ins)`
                    : `${strongest.key} is your strongest area.`;
                })()
              },
              {
                icon: '🎯',
                title: 'Focus Suggestion',
                desc: (() => {
                  if (checkpoints.length < 1) return 'Complete a check-in to get personalized focus suggestions.';
                  const latestCp = checkpoints[checkpoints.length - 1];
                  // Find lowest scoring competency in latest checkpoint
                  let lowest = { key: '', score: 5 };
                  COMPETENCIES.forEach(comp => {
                    const score = latestCp.competency_scores[comp.key as keyof typeof latestCp.competency_scores] || 0;
                    if (score < lowest.score && score > 0) {
                      lowest = { key: comp.label, score };
                    }
                  });
                  return lowest.score < 4
                    ? `Consider focusing on ${lowest.key} in upcoming sessions.`
                    : 'Great balance! Continue building across all areas.';
                })()
              }
            ].map((card, i) => (
              <div
                key={i}
                className="p-6 bg-white/60 rounded-2xl border border-white hover:bg-white hover:shadow-lg transition-all"
              >
                <div className="text-3xl mb-4">{card.icon}</div>
                <h4 className="font-bold text-boon-text mb-2 uppercase tracking-widest text-xs">{card.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* No Checkpoints State */}
        {checkpoints.length === 0 && !coachingState.scaleCheckpointStatus.isCheckpointDue && (
          <section className="bg-gradient-to-br from-boon-bg to-white p-8 rounded-[2rem] border border-gray-100 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-boon-text mb-2">Your First Check-In is Coming</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              After session {coachingState.scaleCheckpointStatus.nextCheckpointDueAtSession}, you'll be prompted to complete your first check-in.
              This will establish your baseline for tracking growth over time.
            </p>
          </section>
        )}
      </div>
    );
  }

  // Pending Reflection: Show baseline only, final scores locked until reflection complete
  if (isPendingReflection) {
    // Build baseline-only competency data
    const baselineCompetencyData = COMPETENCIES.map(comp => {
      const baselineKey = `comp_${comp.key}` as keyof BaselineSurvey;
      const baselineValue = baseline?.[baselineKey] as number | null;
      return {
        key: comp.key,
        label: comp.label,
        shortLabel: comp.shortLabel,
        baseline: baselineValue ?? 0,
      };
    });

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Leadership Profile</h1>
          <p className="text-gray-500 mt-2 font-medium">Track your leadership competency growth over time.</p>
        </header>

        {/* Completion Status Banner */}
        <section className="bg-gradient-to-br from-boon-blue/10 via-white to-purple-50 rounded-[2rem] p-8 border-2 border-boon-blue/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-boon-blue flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-boon-text">Your Leadership Profile is almost complete</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Finish your final reflection to see your growth across all 12 competencies.
          </p>
          <button
            onClick={onStartReflection}
            className="inline-flex items-center gap-2 px-6 py-3 bg-boon-blue text-white font-bold rounded-xl hover:bg-boon-darkBlue transition-all"
          >
            Complete Reflection
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </section>

        {/* Summary Stats (Partial) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-green-600">{completedSessions.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sessions</p>
            <p className="text-[10px] text-green-600 mt-1">Complete</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-purple-600">12</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Competencies</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-green-600">
              <svg className="w-7 h-7 mx-auto text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Baseline</p>
            <p className="text-[10px] text-green-600 mt-1">Complete</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
            <p className="text-3xl font-black text-amber-500">
              <svg className="w-7 h-7 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Final Assessment</p>
            <p className="text-[10px] text-amber-500 mt-1">Pending</p>
          </div>
        </div>

        {/* Competency Grid - Baseline Only */}
        <section>
          <h2 className="text-lg font-extrabold text-boon-text mb-4">Core Leadership Competencies</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {baselineCompetencyData.map(comp => (
              <div
                key={comp.key}
                className="bg-white p-5 rounded-2xl border border-gray-100"
              >
                <h3 className="font-bold text-boon-text text-sm leading-tight mb-4">{comp.label}</h3>

                <div className="space-y-3">
                  {/* Baseline */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase tracking-wide">Baseline</span>
                      <span className="font-bold text-gray-500">{comp.baseline || '—'}/5</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-300 rounded-full transition-all duration-500"
                        style={{ width: `${(comp.baseline || 0) * 20}%` }}
                      />
                    </div>
                  </div>

                  {/* Final - Locked */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase tracking-wide">Final</span>
                      <span className="font-medium text-amber-500 italic text-[11px]">Complete reflection to reveal</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-200 rounded-full border-2 border-dashed border-gray-300" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Radar Chart - Baseline Only */}
        {baseline && (
          <section className="bg-white p-8 rounded-[2rem] border border-gray-100 relative">
            <h2 className="text-lg font-extrabold text-boon-text mb-6 text-center">
              Competency Profile
            </h2>
            <div className="h-96 opacity-50">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={baselineCompetencyData.map(comp => ({
                  competency: comp.shortLabel,
                  baseline: comp.baseline,
                  fullMark: 5,
                }))} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={{ fill: '#374151', fontSize: 9, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 5]}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                  />
                  <Radar
                    name="Baseline"
                    dataKey="baseline"
                    stroke="#9ca3af"
                    fill="#9ca3af"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-[2rem]">
              <div className="text-center p-8">
                <p className="text-gray-600 font-medium mb-4">
                  Complete your reflection to see your full profile
                </p>
                <button
                  onClick={onStartReflection}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-boon-blue text-white font-bold rounded-xl hover:bg-boon-darkBlue transition-all"
                >
                  Complete Reflection
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    );
  }

  // Build competency data with baseline and current scores
  const competencyData = COMPETENCIES.map(comp => {
    // Get baseline from welcome_survey_baseline (comp_ prefixed columns)
    const baselineKey = `comp_${comp.key}` as keyof BaselineSurvey;
    const baselineValue = baseline?.[baselineKey] as number | null;

    // Get current from competency_scores (match by competency_name)
    const currentScore = competencyScores.find(cs =>
      mapCompetencyName(cs.competency_name) === comp.key ||
      cs.competency_name.toLowerCase().includes(comp.shortLabel.toLowerCase())
    );

    return {
      key: comp.key,
      label: comp.label,
      shortLabel: comp.shortLabel,
      baseline: baselineValue ?? 0,
      current: currentScore?.score ?? baselineValue ?? 0,
      scoreLabel: currentScore?.score_label || null,
      improvement: baselineValue && currentScore?.score
        ? Math.round(((currentScore.score - baselineValue) / baselineValue) * 100)
        : null,
    };
  });

  // Calculate average improvement for competencies
  const competenciesWithImprovement = competencyData.filter(c => c.improvement !== null);
  const avgCompetencyImprovement = competenciesWithImprovement.length > 0
    ? Math.round(competenciesWithImprovement.reduce((sum, c) => sum + (c.improvement || 0), 0) / competenciesWithImprovement.length)
    : null;

  // Wellbeing metrics (keys match actual baseline column names)
  const wellbeingMetrics = [
    { key: 'satisfaction', label: 'Work Satisfaction', icon: '😊', color: '#4A90A4' },
    { key: 'productivity', label: 'Productivity', icon: '⚡', color: '#10B981' },
    { key: 'work_life_balance', label: 'Work-Life Balance', icon: '⚖️', color: '#8B5CF6' },
    { key: 'motivation', label: 'Motivation', icon: '💪', color: '#F59E0B' },
  ];

  // Get the latest survey response for current wellbeing values
  const latestProgress = progress.length > 0 ? progress[progress.length - 1] : null;

  const wellbeingData = wellbeingMetrics.map(metric => {
    // Baseline uses direct column names (satisfaction, productivity, work_life_balance, motivation)
    const baselineKey = metric.key as keyof BaselineSurvey;
    const baselineValue = baseline?.[baselineKey] as number | null;

    // Map wellbeing metric keys to survey response fields
    const progressKeyMap: Record<string, keyof SurveyResponse> = {
      'satisfaction': 'wellbeing_satisfaction',
      'productivity': 'wellbeing_productivity',
      'work_life_balance': 'wellbeing_balance',
      'motivation': 'wellbeing_resilience',
    };

    const progressKey = progressKeyMap[metric.key];
    const currentValue = latestProgress?.[progressKey] as number | null;

    return {
      ...metric,
      baseline: baselineValue ?? 0,
      current: currentValue ?? baselineValue ?? 0,
    };
  });

  // Radar chart data for competencies
  const radarData = competencyData.map(comp => ({
    competency: comp.shortLabel,
    baseline: comp.baseline,
    current: comp.current,
    fullMark: 5,
  }));

  // Bar chart data (sorted by current score)
  const barChartData = [...competencyData]
    .sort((a, b) => b.current - a.current)
    .map(comp => ({
      name: comp.shortLabel,
      score: comp.current,
      baseline: comp.baseline,
    }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">
          {isCompleted ? 'Leadership Profile' : 'My Progress'}
        </h1>
        <p className="text-gray-500 mt-2 font-medium">
          {isCompleted
            ? 'Your leadership strengths and capabilities.'
            : isGrowOrExec
              ? 'Track your leadership competency growth over time.'
              : 'Track your wellbeing and growth over time.'}
        </p>
        {isCompleted && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Program Graduate
          </div>
        )}
      </header>

      {/* Tab Navigation - Show both tabs for Grow/Exec, only wellbeing for Scale */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {isGrowOrExec && (
          <button
            onClick={() => setActiveTab('competencies')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'competencies'
                ? 'bg-white text-boon-text shadow-sm'
                : 'text-gray-500 hover:text-boon-text'
            }`}
          >
            {isCompleted ? 'Competency Profile' : 'Competencies'}
          </button>
        )}
        <button
          onClick={() => setActiveTab('wellbeing')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'wellbeing'
              ? 'bg-white text-boon-text shadow-sm'
              : 'text-gray-500 hover:text-boon-text'
          }`}
        >
          Wellbeing
        </button>
      </div>

      {/* Stats Summary - Different for completed vs active */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isCompleted ? (
          // Leadership Profile stats (de-emphasize numeric deltas)
          <>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl text-center text-white">
              <p className="text-4xl font-black">
                {competencyScores.filter(c => c.score_label?.toLowerCase() === 'excelling' || c.score_label?.toLowerCase() === 'mastering').length}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
                Strengths
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-3xl font-black text-boon-text">{completedSessions.length}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sessions</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-3xl font-black text-purple-600">{competencyScores.length}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Competencies</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-3xl font-black text-green-600">100%</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Complete</p>
            </div>
          </>
        ) : (
          // Active program stats (show growth metrics)
          <>
            <div className="bg-gradient-to-br from-boon-blue to-boon-darkBlue p-6 rounded-2xl text-center text-white">
              <p className="text-4xl font-black">
                {avgCompetencyImprovement !== null ? (
                  <span>{avgCompetencyImprovement > 0 ? '+' : ''}{avgCompetencyImprovement}%</span>
                ) : (
                  <span>{competencyScores.length > 0 ? competencyScores.length : '—'}</span>
                )}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
                {avgCompetencyImprovement !== null ? 'Avg Growth' : 'Scores Recorded'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-3xl font-black text-boon-text">{completedSessions.length}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sessions</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-3xl font-black text-green-600">{completedActions.length}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Actions Done</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
              <p className="text-3xl font-black text-purple-600">
                {competencyScores.filter(c => c.score_label?.toLowerCase() === 'excelling').length}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Excelling</p>
            </div>
          </>
        )}
      </div>

      {/* Competencies Tab */}
      {activeTab === 'competencies' && isGrowOrExec && (
        <div className="space-y-8">
          {/* Competency Cards Grid */}
          <section>
            <h2 className="text-lg font-extrabold text-boon-text mb-4">Core Leadership Competencies</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {competencyData.map(comp => (
                <div
                  key={comp.key}
                  className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-boon-text text-sm leading-tight">{comp.label}</h3>
                    {comp.scoreLabel && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getScoreLabelColor(comp.scoreLabel)}`}>
                        {comp.scoreLabel}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Baseline */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 uppercase tracking-wide">Baseline</span>
                        <span className="font-bold text-gray-500">{comp.baseline || '—'}/5</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-300 rounded-full transition-all duration-500"
                          style={{ width: `${(comp.baseline || 0) * 20}%` }}
                        />
                      </div>
                    </div>

                    {/* Current */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 uppercase tracking-wide">Current</span>
                        <span className="font-bold text-purple-600">{comp.current || '—'}/5</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${(comp.current || 0) * 20}%` }}
                        />
                      </div>
                    </div>

                    {/* Improvement indicator */}
                    {comp.improvement !== null && (
                      <div className={`text-xs font-bold text-right ${comp.improvement >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {comp.improvement > 0 ? '↑' : comp.improvement < 0 ? '↓' : '→'} {Math.abs(comp.improvement)}%
                      </div>
                    )}

                    {/* Practice Bridge - show for lower scoring competencies */}
                    {(comp.scoreLabel?.toLowerCase() === 'applying' || comp.current <= 3) && comp.current > 0 && !isCompleted && (
                      <button
                        onClick={() => {
                          // Navigate to Practice with competency filter
                          // Using window location for now - ideally use React Router
                          window.dispatchEvent(new CustomEvent('navigate-to-practice', {
                            detail: { competency: comp.key }
                          }));
                        }}
                        className="mt-3 w-full py-2 text-xs font-bold text-boon-blue bg-boon-lightBlue/30 rounded-lg hover:bg-boon-lightBlue transition-all flex items-center justify-center gap-1"
                      >
                        Practice this
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Radar Chart */}
          {(baseline || competencyScores.length > 0) && (
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
              <h2 className="text-lg font-extrabold text-boon-text mb-6 text-center">
                Competency Profile
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="competency"
                      tick={{ fill: '#374151', fontSize: 9, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 5]}
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Radar
                      name="Baseline"
                      dataKey="baseline"
                      stroke="#9ca3af"
                      fill="#9ca3af"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Current"
                      dataKey="current"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 20 }}
                      formatter={(value) => (
                        <span className="text-sm font-semibold text-gray-600">{value}</span>
                      )}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                The purple area shows your current competency levels compared to your baseline (gray).
              </p>
            </section>
          )}

          {/* Bar Chart */}
          {competencyScores.length > 0 && (
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
              <h2 className="text-lg font-extrabold text-boon-text mb-6">Competency Rankings</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 5]} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 11 }} width={75} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* No Data State */}
          {!baseline && competencyScores.length === 0 && (
            <section className="bg-gradient-to-br from-boon-bg to-white p-8 rounded-[2rem] border border-gray-100 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-boon-text mb-2">Competency Data Coming Soon</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Your competency scores will appear here after your baseline assessment and coaching sessions.
              </p>
            </section>
          )}
        </div>
      )}

      {/* Wellbeing Tab */}
      {activeTab === 'wellbeing' && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-extrabold text-boon-text mb-4">Wellbeing Metrics</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {wellbeingData.map(metric => (
                <div
                  key={metric.key}
                  className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-boon-blue/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                  <h3 className="font-bold text-boon-text text-sm mb-3">{metric.label}</h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 uppercase tracking-wide">Score</span>
                        <span className="font-bold" style={{ color: metric.color }}>
                          {metric.current || '—'}/5
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(metric.current || 0) * 20}%`,
                            backgroundColor: metric.color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* No Baseline State */}
          {!baseline && (
            <section className="bg-gradient-to-br from-boon-bg to-white p-8 rounded-[2rem] border border-gray-100 text-center">
              <div className="w-16 h-16 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-boon-text mb-2">Complete Your Welcome Survey</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Take the welcome survey to establish your baseline wellbeing metrics and track your progress.
              </p>
            </section>
          )}
        </div>
      )}

      {/* Insights Section - Reframed for completed users */}
      <section className="bg-gradient-to-br from-purple-50 to-boon-lightBlue/20 p-8 rounded-[2rem] border border-purple-100">
        <h2 className="text-lg font-extrabold text-boon-text mb-6">Insights</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {(isCompleted ? [
            {
              icon: '📈',
              title: 'Growth',
              desc: competencyScores.length > 0
                ? `You grew in ${competenciesWithImprovement.filter(c => (c.improvement || 0) > 0).length} of ${COMPETENCIES.length} competencies.`
                : 'Your growth is reflected across your leadership profile.'
            },
            {
              icon: '⭐',
              title: 'Strongest Area',
              desc: competencyScores.length > 0
                ? (() => {
                    const highest = competencyData.filter(c => c.current > 0).sort((a, b) => b.current - a.current)[0];
                    return highest ? `${highest.label} is where you showed the most development.` : 'Strong growth across all areas!';
                  })()
                : 'Your strengths define your leadership profile.'
            },
            {
              icon: '🌱',
              title: 'Continued Growth',
              desc: competencyScores.length > 0
                ? (() => {
                    const lowest = competencyData.filter(c => c.current > 0).sort((a, b) => a.current - b.current)[0];
                    return lowest ? `If you want to keep building, ${lowest.label} could be a focus area.` : 'Continue practicing to maintain growth!';
                  })()
                : 'Your Practice Space is always available when challenges arise.'
            }
          ] : [
            {
              icon: '📈',
              title: 'Growth',
              desc: competencyScores.length > 0
                ? `You have ${competencyScores.filter(c => c.score >= 4).length} competencies at level 4 or above.`
                : 'Your growth insights will appear as you complete assessments.'
            },
            {
              icon: '🎯',
              title: 'Focus Area',
              desc: competencyScores.length > 0
                ? (() => {
                    const lowest = competencyData.filter(c => c.current > 0).sort((a, b) => a.current - b.current)[0];
                    return lowest ? `Consider focusing on ${lowest.label} for development.` : 'Great balance across competencies!';
                  })()
                : 'Focus areas will be identified after your baseline assessment.'
            },
            {
              icon: '💡',
              title: 'Next Step',
              desc: completedSessions.length === 0
                ? 'Book your first coaching session to start your journey.'
                : completedSessions.length < 3
                  ? 'Continue building momentum with regular coaching sessions.'
                  : 'Keep up the great work! Consider setting stretch goals.'
            }
          ]).map((card, i) => (
            <div
              key={i}
              className="p-6 bg-white/60 rounded-2xl border border-white hover:bg-white hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-4">{card.icon}</div>
              <h4 className="font-bold text-boon-text mb-2 uppercase tracking-widest text-xs">{card.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
