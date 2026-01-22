import { useState } from 'react';
import type { Checkpoint } from '../lib/types';
import { submitCheckpoint, addCoachingWin, type ScaleCheckinData } from '../lib/dataFetcher';

interface CheckpointFlowProps {
  userEmail: string;
  employeeId: string | number;
  sessionId: string;
  sessionNumber: number;
  coachName: string;
  // Employee data to include in survey (avoids re-fetching)
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  coachingProgram: string | null;
  onComplete: (checkpoint: Checkpoint) => void;
  onClose: () => void;
}

type Step =
  | 'experience_rating'      // Q1: How's your coaching experience so far? (1-10)
  | 'coach_match'            // Q2: How's your match with {coach}? (1-10)
  | 'whats_not_working'      // Q3: [If match ≤8] What's not working? (required)
  | 'wins'                   // Q4: Any wins or breakthroughs? (optional)
  | 'continue_with_coach'    // Q5: [If match ≤8] Continue with {coach}? (Yes/Explore)
  | 'better_match'           // Q6: [If explore] What would make a better match?
  | 'booked_next'            // Q7: Booked your next session?
  | 'whats_in_the_way'       // Q7b: [If no] What's in the way?
  | 'anything_else'          // Q8: Anything else?
  | 'nps'                    // Q9: NPS (0-10)
  | 'open_to_chat'           // Q10: Open to a quick chat?
  | 'submitting'
  | 'complete';

export default function CheckpointFlow({
  userEmail,
  employeeId,
  sessionId,
  sessionNumber,
  coachName,
  firstName,
  lastName,
  companyName,
  coachingProgram,
  onComplete,
  onClose,
}: CheckpointFlowProps) {
  const [step, setStep] = useState<Step>('experience_rating');

  // Form state
  const [experienceRating, setExperienceRating] = useState<number | null>(null);
  const [coachMatchRating, setCoachMatchRating] = useState<number | null>(null);
  const [whatsNotWorkingText, setWhatsNotWorkingText] = useState('');
  const [winsText, setWinsText] = useState('');
  const [continueWithCoach, setContinueWithCoach] = useState<'yes' | 'explore' | null>(null);
  const [betterMatchText, setBetterMatchText] = useState('');
  const [bookedNext, setBookedNext] = useState<'yes' | 'no' | null>(null);
  const [whatsInTheWayOption, setWhatsInTheWayOption] = useState<string | null>(null);
  const [whatsInTheWayOtherText, setWhatsInTheWayOtherText] = useState('');
  const [anythingElseText, setAnythingElseText] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [openToChat, setOpenToChat] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coachFirstName = coachName?.split(' ')[0] || 'your coach';
  const needsCoachFeedback = coachMatchRating !== null && coachMatchRating <= 8;

  // Calculate progress
  const getStepNumber = (): number => {
    const stepOrder: Step[] = [
      'experience_rating',
      'coach_match',
      ...(needsCoachFeedback ? ['whats_not_working' as Step] : []),
      'wins',
      ...(needsCoachFeedback ? ['continue_with_coach' as Step] : []),
      ...(needsCoachFeedback && continueWithCoach === 'explore' ? ['better_match' as Step] : []),
      'booked_next',
      ...(bookedNext === 'no' ? ['whats_in_the_way' as Step] : []),
      'anything_else',
      'nps',
      'open_to_chat',
    ];
    const idx = stepOrder.indexOf(step);
    return idx >= 0 ? idx + 1 : stepOrder.length;
  };

  const getTotalSteps = (): number => {
    let total = 7; // Base: experience, coach_match, wins, booked_next, anything_else, nps, open_to_chat
    if (needsCoachFeedback) total += 2; // whats_not_working + continue_with_coach
    if (needsCoachFeedback && continueWithCoach === 'explore') total += 1; // better_match
    if (bookedNext === 'no') total += 1; // whats_in_the_way
    return total;
  };

  const progressPercent = Math.round((getStepNumber() / getTotalSteps()) * 100);

  const handleSubmit = async () => {
    setStep('submitting');
    setError(null);

    // Build combined feedback text with all responses
    const feedbackParts: string[] = [];

    if (whatsNotWorkingText) {
      feedbackParts.push(`What's not working: ${whatsNotWorkingText}`);
    }
    if (winsText) {
      feedbackParts.push(`Wins/breakthroughs: ${winsText}`);
    }
    if (needsCoachFeedback && continueWithCoach) {
      feedbackParts.push(`Continue with ${coachFirstName}: ${continueWithCoach === 'yes' ? 'Yes' : 'Exploring options'}`);
    }
    if (betterMatchText) {
      feedbackParts.push(`Better match criteria: ${betterMatchText}`);
    }
    if (bookedNext) {
      feedbackParts.push(`Booked next session: ${bookedNext === 'yes' ? 'Yes' : 'No'}`);
    }
    // Map option values to human-readable labels for feedback text
    const whatsInTheWayLabels: Record<string, string> = {
      'no_time': "Haven't had time to book",
      'hard_to_find_time': 'Hard to find a time that works',
      'not_sure_how': 'Not sure how to book',
      'waiting_to_decide': 'Waiting to see if I want to continue',
      'other': 'Other',
    };
    if (whatsInTheWayOption) {
      const inTheWay = whatsInTheWayOption === 'other'
        ? `Other: ${whatsInTheWayOtherText}`
        : whatsInTheWayLabels[whatsInTheWayOption] || whatsInTheWayOption;
      feedbackParts.push(`What's in the way: ${inTheWay}`);
    }
    if (anythingElseText) {
      feedbackParts.push(`Other feedback: ${anythingElseText}`);
    }
    if (openToChat !== null) {
      feedbackParts.push(`Open to quick chat: ${openToChat === 'yes' ? 'Yes' : 'No'}`);
    }

    // Build not_booked_reasons array
    let notBookedReasons: string[] | null = null;
    if (bookedNext === 'no' && whatsInTheWayOption) {
      if (whatsInTheWayOption === 'other') {
        notBookedReasons = [`Other: ${whatsInTheWayOtherText}`];
      } else {
        notBookedReasons = [whatsInTheWayLabels[whatsInTheWayOption] || whatsInTheWayOption];
      }
    }

    const checkinData: ScaleCheckinData = {
      sessionId,
      sessionNumber,
      coachName,
      sessionRating: experienceRating || 0,
      coachMatchRating: coachMatchRating || 0,
      feedbackText: feedbackParts.length > 0 ? feedbackParts.join('\n\n') : null,
      nps: npsScore || 0,
      testimonialConsent: openToChat === 'yes',
      nextSessionBooked: bookedNext === 'yes' ? true : bookedNext === 'no' ? false : null,
      notBookedReasons,
      openToFollowup: openToChat === 'yes' ? true : openToChat === 'no' ? false : null,
      // Employee data (passed from parent, not re-fetched)
      firstName,
      lastName,
      companyName,
      coachingProgram,
    };

    try {
      console.log('[CheckpointFlow] Submitting checkin data:', checkinData);
      const result = await submitCheckpoint(userEmail, checkinData);
      console.log('[CheckpointFlow] Submit result:', result);

      if (result.success && result.data) {
        // Store win in coaching_wins table if user entered one
        if (winsText.trim()) {
          await addCoachingWin(
            userEmail,
            employeeId,
            winsText.trim(),
            sessionNumber,
            false,
            'check_in_survey'
          );
        }

        setStep('complete');
        setTimeout(() => {
          onComplete(result.data!);
        }, 2000);
      } else {
        console.error('[CheckpointFlow] Submit failed:', result.error);
        setError(result.error || 'Something went wrong. Please try again.');
        setStep('open_to_chat');
      }
    } catch (err) {
      console.error('[CheckpointFlow] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setStep('open_to_chat');
    }
  };

  // Navigation helper
  const goToNextStep = () => {
    switch (step) {
      case 'experience_rating':
        setStep('coach_match');
        break;
      case 'coach_match':
        setStep(needsCoachFeedback ? 'whats_not_working' : 'wins');
        break;
      case 'whats_not_working':
        setStep('wins');
        break;
      case 'wins':
        setStep(needsCoachFeedback ? 'continue_with_coach' : 'booked_next');
        break;
      case 'continue_with_coach':
        setStep(continueWithCoach === 'explore' ? 'better_match' : 'booked_next');
        break;
      case 'better_match':
        setStep('booked_next');
        break;
      case 'booked_next':
        setStep(bookedNext === 'no' ? 'whats_in_the_way' : 'anything_else');
        break;
      case 'whats_in_the_way':
        setStep('anything_else');
        break;
      case 'anything_else':
        setStep('nps');
        break;
      case 'nps':
        setStep('open_to_chat');
        break;
      case 'open_to_chat':
        handleSubmit();
        break;
    }
  };

  const goToPrevStep = () => {
    switch (step) {
      case 'coach_match':
        setStep('experience_rating');
        break;
      case 'whats_not_working':
        setStep('coach_match');
        break;
      case 'wins':
        setStep(needsCoachFeedback ? 'whats_not_working' : 'coach_match');
        break;
      case 'continue_with_coach':
        setStep('wins');
        break;
      case 'better_match':
        setStep('continue_with_coach');
        break;
      case 'booked_next':
        if (needsCoachFeedback && continueWithCoach === 'explore') {
          setStep('better_match');
        } else if (needsCoachFeedback) {
          setStep('continue_with_coach');
        } else {
          setStep('wins');
        }
        break;
      case 'whats_in_the_way':
        setStep('booked_next');
        break;
      case 'anything_else':
        setStep(bookedNext === 'no' ? 'whats_in_the_way' : 'booked_next');
        break;
      case 'nps':
        setStep('anything_else');
        break;
      case 'open_to_chat':
        setStep('nps');
        break;
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'experience_rating':
        return experienceRating !== null;
      case 'coach_match':
        return coachMatchRating !== null;
      case 'whats_not_working':
        return whatsNotWorkingText.trim().length > 0;
      case 'wins':
        return true; // optional
      case 'continue_with_coach':
        return continueWithCoach !== null;
      case 'better_match':
        return betterMatchText.trim().length > 0;
      case 'booked_next':
        return bookedNext !== null;
      case 'whats_in_the_way':
        if (whatsInTheWayOption === 'other') {
          return whatsInTheWayOtherText.trim().length > 0;
        }
        return whatsInTheWayOption !== null;
      case 'anything_else':
        return true; // optional
      case 'nps':
        return npsScore !== null;
      case 'open_to_chat':
        return openToChat !== null;
      default:
        return false;
    }
  };

  const getNextButtonText = (): string => {
    if (step === 'open_to_chat') return 'Done';
    if (step === 'wins' && !winsText) return 'Skip';
    if (step === 'anything_else' && !anythingElseText) return 'Skip';
    return 'Next';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-boon-text/50 backdrop-blur-md">
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
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
                  Quick Check-In
                </h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                  ~2 min
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Help us make your experience better
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
          {/* Q1: Experience Rating */}
          {step === 'experience_rating' && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-2">
                  How's your coaching experience so far?
                </h3>
                <p className="text-gray-500 text-sm">1 = Not great, 10 = Amazing</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => setExperienceRating(score)}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      experienceRating === score
                        ? 'bg-boon-blue text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Q2: Coach Match */}
          {step === 'coach_match' && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-2">
                  How's your match with {coachFirstName}?
                </h3>
                <p className="text-gray-500 text-sm">1 = Not a fit, 10 = Perfect match</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => setCoachMatchRating(score)}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      coachMatchRating === score
                        ? 'bg-boon-blue text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Q3: What's not working (if match ≤8) */}
          {step === 'whats_not_working' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  What's not working?
                </label>
                <p className="text-gray-500 text-sm text-center mb-4">
                  Your honest feedback helps us improve
                </p>
                <textarea
                  value={whatsNotWorkingText}
                  onChange={(e) => setWhatsNotWorkingText(e.target.value)}
                  placeholder="Tell us what could be better..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Q4: Wins */}
          {step === 'wins' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  Any wins or breakthroughs since you started?
                </label>
                <textarea
                  value={winsText}
                  onChange={(e) => setWinsText(e.target.value)}
                  placeholder="Share something you're proud of... (optional)"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  This is optional - skip if nothing comes to mind
                </p>
              </div>
            </div>
          )}

          {/* Q5: Continue with coach (if match ≤8) */}
          {step === 'continue_with_coach' && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-6">
                  Continue with {coachFirstName}?
                </h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setContinueWithCoach('yes')}
                  className={`w-full p-5 rounded-2xl text-left transition-all border-2 ${
                    continueWithCoach === 'yes'
                      ? 'border-boon-blue bg-boon-lightBlue/30'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      continueWithCoach === 'yes' ? 'border-boon-blue bg-boon-blue' : 'border-gray-300'
                    }`}>
                      {continueWithCoach === 'yes' && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-bold text-boon-text">Yes, continue</span>
                  </div>
                </button>
                <button
                  onClick={() => setContinueWithCoach('explore')}
                  className={`w-full p-5 rounded-2xl text-left transition-all border-2 ${
                    continueWithCoach === 'explore'
                      ? 'border-boon-blue bg-boon-lightBlue/30'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      continueWithCoach === 'explore' ? 'border-boon-blue bg-boon-blue' : 'border-gray-300'
                    }`}>
                      {continueWithCoach === 'explore' && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-bold text-boon-text">Explore options</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Q6: Better match (if explore) */}
          {step === 'better_match' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  What would make a better match?
                </label>
                <p className="text-gray-500 text-sm text-center mb-4">
                  Help us find the right coach for you
                </p>
                <textarea
                  value={betterMatchText}
                  onChange={(e) => setBetterMatchText(e.target.value)}
                  placeholder="Coaching style, background, expertise..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Q7: Booked next session */}
          {step === 'booked_next' && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-6">
                  Booked your next session?
                </h3>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setBookedNext('yes')}
                  className={`px-10 py-4 rounded-2xl font-bold transition-all border-2 ${
                    bookedNext === 'yes'
                      ? 'border-boon-blue bg-boon-blue text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setBookedNext('no')}
                  className={`px-10 py-4 rounded-2xl font-bold transition-all border-2 ${
                    bookedNext === 'no'
                      ? 'border-boon-blue bg-boon-blue text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}

          {/* Q7b: What's in the way (if not booked) */}
          {step === 'whats_in_the_way' && (
            <div className="space-y-6 py-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-extrabold text-boon-text mb-2">
                  What's in the way?
                </h3>
                <p className="text-gray-500 text-sm">
                  We might be able to help
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { value: 'no_time', label: "Haven't had time to book" },
                  { value: 'hard_to_find_time', label: 'Hard to find a time that works' },
                  { value: 'not_sure_how', label: 'Not sure how to book' },
                  { value: 'waiting_to_decide', label: 'Waiting to see if I want to continue' },
                  { value: 'other', label: 'Other' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setWhatsInTheWayOption(option.value)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
                      whatsInTheWayOption === option.value
                        ? 'border-boon-blue bg-boon-lightBlue/30'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        whatsInTheWayOption === option.value ? 'border-boon-blue bg-boon-blue' : 'border-gray-300'
                      }`}>
                        {whatsInTheWayOption === option.value && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="font-medium text-boon-text">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              {whatsInTheWayOption === 'other' && (
                <textarea
                  value={whatsInTheWayOtherText}
                  onChange={(e) => setWhatsInTheWayOtherText(e.target.value)}
                  placeholder="Tell us more..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-24 mt-2"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Q8: Anything else */}
          {step === 'anything_else' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  Anything else?
                </label>
                <textarea
                  value={anythingElseText}
                  onChange={(e) => setAnythingElseText(e.target.value)}
                  placeholder="Any other thoughts... (optional)"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  This is optional - skip if nothing comes to mind
                </p>
              </div>
            </div>
          )}

          {/* Q9: NPS */}
          {step === 'nps' && (
            <div className="space-y-6 py-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-extrabold text-boon-text mb-2">
                  How likely are you to recommend Boon to a colleague?
                </h3>
                <p className="text-gray-500 text-sm">0 = Not likely, 10 = Extremely likely</p>
              </div>
              <div className="grid grid-cols-11 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => setNpsScore(score)}
                    className={`py-3 rounded-lg text-xs font-bold transition-all ${
                      npsScore === score
                        ? 'bg-boon-blue text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Q10: Open to chat */}
          {step === 'open_to_chat' && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-2">
                  Open to a quick chat with our team?
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  We'd love to hear more about your experience
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setOpenToChat('yes')}
                  className={`px-10 py-4 rounded-2xl font-bold transition-all border-2 ${
                    openToChat === 'yes'
                      ? 'border-boon-blue bg-boon-blue text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setOpenToChat('no')}
                  className={`px-10 py-4 rounded-2xl font-bold transition-all border-2 ${
                    openToChat === 'no'
                      ? 'border-boon-blue bg-boon-blue text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  No
                </button>
              </div>
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
              <p className="text-gray-600 font-medium">Saving...</p>
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
                Thanks!
              </h3>
              <p className="text-gray-500">
                Your feedback helps us improve.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'submitting' && step !== 'complete' && (
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              {step !== 'experience_rating' ? (
                <button
                  onClick={goToPrevStep}
                  className="px-6 py-3 text-gray-500 font-bold hover:text-boon-text transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
              >
                {getNextButtonText()}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
