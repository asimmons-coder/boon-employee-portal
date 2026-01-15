import { useState } from 'react';
import type { SurveyResponse, BaselineSurvey, GrowBaselineSurvey, Session, ActionItem } from '../lib/types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface ProgressPageProps {
  progress: SurveyResponse[];
  baseline: BaselineSurvey | GrowBaselineSurvey | null;
  sessions: Session[];
  actionItems: ActionItem[];
  programType?: string;
}

// Helper to check if baseline is Grow type (has core competencies)
function isGrowBaseline(baseline: BaselineSurvey | GrowBaselineSurvey | null): baseline is GrowBaselineSurvey {
  return baseline !== null && 'strategic_thinking' in baseline;
}

// Calculate improvement percentage
function calculateImprovement(baseline: number | null, current: number | null): number | null {
  if (baseline === null || current === null || baseline === 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

// Get improvement color class
function getImprovementColor(improvement: number | null): string {
  if (improvement === null) return 'text-gray-400';
  if (improvement > 10) return 'text-green-600';
  if (improvement > 0) return 'text-green-500';
  if (improvement === 0) return 'text-gray-500';
  return 'text-red-500';
}

// Get improvement icon
function getImprovementIcon(improvement: number | null): string {
  if (improvement === null) return '—';
  if (improvement > 0) return '↑';
  if (improvement === 0) return '→';
  return '↓';
}

export default function ProgressPage({
  progress,
  baseline,
  sessions,
  actionItems,
  programType = 'scale'
}: ProgressPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'competencies'>('overview');

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const completedActions = actionItems.filter(a => a.status === 'completed');

  // Get the latest survey response for "current" state
  const latestSurvey = progress.length > 0
    ? progress.reduce((latest, current) =>
        new Date(current.date) > new Date(latest.date) ? current : latest
      )
    : null;

  // Core metrics for all clients (Scale + Grow)
  const coreMetrics = [
    {
      key: 'satisfaction',
      label: 'Work Satisfaction',
      baselineKey: 'satisfaction' as const,
      currentKey: 'wellbeing_satisfaction' as const,
      icon: '😊',
      color: '#4A90A4'
    },
    {
      key: 'productivity',
      label: 'Productivity',
      baselineKey: 'productivity' as const,
      currentKey: 'wellbeing_productivity' as const,
      icon: '⚡',
      color: '#10B981'
    },
    {
      key: 'balance',
      label: 'Work-Life Balance',
      baselineKey: 'work_life_balance' as const,
      currentKey: 'wellbeing_balance' as const,
      icon: '⚖️',
      color: '#8B5CF6'
    },
    {
      key: 'resilience',
      label: 'Resilience',
      baselineKey: 'resilience' as const,
      currentKey: 'wellbeing_resilience' as const,
      icon: '💪',
      color: '#F59E0B'
    },
  ];

  // Core competencies for Grow clients only
  const competencyMetrics = [
    { key: 'strategic_thinking', label: 'Strategic Thinking', icon: '🎯' },
    { key: 'decision_making', label: 'Decision Making', icon: '⚖️' },
    { key: 'people_management', label: 'People Management', icon: '👥' },
    { key: 'influence', label: 'Influence', icon: '🌟' },
    { key: 'emotional_intelligence', label: 'Emotional Intelligence', icon: '💡' },
    { key: 'adaptability', label: 'Adaptability', icon: '🔄' },
  ];

  // Prepare radar chart data for core metrics
  const radarData = coreMetrics.map(metric => ({
    metric: metric.label,
    baseline: baseline?.[metric.baselineKey] ?? 0,
    current: latestSurvey?.[metric.currentKey] ?? baseline?.[metric.baselineKey] ?? 0,
    fullMark: 5,
  }));

  // Prepare competency radar data for Grow clients
  const competencyRadarData = isGrowBaseline(baseline)
    ? competencyMetrics.map(metric => ({
        metric: metric.label,
        baseline: (baseline as GrowBaselineSurvey)?.[metric.key as keyof GrowBaselineSurvey] as number ?? 0,
        current: latestSurvey?.[metric.key as keyof SurveyResponse] as number ??
                 (baseline as GrowBaselineSurvey)?.[metric.key as keyof GrowBaselineSurvey] as number ?? 0,
        fullMark: 5,
      }))
    : [];

  // Prepare timeline data for line chart
  const timelineData = progress.map(survey => ({
    date: new Date(survey.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    satisfaction: survey.wellbeing_satisfaction,
    productivity: survey.wellbeing_productivity,
    balance: survey.wellbeing_balance,
    resilience: survey.wellbeing_resilience,
  }));

  // Add baseline as first point if we have it
  if (baseline && timelineData.length > 0) {
    timelineData.unshift({
      date: 'Baseline',
      satisfaction: baseline.satisfaction,
      productivity: baseline.productivity,
      balance: baseline.work_life_balance,
      resilience: baseline.resilience,
    });
  }

  // Calculate overall improvement
  const overallImprovement = coreMetrics.reduce((acc, metric) => {
    const improvement = calculateImprovement(
      baseline?.[metric.baselineKey] ?? null,
      latestSurvey?.[metric.currentKey] ?? null
    );
    if (improvement !== null) {
      acc.total += improvement;
      acc.count++;
    }
    return acc;
  }, { total: 0, count: 0 });

  const avgImprovement = overallImprovement.count > 0
    ? Math.round(overallImprovement.total / overallImprovement.count)
    : null;

  const isGrow = programType?.toLowerCase().includes('grow') || isGrowBaseline(baseline);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Progress</h1>
        <p className="text-gray-500 mt-2 font-medium">
          Track your growth from where you started to where you are today.
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'overview'
              ? 'bg-white text-boon-text shadow-sm'
              : 'text-gray-500 hover:text-boon-text'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'timeline'
              ? 'bg-white text-boon-text shadow-sm'
              : 'text-gray-500 hover:text-boon-text'
          }`}
        >
          Timeline
        </button>
        {isGrow && (
          <button
            onClick={() => setActiveTab('competencies')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'competencies'
                ? 'bg-white text-boon-text shadow-sm'
                : 'text-gray-500 hover:text-boon-text'
            }`}
          >
            Competencies
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-boon-blue to-boon-darkBlue p-6 rounded-2xl text-center text-white">
          <p className="text-4xl font-black">
            {avgImprovement !== null ? (
              <span className="flex items-center justify-center gap-1">
                {avgImprovement > 0 ? '+' : ''}{avgImprovement}%
              </span>
            ) : '—'}
          </p>
          <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Avg Improvement</p>
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
          <p className="text-3xl font-black text-purple-600">{progress.length}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Check-ins</p>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Core Metrics Cards */}
          <section>
            <h2 className="text-lg font-extrabold text-boon-text mb-4">Core Wellbeing Metrics</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {coreMetrics.map(metric => {
                const baselineValue = baseline?.[metric.baselineKey] ?? null;
                const currentValue = latestSurvey?.[metric.currentKey] ?? baselineValue;
                const improvement = calculateImprovement(baselineValue, currentValue);

                return (
                  <div
                    key={metric.key}
                    className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-boon-blue/20 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{metric.icon}</span>
                      <span className={`font-bold text-sm ${getImprovementColor(improvement)}`}>
                        {getImprovementIcon(improvement)} {improvement !== null ? `${Math.abs(improvement)}%` : '—'}
                      </span>
                    </div>
                    <h3 className="font-bold text-boon-text text-sm mb-3">{metric.label}</h3>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Baseline</p>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-300 rounded-full transition-all duration-500"
                            style={{ width: `${(baselineValue ?? 0) * 20}%` }}
                          />
                        </div>
                        <p className="text-sm font-bold text-gray-500 mt-1">{baselineValue ?? '—'}/5</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current</p>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(currentValue ?? 0) * 20}%`,
                              backgroundColor: metric.color
                            }}
                          />
                        </div>
                        <p className="text-sm font-bold mt-1" style={{ color: metric.color }}>
                          {currentValue ?? '—'}/5
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Radar Chart */}
          {baseline && (
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
              <h2 className="text-lg font-extrabold text-boon-text mb-6 text-center">
                Your Growth Snapshot
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }}
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
                      stroke="#4A90A4"
                      fill="#4A90A4"
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
                The larger the blue area, the more you've grown since your baseline assessment.
              </p>
            </section>
          )}

          {/* No Baseline State */}
          {!baseline && (
            <section className="bg-gradient-to-br from-boon-bg to-white p-8 rounded-[2rem] border border-gray-100 text-center">
              <div className="w-16 h-16 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-boon-text mb-2">Complete Your Welcome Survey</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Take the welcome survey to establish your baseline metrics.
                This will help you track your progress over time.
              </p>
            </section>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-8">
          {timelineData.length > 1 ? (
            <>
              {/* Progress Over Time Chart */}
              <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
                <h2 className="text-lg font-extrabold text-boon-text mb-6">Progress Over Time</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSatisfaction" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4A90A4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4A90A4" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorResilience" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        domain={[0, 5]}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          padding: '12px 16px'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 20 }}
                        formatter={(value) => (
                          <span className="text-sm font-medium text-gray-600 capitalize">{value}</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="satisfaction"
                        stroke="#4A90A4"
                        fill="url(#colorSatisfaction)"
                        strokeWidth={2}
                        name="Satisfaction"
                      />
                      <Area
                        type="monotone"
                        dataKey="productivity"
                        stroke="#10B981"
                        fill="url(#colorProductivity)"
                        strokeWidth={2}
                        name="Productivity"
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#8B5CF6"
                        fill="url(#colorBalance)"
                        strokeWidth={2}
                        name="Balance"
                      />
                      <Area
                        type="monotone"
                        dataKey="resilience"
                        stroke="#F59E0B"
                        fill="url(#colorResilience)"
                        strokeWidth={2}
                        name="Resilience"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Session Timeline */}
              <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
                <h2 className="text-lg font-extrabold text-boon-text mb-6">Session Journey</h2>
                <div className="space-y-4">
                  {completedSessions.slice(0, 8).map((session, idx) => {
                    const theme = session.mental_well_being ? 'Mental Well-being' :
                                  session.communication_skills ? 'Communication' :
                                  session.leadership_management_skills ? 'Leadership' : 'General Growth';
                    const themeColor = session.mental_well_being ? 'bg-purple-100 text-purple-700' :
                                       session.communication_skills ? 'bg-green-100 text-green-700' :
                                       session.leadership_management_skills ? 'bg-blue-100 text-blue-700' :
                                       'bg-gray-100 text-gray-700';

                    return (
                      <div key={session.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-boon-blue" />
                          {idx < completedSessions.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(session.session_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="font-semibold text-boon-text mt-1">Session with {session.coach_name}</p>
                          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${themeColor}`}>
                            {theme}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section className="bg-gradient-to-br from-boon-bg to-white p-8 rounded-[2rem] border border-gray-100 text-center">
              <div className="w-16 h-16 bg-boon-lightBlue rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-boon-text mb-2">Timeline Coming Soon</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                After completing more check-ins and sessions, you'll see your progress charted over time here.
              </p>
            </section>
          )}
        </div>
      )}

      {/* Competencies Tab (Grow clients only) */}
      {activeTab === 'competencies' && isGrow && (
        <div className="space-y-8">
          {/* Competency Cards */}
          <section>
            <h2 className="text-lg font-extrabold text-boon-text mb-4">Core Leadership Competencies</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {competencyMetrics.map(metric => {
                const baselineValue = isGrowBaseline(baseline)
                  ? (baseline as GrowBaselineSurvey)?.[metric.key as keyof GrowBaselineSurvey] as number ?? null
                  : null;
                const currentValue = latestSurvey?.[metric.key as keyof SurveyResponse] as number ?? baselineValue;
                const improvement = calculateImprovement(baselineValue, currentValue);

                return (
                  <div
                    key={metric.key}
                    className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{metric.icon}</span>
                      <span className={`font-bold text-sm ${getImprovementColor(improvement)}`}>
                        {getImprovementIcon(improvement)} {improvement !== null ? `${Math.abs(improvement)}%` : '—'}
                      </span>
                    </div>
                    <h3 className="font-bold text-boon-text mb-4">{metric.label}</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400 uppercase tracking-wide">Baseline</span>
                          <span className="font-bold text-gray-500">{baselineValue ?? '—'}/5</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-300 rounded-full transition-all duration-500"
                            style={{ width: `${(baselineValue ?? 0) * 20}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400 uppercase tracking-wide">Current</span>
                          <span className="font-bold text-purple-600">{currentValue ?? '—'}/5</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${(currentValue ?? 0) * 20}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Competency Radar */}
          {competencyRadarData.length > 0 && (
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100">
              <h2 className="text-lg font-extrabold text-boon-text mb-6 text-center">
                Leadership Competency Profile
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={competencyRadarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: '#374151', fontSize: 10, fontWeight: 600 }}
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
                The purple area shows your current self-assessment across key leadership dimensions.
              </p>
            </section>
          )}
        </div>
      )}

      {/* Insights Section */}
      <section className="bg-gradient-to-br from-boon-blue/5 to-boon-lightBlue/20 p-8 rounded-[2rem] border border-boon-blue/10">
        <h2 className="text-lg font-extrabold text-boon-text mb-6">What the data tells us</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: '📈',
              title: 'Trend',
              desc: avgImprovement !== null && avgImprovement > 0
                ? `You're showing ${avgImprovement}% average improvement across your core metrics.`
                : 'Keep attending sessions and completing check-ins to track your growth.'
            },
            {
              icon: '🎯',
              title: 'Focus',
              desc: coreMetrics.reduce((best, metric) => {
                const improvement = calculateImprovement(
                  baseline?.[metric.baselineKey] ?? null,
                  latestSurvey?.[metric.currentKey] ?? null
                );
                if (improvement !== null && (best.value === null || improvement > best.value)) {
                  return { label: metric.label, value: improvement };
                }
                return best;
              }, { label: '', value: null as number | null }).label
                ? `${coreMetrics.reduce((best, metric) => {
                    const improvement = calculateImprovement(
                      baseline?.[metric.baselineKey] ?? null,
                      latestSurvey?.[metric.currentKey] ?? null
                    );
                    if (improvement !== null && (best.value === null || improvement > best.value)) {
                      return { label: metric.label, value: improvement };
                    }
                    return best;
                  }, { label: '', value: null as number | null }).label} shows the most growth.`
                : 'Your areas of focus will emerge as you progress.'
            },
            {
              icon: '💡',
              title: 'Next Step',
              desc: completedSessions.length === 0
                ? 'Book your first session to start your coaching journey.'
                : completedActions.length < 3
                  ? 'Complete more action items to accelerate your progress.'
                  : 'Keep up the momentum! You\'re building great habits.'
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
    </div>
  );
}
