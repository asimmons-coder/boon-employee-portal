import { useAuth } from '../lib/AuthContext';
import type { Session } from '../lib/types';

interface GettingStartedPageProps {
  sessions: Session[];
}

export default function GettingStartedPage({ sessions }: GettingStartedPageProps) {
  const { employee, signOut } = useAuth();

  const upcomingSession = sessions.find(s => s.status === 'Upcoming' || s.status === 'Scheduled');
  const coachName = upcomingSession?.coach_name || sessions[0]?.coach_name || 'Your Coach';

  return (
    <div className="min-h-screen bg-boon-bg">
      {/* Minimal Header */}
      <header className="p-6 flex items-center justify-between">
        <img
          src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863862/Logo_Blue_2_kl7tot.png"
          alt="Boon"
          className="h-8"
        />
        <button
          onClick={signOut}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto animate-fade-in">
        {/* Welcome Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-boon-text mb-3">
            {upcomingSession ? "You're all set!" : "Let's get started"}
          </h1>
          <p className="text-gray-500 text-lg">
            {upcomingSession
              ? `Your first session is coming up with ${coachName}`
              : `You've been matched with ${coachName}. Book your first session!`
            }
          </p>
        </div>

        {/* Session Card - if upcoming session exists */}
        {upcomingSession && (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 mb-8">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-boon-lightBlue flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-boon-blue uppercase tracking-widest mb-1">First Session</p>
                <p className="text-2xl font-extrabold text-boon-text">
                  {new Date(upcomingSession.session_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-gray-500 mt-1">
                  {new Date(upcomingSession.session_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })} with {coachName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Book Session CTA - if no upcoming session */}
        {!upcomingSession && employee?.booking_link && (
          <div className="bg-gradient-to-br from-boon-blue to-boon-darkBlue rounded-[2rem] p-8 text-center mb-8">
            <h2 className="text-xl font-extrabold text-white mb-3">Ready to begin?</h2>
            <p className="text-boon-lightBlue mb-6">
              Pick a time that works for you and meet your coach
            </p>
            <a
              href={employee.booking_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-white text-boon-blue rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-boon-lightBlue transition-all"
            >
              Book Your First Session
            </a>
          </div>
        )}

        {/* Coach Info */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-5 mb-6">
            <img
              src={`https://picsum.photos/seed/${coachName}/100/100`}
              alt={coachName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-boon-bg"
            />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Coach</p>
              <p className="text-xl font-extrabold text-boon-text">{coachName}</p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Your coach is excited to meet you and learn about your goals. The first session is all about getting to know each other and setting the foundation for your coaching journey.
          </p>
        </div>

        {/* Preparation Tips */}
        <div className="bg-boon-bg rounded-[2rem] p-8 border border-gray-100">
          <h2 className="text-lg font-extrabold text-boon-text mb-6">Prepare for your first session</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-boon-blue font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-bold text-boon-text">Think about your goals</p>
                <p className="text-sm text-gray-500 mt-1">What do you want to achieve through coaching? Career growth? Better work-life balance? Leadership skills?</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-boon-blue font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-bold text-boon-text">Reflect on recent challenges</p>
                <p className="text-sm text-gray-500 mt-1">Any situations at work that felt difficult? These make great starting points for discussion.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-boon-blue font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-bold text-boon-text">Come with an open mind</p>
                <p className="text-sm text-gray-500 mt-1">This is your space. There's no right or wrong—just be yourself.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Questions about what to expect?{' '}
            <a href="mailto:support@boon-health.com" className="text-boon-blue hover:underline">
              Reach out anytime
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
