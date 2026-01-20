import React, { useState, useMemo } from 'react';
import type { Session } from '../lib/types';
import type { CoachingStateData } from '../lib/coachingState';
import { isAlumniState, isPreFirstSession } from '../lib/coachingState';

interface SessionsPageProps {
  sessions: Session[];
  coachingState: CoachingStateData;
}

export default function SessionsPage({ sessions, coachingState }: SessionsPageProps) {
  const isCompleted = isAlumniState(coachingState.state);
  const isPreFirst = isPreFirstSession(coachingState.state);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'Completed' | 'Upcoming'>(isCompleted ? 'Completed' : 'all');
  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [feedbackSession, setFeedbackSession] = useState<Session | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get unique themes from all sessions for filtering
  const allThemes = useMemo(() => {
    const themeSet = new Set<string>();
    sessions.forEach(s => {
      if (s.leadership_management_skills) themeSet.add('Leadership');
      if (s.communication_skills) themeSet.add('Communication');
      if (s.mental_well_being) themeSet.add('Well-being');
    });
    return Array.from(themeSet);
  }, [sessions]);

  const filteredSessions = sessions.filter(s => {
    // Status filter
    if (filter !== 'all' && s.status !== filter) return false;

    // Theme filter
    if (themeFilter) {
      const sessionThemes = [
        s.leadership_management_skills && 'Leadership',
        s.communication_skills && 'Communication',
        s.mental_well_being && 'Well-being',
      ].filter(Boolean);
      if (!sessionThemes.includes(themeFilter)) return false;
    }

    return true;
  });

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: Submit to Supabase
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => {
      setFeedbackSession(null);
      setIsSuccess(false);
      setFeedbackRating(0);
      setFeedbackText('');
    }, 2200);
  };

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const days: { day: number | null; date: string | null; sessions?: Session[] }[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push({ day: null, date: null });
    }
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const sessionsOnDay = sessions.filter(s => s.session_date === dateStr);
      days.push({ day: i, date: dateStr, sessions: sessionsOnDay });
    }
    return days;
  }, [currentDate, sessions]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const selectedDaySessions = useMemo(() => {
    return sessions.filter(s => s.session_date === selectedCalendarDate);
  }, [selectedCalendarDate, sessions]);

  // Pre-first-session: Show anticipation-focused empty state
  if (isPreFirst) {
    const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
    const coachName = upcomingSession?.coach_name || 'your coach';

    return (
      <div className="space-y-8 animate-fade-in">
        <header className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Sessions</h1>
          <p className="text-gray-500 mt-2 font-medium">Your coaching journey is just beginning.</p>
        </header>

        {/* Upcoming First Session Card */}
        {upcomingSession ? (
          <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2.5rem] p-8 md:p-10 border-2 border-boon-blue/20 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-boon-blue flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-boon-blue uppercase tracking-widest">Your First Session</span>
            </div>

            <p className="text-2xl md:text-3xl font-extrabold text-boon-text mb-2">
              {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-gray-500 text-lg">
              {new Date(upcomingSession.session_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })} with {coachName}
            </p>
          </section>
        ) : (
          <section className="bg-white rounded-[2rem] p-8 border border-gray-100 text-center">
            <p className="text-gray-500">
              Your first session will appear here once it's scheduled.
            </p>
          </section>
        )}

        {/* Intentional Empty State */}
        <section className="bg-white rounded-[2rem] p-8 md:p-12 border border-gray-100 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-boon-lightBlue/30 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-boon-text mb-3">Session Notes & History</h3>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            {upcomingSession
              ? `After your first session with ${coachName.split(' ')[0]}, you'll see notes, reflections, and key themes here.`
              : "After your first session, you'll see notes, reflections, and key themes here."
            }
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">
            {isCompleted ? 'Session Archive' : 'My Sessions'}
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            {isCompleted
              ? `${sessions.filter(s => s.status === 'Completed').length} coaching sessions completed`
              : 'Manage and review your coaching journey.'
            }
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 self-center md:self-end shadow-sm">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-boon-blue text-white shadow-md' : 'text-gray-400 hover:text-boon-blue'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            List
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-boon-blue text-white shadow-md' : 'text-gray-400 hover:text-boon-blue'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </button>
        </div>
      </header>

      {viewMode === 'list' ? (
        <div className="space-y-8">
          <div className="overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
            <div className="flex flex-wrap items-center gap-4">
              {/* Status filter */}
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                {(isCompleted
                  ? [{ id: 'all', label: 'All Sessions' }, { id: 'Completed', label: 'Completed' }]
                  : [
                      { id: 'all', label: 'All Sessions' },
                      { id: 'Completed', label: 'Completed' },
                      { id: 'Upcoming', label: 'Upcoming' }
                    ]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${
                      filter === tab.id ? 'bg-boon-blue text-white shadow-lg shadow-boon-blue/20' : 'text-gray-400 hover:text-boon-blue'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Theme filter - enhanced for archive mode */}
              {allThemes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Theme:</span>
                  <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                    <button
                      onClick={() => setThemeFilter(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        themeFilter === null ? 'bg-gray-100 text-boon-text' : 'text-gray-400 hover:text-boon-blue'
                      }`}
                    >
                      All
                    </button>
                    {allThemes.map(theme => (
                      <button
                        key={theme}
                        onClick={() => setThemeFilter(theme)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          themeFilter === theme ? 'bg-boon-blue text-white' : 'text-gray-400 hover:text-boon-blue'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredSessions.length > 0 ? filteredSessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              const hasDetails = session.goals || session.plan || session.summary;
              const themes = [
                session.leadership_management_skills && 'Leadership',
                session.communication_skills && 'Communication',
                session.mental_well_being && 'Well-being',
              ].filter(Boolean);

              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all ${
                    isExpanded ? 'border-boon-blue/20' : 'border-gray-100 hover:border-boon-blue/10'
                  }`}
                >
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => hasDetails && setExpandedSession(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          session.status === 'Completed'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-boon-lightBlue text-boon-blue'
                        }`}>
                          {session.status === 'Completed' ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-boon-text">
                            {new Date(session.session_date).toLocaleDateString('en-US', {
                              weekday: 'long', month: 'long', day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-500">with {session.coach_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          session.status === 'Completed'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {session.status}
                        </span>
                        {hasDetails && (
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Theme tags - always visible */}
                    {themes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {themes.map((theme, i) => (
                          <span key={i} className="px-3 py-1 bg-boon-bg text-gray-600 text-xs font-medium rounded-full">
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && hasDetails && (
                    <div className="px-6 pb-6 space-y-4 border-t border-gray-50 pt-4">
                      {session.goals && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Goals</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{session.goals}</p>
                        </div>
                      )}
                      {session.plan && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Plan</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{session.plan}</p>
                        </div>
                      )}
                      {session.summary && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Summary</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{session.summary}</p>
                        </div>
                      )}
                      {session.status === 'Completed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFeedbackSession(session); }}
                          className="px-4 py-2 text-xs font-bold text-boon-blue bg-boon-lightBlue/30 rounded-xl hover:bg-boon-lightBlue transition-all"
                        >
                          Give Feedback
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400">No sessions found.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Calendar View */
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-boon-bg rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xl font-black text-boon-text">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button 
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-boon-bg rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayObj, idx) => (
                <button
                  key={idx}
                  onClick={() => dayObj.date && setSelectedCalendarDate(dayObj.date)}
                  disabled={!dayObj.day}
                  className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                    !dayObj.day 
                      ? 'invisible' 
                      : selectedCalendarDate === dayObj.date
                        ? 'bg-boon-blue text-white'
                        : dayObj.sessions && dayObj.sessions.length > 0
                          ? 'bg-boon-lightBlue text-boon-blue hover:bg-boon-blue hover:text-white'
                          : 'hover:bg-boon-bg'
                  }`}
                >
                  <span className="text-sm font-bold">{dayObj.day}</span>
                  {dayObj.sessions && dayObj.sessions.length > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      selectedCalendarDate === dayObj.date ? 'bg-white' : 'bg-boon-blue'
                    }`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedCalendarDate && (
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <h4 className="font-bold text-boon-text mb-4">
                {new Date(selectedCalendarDate + 'T12:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric' 
                })}
              </h4>
              {selectedDaySessions.length > 0 ? selectedDaySessions.map(session => (
                <div key={session.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-bold text-boon-text">{session.coach_name}</p>
                    <p className={`text-xs font-bold uppercase ${
                      session.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {session.status}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-400 text-sm">No sessions on this day.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div 
            className="absolute inset-0 bg-boon-text/40 backdrop-blur-md" 
            onClick={() => !isSubmitting && setFeedbackSession(null)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />
            <div className="p-8 sm:p-12">
              {isSuccess ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-black text-boon-text">Thank You!</h3>
                  <p className="text-gray-500 mt-3">Your feedback helps us improve.</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-8">
                  <header className="text-center">
                    <h3 className="text-2xl font-black text-boon-text">Session Feedback</h3>
                    <p className="text-gray-500 mt-2">How was your session with {feedbackSession.coach_name}?</p>
                  </header>

                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className={`p-1 transition-all transform hover:scale-110 ${
                          feedbackRating >= star ? 'text-boon-blue' : 'text-gray-200'
                        }`}
                      >
                        <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Any additional thoughts? (optional)"
                    className="w-full px-5 py-4 bg-boon-bg border-2 border-transparent rounded-2xl focus:bg-white focus:border-boon-blue outline-none resize-none h-32"
                  />

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={feedbackRating === 0 || isSubmitting}
                      className="w-full py-4 bg-boon-blue text-white rounded-2xl font-bold uppercase tracking-widest text-xs disabled:bg-gray-200 disabled:text-gray-400 transition-all"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackSession(null)}
                      disabled={isSubmitting}
                      className="py-3 text-gray-400 font-bold text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
