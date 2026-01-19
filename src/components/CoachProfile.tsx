import { useState, useEffect } from 'react';
import type { Session, Coach, ProgramType } from '../lib/types';
import { fetchCoachByName, parseCoachSpecialties, getCoachTitleLine, getCoachBackgroundLine, fetchMatchSummary } from '../lib/dataFetcher';

interface CoachProfileProps {
  sessions: Session[];
  coachName: string;
  programType?: ProgramType | null;
  employeeId?: string | null;
  userEmail?: string | null;
}

export default function CoachProfile({ sessions, coachName, programType, employeeId, userEmail }: CoachProfileProps) {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [matchSummary, setMatchSummary] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.status === 'Completed');
  const coachFirstName = coachName.split(' ')[0];

  // Calculate months of coaching relationship
  const firstSession = completedSessions[completedSessions.length - 1];
  const monthsCoaching = firstSession
    ? Math.max(1, Math.ceil((Date.now() - new Date(firstSession.session_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  // Fetch coach details
  useEffect(() => {
    const loadCoach = async () => {
      const coachData = await fetchCoachByName(coachName);
      setCoach(coachData);
    };

    if (coachName && coachName !== 'Your Coach') {
      loadCoach();
    }
  }, [coachName]);

  // Fetch match summary with email fallback
  useEffect(() => {
    const loadMatchSummary = async () => {
      if (!employeeId) return;
      const summary = await fetchMatchSummary(employeeId, userEmail || undefined);
      setMatchSummary(summary);
    };

    loadMatchSummary();
  }, [employeeId, userEmail]);

  // Get specialties - from coach data or fallback to session themes
  const specialties = coach?.special_services
    ? parseCoachSpecialties(coach.special_services, 4)
    : (() => {
        const themeCounts = {
          leadership: completedSessions.filter(s => s.leadership_management_skills).length,
          communication: completedSessions.filter(s => s.communication_skills).length,
          wellbeing: completedSessions.filter(s => s.mental_well_being).length,
        };
        return [
          themeCounts.leadership > 0 && 'Leadership',
          themeCounts.communication > 0 && 'Communication',
          themeCounts.wellbeing > 0 && 'Well-being',
          'Executive Coaching',
        ].filter(Boolean).slice(0, 4) as string[];
      })();

  // Coach title line (product type + ICF level)
  const titleLine = getCoachTitleLine(coach, programType);

  // Background line for Industry Practitioners
  const backgroundLine = getCoachBackgroundLine(coach);

  // Match summary or default text
  const displayMatchSummary = matchSummary || 'Your coach is here to help you achieve your goals.';

  // Coach bio
  const coachBio = coach?.bio || `${coachFirstName} specializes in leadership development and emotional intelligence, helping professionals unlock their full potential through personalized coaching.`;

  // Photo URL - use real URL if available, otherwise placeholder
  const photoUrl = coach?.photo_url || `https://picsum.photos/seed/${coachName.replace(' ', '')}/200/200`;

  return (
    <section className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-sm">
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Your Coach</h2>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Coach Photo */}
        <div className="flex-shrink-0">
          <img
            src={photoUrl}
            alt={coachName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-boon-bg shadow-lg mx-auto sm:mx-0"
          />
        </div>

        {/* Coach Info */}
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-xl font-extrabold text-boon-text">{coachName}</h3>
          <p className="text-sm font-bold text-boon-blue uppercase tracking-widest mt-1">{titleLine}</p>

          {/* Background line for Industry Practitioners */}
          {backgroundLine && (
            <p className="text-sm text-gray-500 mt-2 italic">
              {backgroundLine}
            </p>
          )}

          {/* Match Summary */}
          <p className="text-sm text-gray-700 mt-3 bg-boon-bg/50 px-4 py-3 rounded-xl border border-gray-100">
            {displayMatchSummary}
          </p>

          {/* Bio */}
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {coachBio}
          </p>

          {/* Specialties as tags */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
            {specialties.map((specialty, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs font-bold bg-boon-lightBlue/50 text-boon-blue rounded-full"
              >
                {specialty}
              </span>
            ))}
          </div>

          {/* Sessions together */}
          <p className="text-xs text-gray-400 mt-4 uppercase tracking-wide">
            {completedSessions.length} sessions together
            {monthsCoaching > 0 && ` over ${monthsCoaching} month${monthsCoaching > 1 ? 's' : ''}`}
          </p>

          {/* Message Button */}
          <a
            href={`mailto:${coach?.email || 'coaching@boon-health.com'}?subject=Message for ${coachName}`}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-bold text-boon-blue bg-boon-lightBlue/30 rounded-xl hover:bg-boon-lightBlue transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Message {coachFirstName}
          </a>
        </div>
      </div>
    </section>
  );
}
