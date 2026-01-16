import { useMemo } from 'react';
import type { ActionItem, Session } from '../lib/types';

interface KeyTakeawaysProps {
  actionItems: ActionItem[];
  sessions: Session[];
}

// Keywords to themes mapping for clustering
const THEME_KEYWORDS: Record<string, string[]> = {
  leadership: ['delegate', 'lead', 'team', 'decision', 'vision', 'strategy', 'empower', 'direct', 'manage'],
  communication: ['feedback', 'conversation', 'listen', 'speak', 'message', 'communicate', 'present', 'share', 'discuss'],
  wellbeing: ['pause', 'boundary', 'energy', 'stress', 'balance', 'reflect', 'breathe', 'calm', 'rest'],
  values: ['value', 'authentic', 'trust', 'integrity', 'principle', 'belief'],
  confidence: ['confidence', 'imposter', 'voice', 'assert', 'advocate', 'own'],
};

// Synthesized takeaway templates by theme
const TAKEAWAY_TEMPLATES: Record<string, string[]> = {
  leadership: [
    'Lead by example—your actions set the standard for your team.',
    'Delegate with clarity, then trust the outcome.',
    'Make decisions with conviction, even with incomplete information.',
  ],
  communication: [
    'Practice the pause before responding in tense moments.',
    'Ask more questions than you give answers.',
    'Deliver difficult messages with directness and care.',
  ],
  wellbeing: [
    'Protect your energy as fiercely as you protect your calendar.',
    'Boundaries are not barriers—they enable you to show up fully.',
    'When overwhelmed, simplify—focus on what matters most.',
  ],
  values: [
    'Name your values and lead from them visibly.',
    'Let authenticity guide your leadership, not perfection.',
    'Trust is built through consistency, not grand gestures.',
  ],
  confidence: [
    'Your voice matters—use it, even when it feels risky.',
    'The inner critic is not the truth. Act anyway.',
    'Own your successes as readily as your growth areas.',
  ],
  general: [
    'Small, consistent actions compound into significant change.',
    'What got you here won\'t get you there—keep evolving.',
    'Leadership is a practice, not a destination.',
  ],
};

function detectTheme(text: string): string {
  const lowerText = text.toLowerCase();

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return theme;
    }
  }

  return 'general';
}

export default function KeyTakeaways({ actionItems, sessions }: KeyTakeawaysProps) {
  const completedActions = actionItems.filter(a => a.status === 'completed');
  const completedSessions = sessions.filter(s => s.status === 'Completed');

  // Cluster completed actions by theme
  const themeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};

    completedActions.forEach(action => {
      const theme = detectTheme(action.action_text);
      counts[theme] = (counts[theme] || 0) + 1;
    });

    // Also consider session themes
    completedSessions.forEach(session => {
      if (session.leadership_management_skills) counts['leadership'] = (counts['leadership'] || 0) + 1;
      if (session.communication_skills) counts['communication'] = (counts['communication'] || 0) + 1;
      if (session.mental_well_being) counts['wellbeing'] = (counts['wellbeing'] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme);
  }, [completedActions, completedSessions]);

  // Generate takeaways based on theme distribution
  const takeaways = useMemo(() => {
    const result: string[] = [];

    themeDistribution.forEach(theme => {
      const templates = TAKEAWAY_TEMPLATES[theme] || TAKEAWAY_TEMPLATES.general;
      // Pick deterministically based on total items to avoid randomness
      const index = (completedActions.length + completedSessions.length) % templates.length;
      result.push(templates[index]);
    });

    // Ensure we have at least 2-3 takeaways
    if (result.length < 2) {
      const generalTemplates = TAKEAWAY_TEMPLATES.general;
      while (result.length < 3 && result.length < generalTemplates.length) {
        const template = generalTemplates[result.length];
        if (!result.includes(template)) {
          result.push(template);
        }
      }
    }

    return result.slice(0, 3);
  }, [themeDistribution, completedActions.length, completedSessions.length]);

  if (completedActions.length === 0 && completedSessions.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-boon-text">Key Takeaways</h2>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Lasting principles from your {completedActions.length} completed action items
      </p>

      <div className="space-y-4">
        {takeaways.map((takeaway, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100/50"
          >
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-gray-700 font-medium text-[15px]">{takeaway}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
