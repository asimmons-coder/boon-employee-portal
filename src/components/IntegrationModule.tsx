import { useState } from 'react';
import type { Session } from '../lib/types';

interface IntegrationModuleProps {
  coachName: string;
  sessions: Session[];
}

interface IntegrationPrompt {
  id: string;
  title: string;
  description: string;
  category: 'reflection' | 'action' | 'mindset';
  icon: string;
}

const INTEGRATION_PROMPTS: IntegrationPrompt[] = [
  {
    id: 'high-stakes',
    title: 'Prepare for a High-Stakes Moment',
    description: 'Use your coaching insights to prepare for an important conversation, presentation, or decision.',
    category: 'action',
    icon: '🎯',
  },
  {
    id: 'reflect-growth',
    title: 'Reflect on Your Growth',
    description: 'Look back at where you started and recognize the shifts in how you lead and communicate.',
    category: 'reflection',
    icon: '🌱',
  },
  {
    id: 'challenge-response',
    title: 'Navigate a Challenge',
    description: 'Apply your coaching frameworks to a current challenge you\'re facing.',
    category: 'action',
    icon: '🧭',
  },
  {
    id: 'energy-check',
    title: 'Check Your Energy',
    description: 'Notice where your energy is flowing and where it\'s being drained. What adjustments can you make?',
    category: 'mindset',
    icon: '⚡',
  },
  {
    id: 'leadership-identity',
    title: 'Strengthen Your Leadership Identity',
    description: 'Reconnect with the leader you\'ve become. What do you stand for?',
    category: 'mindset',
    icon: '👤',
  },
  {
    id: 'teach-others',
    title: 'Share What You\'ve Learned',
    description: 'The best way to deepen your understanding is to teach others. Who could benefit from your insights?',
    category: 'action',
    icon: '💬',
  },
];

export default function IntegrationModule({ coachName, sessions }: IntegrationModuleProps) {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  // Get key themes from sessions
  const sessionThemes = sessions.reduce((acc, session) => {
    if (session.leadership_management_skills) acc.leadership++;
    if (session.communication_skills) acc.communication++;
    if (session.mental_well_being) acc.wellbeing++;
    return acc;
  }, { leadership: 0, communication: 0, wellbeing: 0 });

  const primaryTheme = Object.entries(sessionThemes).sort((a, b) => b[1] - a[1])[0];
  const themeLabels: Record<string, string> = {
    leadership: 'Leadership & Management',
    communication: 'Communication',
    wellbeing: 'Mental Well-being',
  };

  return (
    <section className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-[2.5rem] p-8 md:p-10 border border-green-100 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">🎓</span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-boon-text">Integration</h2>
          <p className="text-sm text-gray-500">Apply your coaching in real moments</p>
        </div>
      </div>

      {/* Key Insight Banner */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h3 className="font-bold text-boon-text mb-1">Your Coaching Foundation</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Over {sessions.length} sessions with {coachName}, you've developed deep insights in{' '}
              <span className="font-semibold text-green-700">{themeLabels[primaryTheme?.[0] || 'leadership']}</span>.
              The real transformation happens when you apply these insights in moments that matter.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Prompts Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {INTEGRATION_PROMPTS.map(prompt => (
          <button
            key={prompt.id}
            onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
            className={`text-left p-5 rounded-2xl border transition-all ${
              expandedPrompt === prompt.id
                ? 'bg-white border-green-200 shadow-md'
                : 'bg-white/40 border-white hover:bg-white hover:border-green-100 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{prompt.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-boon-text text-sm mb-1">{prompt.title}</h4>
                <p className={`text-xs text-gray-500 leading-relaxed ${
                  expandedPrompt === prompt.id ? '' : 'line-clamp-2'
                }`}>
                  {prompt.description}
                </p>
                {expandedPrompt === prompt.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">
                      Try This
                    </p>
                    <p className="text-sm text-gray-600">
                      {prompt.category === 'action' && 'Open Practice Space to work through this scenario with your AI coach.'}
                      {prompt.category === 'reflection' && 'Review your session summaries to trace your growth journey.'}
                      {prompt.category === 'mindset' && 'Take 5 minutes to journal on this prompt before your next meeting.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Action */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white/60 rounded-2xl border border-white">
        <div>
          <p className="font-bold text-boon-text text-sm">Ready to practice?</p>
          <p className="text-xs text-gray-500">Use Practice Space to prepare for your next high-stakes moment.</p>
        </div>
        <button className="px-6 py-3 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95 whitespace-nowrap">
          Open Practice Space →
        </button>
      </div>
    </section>
  );
}
