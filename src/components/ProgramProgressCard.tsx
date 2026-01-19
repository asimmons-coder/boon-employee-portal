import type { ProgramInfo } from '../lib/dataFetcher';

interface ProgramProgressCardProps {
  programInfo: ProgramInfo | null;
  completedSessions: number;
}

export default function ProgramProgressCard({ programInfo, completedSessions }: ProgramProgressCardProps) {
  const totalSessions = programInfo?.sessions_per_employee || 6;
  const progressPercent = Math.min((completedSessions / totalSessions) * 100, 100);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!programInfo?.program_end_date) return null;

    const endDate = new Date(programInfo.program_end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Program ended';
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return '1 day remaining';
    if (diffDays < 7) return `${diffDays} days remaining`;
    if (diffDays < 30) {
      const weeks = Math.ceil(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} remaining`;
    }
    const months = Math.ceil(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} remaining`;
  };

  const formatEndDate = () => {
    if (!programInfo?.program_end_date) return null;
    const date = new Date(programInfo.program_end_date);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const timeRemaining = getTimeRemaining();
  const endDateFormatted = formatEndDate();

  return (
    <section className="bg-gradient-to-br from-boon-blue/5 via-white to-boon-lightBlue/20 rounded-[2rem] p-8 border border-boon-blue/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-boon-blue/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-boon-blue uppercase tracking-widest">Program Progress</h2>
        </div>
        {programInfo?.program_title && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {programInfo.program_title}
          </span>
        )}
      </div>

      {/* Progress Display */}
      <div className="space-y-4">
        {/* Session Count */}
        <div className="flex items-end justify-between">
          <div>
            <p style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }} className="text-3xl text-boon-text">
              Session <span className="font-bold text-boon-blue">{completedSessions}</span> of {totalSessions}
            </p>
          </div>
          <p className="text-sm font-bold text-boon-blue">{Math.round(progressPercent)}%</p>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-boon-blue to-boon-lightBlue rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* End Date Info */}
        {(endDateFormatted || timeRemaining) && (
          <div className="flex items-center justify-between pt-2">
            {endDateFormatted && (
              <p className="text-sm text-gray-500">
                Program ends <span className="font-medium text-boon-text">{endDateFormatted}</span>
              </p>
            )}
            {timeRemaining && (
              <p className="text-xs font-bold text-boon-amber uppercase tracking-wider">
                {timeRemaining}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
