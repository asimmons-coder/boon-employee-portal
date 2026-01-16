import { useMemo } from 'react';
import type { Session, CompetencyScore, BaselineSurvey } from '../lib/types';

interface GrowthStoryProps {
  sessions: Session[];
  competencyScores: CompetencyScore[];
  baseline: BaselineSurvey | null;
}

// The 12 competencies with narrative templates
const COMPETENCY_NARRATIVES: Record<string, { growth: string; strength: string }> = {
  'adaptability_and_resilience': {
    growth: 'You learned to embrace change rather than resist it—finding stability in uncertainty.',
    strength: 'Your ability to adapt and bounce back from setbacks is a cornerstone of your leadership.',
  },
  'building_relationships_at_work': {
    growth: 'You invested in authentic connections, building trust across your team and beyond.',
    strength: 'Your skill in building meaningful work relationships sets you apart as a leader.',
  },
  'change_management': {
    growth: 'You developed the ability to guide others through transitions with clarity and empathy.',
    strength: 'Your capacity to lead change effectively is one of your defining strengths.',
  },
  'delegation_and_accountability': {
    growth: 'You learned to trust your team by letting go—delegating with clarity, then stepping back.',
    strength: 'Your approach to delegation empowers others while maintaining accountability.',
  },
  'effective_communication': {
    growth: 'You became more intentional with your words, saying what matters clearly and directly.',
    strength: 'Your communication style brings clarity to complexity and helps others understand.',
  },
  'effective_planning_and_execution': {
    growth: 'You sharpened your ability to turn ideas into action with focus and follow-through.',
    strength: 'Your skill in planning and executing keeps your team aligned and productive.',
  },
  'emotional_intelligence': {
    growth: 'You grew in reading the room—understanding emotions, both your own and others\'.',
    strength: 'Your emotional intelligence creates psychological safety for those around you.',
  },
  'giving_and_receiving_feedback': {
    growth: 'You learned to deliver difficult messages with care and receive input with openness.',
    strength: 'Your ability to exchange feedback constructively drives growth in your team.',
  },
  'persuasion_and_influence': {
    growth: 'You discovered how to lead without authority—influencing through connection, not command.',
    strength: 'Your influence extends beyond your role through genuine persuasion and trust.',
  },
  'self_confidence_and_imposter_syndrome': {
    growth: 'You confronted the inner critic and found a steadier sense of your own value.',
    strength: 'Your quiet confidence inspires others and anchors your leadership presence.',
  },
  'strategic_thinking': {
    growth: 'You elevated your perspective—seeing patterns, anticipating consequences, thinking ahead.',
    strength: 'Your strategic mindset helps your team see the bigger picture.',
  },
  'time_management_and_productivity': {
    growth: 'You became more intentional with your time, protecting what matters most.',
    strength: 'Your disciplined approach to time enables you to lead effectively under pressure.',
  },
};

// Theme-based narratives
const THEME_NARRATIVES: Record<string, string[]> = {
  leadership: [
    'You moved from reaction to intention—learning to pause before responding.',
    'You built confidence in setting direction and holding your team to high standards.',
    'You discovered that leading well starts with leading yourself.',
  ],
  communication: [
    'You found your voice—learning to speak with clarity even in difficult moments.',
    'You became more present in conversations, listening to understand, not just respond.',
    'You learned that the most powerful messages are often the simplest ones.',
  ],
  wellbeing: [
    'You recognized that sustainable leadership requires sustainable energy.',
    'You set boundaries that protect your capacity to show up fully.',
    'You learned to manage your energy, not just your time.',
  ],
};

export default function GrowthStory({ sessions, competencyScores, baseline }: GrowthStoryProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');

  // Calculate theme emphasis from sessions
  const themeEmphasis = useMemo(() => {
    const counts = {
      leadership: completedSessions.filter(s => s.leadership_management_skills).length,
      communication: completedSessions.filter(s => s.communication_skills).length,
      wellbeing: completedSessions.filter(s => s.mental_well_being).length,
    };
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([theme]) => theme);
  }, [completedSessions]);

  // Find top competencies by growth
  const topGrowthCompetencies = useMemo(() => {
    if (!baseline || competencyScores.length === 0) return [];

    return competencyScores
      .map(score => {
        const key = score.competency_name.toLowerCase().replace(/ /g, '_').replace(/&/g, 'and');
        const baselineKey = `comp_${key}` as keyof BaselineSurvey;
        const baselineValue = baseline[baselineKey] as number | null;

        if (!baselineValue) return null;

        const growth = ((score.score - baselineValue) / baselineValue) * 100;
        return { key, score: score.score, baseline: baselineValue, growth };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.growth || 0) - (a?.growth || 0))
      .slice(0, 2);
  }, [competencyScores, baseline]);

  // Generate narrative statements
  const narratives = useMemo(() => {
    const statements: string[] = [];

    // Add theme-based narratives (pick one from each top theme)
    themeEmphasis.forEach(theme => {
      const themeNarratives = THEME_NARRATIVES[theme];
      if (themeNarratives) {
        // Pick a deterministic one based on session count to avoid randomness
        const index = completedSessions.length % themeNarratives.length;
        statements.push(themeNarratives[index]);
      }
    });

    // Add competency-based narratives for growth areas
    topGrowthCompetencies.forEach(comp => {
      if (comp && COMPETENCY_NARRATIVES[comp.key]) {
        statements.push(COMPETENCY_NARRATIVES[comp.key].growth);
      }
    });

    // Ensure we have at least 2-3 statements
    return statements.slice(0, 3);
  }, [themeEmphasis, topGrowthCompetencies, completedSessions]);

  if (narratives.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-purple-50 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border border-purple-100">
      <h2 className="text-xl font-extrabold text-boon-text mb-6">Your Growth Story</h2>
      <div className="space-y-5">
        {narratives.map((narrative, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-white"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold text-sm">
              {i + 1}
            </div>
            <p className="text-gray-700 leading-relaxed text-[15px] italic">
              "{narrative}"
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-6 text-center">
        Based on your {completedSessions.length} sessions and competency growth
      </p>
    </section>
  );
}
