import { useState } from 'react';
import type { SurveyResponse, BaselineSurvey, CompetencyScore, ProgramType, Session, ActionItem, Checkpoint, WelcomeSurveyScale, CoachingWin } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState, isPreFirstSession, isPendingReflectionState } from '../lib/coachingState';
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
  coachingWins?: CoachingWin[];
  onAddWin?: (winText: string) => Promise<boolean>;
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
  checkpoints: _checkpoints = [],
  onStartCheckpoint,
  coachingWins = [],
  onAddWin
}: ProgressPageProps) {
  const [activeTab, setActiveTab] = useState<'competencies' | 'wellbeing'>('competencies');
  // Get latest checkpoint with wellbeing data (Session 6+)
  const latestWellbeingCheckpoint = _checkpoints
    .filter(cp => cp.wellbeing_satisfaction !== null || cp.wellbeing_productivity !== null || cp.wellbeing_balance !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
  const [showAddWinModal, setShowAddWinModal] = useState(false);
  const [newWinText, setNewWinText] = useState('');
  const [isSubmittingWin, setIsSubmittingWin] = useState(false);

  const handleAddWin = async () => {
    console.log('[Progress] handleAddWin called', { newWinText: newWinText.trim(), hasOnAddWin: !!onAddWin });
    if (!newWinText.trim() || !onAddWin) {
      console.log('[Progress] handleAddWin early return - text empty or no onAddWin');
      return;
    }
    setIsSubmittingWin(true);
    try {
      const success = await onAddWin(newWinText.trim());
      console.log('[Progress] onAddWin result:', success);
      if (success) {
        setNewWinText('');
        setShowAddWinModal(false);
      }
    } catch (err) {
      console.error('[Progress] handleAddWin error:', err);
    } finally {
      setIsSubmittingWin(false);
    }
  };

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const completedActions = actionItems.filter(a => a.status === 'completed');

  const isGrowOrExec = programType === 'GROW' || programType === 'EXEC';
  // SCALE detection: either explicit programType OR has welcomeSurveyScale data
  const isScale = programType === 'SCALE' || (programType === null && !!welcomeSurveyScale);
  const isCompleted = isAlumniState(coachingState.state);
  const isPreFirst = isPreFirstSession(coachingState.state);
  const isPendingReflection = isPendingReflectionState(coachingState.state);

  // Get coach name for pre-first-session messaging
  // Try upcoming session first, then any session with a coach name
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const anySessionWithCoach = sessions.find(s => s.coach_name);
  const coachName = upcomingSession?.coach_name || anySessionWithCoach?.coach_name;
  const coachFirstName = coachName?.split(' ')[0] || 'your coach';

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

      // Coach info for timeline - use full name from any session
      const coachFullName = coachName || 'Your Coach';

      return (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <header className="text-center">
            <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Your Coaching Journey</h1>
            <p className="text-gray-500 mt-2 font-medium">Here's what you're working toward</p>
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
                  <p className="text-sm text-gray-500">{coachFullName}</p>
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

          {/* Your Wins */}
          {coachingWins.length > 0 ? (
            <section className="rounded-[2rem] p-8 border border-orange-200" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FEF9EE 100%)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-lg font-extrabold text-boon-text">Your Wins</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200">
                    {coachingWins.length} breakthrough{coachingWins.length !== 1 ? 's' : ''}
                  </span>
                  {onAddWin && (
                    <button
                      onClick={() => setShowAddWinModal(true)}
                      className="text-sm font-bold text-white bg-orange-400 hover:bg-orange-500 px-4 py-1.5 rounded-full transition-colors"
                    >
                      + Add a win
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {coachingWins.map((win) => (
                  <div key={win.id} className="bg-amber-50 rounded-xl p-5 border-l-4 border-orange-400">
                    <p className="text-gray-800 italic text-lg leading-relaxed">"{win.win_text}"</p>
                    <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                      {win.session_number && (
                        <span className="bg-white px-3 py-1 rounded-full border border-gray-200">
                          After Session {win.session_number}
                        </span>
                      )}
                      <span>
                        {new Date(win.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-[2rem] p-8 border-2 border-dashed border-gray-200 text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h2 className="text-lg font-extrabold text-boon-text mb-2">Your Wins</h2>
              <p className="text-gray-500 max-w-md mx-auto text-sm mb-4">
                This is where you'll track breakthroughs and accomplishments as you progress through coaching.
              </p>
              {onAddWin && (
                <button
                  onClick={() => setShowAddWinModal(true)}
                  className="text-sm font-bold text-white bg-orange-400 hover:bg-orange-500 px-5 py-2 rounded-full transition-colors"
                >
                  + Add your first win
                </button>
              )}
            </section>
          )}

          {/* Add Win Modal */}
          {showAddWinModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🏆</span>
                  <h3 className="text-lg font-extrabold text-boon-text">Add a Win</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  What breakthrough or accomplishment would you like to celebrate?
                </p>
                <textarea
                  value={newWinText}
                  onChange={(e) => setNewWinText(e.target.value)}
                  placeholder="e.g., Had a difficult conversation that went well, got positive feedback, set a boundary..."
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  rows={4}
                  maxLength={500}
                  autoFocus
                />
                <div className="flex justify-between items-center mt-2 mb-4">
                  <span className="text-xs text-gray-400">{newWinText.length}/500</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddWinModal(false);
                      setNewWinText('');
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddWin}
                    disabled={!newWinText.trim() || isSubmittingWin}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-400 hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    {isSubmittingWin ? 'Saving...' : 'Save Win'}
                  </button>
                </div>
              </div>
            </div>
          )}

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

    // Build baseline competency data for pre-first-session display
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

    // Check if we have any baseline competency data
    const hasBaselineCompetencies = baselineCompetencyData.some(c => c.baseline > 0);

    // GROW/EXEC pre-first-session: Show baseline competencies if available
    return (
      <div className="space-y-8 animate-fade-in">
        <header className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Progress</h1>
          <p className="text-gray-500 mt-2 font-medium">Track your leadership growth over time.</p>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-50 to-boon-lightBlue/20 rounded-[2.5rem] p-10 md:p-14 border border-purple-100 text-center">
          <div className="w-20 h-20 mx-auto mb-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-boon-text mb-4">
            Your Leadership Profile
          </h2>
          <p className="text-gray-600 text-lg max-w-lg mx-auto leading-relaxed">
            {hasBaselineCompetencies
              ? `Here's where you're starting. As you work with ${coachFirstName}, you'll see your growth across these competencies.`
              : `Your leadership profile will emerge as you work with ${coachFirstName}.`
            }
          </p>
        </section>

        {/* Baseline Competencies Grid */}
        {hasBaselineCompetencies && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-extrabold text-boon-text">Your Starting Point</h2>
              <span className="text-xs text-gray-400">From your welcome survey</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Scores reflect where you are today — from Learning (1) to Mastering (5). Most people start at 2-3.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {baselineCompetencyData.filter(c => c.baseline > 0).map(comp => (
                <div
                  key={comp.key}
                  className="bg-white p-5 rounded-2xl border border-gray-100"
                >
                  <h3 className="font-bold text-boon-text text-sm leading-tight mb-4">{comp.label}</h3>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase tracking-wide">Baseline</span>
                      <span className="font-bold text-purple-600">{comp.baseline}/5</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full transition-all duration-500"
                        style={{ width: `${(comp.baseline) * 20}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Wellbeing Baseline */}
        {baseline && (baseline.satisfaction || baseline.productivity || baseline.work_life_balance || baseline.motivation) && (
          <section className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-600">Wellbeing Baseline</h3>
              <span className="text-[10px] text-gray-400">From welcome survey</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'satisfaction', label: 'Satisfaction', value: baseline.satisfaction, benchmark: BOON_BENCHMARKS.satisfaction },
                { key: 'productivity', label: 'Productivity', value: baseline.productivity, benchmark: BOON_BENCHMARKS.productivity },
                { key: 'work_life_balance', label: 'Balance', value: baseline.work_life_balance, benchmark: BOON_BENCHMARKS.work_life_balance },
                { key: 'motivation', label: 'Motivation', value: baseline.motivation, benchmark: null },
              ].map((metric) => {
                const vsBenchmark = metric.benchmark && metric.value
                  ? Math.round(((metric.value - metric.benchmark) / metric.benchmark) * 100)
                  : null;
                return (
                  <div key={metric.key} className="text-center">
                    <p className="text-xl font-bold text-boon-text">
                      {metric.value || '—'}<span className="text-sm text-gray-400">/10</span>
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metric.label}</p>
                    {vsBenchmark !== null && (
                      <p className={`text-xs font-bold mt-1 ${vsBenchmark >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {vsBenchmark >= 0 ? '+' : ''}{vsBenchmark}% vs avg
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

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

  // SCALE: Redesigned view focused on goals, journey, and wins
  if (isScale) {
    // Calculate time in program
    const firstSession = completedSessions.length > 0 ? completedSessions[completedSessions.length - 1] : null;
    const monthsInProgram = firstSession
      ? Math.max(1, Math.floor((Date.now() - new Date(firstSession.session_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;

    // Get coaching goals from welcomeSurveyScale - priority: additional_topics (their own words) > selected focus areas
    const focusLabels: Record<string, string> = {
      'focus_leadership_development': 'Leadership Development',
      'focus_work_life_balance': 'Work/Life Balance',
      'focus_work_performance': 'Work Performance',
      'focus_work_relationships': 'Work Relationships',
      'focus_work_stress': 'Managing Work Stress',
      'focus_new_environment': 'Navigating a New Environment',
      'focus_adapting_to_change': 'Adapting to Change',
      'focus_dealing_with_uncertainty': 'Dealing with Uncertainty',
      'focus_bouncing_back': 'Building Resilience',
      'focus_relationship_with_self': 'Relationship with Self',
      'focus_inner_confidence': 'Inner Confidence',
      'focus_positive_habits': 'Building Positive Habits',
      'focus_personal_accountability': 'Personal Accountability',
      'focus_professional_development': 'Professional Growth',
      'focus_persevering_through_change': 'Persevering Through Change',
      'focus_relationships_self_others': 'Relationships with Self & Others',
      'focus_coping_stress_anxiety': 'Coping with Stress & Anxiety',
      'focus_realizing_potential': 'Realizing Your Potential',
    };

    // Get goal display - prefer their own words, fall back to selected focus areas
    const getGoalDisplay = () => {
      if (welcomeSurveyScale?.additional_topics?.trim()) {
        return { type: 'text' as const, content: welcomeSurveyScale.additional_topics };
      }
      if (welcomeSurveyScale?.coaching_goals?.trim()) {
        return { type: 'text' as const, content: welcomeSurveyScale.coaching_goals };
      }
      // Get selected focus areas
      const selectedFocusAreas = Object.entries(focusLabels)
        .filter(([field]) => welcomeSurveyScale?.[field as keyof WelcomeSurveyScale])
        .map(([, label]) => label);
      if (selectedFocusAreas.length > 0) {
        return { type: 'list' as const, content: selectedFocusAreas };
      }
      return null;
    };

    const goalDisplay = getGoalDisplay();
    const goalDate = welcomeSurveyScale?.created_at
      ? new Date(welcomeSurveyScale.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : null;

    // Calculate wellbeing metrics vs benchmark
    const calculateVsBenchmark = (value: number | null | undefined, benchmark: number) => {
      if (!value) return null;
      const diff = ((value - benchmark) / benchmark) * 100;
      return Math.round(diff);
    };

    const wellbeingMetrics = [
      {
        key: 'satisfaction',
        label: 'Satisfaction',
        value: welcomeSurveyScale?.satisfaction,
        benchmark: BOON_BENCHMARKS.satisfaction,
      },
      {
        key: 'productivity',
        label: 'Productivity',
        value: welcomeSurveyScale?.productivity,
        benchmark: BOON_BENCHMARKS.productivity,
      },
      {
        key: 'work_life_balance',
        label: 'Work/Life Balance',
        value: welcomeSurveyScale?.work_life_balance,
        benchmark: BOON_BENCHMARKS.work_life_balance,
      },
    ];

    // Check-in schedule: 1, 3, 6, 12, 18, 24, etc.
    const checkInSchedule = [1, 3, 6, 12, 18, 24, 30, 36];
    const nextCheckInSession = checkInSchedule.find(n => n > completedSessions.length) || (completedSessions.length + 6);

    // Build journey timeline steps
    const journeySteps: Array<{ key: string; label: string; detail: string; completed: boolean; isCurrent?: boolean }> = [
      {
        key: 'welcome',
        label: 'Welcome Survey',
        detail: 'Shared your goals and baseline',
        completed: true
      },
      {
        key: 'matched',
        label: 'Matched with Coach',
        detail: coachName || 'Your Coach',
        completed: true
      },
    ];

    // Add completed sessions
    completedSessions.slice().reverse().forEach((session, idx) => {
      const sessionNum = idx + 1;
      journeySteps.push({
        key: `session-${sessionNum}`,
        label: `Session ${sessionNum}`,
        detail: `Completed ${new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        completed: true,
      });
    });

    // Add next step (upcoming session or schedule prompt)
    const nextSessionNum = completedSessions.length + 1;
    if (upcomingSession) {
      journeySteps.push({
        key: `session-${nextSessionNum}`,
        label: `Session ${nextSessionNum}`,
        detail: `${new Date(upcomingSession.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${new Date(upcomingSession.session_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        completed: false,
        isCurrent: !coachingState.scaleCheckpointStatus.isCheckpointDue,
      });
    } else {
      journeySteps.push({
        key: `session-${nextSessionNum}`,
        label: `Session ${nextSessionNum}`,
        detail: 'Schedule your next session',
        completed: false,
        isCurrent: !coachingState.scaleCheckpointStatus.isCheckpointDue,
      });
    }

    // Add future milestones
    journeySteps.push(
      { key: 'ongoing', label: 'Ongoing Coaching', detail: 'Continue your growth', completed: false },
      { key: 'wins', label: 'Wins & Breakthroughs', detail: 'Celebrate your progress', completed: false }
    );

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Your Coaching Journey</h1>
          <p className="text-gray-500 mt-2 font-medium">Here's what you're working toward</p>
        </header>

        {/* Check-in Due Banner - Priority CTA */}
        {coachingState.scaleCheckpointStatus.isCheckpointDue && onStartCheckpoint && (
          <section className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-[2rem] p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-boon-text">Complete your check-in</h2>
                  <p className="text-sm text-gray-600">Reflect on your progress and set your focus for upcoming sessions.</p>
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

        {/* Your Goal - Hero Card */}
        <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-8 text-white">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">What You Want to Work On</p>
            {goalDate && (
              <span className="text-[10px] text-gray-500">{goalDate}</span>
            )}
          </div>
          <div className="mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          {goalDisplay ? (
            goalDisplay.type === 'text' ? (
              <>
                <p className="text-xl font-bold leading-relaxed mb-4">
                  "{goalDisplay.content}"
                </p>
                <p className="text-gray-400 text-sm">
                  Refine this with your coach anytime
                </p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(goalDisplay.content as string[]).map((area, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-medium">
                      {area}
                    </span>
                  ))}
                </div>
                <p className="text-gray-400 text-sm">
                  Refine these focus areas with your coach anytime
                </p>
              </>
            )
          ) : (
            <p className="text-gray-400">
              Your goals will be refined with your coach
            </p>
          )}
        </section>

        {/* Your Journey - Timeline */}
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100">
          <h2 className="text-lg font-extrabold text-boon-text mb-6">Your Journey</h2>
          <div className="space-y-0">
            {journeySteps.map((step, idx) => {
              const isLast = idx === journeySteps.length - 1;
              const isCurrent = step.isCurrent;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-boon-blue ring-4 ring-boon-blue/20'
                        : 'bg-gray-200'
                    }`}>
                      {step.completed ? (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isCurrent ? (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-12 ${step.completed ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className={`font-bold ${isCurrent ? 'text-boon-blue' : step.completed ? 'text-boon-text' : 'text-gray-400'}`}>
                      {step.label}
                      {isCurrent && <span className="ml-2 text-xs font-normal">(You're here)</span>}
                    </p>
                    <p className={`text-sm ${step.completed || isCurrent ? 'text-gray-500' : 'text-gray-400'}`}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Your Wins */}
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-boon-text">Your Wins</h2>
            <button
              onClick={() => setShowAddWinModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-boon-blue hover:bg-boon-lightBlue/30 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add a win
            </button>
          </div>

          {coachingWins.length > 0 ? (
            <div className="space-y-4">
              {coachingWins.map((win) => (
                <div key={win.id} className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/30 rounded-2xl border border-amber-100/50">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🏆</span>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed">"{win.win_text}"</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {win.session_number && `Session ${win.session_number} · `}
                        {new Date(win.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <p className="text-gray-500 mb-2">This is where you'll track breakthroughs and accomplishments</p>
              <p className="text-sm text-gray-400">Celebrate your wins—big and small</p>
            </div>
          )}
        </section>

        {/* Session Stats - Compact */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
            <p className="text-2xl font-black text-boon-text">{completedSessions.length}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sessions completed</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
            <p className="text-2xl font-black text-boon-text">{monthsInProgram > 0 ? monthsInProgram : '—'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Months in coaching</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center">
            <p className="text-2xl font-black text-gray-500">Session {nextCheckInSession}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Next check-in</p>
          </div>
        </div>

        {/* Wellbeing Progress - Baseline vs Current */}
        {welcomeSurveyScale && (welcomeSurveyScale.satisfaction || welcomeSurveyScale.productivity || welcomeSurveyScale.work_life_balance) && (
          <section className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-600">
                {latestWellbeingCheckpoint ? 'Your Wellbeing Progress' : 'Your Starting Point'}
              </h3>
              <span className="text-[10px] text-gray-400">
                {latestWellbeingCheckpoint
                  ? `Updated Session ${latestWellbeingCheckpoint.checkpoint_number}`
                  : 'From welcome survey · Check-in every 6 sessions'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {wellbeingMetrics.map((metric) => {
                const baselineValue = metric.value;
                const currentValue = latestWellbeingCheckpoint
                  ? (metric.key === 'satisfaction' ? latestWellbeingCheckpoint.wellbeing_satisfaction
                    : metric.key === 'productivity' ? latestWellbeingCheckpoint.wellbeing_productivity
                    : latestWellbeingCheckpoint.wellbeing_balance)
                  : null;
                const hasUpdate = currentValue !== null;
                const improvement = hasUpdate && baselineValue ? currentValue - baselineValue : null;

                return (
                  <div key={metric.key} className="text-center">
                    {hasUpdate ? (
                      <>
                        {/* Current score - prominent */}
                        <p className="text-xl font-bold text-boon-text">
                          {currentValue}<span className="text-sm text-gray-400">/10</span>
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metric.label}</p>
                        {/* Show improvement from baseline */}
                        {improvement !== null && improvement !== 0 && (
                          <p className={`text-xs font-bold mt-1 ${improvement > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                            {improvement > 0 ? '↑' : '↓'} {Math.abs(improvement)} from baseline
                          </p>
                        )}
                        {improvement === 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Same as baseline ({baselineValue})
                          </p>
                        )}
                        {/* Baseline reference */}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Baseline: {baselineValue}/10
                        </p>
                      </>
                    ) : (
                      <>
                        {/* Only baseline - original display */}
                        <p className="text-xl font-bold text-boon-text">
                          {baselineValue || '—'}<span className="text-sm text-gray-400">/10</span>
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metric.label}</p>
                        {(() => {
                          const vsBenchmark = calculateVsBenchmark(baselineValue, metric.benchmark);
                          return vsBenchmark !== null ? (
                            <p className={`text-xs mt-1 ${vsBenchmark >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                              {vsBenchmark >= 0 ? '+' : ''}{vsBenchmark}% vs avg
                            </p>
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Add Win Modal */}
        {showAddWinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-boon-text mb-4">Add a Win</h3>
              <p className="text-sm text-gray-500 mb-4">
                Capture a breakthrough, accomplishment, or moment you're proud of.
              </p>
              <textarea
                value={newWinText}
                onChange={(e) => setNewWinText(e.target.value)}
                placeholder="What's a win you want to celebrate?"
                className="w-full p-4 border border-gray-200 rounded-xl focus:border-boon-blue focus:ring-0 focus:outline-none resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right mt-1">{newWinText.length}/500</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowAddWinModal(false);
                    setNewWinText('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWin}
                  disabled={!newWinText.trim() || isSubmittingWin}
                  className="flex-1 px-4 py-3 bg-boon-blue text-white font-bold rounded-xl hover:bg-boon-darkBlue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingWin ? 'Saving...' : 'Save Win'}
                </button>
              </div>
            </div>
          </div>
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

  // Check if there are actual "current" competency scores (from midpoint/end assessment)
  // If not, we should only show baseline data and not misleading "Current" scores
  const hasActualCurrentScores = competencyScores.length > 0;

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

                    {/* Current - only show if we have actual assessment data */}
                    {hasActualCurrentScores ? (
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
                    ) : (
                      /* Show "After Midpoint" placeholder when no current data */
                      isGrowOrExec && !isCompleted && (
                        <p className="text-xs text-gray-400 italic">
                          Updated after midpoint assessment
                        </p>
                      )
                    )}

                    {/* Improvement indicator - only show if we have actual current scores */}
                    {hasActualCurrentScores && comp.improvement !== null && (
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
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    {/* Only show Current layer if we have actual assessment data */}
                    {hasActualCurrentScores && (
                      <Radar
                        name="Current"
                        dataKey="current"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                    )}
                    {hasActualCurrentScores && (
                      <Legend
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => (
                          <span className="text-sm font-semibold text-gray-600">{value}</span>
                        )}
                      />
                    )}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                {hasActualCurrentScores
                  ? 'The purple area shows your current competency levels compared to your baseline (gray).'
                  : 'Your baseline competency profile. Current levels will appear after your midpoint assessment.'}
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

      {/* Session History - Show for GROW/Exec with completed sessions */}
      {isGrowOrExec && completedSessions.length > 0 && !isCompleted && (
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
          <h2 className="text-lg font-extrabold text-boon-text mb-6">Session History</h2>
          <div className="space-y-4">
            {completedSessions.slice().reverse().map((session, idx) => {
              const sessionNum = idx + 1;
              const sessionDate = new Date(session.session_date);
              return (
                <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-boon-text">Session {sessionNum}</p>
                    <p className="text-sm text-gray-500">
                      {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {session.coach_name && ` with ${session.coach_name.split(' ')[0]}`}
                    </p>
                  </div>
                  {session.plan && (
                    <div className="hidden sm:block max-w-[200px]">
                      <p className="text-xs text-gray-400 italic truncate" title={session.plan}>
                        {session.plan}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Upcoming session indicator */}
            {sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled') && (
              <div className="flex items-center gap-4 p-4 bg-boon-lightBlue/20 rounded-xl border-2 border-dashed border-boon-blue/30">
                <div className="w-10 h-10 bg-boon-blue ring-4 ring-boon-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-boon-text">Session {completedSessions.length + 1}</p>
                  <p className="text-sm text-boon-blue">
                    {new Date(sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled')!.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    <span className="text-gray-400 ml-1">(upcoming)</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Your Wins - Show for GROW/Exec */}
      {isGrowOrExec && !isCompleted && (
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-boon-text">Your Wins</h2>
            {onAddWin && (
              <button
                onClick={() => setShowAddWinModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-boon-blue hover:bg-boon-lightBlue/30 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add a win
              </button>
            )}
          </div>

          {coachingWins.length > 0 ? (
            <div className="space-y-4">
              {coachingWins.map((win) => (
                <div key={win.id} className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/30 rounded-2xl border border-amber-100/50">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🏆</span>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed">"{win.win_text}"</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {win.session_number && `Session ${win.session_number} · `}
                        {new Date(win.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <p className="text-gray-600 font-medium mb-2">No wins yet—celebrate your first!</p>
              <p className="text-sm text-gray-400">Track breakthroughs and accomplishments here.</p>
            </div>
          )}
        </section>
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
                : isGrowOrExec && completedSessions.length > 0
                  ? `${completedSessions.length} session${completedSessions.length > 1 ? 's' : ''} completed. Updated scores after your midpoint check-in.`
                  : baseline
                    ? 'Building on your baseline. Growth scores after midpoint assessment.'
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
                : isGrowOrExec && baseline
                  ? (() => {
                      // Find lowest baseline scores as focus areas
                      const lowestBaseline = competencyData.filter(c => c.baseline > 0).sort((a, b) => a.baseline - b.baseline)[0];
                      return lowestBaseline
                        ? `Working on ${lowestBaseline.label} based on your baseline.`
                        : 'Focus areas set during your coaching sessions.';
                    })()
                  : 'Focus areas will be identified after your baseline assessment.'
            },
            {
              icon: '💡',
              title: 'Next Step',
              desc: completedSessions.length === 0
                ? 'Book your first coaching session to start your journey.'
                : isGrowOrExec && completedSessions.length > 0
                  ? 'Continue building momentum with regular coaching sessions.'
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
