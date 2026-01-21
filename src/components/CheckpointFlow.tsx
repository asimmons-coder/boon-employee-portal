import { useState } from 'react';
import type { Checkpoint } from '../lib/types';
import { submitCheckpoint, addCoachingWin, type ScaleCheckinData } from '../lib/dataFetcher';

interface CheckpointFlowProps {
  userEmail: string;
  employeeId: string | number;
  sessionId: string;
  sessionNumber: number;
  coachName: string;
  onComplete: (checkpoint: Checkpoint) => void;
  onClose: () => void;
}

type Step = 'session_rating' | 'coach_match' | 'low_score_feedback' | 'wins' | 'anything_else' | 'nps' | 'submitting' | 'complete';

export default function CheckpointFlow({
  userEmail,
  employeeId,
  sessionId,
  sessionNumber,
  coachName,
  onComplete,
  onClose,
}: CheckpointFlowProps) {
  const [step, setStep] = useState<Step>('session_rating');
  const [sessionRating, setSessionRating] = useState<number | null>(null);
  const [coachMatchRating, setCoachMatchRating] = useState<number | null>(null);
  const [lowScoreFeedback, setLowScoreFeedback] = useState('');
  const [winsText, setWinsText] = useState('');
  const [anythingElseText, setAnythingElseText] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [testimonialConsent, setTestimonialConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we need the low score feedback step
  const needsLowScoreFeedback = (sessionRating !== null && sessionRating <= 8) ||
                                 (coachMatchRating !== null && coachMatchRating <= 8);

  const isFirstCheckpoint = sessionNumber === 1;
  const coachFirstName = coachName?.split(' ')[0] || 'your coach';

  // Calculate progress (adjust based on whether low score feedback is needed)
  const totalSteps = needsLowScoreFeedback ? 6 : 5;
  const getStepNumber = () => {
    if (step === 'session_rating') return 1;
    if (step === 'coach_match') return 2;
    if (step === 'low_score_feedback') return 3;
    if (step === 'wins') return needsLowScoreFeedback ? 4 : 3;
    if (step === 'anything_else') return needsLowScoreFeedback ? 5 : 4;
    if (step === 'nps') return needsLowScoreFeedback ? 6 : 5;
    return totalSteps;
  };
  const progressPercent = Math.round((getStepNumber() / totalSteps) * 100);

  const handleSubmit = async () => {
    setStep('submitting');
    setError(null);

    // Build combined feedback text
    const feedbackParts = [
      lowScoreFeedback ? `Feedback: ${lowScoreFeedback}` : '',
      winsText ? `Wins: ${winsText}` : '',
      anythingElseText ? `Other: ${anythingElseText}` : '',
    ].filter(Boolean);

    const checkinData: ScaleCheckinData = {
      sessionId,
      sessionNumber,
      coachName,
      sessionRating: sessionRating || 0,
      coachMatchRating: coachMatchRating || 0,
      feedbackText: feedbackParts.length > 0 ? feedbackParts.join('\n\n') : null,
      nps: npsScore || 0,
      testimonialConsent,
    };

    const result = await submitCheckpoint(userEmail, checkinData);

    if (result.success && result.data) {
      // Store win in coaching_wins table if user entered one
      if (winsText.trim()) {
        await addCoachingWin(
          userEmail,
          employeeId,
          winsText.trim(),
          sessionNumber,
          false, // isPrivate
          'check_in_survey'
        );
      }

      setStep('complete');
      setTimeout(() => {
        onComplete(result.data!);
      }, 2000);
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
      setStep('nps');
    }
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
                  {isFirstCheckpoint ? 'Quick Check-In' : `Check-In ${sessionNumber}`}
                </h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                  ~1 min
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {isFirstCheckpoint ? 'How was your first session?' : 'A quick pulse check'}
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
          {/* Step 1: Session Rating */}
          {step === 'session_rating' && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-boon-text mb-2">
                  How was your {isFirstCheckpoint ? 'first' : 'latest'} session?
                </h3>
                <p className="text-gray-500 text-sm">1 = Not great, 10 = Amazing</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => setSessionRating(score)}
                    className={`py-4 rounded-xl text-sm font-bold transition-all ${
                      sessionRating === score
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

          {/* Step 2: Coach Match */}
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

          {/* Step 3: Low Score Feedback (conditional) */}
          {step === 'low_score_feedback' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  We'd love to make this better. What's not working?
                </label>
                <p className="text-gray-500 text-sm text-center mb-4">
                  Your honest feedback helps us improve
                </p>
                <textarea
                  value={lowScoreFeedback}
                  onChange={(e) => setLowScoreFeedback(e.target.value)}
                  placeholder="Tell us what could be better..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 4: Wins */}
          {step === 'wins' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  Any wins or breakthroughs to celebrate?
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

          {/* Step 5: Anything Else */}
          {step === 'anything_else' && (
            <div className="space-y-6 py-4">
              <div>
                <label className="block text-lg font-bold text-boon-text mb-3 text-center">
                  Anything else you'd like to share?
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

          {/* Step 6: NPS */}
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

              {/* Testimonial Ask - only for high NPS */}
              {npsScore !== null && npsScore >= 9 && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testimonialConsent}
                      onChange={(e) => setTestimonialConsent(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-boon-blue focus:ring-boon-blue"
                    />
                    <span className="text-sm text-green-800 font-medium">
                      I'm open to sharing a testimonial
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
              {/* Back button */}
              {step !== 'session_rating' ? (
                <button
                  onClick={() => {
                    if (step === 'coach_match') setStep('session_rating');
                    if (step === 'low_score_feedback') setStep('coach_match');
                    if (step === 'wins') setStep(needsLowScoreFeedback ? 'low_score_feedback' : 'coach_match');
                    if (step === 'anything_else') setStep('wins');
                    if (step === 'nps') setStep('anything_else');
                  }}
                  className="px-6 py-3 text-gray-500 font-bold hover:text-boon-text transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {/* Next button */}
              {step === 'session_rating' && (
                <button
                  onClick={() => setStep('coach_match')}
                  disabled={sessionRating === null}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Next
                </button>
              )}
              {step === 'coach_match' && (
                <button
                  onClick={() => {
                    // Check if low score feedback is needed (either rating ≤8)
                    const needsFeedback = (sessionRating !== null && sessionRating <= 8) ||
                                          (coachMatchRating !== null && coachMatchRating <= 8);
                    setStep(needsFeedback ? 'low_score_feedback' : 'wins');
                  }}
                  disabled={coachMatchRating === null}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Next
                </button>
              )}
              {step === 'low_score_feedback' && (
                <button
                  onClick={() => setStep('wins')}
                  disabled={!lowScoreFeedback.trim()}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Next
                </button>
              )}
              {step === 'wins' && (
                <button
                  onClick={() => setStep('anything_else')}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl transition-all hover:bg-boon-darkBlue"
                >
                  {winsText ? 'Next' : 'Skip'}
                </button>
              )}
              {step === 'anything_else' && (
                <button
                  onClick={() => setStep('nps')}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl transition-all hover:bg-boon-darkBlue"
                >
                  {anythingElseText ? 'Next' : 'Skip'}
                </button>
              )}
              {step === 'nps' && (
                <button
                  onClick={handleSubmit}
                  disabled={npsScore === null}
                  className="px-8 py-3 bg-boon-blue text-white font-bold rounded-xl disabled:bg-gray-200 disabled:text-gray-400 transition-all hover:bg-boon-darkBlue"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
