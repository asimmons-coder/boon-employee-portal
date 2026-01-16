import { useState, useEffect } from 'react';
import type { CoachingState } from '../lib/coachingState';

interface AdminStatePreviewProps {
  currentState: CoachingState;
  onStateOverride: (state: CoachingState | null) => void;
  overrideState: CoachingState | null;
}

const ALL_STATES: { state: CoachingState; label: string; description: string; color: string }[] = [
  {
    state: 'NOT_SIGNED_UP',
    label: 'Not Signed Up',
    description: 'No program enrollment - shows Welcome page',
    color: 'bg-gray-500',
  },
  {
    state: 'SIGNED_UP_NOT_MATCHED',
    label: 'Awaiting Match',
    description: 'Enrolled but no coach assigned - shows Matching page',
    color: 'bg-yellow-500',
  },
  {
    state: 'MATCHED_PRE_FIRST_SESSION',
    label: 'Pre-First Session',
    description: 'Has coach, awaiting first session - anticipation focused',
    color: 'bg-blue-500',
  },
  {
    state: 'ACTIVE_PROGRAM',
    label: 'Active Program',
    description: 'In active coaching with completed sessions',
    color: 'bg-green-500',
  },
  {
    state: 'PENDING_REFLECTION',
    label: 'Pending Reflection',
    description: 'Sessions done, reflection not submitted - unlock CTA',
    color: 'bg-orange-500',
  },
  {
    state: 'COMPLETED_PROGRAM',
    label: 'Program Complete',
    description: 'Program finished with reflection - alumni view',
    color: 'bg-purple-500',
  },
];

export default function AdminStatePreview({
  currentState,
  onStateOverride,
  overrideState,
}: AdminStatePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // Check if admin preview is enabled (via localStorage or URL param)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');
    const storedAdmin = localStorage.getItem('boon_admin_preview');

    if (adminParam === 'true') {
      localStorage.setItem('boon_admin_preview', 'true');
      setIsEnabled(true);
    } else if (adminParam === 'false') {
      localStorage.removeItem('boon_admin_preview');
      setIsEnabled(false);
    } else if (storedAdmin === 'true') {
      setIsEnabled(true);
    }
  }, []);

  if (!isEnabled) return null;

  const activeState = overrideState || currentState;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-[100] p-3 rounded-full shadow-lg transition-all ${
          overrideState ? 'bg-orange-500 text-white' : 'bg-gray-800 text-white'
        } hover:scale-105`}
        title="Admin State Preview"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[100] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Admin State Preview</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Preview different user states
            </p>
          </div>

          {/* Current State Info */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Actual State
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ALL_STATES.find(s => s.state === currentState)?.color || 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700">
                {ALL_STATES.find(s => s.state === currentState)?.label || currentState}
              </span>
            </div>
            {overrideState && (
              <p className="text-[10px] text-orange-600 mt-1 font-medium">
                Override active - viewing simulated state
              </p>
            )}
          </div>

          {/* State Options */}
          <div className="max-h-80 overflow-y-auto">
            {ALL_STATES.map(({ state, label, description, color }) => {
              const isActive = activeState === state;
              const isActualState = currentState === state;

              return (
                <button
                  key={state}
                  onClick={() => {
                    if (isActualState && !overrideState) {
                      // Already at this state, no override needed
                      return;
                    }
                    onStateOverride(isActualState ? null : state);
                  }}
                  className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 transition-all ${
                    isActive
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                          {label}
                        </span>
                        {isActualState && (
                          <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                            Actual
                          </span>
                        )}
                        {isActive && !isActualState && (
                          <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase">
                            Preview
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {description}
                      </p>
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            {overrideState ? (
              <button
                onClick={() => onStateOverride(null)}
                className="w-full py-2 text-sm font-bold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all"
              >
                Clear Override (Return to Actual)
              </button>
            ) : (
              <p className="text-xs text-gray-400 text-center">
                Click a state to preview that experience
              </p>
            )}
          </div>

          {/* Disable Admin */}
          <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
            <button
              onClick={() => {
                localStorage.removeItem('boon_admin_preview');
                setIsEnabled(false);
                onStateOverride(null);
              }}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline"
            >
              Disable admin preview
            </button>
          </div>
        </div>
      )}
    </>
  );
}
