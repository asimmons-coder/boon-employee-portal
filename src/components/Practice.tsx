import { useState, useMemo, useEffect, useCallback } from 'react';
import { SCENARIOS, CATEGORY_INFO, type PracticeScenario, type ScenarioCategory } from '../data/scenarios';
import type { Session, CompetencyScore } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState } from '../lib/coachingState';
import PracticeModal from './PracticeModal';
import TeamManager from './TeamManager';
import { getTeamMembers, getSavedPlans, deleteSavedPlan, type TeamMember, type SavedPlan } from '../lib/storageService';

interface PracticeProps {
  sessions: Session[];
  coachName: string;
  userEmail: string;
  coachingState: CoachingStateData;
  competencyScores?: CompetencyScore[];
}

export default function Practice({ sessions, coachName, userEmail, coachingState, competencyScores = [] }: PracticeProps) {
  const isCompleted = isAlumniState(coachingState.state);
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | 'all'>('all');
  const [selectedScenario, setSelectedScenario] = useState<PracticeScenario | null>(null);
  const [customSituation, setCustomSituation] = useState('');

  // Team & Playbook state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [_isLoading, setIsLoading] = useState(true);

  // Load team members and saved plans
  const refreshData = useCallback(async () => {
    if (!userEmail) return;
    const [members, plans] = await Promise.all([
      getTeamMembers(userEmail),
      getSavedPlans(userEmail)
    ]);
    setTeamMembers(members);
    setSavedPlans(plans);
  }, [userEmail]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    };
    loadData();
  }, [refreshData]);

  const handleDeletePlan = async (id: string) => {
    if (confirm('Delete this saved plan?')) {
      await deleteSavedPlan(id);
      refreshData();
    }
  };

  const handleOpenSavedPlan = (plan: SavedPlan) => {
    // Find the original scenario or create a custom one
    const originalScenario = SCENARIOS.find(s => s.id === plan.scenario_id);
    if (originalScenario) {
      setSelectedScenario(originalScenario);
      setCustomSituation(plan.context);
      if (plan.team_member_id) {
        const member = teamMembers.find(m => m.id === plan.team_member_id);
        setSelectedTeamMember(member || null);
      }
    }
  };

  // Determine user's coaching themes from their session history
  const userThemes = useMemo(() => {
    const completedSessions = sessions.filter(s => s.status === 'Completed');
    return {
      leadership: completedSessions.some(s => s.leadership_management_skills),
      communication: completedSessions.some(s => s.communication_skills),
      wellbeing: completedSessions.some(s => s.mental_well_being)
    };
  }, [sessions]);

  // If no themes detected, show all
  const hasAnyTheme = userThemes.leadership || userThemes.communication || userThemes.wellbeing;

  // Identify low-scoring competencies (score <= 3 or label is "Applying")
  const lowScoringCategories = useMemo(() => {
    const categoryMap: Record<string, ScenarioCategory> = {
      'effective_communication': 'communication',
      'giving_and_receiving_feedback': 'communication',
      'persuasion_and_influence': 'communication',
      'building_relationships_at_work': 'communication',
      'emotional_intelligence': 'wellbeing',
      'adaptability_and_resilience': 'wellbeing',
      'self_confidence_and_imposter_syndrome': 'wellbeing',
      'leadership_management_skills': 'leadership',
      'people_management': 'leadership',
      'delegation_and_accountability': 'leadership',
      'change_management': 'leadership',
      'strategic_thinking': 'leadership',
      'effective_planning_and_execution': 'leadership',
      'time_management_and_productivity': 'leadership',
    };

    const lowCategories = new Set<ScenarioCategory>();

    competencyScores.forEach(score => {
      const key = score.competency_name.toLowerCase().replace(/ /g, '_').replace(/&/g, 'and');
      if (score.score <= 3 || score.score_label?.toLowerCase() === 'applying') {
        const category = categoryMap[key];
        if (category) {
          lowCategories.add(category);
        }
      }
    });

    return lowCategories;
  }, [competencyScores]);

  const filteredScenarios = useMemo(() => {
    let scenarios = [...SCENARIOS]; // Create a copy to avoid mutating original

    // Filter by category if selected
    if (selectedCategory !== 'all') {
      scenarios = scenarios.filter(s => s.category === selectedCategory);
    }

    // Prioritize based on: 1) user themes, 2) low-scoring competencies, 3) all others
    scenarios = scenarios.sort((a, b) => {
      // First priority: matches coaching themes
      const aThemeMatch = (a.category === 'leadership' && userThemes.leadership) ||
                         (a.category === 'communication' && userThemes.communication) ||
                         (a.category === 'wellbeing' && userThemes.wellbeing);
      const bThemeMatch = (b.category === 'leadership' && userThemes.leadership) ||
                         (b.category === 'communication' && userThemes.communication) ||
                         (b.category === 'wellbeing' && userThemes.wellbeing);

      // Second priority: matches low-scoring competencies
      const aCompMatch = lowScoringCategories.has(a.category);
      const bCompMatch = lowScoringCategories.has(b.category);

      // Theme match wins over competency match
      if (aThemeMatch && !bThemeMatch) return -1;
      if (!aThemeMatch && bThemeMatch) return 1;

      // If both have same theme match, check competency match
      if (aCompMatch && !bCompMatch) return -1;
      if (!aCompMatch && bCompMatch) return 1;

      return 0;
    });

    return scenarios;
  }, [selectedCategory, userThemes, lowScoringCategories]);

  const handleCustomSubmit = () => {
    if (!customSituation.trim()) return;

    // Create a custom scenario on the fly
    const customScenario: PracticeScenario = {
      id: `custom-${Date.now()}`,
      title: 'Custom Situation',
      category: 'leadership',
      description: customSituation.slice(0, 100) + (customSituation.length > 100 ? '...' : ''),
      difficulty: 'Medium',
      tags: ['custom'],
      explanation: 'Your specific situation requires a tailored approach.',
      basePrompt: `**STRATEGY GUIDE:** Custom Situation Analysis

Based on your specific situation, we'll help you:
1. Understand what's really happening
2. Identify the key stakeholders and dynamics
3. Develop a clear action plan
4. Practice the conversation

Describe your situation in detail so we can provide the most relevant guidance.`
    };

    setSelectedScenario(customScenario);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'High': return 'bg-red-100 text-red-600';
      case 'Medium': return 'bg-amber-100 text-amber-600';
      case 'Low': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <header className="text-center pt-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-boon-text mb-3">
          {isCompleted ? 'Leadership Toolkit' : 'Practice Space'}
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          {isCompleted
            ? 'Apply your coaching insights when it matters most. Prepare for real leadership moments with confidence.'
            : 'Prepare for challenging moments with AI-powered scenarios. Get a gameplan, then practice the conversation.'
          }
        </p>
        {isCompleted && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Available to you as a program graduate
          </div>
        )}
      </header>

      {/* My Team & My Playbook Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My Team Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-boon-text">My Team</h3>
                <p className="text-xs text-gray-400">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTeamManager(true)}
              className="px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              {teamMembers.length > 0 ? 'Manage' : 'Add'}
            </button>
          </div>
          {teamMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teamMembers.slice(0, 4).map(member => (
                <span key={member.id} className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs font-medium text-gray-600">
                  {member.name}
                </span>
              ))}
              {teamMembers.length > 4 && (
                <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs font-medium text-gray-400">
                  +{teamMembers.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Add team members for more personalized practice scenarios</p>
          )}
        </div>

        {/* My Playbook Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-boon-text">My Playbook</h3>
                <p className="text-xs text-gray-400">{savedPlans.length} saved plan{savedPlans.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          {savedPlans.length > 0 ? (
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {savedPlans.slice(0, 3).map(plan => (
                <div key={plan.id} className="flex items-center justify-between group">
                  <button
                    onClick={() => handleOpenSavedPlan(plan)}
                    className="text-xs text-gray-600 hover:text-boon-blue truncate flex-1 text-left"
                  >
                    {plan.scenario_title} {plan.team_member_name && `• ${plan.team_member_name}`}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Your generated plans will be saved here for future reference</p>
          )}
        </div>
      </div>

      {/* Custom Situation Input */}
      <section className={`rounded-[2rem] p-6 md:p-8 border ${
        isCompleted
          ? 'bg-gradient-to-br from-green-50/50 via-white to-emerald-50/30 border-green-100'
          : 'bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 border-boon-blue/10'
      }`}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-extrabold text-boon-text mb-4 text-center">
            {isCompleted ? 'What challenge are you facing?' : "What's on your mind?"}
          </h2>

          {/* Team Member Selector */}
          {teamMembers.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                This is about... (optional)
              </label>
              <select
                value={selectedTeamMember?.id || ''}
                onChange={(e) => {
                  const member = teamMembers.find(m => m.id === e.target.value);
                  setSelectedTeamMember(member || null);
                }}
                className="w-full p-3 rounded-xl border-2 border-white bg-white text-sm focus:border-boon-blue focus:ring-0 focus:outline-none shadow-sm"
              >
                <option value="">General situation (no specific person)</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.role && `- ${member.role}`}
                  </option>
                ))}
              </select>
              {selectedTeamMember?.context && (
                <p className="mt-2 text-xs text-gray-400 italic">
                  {selectedTeamMember.context}
                </p>
              )}
            </div>
          )}

          <div className="relative">
            <textarea
              value={customSituation}
              onChange={(e) => setCustomSituation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCustomSubmit();
                }
              }}
              placeholder={selectedTeamMember
                ? `Describe your situation with ${selectedTeamMember.name}...`
                : "Describe your situation... (e.g., 'I need to give feedback to a senior team member who keeps missing deadlines')"
              }
              className="w-full p-5 pr-24 rounded-2xl border-2 border-white focus:border-boon-blue focus:ring-0 focus:outline-none text-sm min-h-[100px] resize-none bg-white shadow-sm placeholder-gray-400 transition-all"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customSituation.trim()}
              className={`absolute bottom-4 right-4 px-5 py-2.5 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg ${
                isCompleted
                  ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                  : 'bg-boon-blue hover:bg-boon-darkBlue shadow-boon-blue/20'
              }`}
            >
              {isCompleted ? 'Get Strategy' : 'Get Help'}
            </button>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="flex justify-center">
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-boon-blue text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            All Scenarios
          </button>
          {(['leadership', 'communication', 'wellbeing'] as ScenarioCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedCategory === cat
                  ? 'bg-boon-blue text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {CATEGORY_INFO[cat].label}
              {hasAnyTheme && (
                (cat === 'leadership' && userThemes.leadership) ||
                (cat === 'communication' && userThemes.communication) ||
                (cat === 'wellbeing' && userThemes.wellbeing)
              ) && (
                <span className={`w-2 h-2 rounded-full ${selectedCategory === cat ? 'bg-white' : 'bg-boon-blue'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended for you badge */}
      {hasAnyTheme && selectedCategory === 'all' && (
        <p className="text-center text-xs text-gray-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-boon-blue" />
            Scenarios matching your coaching themes are shown first
          </span>
        </p>
      )}

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredScenarios.map(scenario => (
          <div
            key={scenario.id}
            onClick={() => setSelectedScenario(scenario)}
            className="group bg-white rounded-[1.5rem] p-6 cursor-pointer border-2 border-transparent hover:border-boon-blue/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            {/* Background accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-boon-lightBlue/30 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getDifficultyColor(scenario.difficulty)}`}>
                  {scenario.difficulty}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${CATEGORY_INFO[scenario.category].bgColor} ${CATEGORY_INFO[scenario.category].color}`}>
                  {CATEGORY_INFO[scenario.category].label}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-extrabold text-boon-text mb-2 leading-tight group-hover:text-boon-blue transition-colors">
                {scenario.title}
              </h3>

              {/* Description */}
              <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
                {scenario.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {scenario.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] font-bold text-boon-blue bg-boon-lightBlue/50 px-2 py-0.5 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-boon-blue group-hover:text-white transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {filteredScenarios.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 font-medium">No scenarios found for this category.</p>
        </div>
      )}

      {/* Practice Modal */}
      {selectedScenario && (
        <PracticeModal
          scenario={selectedScenario}
          initialContext={selectedScenario.id.startsWith('custom-') ? customSituation : ''}
          coachName={coachName}
          teamMember={selectedTeamMember}
          userEmail={userEmail}
          onClose={() => {
            setSelectedScenario(null);
            setCustomSituation('');
            setSelectedTeamMember(null);
          }}
          onPlanSaved={refreshData}
        />
      )}

      {/* Team Manager Modal */}
      {showTeamManager && (
        <TeamManager
          members={teamMembers}
          userEmail={userEmail}
          onUpdate={refreshData}
          onClose={() => setShowTeamManager(false)}
        />
      )}
    </div>
  );
}
