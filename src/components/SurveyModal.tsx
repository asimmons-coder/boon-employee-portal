import { useState, useEffect } from 'react';
import type {
  SurveyType,
  CoreCompetency,
  CompetencyScoreLevel,
} from '../lib/types';
import {
  fetchCoreCompetencies,
  submitScaleFeedbackSurvey,
  submitGrowBaselineSurvey,
  submitGrowEndSurvey,
  submitGrowFirstSessionSurvey,
  addCoachingWin,
} from '../lib/dataFetcher';

interface SurveyModalProps {
  isOpen: boolean;
  surveyType: SurveyType;
  sessionId?: string;
  sessionNumber?: number;
  coachName?: string;
  userEmail: string;
  employeeId?: string | number;
  onComplete: () => void;
  onClose?: () => void;
}

// Booking blockers for "What's getting in the way?"
const BOOKING_BLOCKERS = [
  { key: 'busy_schedule', label: 'Busy schedule' },
  { key: 'unsure_what_to_discuss', label: 'Not sure what to discuss' },
  { key: 'forgot', label: 'I forgot' },
  { key: 'technical_issues', label: 'Technical issues with booking' },
  { key: 'other', label: 'Other' },
];

// Competency score options for GROW surveys
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
  employeeId,
  onComplete,
  onClose,
}: SurveyModalProps) {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Competencies for GROW surveys
  const [competencies, setCompetencies] = useState<CoreCompetency[]>([]);

  // New feedback survey form data (for scale_feedback and grow_midpoint)
  const [experienceRating, setExperienceRating] = useState<number | null>(null);
  const [coachMatchRating, setCoachMatchRating] = useState<number | null>(null);
  const [whatsNotWorking, setWhatsNotWorking] = useState('');
  const [continueWithCoach, setContinueWithCoach] = useState<'yes' | 'explore' | null>(null);
  const [betterMatchDescription, setBetterMatchDescription] = useState('');
  const [winText, setWinText] = useState('');
  const [hasBookedNext, setHasBookedNext] = useState<boolean | null>(null);
  const [bookingBlockers, setBookingBlockers] = useState<string[]>([]);
  const [anythingElse, setAnythingElse] = useState('');
  const [nps, setNps] = useState<number | null>(null);
  const [openToChat, setOpenToChat] = useState<boolean | null>(null);

  // GROW survey form data
  const [competencyScores, setCompetencyScores] = useState<Record<string, CompetencyScoreLevel>>({});
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState('');
  const [openToTestimonial, setOpenToTestimonial] = useState<boolean | null>(null);

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
      setExperienceRating(null);
      setCoachMatchRating(null);
      setWhatsNotWorking('');
      setContinueWithCoach(null);
      setBetterMatchDescription('');
      setWinText('');
      setHasBookedNext(null);
      setBookingBlockers([]);
      setAnythingElse('');
      setNps(null);
      setOpenToChat(null);
      setCompetencyScores({});
      setFocusAreas([]);
      setOutcomes('');
      setOpenToTestimonial(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const coachFirstName = coachName.split(' ')[0];

  // Define step flow for feedback surveys (with conditional logic)
  // Returns array of step identifiers in order
  const getFeedbackSteps = () => {
    const steps: string[] = ['experience', 'coach_match'];

    // If coach match rating <= 8, add conditional steps
    if (coachMatchRating !== null && coachMatchRating <= 8) {
      steps.push('whats_not_working');
      steps.push('continue_with_coach');
      if (continueWithCoach === 'explore') {
        steps.push('better_match');
      }
    }

    steps.push('wins');
    steps.push('booked_next');

    // If hasn't booked, ask why
    if (hasBookedNext === false) {
      steps.push('booking_blockers');
    }

    steps.push('anything_else');
    steps.push('nps');
    steps.push('open_to_chat');

    return steps;
  };

  // Get total steps based on survey type
  const getTotalSteps = () => {
    switch (surveyType) {
      case 'scale_feedback':
      case 'grow_midpoint':
      case 'grow_first_session':
        return getFeedbackSteps().length;
      case 'scale_end':
        return getFeedbackSteps().length + 1; // + outcomes
      case 'grow_baseline':
        return 2; // competencies → focus areas
      case 'grow_end':
        return 3; // competencies → nps → outcomes
      default:
        return 1;
    }
  };

  // Get current step identifier for feedback surveys
  const getCurrentStepId = () => {
    if (surveyType === 'scale_feedback' || surveyType === 'grow_midpoint' || surveyType === 'grow_first_session') {
      const steps = getFeedbackSteps();
      return steps[currentStep - 1] || 'experience';
    }
    return null;
  };

  const totalSteps = getTotalSteps();

  // Toggle booking blocker selection
  const toggleBlocker = (blocker: string) => {
    setBookingBlockers(prev =>
      prev.includes(blocker)
        ? prev.filter(b => b !== blocker)
        : [...prev, blocker]
    );
  };

  // Toggle focus area selection (max 3)
  const toggleFocusArea = (competency: string) => {
    setFocusAreas(prev => {
      if (prev.includes(competency)) {
        return prev.filter(c => c !== competency);
      }
      if (prev.length >= 3) {
        return prev;
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
    if (surveyType === 'scale_feedback' || surveyType === 'grow_midpoint' || surveyType === 'grow_first_session') {
      const stepId = getCurrentStepId();
      switch (stepId) {
        case 'experience':
          return experienceRating !== null;
        case 'coach_match':
          return coachMatchRating !== null;
        case 'whats_not_working':
          return whatsNotWorking.trim().length > 0;
        case 'continue_with_coach':
          return continueWithCoach !== null;
        case 'better_match':
          return betterMatchDescription.trim().length > 0;
        case 'wins':
          return true; // optional
        case 'booked_next':
          return hasBookedNext !== null;
        case 'booking_blockers':
          return bookingBlockers.length > 0;
        case 'anything_else':
          return true; // optional
        case 'nps':
          return nps !== null;
        case 'open_to_chat':
          return openToChat !== null;
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
      if (surveyType === 'scale_feedback' || surveyType === 'scale_end' || surveyType === 'grow_midpoint' || surveyType === 'grow_first_session') {
        // Use appropriate submission function based on survey type
        let result;

        if (surveyType === 'grow_first_session') {
          result = await submitGrowFirstSessionSurvey(
            userEmail,
            sessionNumber!,
            coachName,
            {
              experience_rating: experienceRating!,
              coach_match_rating: coachMatchRating!,
              not_working_reason: coachMatchRating !== null && coachMatchRating <= 8 ? whatsNotWorking : undefined,
              continue_with_coach: continueWithCoach === 'yes' ? true : continueWithCoach === 'explore' ? false : undefined,
              better_match_feedback: continueWithCoach === 'explore' ? betterMatchDescription : undefined,
              win_text: winText.trim() || undefined,
              has_booked_next_session: hasBookedNext!,
              not_booking_reasons: hasBookedNext === false ? bookingBlockers : undefined,
              feedback_suggestions: anythingElse || undefined,
              nps: nps!,
              open_to_chat: openToChat!,
            }
          );
        } else {
          // Map new fields to existing database structure
          result = await submitScaleFeedbackSurvey(
            userEmail,
            sessionId!,
            sessionNumber!,
            coachName,
            {
              coach_satisfaction: coachMatchRating!, // Use coach match rating
              experience_rating: experienceRating!,
              wants_rematch: continueWithCoach === 'explore',
              rematch_reason: continueWithCoach === 'explore' ? betterMatchDescription : undefined,
              whats_not_working: coachMatchRating !== null && coachMatchRating <= 8 ? whatsNotWorking : undefined,
              coach_qualities: [], // Not collecting in new survey
              has_booked_next_session: hasBookedNext!,
              booking_blockers: hasBookedNext === false ? bookingBlockers : undefined,
              nps: nps!,
              feedback_suggestions: anythingElse || undefined,
              outcomes: surveyType === 'scale_end' ? outcomes : undefined,
              open_to_testimonial: surveyType === 'scale_end' ? openToTestimonial || false : undefined,
              open_to_chat: openToChat || false,
            },
            surveyType
          );
        }

        if (!result.success) {
          throw new Error(result.error || 'Failed to submit survey');
        }

        // Save coaching win if user entered one
        if (winText.trim() && employeeId) {
          await addCoachingWin(
            userEmail,
            employeeId,
            winText.trim(),
            sessionNumber,
            false,
            'check_in_survey'
          );
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

  // Next step handler - recalculates steps based on current answers
  const handleNext = () => {
    if (surveyType === 'scale_feedback' || surveyType === 'grow_midpoint' || surveyType === 'grow_first_session') {
      const steps = getFeedbackSteps();
      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    } else {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  // Previous step handler
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
      <div className="flex gap-1 justify-center">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${
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

  // Render feedback survey step based on step ID
  const renderFeedbackStep = () => {
    const stepId = getCurrentStepId();

    switch (stepId) {
      case 'experience':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              How's your coaching experience so far?
            </h3>
            {renderRatingScale(
              experienceRating,
              setExperienceRating,
              1,
              10,
              'Not great',
              'Excellent'
            )}
          </div>
        );

      case 'coach_match':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              How's your match with {coachFirstName}?
            </h3>
            {renderRatingScale(
              coachMatchRating,
              setCoachMatchRating,
              1,
              10,
              'Not a good fit',
              'Perfect match'
            )}
          </div>
        );

      case 'whats_not_working':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              What's not working?
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Help us understand so we can improve your experience
            </p>
            <textarea
              value={whatsNotWorking}
              onChange={e => setWhatsNotWorking(e.target.value)}
              placeholder="Tell us what could be better..."
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
              className="w-full p-4 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none"
            />
          </div>
        );

      case 'continue_with_coach':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              Would you like to continue with {coachFirstName}?
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setContinueWithCoach('yes')}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                  continueWithCoach === 'yes'
                    ? 'bg-boon-amber/10 border-2 border-boon-amber text-boon-text'
                    : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-boon-amber/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  continueWithCoach === 'yes'
                    ? 'bg-boon-amber border-boon-amber'
                    : 'border-gray-300'
                }`}>
                  {continueWithCoach === 'yes' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                Yes, continue with {coachFirstName}
              </button>
              <button
                onClick={() => setContinueWithCoach('explore')}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                  continueWithCoach === 'explore'
                    ? 'bg-boon-amber/10 border-2 border-boon-amber text-boon-text'
                    : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-boon-amber/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  continueWithCoach === 'explore'
                    ? 'bg-boon-amber border-boon-amber'
                    : 'border-gray-300'
                }`}>
                  {continueWithCoach === 'explore' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                Explore other options
              </button>
            </div>
          </div>
        );

      case 'better_match':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              What would make a better match?
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Help us find the right coach for you
            </p>
            <textarea
              value={betterMatchDescription}
              onChange={e => setBetterMatchDescription(e.target.value)}
              placeholder="e.g., Someone with more experience in leadership, a different coaching style..."
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
              className="w-full p-4 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none"
            />
          </div>
        );

      case 'wins':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              Any wins or breakthroughs?
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Capture any insights from this session (optional)
            </p>
            <textarea
              value={winText}
              onChange={e => setWinText(e.target.value)}
              placeholder="e.g., I realized I need to delegate more, I had a breakthrough about..."
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
              className="w-full p-4 rounded-xl border border-orange-200 bg-orange-50/50 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none"
            />
          </div>
        );

      case 'booked_next':
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
                No
              </button>
            </div>
          </div>
        );

      case 'booking_blockers':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              What's getting in the way?
            </h3>
            <p className="text-sm text-gray-500 text-center">Select all that apply</p>
            <div className="space-y-3">
              {BOOKING_BLOCKERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleBlocker(key)}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 ${
                    bookingBlockers.includes(key)
                      ? 'bg-boon-amber/10 border-2 border-boon-amber text-boon-text'
                      : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-boon-amber/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    bookingBlockers.includes(key)
                      ? 'bg-boon-amber border-boon-amber'
                      : 'border-gray-300'
                  }`}>
                    {bookingBlockers.includes(key) && (
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

      case 'anything_else':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              Anything else you'd like to share?
            </h3>
            <textarea
              value={anythingElse}
              onChange={e => setAnythingElse(e.target.value)}
              placeholder="Optional feedback or suggestions..."
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
              className="w-full p-4 rounded-xl border border-gray-200 focus:border-boon-amber focus:ring-0 focus:outline-none text-sm min-h-[120px] resize-none"
            />
          </div>
        );

      case 'nps':
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

      case 'open_to_chat':
        return (
          <div className="space-y-6">
            <h3 style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-xl text-boon-text text-center">
              Would you be open to a quick chat with our team?
            </h3>
            <p className="text-sm text-gray-500 text-center">
              We'd love to hear more about your experience
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setOpenToChat(true)}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  openToChat === true
                    ? 'bg-boon-amber text-white shadow-lg'
                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-boon-amber'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setOpenToChat(false)}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  openToChat === false
                    ? 'bg-boon-amber text-white shadow-lg'
                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-boon-amber'
                }`}
              >
                No thanks
              </button>
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
      case 'grow_first_session':
        return 'Post-Session Check-In';
      case 'grow_midpoint':
        return 'Midpoint Check-In';
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

  // Calculate progress for feedback surveys
  const getProgressSteps = () => {
    if (surveyType === 'scale_feedback' || surveyType === 'grow_midpoint' || surveyType === 'grow_first_session') {
      return getFeedbackSteps().length;
    }
    return totalSteps;
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
            {Array.from({ length: getProgressSteps() }, (_, i) => (
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

          {(surveyType === 'scale_feedback' || surveyType === 'grow_midpoint' || surveyType === 'grow_first_session') && renderFeedbackStep()}
          {surveyType === 'scale_end' && renderFeedbackStep()}
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
            ) : currentStep === getProgressSteps() ? (
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
