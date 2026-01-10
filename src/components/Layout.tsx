import React from 'react';
import { useAuth } from '../lib/AuthContext';
import type { View } from '../lib/types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
}

export default function Layout({ children, currentView, setView }: LayoutProps) {
  const { employee, signOut } = useAuth();

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'sessions', label: 'Sessions', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'progress', label: 'Progress', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    { id: 'coach', label: 'My Coach', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  const initials = employee 
    ? `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase()
    : 'ME';

  return (
    <div className="flex flex-col min-h-screen bg-boon-bg pb-[calc(72px+env(safe-area-inset-bottom,16px))] md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30">
        <div className="p-6 flex flex-col h-full">
          <img
            src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Wordmark_Blue_16_aw7lvc.png"
            className="h-7 max-w-[140px] object-contain mb-8"
            alt="Boon Health"
          />
          
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  currentView === item.id 
                    ? 'bg-boon-blue text-white shadow-lg shadow-boon-blue/20' 
                    : 'text-boon-text hover:bg-boon-lightBlue/30 hover:text-boon-blue'
                }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User info and sign out */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="w-10 h-10 rounded-full bg-boon-lightBlue flex items-center justify-center">
                <span className="text-boon-blue text-sm font-bold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-boon-text truncate">
                  {employee?.first_name} {employee?.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{employee?.job_title || 'Employee'}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
        <img
          src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Wordmark_Blue_16_aw7lvc.png"
          className="h-5 max-w-[100px] object-contain"
          alt="Boon Health"
        />
        <div className="w-8 h-8 rounded-full bg-boon-lightBlue flex items-center justify-center">
          <span className="text-boon-blue text-xs font-bold">{initials}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-5 md:px-8 py-6 md:py-10">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 flex justify-around items-center px-2 py-3 pb-[env(safe-area-inset-bottom,16px)] z-30">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1.5 min-w-[64px] transition-all active:scale-90 ${
              currentView === item.id ? 'text-boon-blue' : 'text-gray-400'
            }`}
          >
            <div className={`p-2 rounded-xl transition-colors ${currentView === item.id ? 'bg-boon-blue/10' : ''}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
