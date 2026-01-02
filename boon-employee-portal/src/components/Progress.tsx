import React from 'react';
import type { SurveyResponse, BaselineSurvey, Session } from '../lib/types';

interface ProgressPageProps {
  progress: SurveyResponse[];
  baseline: BaselineSurvey | null;
  sessions: Session[];
}

export default function ProgressPage({ sessions, baseline }: ProgressPageProps) {
  const completedSessions = sessions.filter(s => s.status === 'Completed');
  
  const themeDefinitions = [
    { key: 'leadership_management_skills', label: 'Leading with empathy and clarity' },
    { key: 'communication_skills', label: 'Communicating with impact and intention' },
    { key: 'mental_well_being', label: 'Cultivating sustainable mental energy' },
  ];

  const focusInsights = themeDefinitions.map(theme => {
    const sessionsWithTheme = completedSessions.filter(s => (s as any)[theme.key]);
    if (sessionsWithTheme.length === 0) return null;
    const isMultiple = sessionsWithTheme.length > 1;
    return {
      key: theme.key,
      label: theme.label,
      isMultiple,
      metadata: isMultiple ? "Explored across multiple sessions" : "Recently focused theme",
      count: sessionsWithTheme.length,
    };
  }).filter(Boolean) as any[];

  const primaryFocus = focusInsights.filter(i => i.isMultiple);
  const supportingFocus = focusInsights.filter(i => !i.isMultiple);

  const timelineItems = [...completedSessions].sort(
    (a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );

  const getPrimaryTheme = (session: Session) => {
    if (session.mental_well_being) return 'Mental Well-being';
    if (session.communication_skills) return 'Communication';
    if (session.leadership_management_skills) return 'Leadership';
    return 'General Growth';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Progress</h1>
        <p className="text-gray-500 mt-2 font-medium">Visualizing your growth over time.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-boon-blue">{completedSessions.length}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sessions</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-boon-blue">{focusInsights.length}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Focus Areas</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-boon-blue">
            {completedSessions.length > 0 
              ? Math.ceil((Date.now() - new Date(completedSessions[completedSessions.length - 1]?.session_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
              : 0}
          </p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Weeks Active</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-boon-blue">
            {baseline ? '✓' : '—'}
          </p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Baseline Set</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Core Focus Areas */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-boon-text mb-8">Core focus areas</h2>
          <div className="space-y-8">
            {primaryFocus.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Primary Themes</h3>
                {primaryFocus.map((insight, idx) => (
                  <div key={idx} className="border-l-4 border-boon-blue pl-5 py-1">
                    <h4 className="text-boon-text font-bold text-lg leading-snug">{insight.label}</h4>
                    <p className="text-xs text-boon-blue font-bold uppercase tracking-widest mt-2 bg-boon-blue/5 px-3 py-1.5 rounded-lg w-fit">
                      {insight.count} sessions
                    </p>
                  </div>
                ))}
              </div>
            )}

            {supportingFocus.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Supporting Focus</h3>
                {supportingFocus.map((insight, idx) => (
                  <div key={idx} className="bg-boon-bg/30 p-4 rounded-xl border border-gray-50">
                    <h4 className="text-boon-text font-medium">{insight.label}</h4>
                  </div>
                ))}
              </div>
            )}

            {focusInsights.length === 0 && (
              <p className="text-gray-400 italic">Focus areas will appear here as you have sessions.</p>
            )}
          </div>
        </section>

        {/* Timeline */}
        <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-boon-text mb-8">Your journey</h2>
          <div className="space-y-6 relative">
            {timelineItems.length > 0 ? timelineItems.slice(-6).map((session, idx) => {
              const currentTheme = getPrimaryTheme(session);
              const prevTheme = idx > 0 ? getPrimaryTheme(timelineItems[idx - 1]) : null;
              const isShift = prevTheme && prevTheme !== currentTheme;

              return (
                <div key={session.id} className="relative pl-6">
                  <div className={`absolute left-0 top-1 w-3 h-3 rounded-full ${
                    isShift ? 'bg-boon-blue' : 'bg-gray-200'
                  }`} />
                  {idx < timelineItems.length - 1 && (
                    <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-gray-100" />
                  )}
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                      {new Date(session.session_date).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric' 
                      })}
                      {isShift && (
                        <span className="bg-boon-blue text-white px-2 py-0.5 rounded text-[9px]">Shift</span>
                      )}
                    </span>
                    <p className="text-boon-text font-medium mt-1">{currentTheme}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-400 italic">Your timeline will appear here.</p>
            )}
          </div>
        </section>
      </div>

      {/* Insights */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-boon-text mb-8 text-center sm:text-left">Patterns we've noticed</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: '📈', title: 'Momentum', desc: 'You've been consistent with your sessions. Keep that rhythm going.' },
            { icon: '🎯', title: 'Focus', desc: focusInsights.length > 0 
              ? `${focusInsights[0].label} has been your main area of exploration.`
              : 'Your focus areas will emerge as you continue coaching.' 
            },
            { icon: '💡', title: 'Growth', desc: 'Each session builds on the last. Your coach sees progress in how you approach challenges.' }
          ].map((card, i) => (
            <div 
              key={i} 
              className="p-6 bg-boon-bg/40 rounded-2xl border border-gray-50 hover:bg-white hover:shadow-lg hover:border-boon-blue/10 transition-all"
            >
              <div className="text-3xl mb-4">{card.icon}</div>
              <h4 className="font-bold text-boon-text mb-2 uppercase tracking-widest text-xs">{card.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
