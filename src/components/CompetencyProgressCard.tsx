import type { GrowFocusArea } from '../lib/dataFetcher';
import type { CompetencyScoreLevel } from '../lib/types';

interface CompetencyProgressCardProps {
  focusAreas: GrowFocusArea[];
}

// Score level labels matching the survey
const SCORE_LABELS: Record<CompetencyScoreLevel, string> = {
  1: 'Learning',
  2: 'Growing',
  3: 'Applying',
  4: 'Excelling',
  5: 'Mastering',
};

// Score colors for visual distinction
const SCORE_COLORS: Record<CompetencyScoreLevel, { bg: string; text: string; bar: string }> = {
  1: { bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-400' },
  2: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-400' },
  3: { bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-400' },
  4: { bg: 'bg-green-50', text: 'text-green-600', bar: 'bg-green-400' },
  5: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
};

export default function CompetencyProgressCard({ focusAreas }: CompetencyProgressCardProps) {
  if (focusAreas.length === 0) {
    return (
      <section className="bg-gradient-to-br from-boon-amberLight/50 to-white rounded-[2rem] p-8 border border-boon-amber/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Your Focus Areas</h2>
        </div>
        <p className="text-gray-500 text-sm italic">
          Complete your baseline assessment to see your focus areas and competency scores here.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-br from-boon-amberLight/50 to-white rounded-[2rem] p-8 border border-boon-amber/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-boon-amber/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Your Focus Areas</h2>
        </div>
      </div>

      {/* Scale Reference */}
      <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
        <span className="font-medium">Scale:</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <span key={level} className="flex items-center gap-0.5">
              <span className={`w-2 h-2 rounded-full ${SCORE_COLORS[level as CompetencyScoreLevel].bar}`} />
              <span className="text-[10px]">{SCORE_LABELS[level as CompetencyScoreLevel]}</span>
              {level < 5 && <span className="mx-1 text-gray-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Competency List */}
      <div className="space-y-4">
        {focusAreas.map((area, index) => {
          const colors = SCORE_COLORS[area.baseline_score];
          const label = SCORE_LABELS[area.baseline_score];

          return (
            <div
              key={index}
              className="p-5 bg-white/70 rounded-xl border border-boon-amber/10 hover:border-boon-amber/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-lg text-boon-text leading-relaxed">
                    {area.competency_name}
                  </h3>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}>
                  {label} ({area.baseline_score}/5)
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full transition-all`}
                  style={{ width: `${(area.baseline_score / 5) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Baseline Note */}
      <p className="mt-6 text-xs text-gray-400 flex items-center gap-2">
        <svg className="w-4 h-4 text-boon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>These are your baseline scores from the start of your program. Post-program scores will be added after completion.</span>
      </p>
    </section>
  );
}
