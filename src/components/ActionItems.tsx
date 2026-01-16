import { useState } from 'react';
import type { ActionItem, View } from '../lib/types';
import { updateActionItemStatus } from '../lib/dataFetcher';

interface ActionItemsProps {
  items: ActionItem[];
  onUpdate: () => void;
  onNavigate?: (view: View) => void;
}

// Keywords that suggest an action item might benefit from practice
const PRACTICE_KEYWORDS = ['feedback', 'conversation', 'discuss', 'tell', 'ask', 'communicate', 'delegation', 'delegate', 'difficult'];

function hasPracticeRelevance(text: string): boolean {
  const lower = text.toLowerCase();
  return PRACTICE_KEYWORDS.some(keyword => lower.includes(keyword));
}

export default function ActionItems({ items, onUpdate, onNavigate }: ActionItemsProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const pendingItems = items.filter(item => item.status === 'pending');
  const completedItems = items.filter(item => item.status === 'completed');

  async function handleComplete(itemId: string) {
    setUpdating(itemId);
    const success = await updateActionItemStatus(itemId, 'completed');
    if (success) {
      onUpdate();
    }
    setUpdating(null);
  }

  async function handleDismiss(itemId: string) {
    setUpdating(itemId);
    const success = await updateActionItemStatus(itemId, 'dismissed');
    if (success) {
      onUpdate();
    }
    setUpdating(null);
  }

  function formatDueDate(dateStr: string | null) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', className: 'text-red-500 bg-red-50' };
    if (diffDays === 0) return { text: 'Due today', className: 'text-orange-500 bg-orange-50' };
    if (diffDays <= 3) return { text: `Due in ${diffDays}d`, className: 'text-yellow-600 bg-yellow-50' };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: 'text-gray-500 bg-gray-50' };
  }

  if (items.length === 0) {
    return (
      <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-boon-text mb-2">Action Items</h2>
        <p className="text-gray-400 text-sm">Your coach will add action items after your sessions.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-boon-text">Action Items</h2>
        {pendingItems.length > 0 && (
          <span className="px-3 py-1 bg-boon-blue/10 text-boon-blue text-xs font-bold rounded-full">
            {pendingItems.length} pending
          </span>
        )}
      </div>

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <div className="space-y-3 mb-6">
          {pendingItems.map(item => {
            const due = formatDueDate(item.due_date);
            const isUpdating = updating === item.id;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  isUpdating ? 'opacity-50' : 'hover:border-boon-blue/30'
                } border-gray-100 bg-gradient-to-r from-white to-boon-bg/30`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleComplete(item.id)}
                    disabled={isUpdating}
                    className="mt-0.5 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-boon-blue hover:bg-boon-blue/10 transition-all flex-shrink-0 flex items-center justify-center group"
                    title="Mark as complete"
                  >
                    <svg className="w-3 h-3 text-transparent group-hover:text-boon-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-boon-text font-medium leading-relaxed">{item.action_text}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">From {item.coach_name.split(' ')[0]}</span>
                      {due && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${due.className}`}>
                          {due.text}
                        </span>
                      )}
                      {/* Contextual bridge to Practice */}
                      {onNavigate && hasPracticeRelevance(item.action_text) && (
                        <button
                          onClick={() => onNavigate('practice')}
                          className="text-xs text-purple-600 font-medium hover:underline"
                        >
                          Practice this →
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(item.id)}
                    disabled={isUpdating}
                    className="text-gray-300 hover:text-gray-500 transition-colors p-1"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Completed</p>
          <div className="space-y-2">
            {completedItems.slice(0, 3).map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-gray-50/50 flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm line-through">{item.action_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
