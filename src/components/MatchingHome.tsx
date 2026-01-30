import type { Employee, BaselineSurvey, WelcomeSurveyScale, ProgramType, View } from '../lib/types';
import { SCALE_FOCUS_AREA_LABELS } from '../lib/types';

interface MatchingHomeProps {
  profile: Employee | null;
  baseline: BaselineSurvey | null;
  welcomeSurveyScale: WelcomeSurveyScale | null;
  programType: ProgramType | null;
  onNavigate?: (view: View) => void;
}

/**
 * MatchingHome - Full dashboard experience for employees waiting for coach match
 * Shows matching status banner + goals/program info instead of a blank waiting page
 */
export default function MatchingHome({
  profile,
  baseline,
  welcomeSurveyScale,
  programType,
  onNavigate,
}: MatchingHomeProps) {
  // Determine if we have survey data to show
  const isScaleUser = programType === 'SCALE';
  const hasWelcomeSurvey = isScaleUser ? welcomeSurveyScale !== null : baseline !== null;

  // Get coaching goals from the appropriate survey
  const rawCoachingGoals = isScaleUser
    ? (welcomeSurveyScale?.coaching_goals || welcomeSurveyScale?.additional_topics)
    : baseline?.coaching_goals;

  // Check if coaching goals are valid/helpful (not empty, "no", "n/a", "none", etc.)
  const isValidCoachingGoals = (goals: string | null | undefined): boolean => {
    if (!goals) return false;
    const trimmed = goals.trim().toLowerCase();
    if (trimmed.length < 5) return false;
    const unhelpfulResponses = ['no', 'n/a', 'na', 'none', 'nothing', 'no.', 'n/a.', 'none.', '-', '--', '...', 'idk', 'not sure', 'unsure', 'no idea'];
    return !unhelpfulResponses.includes(trimmed);
  };

  const coachingGoals = isValidCoachingGoals(rawCoachingGoals) ? rawCoachingGoals : null;

  // Get focus areas from SCALE survey (selected boolean fields)
  const scaleFocusAreas = welcomeSurveyScale ? Object.entries(SCALE_FOCUS_AREA_LABELS)
    .filter(([key]) => welcomeSurveyScale[key as keyof WelcomeSurveyScale] === true)
    .map(([, label]) => label)
  : [];

  // GROW focus area labels (maps focus_* fields to display labels)
  const growFocusAreaLabels: Record<string, string> = {
    focus_effective_communication: 'Effective Communication',
    focus_persuasion_and_influence: 'Persuasion & Influence',
    focus_adaptability_and_resilience: 'Adaptability & Resilience',
    focus_strategic_thinking: 'Strategic Thinking',
    focus_emotional_intelligence: 'Emotional Intelligence',
    focus_building_relationships_at_work: 'Building Relationships',
    focus_self_confidence_and_imposter_syndrome: 'Self-Confidence',
    focus_delegation_and_accountability: 'Delegation & Accountability',
    focus_giving_and_receiving_feedback: 'Giving & Receiving Feedback',
    focus_effective_planning_and_execution: 'Planning & Execution',
    focus_change_management: 'Change Management',
    focus_time_management_and_productivity: 'Time Management',
  };

  // Get selected focus areas from GROW baseline
  const growFocusAreas = baseline ? Object.entries(growFocusAreaLabels)
    .filter(([key]) => {
      const value = baseline[key as keyof typeof baseline];
      return value === true || value === 'true';
    })
    .map(([, label]) => label)
  : [];

  // Use appropriate focus areas based on program type
  const focusAreas = isScaleUser ? scaleFocusAreas : growFocusAreas;

  // Program display info
  const programDisplayName = programType === 'SCALE' ? 'SCALE' : programType === 'GROW' ? 'GROW' : programType === 'EXEC' ? 'Executive Coaching' : 'Coaching Program';
  const companyName = profile?.company_name || null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-10 animate-fade-in">
      {/* Header */}
      <header className="text-center pt-2">
        <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
          Hi {profile?.first_name || 'there'}
        </h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">
          Your coaching journey is starting
        </p>
      </header>

      {/* Matching Status Banner */}
      <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/30 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg">
        {/* Icon and Status Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-boon-lightBlue to-boon-blue/20 rounded-full flex items-center justify-center mb-4 relative">
            <svg className="w-10 h-10 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-boon-blue/30 animate-ping" />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 text-sm text-boon-blue bg-boon-lightBlue px-4 py-2 rounded-full mb-4">
            <div className="w-2 h-2 bg-boon-blue rounded-full animate-pulse" />
            Matching in progress
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-boon-text mb-2">
            Finding your best coach
          </h2>
          <p className="text-gray-500 max-w-md">
            We're carefully matching you with a coach who fits your goals, preferences, and style.
          </p>
        </div>

        {/* What's Happening Timeline */}
        <div className="bg-white/60 rounded-2xl p-6 mb-6">
          <p className="text-sm font-bold text-boon-text mb-4">What's happening:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700">Your preferences have been recorded</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-boon-lightBlue flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-boon-blue rounded-full animate-pulse" />
              </div>
              <span className="text-gray-700">Reviewing coaches who match your goals</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-gray-300 rounded-full" />
              </div>
              <span className="text-gray-400">You'll receive an email when matched</span>
            </li>
          </ul>
        </div>

        {/* Timeline Note */}
        <div className="bg-gradient-to-r from-boon-blue/5 to-boon-lightBlue/30 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-600">
            Most people are matched within <span className="font-bold text-boon-text">24-48 hours</span>
          </p>
        </div>
      </section>

      {/* Your Goals Section - Show what they shared in welcome survey */}
      {hasWelcomeSurvey && (coachingGoals || focusAreas.length > 0) && (
        <section className="bg-gradient-to-br from-purple-50 to-boon-bg rounded-[2rem] p-8 border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-boon-text">
              Your Goals
            </h2>
          </div>

          {/* Show coaching goals if they exist */}
          {coachingGoals && (
            <div className="mb-6">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">
                What you're hoping to work on
              </p>
              <p className="text-gray-700 bg-white/60 p-4 rounded-xl border border-purple-100/50 italic leading-relaxed">
                "{coachingGoals}"
              </p>
            </div>
          )}

          {/* Show focus areas */}
          {focusAreas.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Focus areas you selected
              </p>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1.5 text-sm font-medium bg-white/70 text-purple-700 rounded-full border border-purple-200/50"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation message */}
          <p className="text-sm text-gray-500 mt-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Your coach will use this to personalize your first conversation
          </p>
        </section>
      )}

      {/* About Your Program */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-boon-lightBlue flex items-center justify-center">
            <svg className="w-4 h-4 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-boon-text">
            About Your Program
          </h2>
        </div>

        <div className="space-y-2">
          {companyName && (
            <p className="text-xl font-bold text-boon-text">
              {companyName} Coaching Program
            </p>
          )}
          <p className="text-gray-500">
            <span className="font-semibold text-boon-blue">{programDisplayName}</span>
            {programType === 'SCALE' && ' • Ongoing coaching sessions'}
            {programType === 'GROW' && ' • 12 structured sessions'}
            {programType === 'EXEC' && ' • Executive coaching sessions'}
          </p>
        </div>
      </section>

      {/* What to Expect */}
      <section className="bg-gradient-to-br from-boon-bg via-white to-green-50/30 rounded-[2rem] p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-boon-text">
            What to Expect
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-boon-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-bold text-boon-text">Get matched with your coach</p>
              <p className="text-sm text-gray-500">Usually within 24-48 hours</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-boon-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-bold text-boon-text">Book your first session</p>
              <p className="text-sm text-gray-500">Choose a time that works for you</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-boon-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-bold text-boon-text">Start your coaching journey</p>
              <p className="text-sm text-gray-500">Your coach receives your goals to personalize your first conversation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore While You Wait */}
      <section className="bg-gradient-to-br from-boon-bg via-white to-purple-50/30 rounded-[2rem] p-8 border border-gray-100 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-boon-text mb-2">Explore While You Wait</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Check out the Practice Space—AI-powered scenarios to help you prepare for real leadership moments.
        </p>
        <button
          onClick={() => onNavigate?.('practice')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
        >
          Explore Practice Space
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* Support */}
      <div className="text-center pb-8">
        <p className="text-sm text-gray-400">
          Questions?{' '}
          <a href="mailto:support@boon-health.com" className="text-boon-blue hover:underline">
            Email support@boon-health.com
          </a>
        </p>
      </div>
    </div>
  );
}
