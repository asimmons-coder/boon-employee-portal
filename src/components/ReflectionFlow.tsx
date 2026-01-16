import { useState } from 'react';
import type { BaselineSurvey, ReflectionResponse } from '../lib/types';
import { submitReflection } from '../lib/dataFetcher';

interface ReflectionFlowProps {
  userEmail: string;
  baseline: BaselineSurvey | null;
  onComplete: (reflection: ReflectionResponse) => void;
  onClose: () => void;
}

// The 12 competencies
const COMPETENCIES = [
  { key: 'comp_adaptability_and_resilience', label: 'Adaptability & Resilience' },
  { key: 'comp_building_relationships_at_work', label: 'Building Relationships' },
  { key: 'comp_change_management', label: 'Change Management' },
  { key: 'comp_delegation_and_accountability', label: 'Delegation & Accountability' },
  { key: 'comp_effective_communication', label: 'Effective Communication' },
  { key: 'comp_effective_planning_and_execution', label: 'Planning & Execution' },
  { key: 'comp_emotional_intelligence', label: 'Emotional Intelligence' },
  { key: 'comp_giving_and_receiving_feedback', label: 'Giving & Receiving Feedback' },
  { key: 'comp_persuasion_and_influence', label: 'Persuasion & Influence' },
  { key: 'comp_self_confidence_and_imposter_syndrome', label: 'Self Confidence' },
  { key: 'comp_strategic_thinking', label: 'Strategic Thinking' },
  { key: 'comp_time_management_and_productivity', label: 'Time Management' },
];

type Step = 'competencies' | 'nps' | 'qualitative' | 'submitting' | 'complete';

export default function ReflectionFlow({
  userEmail,
  baseline,
  onComplete,
  onClose,
}: ReflectionFlowProps) {
  const [step, setStep] = useState<Step>('competencies');
  const [competencyScores, setCompetencyScores] = useState<Record<string, number>>({});
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [qualitativeShift, setQualitativeShift] = useState('');
  const [qualitativeOther, setQualitativeOther] = useState('');
  const [testimonialConsent, setTestimonialConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate progress
  const completedCompetencies = Object.keys(competencyScores).length;
  const progressPercent = step === 'competencies'
    ? (completedCompetencies / COMPETENCIES.length) * 50
    : step === 'nps'
    ? 60
    : step === 'qualitative'
    ? 80
    : 100;

  const handleCompetencyScore = (key: string, score: number) => {
    setCompetencyScores(prev => ({ ...prev, [key]: score }));
  };

  const handleSubmit = async () => {
    setStep('submitting');
    setError(null);

    const reflectionData: Omit<ReflectionResponse, 'id' | 'email' | 'created_at'> = {
      comp_adaptability_and_resilience: competencyScores['comp_adaptability_and_resilience'] || null,
      comp_building_relationships_at_work: competencyScores['comp_building_relationships_at_work'] || null,
      comp_change_management: competencyScores['comp_change_management'] || null,
      comp_delegation_and_accountability: competencyScores['comp_delegation_and_accountability'] || null,
      comp_effective_communication: competencyScores['comp_effective_communication'] || null,
      comp_effective_planning_and_execution: competencyScores['comp_effective_planning_and_execution'] || null,
      comp_emotional_intelligence: competencyScores['comp_emotional_intelligence'] || null,
      comp_giving_and_receiving_feedback: competencyScores['comp_giving_and_receiving_feedback'] || null,
      comp_persuasion_and_influence: competencyScores['comp_persuasion_and_influence'] || null,
      comp_self_confidence_and_imposter_syndrome: competencyScores['comp_self_confidence_and_imposter_syndrome'] || null,
      comp_strategic_thinking: competencyScores['comp_strategic_thinking'] || null,
      comp_time_management_and_productivity: competencyScores['comp_time_management_and_productivity'] || null,
      nps_score: npsScore,
      qualitative_shift: qualitativeShift || null,
      qualitative_other: qualitativeOther || null,
      testimonial_consent: testimonialConsent,
    };

    const result = await submitReflection(userEmail, reflectionData);

    if (result.success && result.data) {
      setStep('complete');
      // Brief delay to show completion, then trigger callback
      setTimeout(() => {
        onComplete(result.data!);
      }, 2000);
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
      setStep('qualitative');
    }
  };

  const canProceedFromCompetencies = completedCompetencies === COMPETENCIES.length;
  const canProceedFromNps = npsScore !== null;

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
              <h2 className="text-2xl font-extrabold text-boon-text">Final Reflection</h2>
              <p className="text-gray-500 text-sm mt-1">
                {step === 'competencies' && 'Rate yourself across leadership competencies'}
                {step === 'nps' && 'One quick question'}
                {step === 'qualitative' && 'Share your experience (optional)'}
                {step === 'submitting' && 'Saving your reflection...'}
                {step === 'complete' && 'Your Leadership Profile is complete'}
              </p>
            </div>
            {step !== 'submitting' && step !== 'complete' && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                Think about where you are <strong>today</strong> compared to when you started. Rate yourself on each competency.
              </p>
              <div className="space-y-4">
                {COMPETENCIES.map(comp => {
                  const baselineValue = baseline?.[comp.key as keyof BaselineSurvey] as number | null;
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
                        {baselineValue && (
                          <span className="text-xs text-gray-400">
                            Baseline: {baselineValue}/5
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

          {/* Step 2: NPS */}
          {step === 'nps' && (
            <div className="space-y-8 py-8">
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
            </div>
          )}

          {/* Step 3: Qualitative */}
          {step === 'qualitative' && (
            <div className="space-y-8">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-boon-text mb-2">
                  What skill improved most for you during this program?
                </label>
                <textarea
                  value={qualitativeShift}
                  onChange={(e) => setQualitativeShift(e.target.value)}
                  placeholder="E.g., delegation, giving feedback, managing up, communication..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                />
                <p className="text-xs text-gray-400 mt-1">Optional</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-boon-text mb-2">
                  Anything else you'd like to share?
                </label>
                <textarea
                  value={qualitativeOther}
                  onChange={(e) => setQualitativeOther(e.target.value)}
                  placeholder="Feedback, suggestions, or final thoughts..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                />
                <p className="text-xs text-gray-400 mt-1">Optional</p>
              </div>

              {/* Testimonial Ask - only for high NPS */}
              {npsScore !== null && npsScore >= 9 && (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-200">
                  <p className="text-sm text-green-800 mb-4">
                    Thank you for the great score! Would you be willing to share a brief quote we can use with future participants or your HR team?
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
              <div className="w-16 h-16 mx-auto mb-6 bg-boon-lightBlue rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Saving your reflection...</p>
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
                Your Leadership Profile is complete
              </h3>
              <p className="text-gray-500">
                Here's how you grew...
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
                    if (step === 'nps') setStep('competencies');
                    if (step === 'qualitative') setStep('nps');
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
                {step === 'nps' && 'Quick question'}
                {step === 'qualitative' && 'Final step'}
              </span>

              {/* Next button */}
              {step === 'competencies' && (
                <button
                  onClick={() => setStep('nps')}
                  disabled={!canProceedFromCompetencies}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Continue
                </button>
              )}
              {step === 'nps' && (
                <button
                  onClick={() => setStep('qualitative')}
                  disabled={!canProceedFromNps}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Continue
                </button>
              )}
              {step === 'qualitative' && (
                <button
                  onClick={handleSubmit}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl transition-all hover:bg-boon-darkBlue"
                >
                  Submit Reflection
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
