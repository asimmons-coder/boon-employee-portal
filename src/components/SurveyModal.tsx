import { useState, useEffect } from 'react';
import type {
  SurveyType,
  CoreCompetency,
  CoachQuality,
  CompetencyScoreLevel,
} from '../lib/types';
import {
  fetchCoreCompetencies,
  submitScaleFeedbackSurvey,
  submitGrowBaselineSurvey,
  submitGrowEndSurvey,
} from '../lib/dataFetcher';

interface SurveyModalProps {
  isOpen: boolean;
  surveyType: SurveyType;
  sessionId?: string;
  sessionNumber?: number;
  coachName?: string;
  userEmail: string;
  onComplete: () => void;
  onClose?: () => void; // Optional - some surveys can't be dismissed
}

// Coach quality options
const COACH_QUALITIES: { key: CoachQuality; label: string }[] = [
  { key: 'made_me_feel_safe', label: 'Made me feel safe' },
  { key: 'listened_well', label: 'Listened well' },
  { key: 'provided_tools', label: 'Provided me with concrete tools' },
  { key: 'challenged_me', label: 'Challenged me' },
];

// Competency score options
const SCORE_OPTIONS: { value: CompetencyScoreLevel; label: string }[] = [
  { value: 1, label: 'Learning' },
  { value: 2, label: 'Growing' },
  { value: 3, label: 'Applying' },
  { value: 4, label: 'Excelling' },
  { value: 5, label: 'Mastering' },
];

export default function SurveyModal({
  isOpen,
  surveyType,
  sessionId,
  sessionNumber,
  coachName = 'Your Coach',
  userEmail,
  onComplete,
  onClose,
}: SurveyModalProps) {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Competencies for GROW surveys
  const [competencies, setCompetencies] = useState<CoreCompetency[]>([]);

  // SCALE survey form data
  const [coachSatisfaction, setCoachSatisfaction] = useState<number | null>(null);
  const [wantsRematch, setWantsRematch] = useState<boolean | null>(null);
  const [rematchReason, setRematchReason] = useState('');
  const [selectedQualities, setSelectedQualities] = useState<CoachQuality[]>([]);
  const [hasBookedNext, setHasBookedNext] = useState<boolean | null>(null);
  const [nps, setNps] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [openToTestimonial, setOpenToTestimonial] = useState<boolean | null>(null);

  // GROW survey form data
  const [competencyScores, setCompetencyScores] = useState<Record<string, CompetencyScoreLevel>>({});
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  // Load competencies for GROW surveys
  useEffect(() => {
    if (surveyType === 'grow_baseline' || surveyType === 'grow_end') {
      fetchCoreCompetencies().then(setCompetencies);
    }
  }, [surveyType]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
      setCoachSatisfaction(null);
      setWantsRematch(null);
      setRematchReason('');
      setSelectedQualities([]);
      setHasBookedNext(null);
      setNps(null);
      setFeedbackText('');
      setOutcomes('');
      setOpenToTestimonial(null);
      setCompetencyScores({});
      setFocusAreas([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const coachFirstName = coachName.split(' ')[0];

  // Calculate total steps based on survey type
  const getTotalSteps = () => {
    switch (surveyType) {
      case 'scale_feedback':
        return 4; // satisfaction → qualities → booked → nps/feedback
      case 'scale_end':
        return 5; // + outcomes/testimonial
      case 'grow_baseline':
        return 2; // competencies → focus areas
      case 'grow_end':
        return 3; // competencies → nps → outcomes/testimonial
      default:
        return 1;
    }
  };

  const totalSteps = getTotalSteps();

  // Toggle coach quality selection
  const toggleQuality = (quality: CoachQuality) => {
    setSelectedQualities(prev =>
      prev.includes(quality)
        ? prev.filter(q => q !== quality)
        : [...prev, quality]
    );
  };

  // Toggle focus area selection (max 3)
  const toggleFocusArea = (competency: string) => {
    setFocusAreas(prev => {
      if (prev.includes(competency)) {
        return prev.filter(c => c !== competency);
      }
      if (prev.length >= 3) {
        return prev; // Max 3
      }
      return [...prev, competency];
    });
  };

  // Set competency score
  const setCompetencyScore = (competency: string, score: CompetencyScoreLevel) => {
    setCompetencyScores(prev => ({ ...prev, [competency]: score }));
  };

  // Can proceed to next step?
  const canProceed = () => {
    if (surveyType === 'scale_feedback' || surveyType === 'scale_end') {
      switch (currentStep) {
        case 1:
          return coachSatisfaction !== null;
        case 2:
          return true; // qualities optional
        case 3:
          return hasBookedNext !== null;
        case 4:
          return nps !== null;
        case 5:
          return surveyType === 'scale_end' ? outcomes.trim().length > 0 : true;
        default:
          return true;
      }
    }

    if (surveyType === 'grow_baseline') {
      switch (currentStep) {
        case 1:
          return Object.keys(competencyScores).length === competencies.length;
        case 2:
          return focusAreas.length >= 1 && focusAreas.length <= 3;
        default:
          return true;
      }
    }

    if (surveyType === 'grow_end') {
      switch (currentStep) {
        case 1:
          return Object.keys(competencyScores).length === competencies.length;
        case 2:
          return nps !== null;
        case 3:
          return outcomes.trim().length > 0;
        default:
          return true;
      }
    }

    return true;
  };

  // Handle submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (surveyType === 'scale_feedback' || surveyType === 'scale_end') {
        const result = await submitScaleFeedbackSurvey(
          userEmail,
          sessionId!,
          sessionNumber!,
          coachName,
          {
            coach_satisfaction: coachSatisfaction!,
            wants_rematch: wantsRematch || false,
            rematch_reason: rematchReason || undefined,
            coach_qualities: selectedQualities,
            has_booked_next_session: hasBookedNext!,
            nps: nps!,
            feedback_text: feedbackText || undefined,
            outcomes: surveyType === 'scale_end' ? outcomes : undefined,
            open_to_testimonial: surveyType === 'scale_end' ? openToTestimonial || false : undefined,
          },
          surveyType
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to submit survey');
        }
      } else if (surveyType === 'grow_baseline') {
        const result = await submitGrowBaselineSurvey(
          userEmail,
          competencyScores,
          focusAreas
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to submit survey');
        }
      } else if (surveyType === 'grow_end') {
        const result = await submitGrowEndSurvey(
          userEmail,
          competencyScores,
          {
            nps: nps!,
            outcomes,
            open_to_testimonial: openToTestimonial || false,
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to submit survey');
        }
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next/Previous step handlers
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Render rating scale (1-10 or 0-10)
  const renderRatingScale = (
    value: number | null,
    onChange: (v: number) => void,
    min: number,
    max: number,
    lowLabel: string,
    highLabel: string
  ) => (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
              value === n
                ? 'bg-boon-amber text-white shadow-lg scale-110'
                : 'bg-gray-100 text-gray-600 hover:bg-boon-amberLight'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  // Render SCALE survey steps
  const renderScaleSurveyStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              How satisfied are you with {coachFirstName} as your coach?
            </h3>
            {renderRatingScale(
              coachSatisfaction,
              setCoachSatisfaction,
              1,
              10,
              'Not satisfied',
              'Very satisfied'
            )}

            {/* Show rematch question if satisfaction < 9 */}
            {coachSatisfaction !== null && coachSatisfaction < 9 && (
              <div className="mt-8 p-5 bg-gray-50 rounded-xl space-y-4">
                <p className="text-sm text-gray-700 font-medium">
                  Would you like to be matched with a new coach?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWantsRematch(true)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      wantsRematch === true
                        ? 'bg-boon-amber text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setWantsRematch(false)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      wantsRematch === false
                        ? 'bg-boon-amber text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                    }`}
                  >
                    No
                  </button>
                </div>

                {wantsRematch && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-600 block mb-2">
                      Tell us more (optional)
                    </label>
                    <textarea
                      value={rematchReason}
                      onChange={e => setRematchReason(e.target.value)}
                      placeholder="What would you like in a new coach?"
                      className="w-full p-3 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[80px] resize-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              I feel that {coachFirstName}:
            </h3>
            <p className="text-sm text-gray-500 text-center">Select all that apply</p>
            <div className="space-y-3">
              {COACH_QUALITIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleQuality(key)}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                    selectedQualities.includes(key)
                      ? 'bg-boon-amber/10 border-2 border-boon-amber text-boon-text'
                      : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-boon-amber/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedQualities.includes(key)
                      ? 'bg-boon-amber border-boon-amber'
                      : 'border-gray-300'
                  }`}>
                    {selectedQualities.includes(key) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              Have you booked your next session?
            </h3>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setHasBookedNext(true)}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  hasBookedNext === true
                    ? 'bg-boon-amber text-white shadow-lg'
                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-boon-amber'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setHasBookedNext(false)}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  hasBookedNext === false
                    ? 'bg-boon-amber text-white shadow-lg'
                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-boon-amber'
                }`}
              >
                Not yet
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
                How likely are you to recommend Boon to a friend or colleague?
              </h3>
              {renderRatingScale(
                nps,
                setNps,
                0,
                10,
                'Not likely',
                'Very likely'
              )}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="text-sm text-gray-600 block mb-2">
                Any feedback or suggestions? (optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="We'd love to hear your thoughts..."
                style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
                className="w-full p-4 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[100px] resize-none"
              />
            </div>
          </div>
        );

      case 5:
        // SCALE_END only
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
                What outcomes have you achieved through coaching?
              </h3>
              <textarea
                value={outcomes}
                onChange={e => setOutcomes(e.target.value)}
                placeholder="Reflect on your growth and accomplishments..."
                style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
                className="w-full p-4 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none min-h-[120px] resize-none"
              />
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-4">
              <p className="text-gray-700 font-medium">
                Would you be open to sharing a testimonial about your coaching experience?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOpenToTestimonial(true)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    openToTestimonial === true
                      ? 'bg-boon-amber text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                  }`}
                >
                  Yes, I'd be happy to
                </button>
                <button
                  onClick={() => setOpenToTestimonial(false)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    openToTestimonial === false
                      ? 'bg-boon-amber text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                  }`}
                >
                  Not right now
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render GROW baseline survey steps
  const renderGrowBaselineStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text">
                Rate yourself on each competency
              </h3>
              <p className="text-sm text-gray-500">
                This helps us understand where you're starting from
              </p>
            </div>

            {/* Score legend */}
            <div className="flex justify-center gap-2 flex-wrap text-xs">
              {SCORE_OPTIONS.map(({ value, label }) => (
                <span key={value} className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {value} = {label}
                </span>
              ))}
            </div>

            {/* Competency grid */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {competencies.map(comp => (
                <div key={comp.id} className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-boon-text mb-3">{comp.name}</p>
                  <div className="flex gap-2">
                    {SCORE_OPTIONS.map(({ value }) => (
                      <button
                        key={value}
                        onClick={() => setCompetencyScore(comp.name, value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          competencyScores[comp.name] === value
                            ? 'bg-boon-amber text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-500">
              {Object.keys(competencyScores).length} of {competencies.length} rated
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text">
                Which areas would you most like to focus on?
              </h3>
              <p className="text-sm text-gray-500">
                Select up to 3 competencies
              </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {competencies.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => toggleFocusArea(comp.name)}
                  disabled={!focusAreas.includes(comp.name) && focusAreas.length >= 3}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                    focusAreas.includes(comp.name)
                      ? 'bg-boon-amber/10 border-2 border-boon-amber text-boon-text'
                      : focusAreas.length >= 3
                        ? 'bg-gray-50 border-2 border-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-boon-amber/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    focusAreas.includes(comp.name)
                      ? 'bg-boon-amber border-boon-amber'
                      : 'border-gray-300'
                  }`}>
                    {focusAreas.includes(comp.name) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {comp.name}
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-boon-amber font-medium">
              {focusAreas.length} of 3 selected
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Render GROW end survey steps
  const renderGrowEndStep = () => {
    switch (currentStep) {
      case 1:
        // Same competency grid as baseline
        return renderGrowBaselineStep();

      case 2:
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              How likely are you to recommend Boon to a friend or colleague?
            </h3>
            {renderRatingScale(
              nps,
              setNps,
              0,
              10,
              'Not likely',
              'Very likely'
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
                What outcomes have you achieved through coaching?
              </h3>
              <textarea
                value={outcomes}
                onChange={e => setOutcomes(e.target.value)}
                placeholder="Reflect on your growth and accomplishments..."
                style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
                className="w-full p-4 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none min-h-[120px] resize-none"
              />
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-4">
              <p className="text-gray-700 font-medium">
                Would you be open to sharing a testimonial?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOpenToTestimonial(true)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    openToTestimonial === true
                      ? 'bg-boon-amber text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setOpenToTestimonial(false)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    openToTestimonial === false
                      ? 'bg-boon-amber text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-boon-amber'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get survey title
  const getSurveyTitle = () => {
    switch (surveyType) {
      case 'scale_feedback':
        return `Session ${sessionNumber} Feedback`;
      case 'scale_end':
        return 'Final Program Feedback';
      case 'grow_baseline':
        return 'Pre-Program Assessment';
      case 'grow_end':
        return 'Post-Program Assessment';
      default:
        return 'Feedback';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-boon-amber uppercase tracking-widest">
                {getSurveyTitle()}
              </p>
              <h2 className="text-lg font-bold text-boon-text mt-1">
                Share your feedback
              </h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all ${
                  i < currentStep ? 'bg-boon-amber' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {(surveyType === 'scale_feedback' || surveyType === 'scale_end') && renderScaleSurveyStep()}
          {surveyType === 'grow_baseline' && renderGrowBaselineStep()}
          {surveyType === 'grow_end' && renderGrowEndStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-boon-amber hover:bg-boon-amberDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Submitting...
              </span>
            ) : currentStep === totalSteps ? (
              'Submit'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
