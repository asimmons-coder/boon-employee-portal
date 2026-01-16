import { useState, useEffect } from 'react';
import type { Session } from '../lib/types';

interface CompletionAcknowledgmentProps {
  sessions: Session[];
  coachName: string;
  userEmail: string;
  onDismiss: () => void;
}

export default function CompletionAcknowledgment({
  sessions,
  coachName,
  userEmail,
  onDismiss,
}: CompletionAcknowledgmentProps) {
  const [isVisible, setIsVisible] = useState(false);

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const firstSession = completedSessions[completedSessions.length - 1];
  const lastSession = completedSessions[0];

  // Calculate program duration
  const startDate = firstSession ? new Date(firstSession.session_date) : null;
  const endDate = lastSession ? new Date(lastSession.session_date) : null;

  const formatDuration = () => {
    if (!startDate || !endDate) return '';

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'long' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const monthsDiff = Math.max(1,
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
    );

    return { startMonth, endMonth, months: monthsDiff };
  };

  const duration = formatDuration();

  // Check localStorage to see if this has been shown before
  useEffect(() => {
    const storageKey = `completion_acknowledged_${userEmail}`;
    const hasAcknowledged = localStorage.getItem(storageKey);

    if (!hasAcknowledged) {
      // Small delay for smooth appearance
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [userEmail]);

  const handleDismiss = () => {
    const storageKey = `completion_acknowledged_${userEmail}`;
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-boon-text/50 backdrop-blur-md transition-opacity duration-300"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[2.5rem] max-w-md w-full p-8 md:p-12 shadow-2xl animate-fade-in">
        {/* Celebration icon */}
        <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-boon-text mb-4">
            You've completed your GROW program.
          </h2>

          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img
                src={`https://picsum.photos/seed/${coachName.replace(' ', '')}/100/100`}
                alt={coachName}
                className="w-14 h-14 rounded-full object-cover ring-4 ring-white shadow-md"
              />
              <div className="text-left">
                <p className="font-bold text-boon-text">{coachName}</p>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Executive Coach</p>
              </div>
            </div>

            <div className="text-gray-600 text-sm space-y-1">
              <p>
                <span className="font-bold text-boon-text">{completedSessions.length}</span> sessions
              </p>
              {duration && (
                <p>
                  {duration.startMonth} – {duration.endMonth}
                  <span className="text-gray-400"> • {duration.months} month{duration.months > 1 ? 's' : ''}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            This space has shifted to reflect where you are now.
            What follows is intentionally different—a place to revisit what you built
            and return when things get hard.
          </p>

          <button
            onClick={handleDismiss}
            className="w-full py-4 bg-boon-blue text-white font-bold rounded-2xl hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20"
          >
            Continue to Your Portal
          </button>
        </div>
      </div>
    </div>
  );
}
