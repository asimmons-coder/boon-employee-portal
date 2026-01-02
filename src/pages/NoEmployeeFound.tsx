import { useAuth } from '../lib/AuthContext';

export default function NoEmployeeFound() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-boon-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-black text-boon-text mb-3">Account not found</h1>
          
          <p className="text-gray-500 mb-6">
            We couldn't find a coaching account linked to <span className="font-semibold text-boon-text">{user?.email}</span>.
          </p>
          
          <div className="bg-boon-bg rounded-2xl p-5 mb-8 text-left">
            <p className="text-sm text-gray-600 font-medium mb-3">This could mean:</p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-boon-blue mt-1">•</span>
                You signed in with a personal email instead of your work email
              </li>
              <li className="flex items-start gap-2">
                <span className="text-boon-blue mt-1">•</span>
                Your company hasn't enrolled you in coaching yet
              </li>
              <li className="flex items-start gap-2">
                <span className="text-boon-blue mt-1">•</span>
                There's a typo in your email address in our system
              </li>
            </ul>
          </div>

          <button
            onClick={signOut}
            className="w-full py-4 bg-boon-blue text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-boon-darkBlue transition-all shadow-lg shadow-boon-blue/20"
          >
            Try a different email
          </button>
          
          <p className="text-xs text-gray-400 mt-6">
            Need help? Contact your HR team or email <a href="mailto:support@boon-health.com" className="text-boon-blue hover:underline">support@boon-health.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
