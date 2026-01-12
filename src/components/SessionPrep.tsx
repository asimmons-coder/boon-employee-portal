import type { Session, ActionItem } from '../lib/types';

interface SessionPrepProps {
  sessions: Session[];
  actionItems: ActionItem[];
  coachName: string;
}

export default function SessionPrep({ sessions, actionItems, coachName }: SessionPrepProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const pendingActions = actionItems.filter(a => a.status === 'pending');
  const lastSession = completedSessions[0];

  // Calculate days since last session
  const daysSinceLastSession = lastSession
    ? Math.floor((Date.now() - new Date(lastSession.session_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine dominant themes
  const themeCount = {
    leadership: completedSessions.filter(s => s.leadership_management_skills).length,
    communication: completedSessions.filter(s => s.communication_skills).length,
    wellbeing: completedSessions.filter(s => s.mental_well_being).length,
  };
  const dominantTheme = Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0];

  // Generate personalized prompts based on context
  function generatePrompts(): string[] {
    const prompts: string[] = [];

    // Time-based prompts
    if (daysSinceLastSession !== null) {
      if (daysSinceLastSession > 21) {
        prompts.push("It's been a few weeks since we last connected. What's been the biggest challenge or win since then?");
      } else if (daysSinceLastSession > 7) {
        prompts.push("Thinking back over the past couple weeks, what situation tested you the most?");
      }
    }

    // Action item prompts
    if (pendingActions.length > 0) {
      const action = pendingActions[0];
      prompts.push(`How did it go with "${action.action_text.substring(0, 50)}${action.action_text.length > 50 ? '...' : ''}"?`);
    }

    // Theme-based prompts
    if (dominantTheme && dominantTheme[1] > 2) {
      const themePrompts: Record<string, string[]> = {
        leadership: [
          "What leadership moment are you most proud of recently?",
          "Where did you feel most challenged as a leader this week?",
          "How has your approach to leading your team evolved?",
        ],
        communication: [
          "What conversation went better than expected recently?",
          "Is there a difficult conversation you've been avoiding?",
          "What have you noticed about your communication patterns?",
        ],
        wellbeing: [
          "How are your energy levels? What's draining vs. energizing you?",
          "What boundaries have you maintained well? Which need work?",
          "When did you feel most centered this week?",
        ],
      };
      const themeSpecific = themePrompts[dominantTheme[0]];
      if (themeSpecific) {
        prompts.push(themeSpecific[Math.floor(Math.random() * themeSpecific.length)]);
      }
    }

    // Session count prompts
    if (completedSessions.length <= 3) {
      prompts.push("What's one thing you'd like your coach to know about how you work best?");
    } else if (completedSessions.length >= 10) {
      prompts.push("Looking back at your coaching journey, what shift has been most significant?");
    }

    // Default prompts if we don't have enough
    const defaults = [
      "What's top of mind for you right now?",
      "What would make this next session most valuable?",
      "Where are you feeling stuck or uncertain?",
    ];

    while (prompts.length < 3) {
      const defaultPrompt = defaults[prompts.length];
      if (defaultPrompt && !prompts.includes(defaultPrompt)) {
        prompts.push(defaultPrompt);
      }
    }

    return prompts.slice(0, 3);
  }

  const prompts = generatePrompts();
  const coachFirstName = coachName.split(' ')[0];

  if (completedSessions.length === 0) {
    return null; // Don't show for brand new users
  }

  return (
    <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border border-boon-blue/10 shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-boon-blue/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-boon-text">Prep for your next session</h2>
          <p className="text-sm text-gray-500 mt-1">
            Reflect on these before meeting with {coachFirstName}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {prompts.map((prompt, idx) => (
          <div
            key={idx}
            className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100 hover:border-boon-blue/20 transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-boon-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <p className="text-boon-text font-medium leading-relaxed">{prompt}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Personalized based on your {completedSessions.length} sessions
        {pendingActions.length > 0 && ` and ${pendingActions.length} action item${pendingActions.length > 1 ? 's' : ''}`}
      </p>
    </section>
  );
}
