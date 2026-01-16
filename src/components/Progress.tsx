import { useState } from 'react';
import type { SurveyResponse, BaselineSurvey, CompetencyScore, ProgramType, Session, ActionItem } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState, isPreFirstSession } from '../lib/coachingState';
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
  competencyScores: CompetencyScore[];
  sessions: Session[];
  actionItems: ActionItem[];
  programType: ProgramType | null;
  coachingState: CoachingStateData;
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

export default function ProgressPage({
  progress,
  baseline,
  competencyScores,
  sessions,
  actionItems,
  programType,
  coachingState
}: ProgressPageProps) {
  const [activeTab, setActiveTab] = useState<'competencies' | 'wellbeing'>('competencies');

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const completedActions = actionItems.filter(a => a.status === 'completed');

  const isGrowOrExec = programType === 'GROW' || programType === 'EXEC';
  const isCompleted = isAlumniState(coachingState.state);
  const isPreFirst = isPreFirstSession(coachingState.state);

  // Get coach name for pre-first-session messaging
  const upcomingSession = sessions.find(s => s.status === 'Upcoming');
  const coachFirstName = upcomingSession?.coach_name?.split(' ')[0] || 'your coach';

  // Pre-first-session: Show anticipation-focused empty state
  if (isPreFirst) {
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
