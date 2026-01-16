import { useState } from 'react';
import type { Checkpoint, BaselineSurvey } from '../lib/types';
import { submitCheckpoint } from '../lib/dataFetcher';

interface CheckpointFlowProps {
  userEmail: string;
  checkpointNumber: number;
  sessionCount: number;
  baseline: BaselineSurvey | null;
  previousCheckpoint: Checkpoint | null;
  onComplete: (checkpoint: Checkpoint) => void;
  onClose: () => void;
}

// The 12 competencies (for checkpoint tracking)
const COMPETENCIES = [
  { key: 'adaptability_and_resilience', label: 'Adaptability & Resilience', baselineKey: 'comp_adaptability_and_resilience' },
  { key: 'building_relationships_at_work', label: 'Building Relationships', baselineKey: 'comp_building_relationships_at_work' },
  { key: 'change_management', label: 'Change Management', baselineKey: 'comp_change_management' },
  { key: 'delegation_and_accountability', label: 'Delegation & Accountability', baselineKey: 'comp_delegation_and_accountability' },
  { key: 'effective_communication', label: 'Effective Communication', baselineKey: 'comp_effective_communication' },
  { key: 'effective_planning_and_execution', label: 'Planning & Execution', baselineKey: 'comp_effective_planning_and_execution' },
  { key: 'emotional_intelligence', label: 'Emotional Intelligence', baselineKey: 'comp_emotional_intelligence' },
  { key: 'giving_and_receiving_feedback', label: 'Giving & Receiving Feedback', baselineKey: 'comp_giving_and_receiving_feedback' },
  { key: 'persuasion_and_influence', label: 'Persuasion & Influence', baselineKey: 'comp_persuasion_and_influence' },
  { key: 'self_confidence_and_imposter_syndrome', label: 'Self Confidence', baselineKey: 'comp_self_confidence_and_imposter_syndrome' },
  { key: 'strategic_thinking', label: 'Strategic Thinking', baselineKey: 'comp_strategic_thinking' },
  { key: 'time_management_and_productivity', label: 'Time Management', baselineKey: 'comp_time_management_and_productivity' },
];

type Step = 'competencies' | 'reflection' | 'focus' | 'nps' | 'submitting' | 'complete';

export default function CheckpointFlow({
  userEmail,
  checkpointNumber,
  sessionCount,
  baseline,
  previousCheckpoint,
  onComplete,
  onClose,
}: CheckpointFlowProps) {
  const [step, setStep] = useState<Step>('competencies');
  const [competencyScores, setCompetencyScores] = useState<Record<string, number>>({});
  const [reflectionText, setReflectionText] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [testimonialConsent, setTestimonialConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstCheckpoint = checkpointNumber === 1;

  // Calculate progress
  const completedCompetencies = Object.keys(competencyScores).length;
  const progressPercent = step === 'competencies'
    ? (completedCompetencies / COMPETENCIES.length) * 40
    : step === 'reflection'
    ? 50
    : step === 'focus'
    ? 65
    : step === 'nps'
    ? 80
    : 100;

  const handleCompetencyScore = (key: string, score: number) => {
    setCompetencyScores(prev => ({ ...prev, [key]: score }));
  };

  const handleSubmit = async () => {
    setStep('submitting');
    setError(null);

    const checkpointData: Omit<Checkpoint, 'id' | 'email' | 'created_at'> = {
      checkpoint_number: checkpointNumber,
      session_count_at_checkpoint: sessionCount,
      competency_scores: {
        adaptability_and_resilience: competencyScores['adaptability_and_resilience'] || 3,
        building_relationships_at_work: competencyScores['building_relationships_at_work'] || 3,
        change_management: competencyScores['change_management'] || 3,
        delegation_and_accountability: competencyScores['delegation_and_accountability'] || 3,
        effective_communication: competencyScores['effective_communication'] || 3,
        effective_planning_and_execution: competencyScores['effective_planning_and_execution'] || 3,
        emotional_intelligence: competencyScores['emotional_intelligence'] || 3,
        giving_and_receiving_feedback: competencyScores['giving_and_receiving_feedback'] || 3,
        persuasion_and_influence: competencyScores['persuasion_and_influence'] || 3,
        self_confidence_and_imposter_syndrome: competencyScores['self_confidence_and_imposter_syndrome'] || 3,
        strategic_thinking: competencyScores['strategic_thinking'] || 3,
        time_management_and_productivity: competencyScores['time_management_and_productivity'] || 3,
      },
      reflection_text: reflectionText || null,
      focus_area: focusArea || null,
      nps_score: npsScore,
      testimonial_consent: testimonialConsent,
    };

    const result = await submitCheckpoint(userEmail, checkpointData);

    if (result.success && result.data) {
      setStep('complete');
      // Brief delay to show completion, then trigger callback
      setTimeout(() => {
        onComplete(result.data!);
      }, 2000);
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
      setStep('nps');
    }
  };

  const canProceedFromCompetencies = completedCompetencies === COMPETENCIES.length;
  const canProceedFromNps = npsScore !== null;

  // Get previous score for a competency
  const getPreviousScore = (key: string): number | null => {
    if (previousCheckpoint) {
      return previousCheckpoint.competency_scores[key as keyof typeof previousCheckpoint.competency_scores] || null;
    }
    if (baseline) {
      const baselineKey = COMPETENCIES.find(c => c.key === key)?.baselineKey;
      if (baselineKey) {
        return baseline[baselineKey as keyof BaselineSurvey] as number | null;
      }
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-boon-text/50 backdrop-blur-md">
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-boon-blue transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-extrabold text-boon-text">
                  {isFirstCheckpoint ? 'Your First Check-In' : `Check-In ${checkpointNumber}`}
                </h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                  ~2 min
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {step === 'competencies' && (isFirstCheckpoint ? 'Establish your baseline' : 'How are you showing up today?')}
                {step === 'reflection' && "Reflect on your progress"}
                {step === 'focus' && 'What do you want to focus on next?'}
                {step === 'nps' && 'One quick question'}
                {step === 'submitting' && 'Saving your check-in...'}
                {step === 'complete' && "See how you're evolving"}
              </p>
            </div>
            {step !== 'submitting' && step !== 'complete' && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Remind me later"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Step 1: Competency Self-Assessment */}
          {step === 'competencies' && (
            <div className="space-y-6">
              <p className="text-gray-600 mb-6">
                {isFirstCheckpoint
                  ? 'Rate yourself across these leadership competencies. This establishes your starting point.'
                  : 'Think about where you are today. How would you rate yourself on each competency?'
                }
              </p>
              <div className="space-y-4">
                {COMPETENCIES.map(comp => {
                  const previousScore = getPreviousScore(comp.key);
                  const currentValue = competencyScores[comp.key];

                  return (
                    <div
                      key={comp.key}
                      className={`p-4 rounded-2xl border transition-all ${
                        currentValue ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-boon-text text-sm">{comp.label}</h3>
                        {!isFirstCheckpoint && previousScore && (
                          <span className="text-xs text-gray-400">
                            Last: {previousScore}/5
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            onClick={() => handleCompetencyScore(comp.key, score)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              currentValue === score
                                ? 'bg-boon-blue text-white shadow-md'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Reflection */}
          {step === 'reflection' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3">
                  {isFirstCheckpoint
                    ? 'What are you hoping to get from coaching?'
                    : "What skill has improved most since your last check-in?"
                  }
                </label>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder={isFirstCheckpoint
                    ? 'Goals, challenges, areas you want to develop...'
                    : 'E.g., delegation, giving feedback, difficult conversations...'
                  }
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-40"
                />
                <p className="text-xs text-gray-400 mt-2">
                  {isFirstCheckpoint
                    ? 'This helps track your journey over time'
                    : 'This becomes part of your personal growth record'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Focus Area */}
          {step === 'focus' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3">
                  What do you want to focus on in your next 6 sessions?
                </label>
                <textarea
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  placeholder="A skill to build, a challenge to tackle, a pattern to change..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-40"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Your coach will see this to help guide your sessions
                </p>
              </div>
            </div>
          )}

          {/* Step 4: NPS */}
          {step === 'nps' && (
            <div className="space-y-8 py-8">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-2">
                  How likely are you to recommend Boon coaching to a colleague?
                </h3>
                <p className="text-gray-500 text-sm">0 = Not at all likely, 10 = Extremely likely</p>
              </div>
              <div className="grid grid-cols-11 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => setNpsScore(score)}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      npsScore === score
                        ? 'bg-boon-blue text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>Not likely</span>
                <span>Extremely likely</span>
              </div>

              {/* Testimonial Ask - only for high NPS */}
              {npsScore !== null && npsScore >= 9 && (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-200 mt-6">
                  <p className="text-sm text-green-800 mb-4">
                    Thank you for the great score! Would you be willing to share a quote we can use?
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testimonialConsent}
                      onChange={(e) => setTestimonialConsent(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-boon-blue focus:ring-boon-blue"
                    />
                    <span className="text-sm text-green-800 font-medium">
                      Yes, you can use my feedback
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Submitting */}
          {step === 'submitting' && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Saving your check-in...</p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-boon-text mb-3">
                Check-in complete
              </h3>
              <p className="text-gray-500">
                {isFirstCheckpoint
                  ? "You've established your baseline. See you at session 6!"
                  : "See how you're evolving..."
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'submitting' && step !== 'complete' && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              {/* Back button */}
              {step !== 'competencies' ? (
                <button
                  onClick={() => {
                    if (step === 'reflection') setStep('competencies');
                    if (step === 'focus') setStep('reflection');
                    if (step === 'nps') setStep('focus');
                  }}
                  className="px-6 py-3 text-gray-500 font-bold hover:text-boon-text transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {/* Progress indicator */}
              <span className="text-xs text-gray-400 font-medium">
                {step === 'competencies' && `${completedCompetencies}/${COMPETENCIES.length} competencies`}
                {step === 'reflection' && 'Reflection'}
                {step === 'focus' && 'Focus area'}
                {step === 'nps' && 'Final step'}
              </span>

              {/* Next button */}
              {step === 'competencies' && (
                <button
                  onClick={() => setStep('reflection')}
                  disabled={!canProceedFromCompetencies}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Continue
                </button>
              )}
              {step === 'reflection' && (
                <button
                  onClick={() => setStep('focus')}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl transition-all hover:bg-boon-darkBlue"
                >
                  Continue
                </button>
              )}
              {step === 'focus' && (
                <button
                  onClick={() => setStep('nps')}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl transition-all hover:bg-boon-darkBlue"
                >
                  Continue
                </button>
              )}
              {step === 'nps' && (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceedFromNps}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Complete Check-In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
