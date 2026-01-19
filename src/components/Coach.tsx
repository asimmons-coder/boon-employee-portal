import { useState, useEffect } from 'react';
import type { Session, Coach, ProgramType } from '../lib/types';
import { fetchCoachByName, parseCoachSpecialties, getCoachTitleLine, getCoachBackgroundLine } from '../lib/dataFetcher';

interface CoachPageProps {
  coachName: string;
  sessions: Session[];
  bookingLink: string | null;
  programType?: ProgramType | null;
}

export default function CoachPage({ coachName, sessions, bookingLink, programType }: CoachPageProps) {
  const [coach, setCoach] = useState<Coach | null>(null);

  const historyWithCoach = sessions.filter(s => s.coach_name === coachName);
  const completedWithCoach = historyWithCoach.filter(s => s.status === 'Completed');

  // Extract first name for display
  const coachFirstName = coachName.split(' ')[0];

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

  // Coach title line (product type + ICF level)
  const titleLine = getCoachTitleLine(coach, programType);

  // Background line for Industry Practitioners
  const backgroundLine = getCoachBackgroundLine(coach);

  // Get specialties from coach data or use defaults
  const specialties = coach?.special_services
    ? parseCoachSpecialties(coach.special_services, 5)
    : ['Leadership', 'EQ', 'Resilience', 'Productivity', 'Communication'];

  // Photo URL
  const photoUrl = coach?.photo_url || `https://picsum.photos/seed/${coachName}/200/200`;

  // Coach bio
  const coachBio = coach?.bio || `${coachFirstName} specializes in leadership development and emotional intelligence. With experience helping professionals at all levels, ${coachFirstName} helps individuals unlock their potential by balancing performance with sustainable wellbeing.`;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">My Coach</h1>
        <p className="text-gray-500 mt-2 font-medium">Your dedicated growth partner.</p>
      </header>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card */}
        <section className="lg:col-span-4">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
            <div className="relative w-28 h-28 mx-auto mb-6">
              <img
                src={photoUrl}
                alt={coachName}
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-xl"
              />
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 border-4 border-white rounded-full" />
            </div>
            <h2 className="text-2xl font-black text-boon-text">{coachName}</h2>
            <p className="text-boon-blue font-bold uppercase tracking-widest text-[11px] mt-2">{titleLine}</p>

            {/* Background line for Industry Practitioners */}
            {backgroundLine && (
              <p className="text-sm text-gray-500 mt-2 italic">
                {backgroundLine}
              </p>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-boon-blue">{completedWithCoach.length}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-boon-blue">
                    {completedWithCoach.length > 0
                      ? Math.ceil((Date.now() - new Date(completedWithCoach[completedWithCoach.length - 1]?.session_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
                      : 0}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Months</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href={`mailto:${coach?.email || 'coaching@boon-health.com'}?subject=Message for ${coachName}`}
                className="w-full py-4 bg-boon-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Message {coachFirstName}
              </a>
              {bookingLink && (
                <a
                  href={bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-white text-boon-text border border-gray-100 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Session
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Info Column */}
        <section className="lg:col-span-8 space-y-8">
          {/* About */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-extrabold text-boon-text mb-5">About {coachFirstName}</h3>
            <p className="text-gray-600 leading-relaxed">
              {coachBio}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {specialties.map(skill => (
                <span
                  key={skill}
                  className="px-4 py-2 bg-boon-bg text-boon-text rounded-xl text-[10px] font-black uppercase tracking-[0.1em]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Session History */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-extrabold text-boon-text mb-6">Session History</h3>
            <div className="space-y-3">
              {historyWithCoach.length > 0 ? historyWithCoach.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-5 rounded-2xl bg-boon-bg/40 border border-gray-50 hover:bg-white hover:border-boon-blue/10 transition-all"
                >
                  <div>
                    <p className="font-bold text-boon-text">
                      {new Date(s.session_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                      s.status === 'Completed' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {s.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {s.leadership_management_skills && (
                      <span className="p-2 bg-white rounded-lg text-sm" title="Leadership">👔</span>
                    )}
                    {s.communication_skills && (
                      <span className="p-2 bg-white rounded-lg text-sm" title="Communication">💬</span>
                    )}
                    {s.mental_well_being && (
                      <span className="p-2 bg-white rounded-lg text-sm" title="Wellbeing">🧠</span>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-gray-400 italic py-4">No sessions yet with {coachName}.</p>
              )}

              {historyWithCoach.length > 5 && (
                <p className="text-center text-sm text-gray-400 pt-2">
                  + {historyWithCoach.length - 5} more sessions
                </p>
              )}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-boon-lightBlue/20 p-8 rounded-[2rem] border border-boon-lightBlue/30">
            <h3 className="font-bold text-boon-text mb-3">Getting the most from your sessions</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Come with a specific situation or challenge in mind</li>
              <li>• Share what's been on your mind since the last session</li>
              <li>• Be open about what's working and what's not</li>
              <li>• Ask {coachFirstName} for specific tools or frameworks when helpful</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
