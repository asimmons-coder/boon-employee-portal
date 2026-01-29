import { useState } from 'react';
import type { Employee, Session, ActionItem, BaselineSurvey, WelcomeSurveyScale, View } from '../lib/types';
import type { ScaleCheckpointStatus } from '../lib/types';
import { updateActionItemStatus } from '../lib/dataFetcher';
import SessionPrep from './SessionPrep';
import CoachProfile from './CoachProfile';

interface ScaleHomeProps {
  profile: Employee | null;
  sessions: Session[];
  actionItems: ActionItem[];
  baseline: BaselineSurvey | null;
  welcomeSurveyScale?: WelcomeSurveyScale | null;
  checkpointStatus: ScaleCheckpointStatus;
  onActionUpdate: () => void;
  userEmail: string;
  onNavigate?: (view: View) => void;
  onStartCheckpoint?: () => void;
  onDismissCheckpoint?: () => void;
}

export default function ScaleHome({
  profile,
  sessions,
  actionItems,
  baseline: _baseline,
  welcomeSurveyScale,
  checkpointStatus,
  onActionUpdate,
  userEmail,
  onNavigate,
  onStartCheckpoint,
  onDismissCheckpoint,
}: ScaleHomeProps) {
  // Unused props reserved for future use
  void _baseline;

  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const lastSession = completedSessions.length > 0 ? completedSessions[0] : null;

  // Find most recent session with goals or plan (for "Where You Left Off")
  const sessionWithGoals = completedSessions.find(s => s.goals || s.plan) || null;

  // Get current focus from latest checkpoint
  const currentFocus = checkpointStatus.latestCheckpoint?.focus_area;

  // Toggle action item status
  async function handleToggleAction(itemId: string, currentStatus: string) {
    setUpdatingItem(itemId);
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const success = await updateActionItemStatus(itemId, newStatus);
    if (success) {
      onActionUpdate();
    }
    setUpdatingItem(null);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 animate-fade-in">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl md:text-5xl font-extrabold text-boon-text tracking-tight">
            Hi {profile?.first_name || 'there'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">
            Your personal coaching space
          </p>
        </div>
      </header>

      {/* 1. Session Prep - FIRST when there's an upcoming session */}
      {upcomingSession && (
        <SessionPrep
          sessions={sessions}
          actionItems={actionItems}
          coachName={lastSession?.coach_name || 'Your Coach'}
          userEmail={userEmail}
          onActionUpdate={onActionUpdate}
        />
      )}

      {/* 2. Ready for your next session - Book CTA when no upcoming session */}
      {!upcomingSession && profile?.booking_link && (
        <a
          href={profile.booking_link}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-br from-boon-lightBlue/30 to-white rounded-[2rem] p-6 border-2 border-boon-blue/20 hover:border-boon-blue/40 transition-all group"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-boon-lightBlue rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-boon-text group-hover:text-boon-blue transition-colors">
                Ready for your next session?
              </h2>
              <p className="text-gray-500 mt-1">
                Continue your coaching journey with {lastSession?.coach_name?.split(' ')[0] || 'your coach'}.
              </p>
            </div>
            <svg className="w-6 h-6 text-boon-blue opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>
      )}

      {/* Checkpoint Prompt - Prominent when due */}
      {checkpointStatus.isCheckpointDue && onStartCheckpoint && (
        <section className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-[2.5rem] p-8 border-2 border-purple-200 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-600 rounded-full" />
            <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-purple-600 rounded-full" />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-200 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">
                    {checkpointStatus.currentCheckpointNumber === 1 ? 'First check-in' : `Check-in ${checkpointStatus.currentCheckpointNumber}`}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-boon-text mb-2">
                  {checkpointStatus.currentCheckpointNumber === 1
                    ? 'Time for your first check-in'
                    : `${checkpointStatus.nextCheckpointDueAtSession} sessions in. See what's shifted.`}
                </h2>
                <p className="text-gray-600 mb-6">
                  {checkpointStatus.currentCheckpointNumber === 1
                    ? 'Establish your baseline and start tracking your evolution over time.'
                    : 'Take 2 minutes to reflect on your progress and set your focus.'}
                </p>
                <button
                  onClick={onStartCheckpoint}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/30 active:scale-95"
                >
                  Start Check-In
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {onDismissCheckpoint && (
                <button
                  onClick={onDismissCheckpoint}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Remind me later"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. Where You Left Off - ONLY when no upcoming session (otherwise redundant with SessionPrep) */}
      {!upcomingSession && (
        currentFocus ? (
          <section className="bg-gradient-to-br from-purple-50/50 to-boon-lightBlue/20 rounded-[2rem] p-8 border border-purple-100/50">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-extrabold text-boon-text">Current Focus</h2>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                From check-in {checkpointStatus.latestCheckpoint?.checkpoint_number}
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-700 leading-relaxed">
                {currentFocus}
              </div>
            </div>
          </section>
        ) : sessionWithGoals ? (
          <section className="bg-gradient-to-br from-boon-amberLight/30 to-white rounded-[2rem] p-8 border border-boon-amber/20">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-sm font-bold text-boon-amber uppercase tracking-widest">Where You Left Off</h2>
              <span className="text-xs font-medium text-gray-400">
                {new Date(sessionWithGoals.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Goals */}
            {sessionWithGoals.goals && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Goals</h3>
                <p className="font-serif text-gray-700 leading-relaxed whitespace-pre-line">{sessionWithGoals.goals}</p>
              </div>
            )}

            {/* Action Items from plan - with checkboxes */}
            {sessionWithGoals.plan && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Action Items</h3>
                <div className="space-y-2">
                  {sessionWithGoals.plan.split('\n').filter(line => line.trim()).map((item, idx) => {
                    // Clean up the item text (remove leading bullets, dashes, numbers)
                    const cleanText = item.trim().replace(/^[\s•\-\*\d\.:\)]+/, '').trim();
                    if (!cleanText || cleanText.length < 5) return null;

                    // Check if this item exists in actionItems and get its status
                    const matchingAction = actionItems.find(ai =>
                      ai.action_text.toLowerCase().includes(cleanText.toLowerCase().slice(0, 30)) ||
                      cleanText.toLowerCase().includes(ai.action_text.toLowerCase().slice(0, 30))
                    );
                    const isCompleted = matchingAction?.status === 'completed';

                    const isUpdating = matchingAction && updatingItem === matchingAction.id;

                    return (
                      <label
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          isCompleted
                            ? 'bg-green-50/50 text-gray-400'
                            : 'bg-white/60 hover:bg-white text-gray-700'
                        } ${isUpdating ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          disabled={!matchingAction || isUpdating}
                          onChange={() => {
                            if (matchingAction) {
                              handleToggleAction(matchingAction.id, matchingAction.status);
                            }
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-boon-amber focus:ring-boon-amber disabled:opacity-50"
                        />
                        <span className={`text-sm leading-relaxed ${isCompleted ? 'line-through' : ''}`}>
                          {cleanText}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : null
      )}

      {/* 4. Practice Space - above Coach */}
      <section className="bg-gradient-to-br from-purple-50 to-boon-bg rounded-[2rem] p-8 border border-purple-100/50 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-boon-text mb-2">Practice Space</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          Prepare for challenging conversations with AI-powered scenarios.
        </p>
        <button
          onClick={() => onNavigate?.('practice')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
        >
          Explore scenarios
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* 5. Coach Card */}
      {lastSession && (
        <CoachProfile
          sessions={sessions}
          coachName={lastSession.coach_name}
          programType="SCALE"
          employeeId={profile?.id || null}
          userEmail={userEmail}
          welcomeSurveyScale={welcomeSurveyScale}
        />
      )}
    </div>
  );
}
