import { useState, useRef, useEffect } from 'react';
import type { PracticeScenario } from '../data/scenarios';
import { generatePlan, getRoleplayResponse, evaluateRoleplay, type ChatMessage } from '../lib/practiceService';

interface PracticeModalProps {
  scenario: PracticeScenario;
  initialContext?: string;
  coachName: string;
  onClose: () => void;
}

type ViewMode = 'guide' | 'rapid' | 'full' | 'practice';

export default function PracticeModal({ scenario, initialContext = '', coachName, onClose }: PracticeModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('guide');
  const [context, setContext] = useState(initialContext);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Roleplay state
  const [roleplayMessages, setRoleplayMessages] = useState<ChatMessage[]>([]);
  const [roleplayInput, setRoleplayInput] = useState('');
  const [isRoleplayLoading, setIsRoleplayLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roleplayMessages.length > 0) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [roleplayMessages]);

  // Parse the generated plan into rapid/full sections
  const { rapidPlan, fullPlan } = (() => {
    if (!generatedPlan) return { rapidPlan: '', fullPlan: '' };

    const regex = /(?:^|[\r\n]+)(?:[*#]*\s*)?(?:7\.?|Part 7:?)?(?:\s*[*#]*\s*)?Rapid (?:Action )?(?:Plan|Script)[^\r\n]*/i;
    const match = generatedPlan.match(regex);

    if (match && match.index !== undefined) {
      const full = generatedPlan.substring(0, match.index).trim();
      const rapid = generatedPlan.substring(match.index + match[0].length).trim();
      return { rapidPlan: rapid, fullPlan: full };
    }

    return { rapidPlan: '', fullPlan: generatedPlan };
  })();

  const currentContent = viewMode === 'guide' ? scenario.basePrompt : (viewMode === 'full' ? fullPlan : rapidPlan);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setIsGenerating(true);
    setError(null);

    const { plan, error: apiError } = await generatePlan(scenario, context);

    if (apiError) {
      setError(apiError);
      setIsGenerating(false);
      return;
    }

    if (plan) {
      setGeneratedPlan(plan);
      setViewMode('rapid');
      setRoleplayMessages([]);
      setEvaluation(null);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRoleplay = async () => {
    setViewMode('practice');
    if (roleplayMessages.length === 0) {
      setIsRoleplayLoading(true);
      // Get the AI's initial response to start the conversation
      const { response, error: apiError } = await getRoleplayResponse(scenario, [], generatedPlan || undefined);
      setIsRoleplayLoading(false);

      if (apiError || !response) {
        setRoleplayMessages([{
          role: 'model',
          text: "*Looks up from their work* Hey, you wanted to talk?"
        }]);
      } else {
        setRoleplayMessages([{ role: 'model', text: response }]);
      }
    }
  };

  const handleRoleplaySend = async () => {
    if (!roleplayInput.trim() || isRoleplayLoading) return;

    const userMessage = roleplayInput;
    setRoleplayInput('');
    const updatedMessages: ChatMessage[] = [...roleplayMessages, { role: 'user', text: userMessage }];
    setRoleplayMessages(updatedMessages);
    setIsRoleplayLoading(true);

    const { response, error: apiError } = await getRoleplayResponse(
      scenario,
      updatedMessages,
      generatedPlan || undefined
    );

    if (apiError || !response) {
      // Fallback response if API fails
      setRoleplayMessages(prev => [...prev, {
        role: 'model',
        text: "I hear what you're saying. Can you tell me more about that?"
      }]);
    } else {
      setRoleplayMessages(prev => [...prev, { role: 'model', text: response }]);
    }
    setIsRoleplayLoading(false);
  };

  const handleEvaluate = async () => {
    if (roleplayMessages.length < 2) return;
    setIsEvaluating(true);

    const { evaluation: evalResult, error: apiError } = await evaluateRoleplay(
      scenario,
      roleplayMessages,
      generatedPlan || undefined
    );

    if (apiError || !evalResult) {
      // Fallback evaluation if API fails
      setEvaluation(`**Evaluation Unavailable**

We couldn't generate an evaluation at this time. Please try again.

**Next Step:** Discuss this scenario with ${coachName} in your next session to get personalized feedback.`);
    } else {
      // Append coach reference to evaluation
      setEvaluation(`${evalResult}

**Next Step:** Discuss this scenario with ${coachName} in your next session to get personalized feedback.`);
    }
    setIsEvaluating(false);
  };

  const resetRoleplay = async () => {
    setEvaluation(null);
    setIsRoleplayLoading(true);

    const { response, error: apiError } = await getRoleplayResponse(scenario, [], generatedPlan || undefined);
    setIsRoleplayLoading(false);

    if (apiError || !response) {
      setRoleplayMessages([{ role: 'model', text: "*Looks up from their work* Hey, you wanted to talk?" }]);
    } else {
      setRoleplayMessages([{ role: 'model', text: response }]);
    }
  };

  // Format text with bold markers
  const FormattedText = ({ text, large = false }: { text: string; large?: boolean }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <div className={`${large ? "text-lg leading-relaxed" : ""} whitespace-pre-wrap`}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-extrabold text-boon-text">{part.slice(2, -2)}</strong>;
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-boon-text/50 backdrop-blur-md z-50 animate-fade-in overflow-y-auto md:overflow-hidden md:flex md:items-center md:justify-center p-4 md:p-0">
      <div className="bg-white w-full md:w-[95%] md:max-w-5xl md:h-[90vh] rounded-[2rem] shadow-2xl flex flex-col md:flex-row relative overflow-hidden">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-boon-text rounded-full backdrop-blur-sm transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* LEFT PANEL - Scenario Info & Context Input */}
        <div className="w-full md:w-2/5 bg-boon-bg p-6 md:p-8 flex flex-col md:overflow-y-auto">
          {/* Accent bar */}
          <div className="hidden md:block absolute top-0 left-0 w-full md:w-2/5 h-1.5 bg-gradient-to-r from-boon-blue via-purple-400 to-green-400" />

          <button
            onClick={onClose}
            className="hidden md:flex mb-6 text-sm font-bold text-boon-blue hover:text-boon-darkBlue items-center transition-colors"
          >
            <svg className="w-4 h-4 mr-1 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-boon-text mb-2 leading-tight">{scenario.title}</h2>
            <span className="inline-block px-3 py-1 bg-boon-lightBlue text-boon-blue text-xs font-bold rounded-full uppercase tracking-wide mb-3">
              {scenario.category}
            </span>
            <p className="text-gray-600 text-sm leading-relaxed">{scenario.description}</p>
          </div>

          {/* Why this works */}
          <div className="bg-white/60 rounded-2xl p-5 mb-6 border border-white">
            <h4 className="text-xs font-bold text-boon-blue uppercase tracking-wide mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Why this works
            </h4>
            <p className="text-gray-600 text-sm leading-relaxed">{scenario.explanation}</p>
          </div>

          {/* Context Input */}
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-bold text-boon-text uppercase tracking-wide mb-2">Your Situation</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (context.trim() && !isGenerating) handleGenerate();
                }
              }}
              placeholder="Describe your specific situation... (e.g., 'Team member has been late to standups 3 times this week')"
              className="flex-1 min-h-[120px] p-4 rounded-2xl border-2 border-white focus:border-boon-blue focus:ring-0 focus:outline-none text-sm resize-none bg-white shadow-sm placeholder-gray-400 transition-all"
            />

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!context.trim() || isGenerating}
              className={`mt-4 w-full flex items-center justify-center py-4 px-6 rounded-2xl text-base font-bold transition-all ${
                !context.trim() || isGenerating
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-boon-blue text-white hover:bg-boon-darkBlue shadow-lg shadow-boon-blue/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Creating your plan...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  {generatedPlan ? 'Regenerate Plan' : 'Generate Action Plan'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - Content View */}
        <div className="w-full md:w-3/5 bg-white flex flex-col md:overflow-hidden">
          {/* Tabs */}
          <div className="p-4 md:p-6 pb-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-gray-100">
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setViewMode('guide')}
                className={`flex-1 md:flex-none px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  viewMode === 'guide' ? 'bg-white text-boon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Strategy Guide
              </button>
              <button
                onClick={() => generatedPlan && setViewMode('rapid')}
                disabled={!generatedPlan}
                className={`flex-1 md:flex-none px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap disabled:opacity-50 ${
                  viewMode === 'rapid' ? 'bg-white text-boon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Rapid Script
              </button>
              <button
                onClick={() => generatedPlan && setViewMode('full')}
                disabled={!generatedPlan}
                className={`flex-1 md:flex-none px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap disabled:opacity-50 ${
                  viewMode === 'full' ? 'bg-white text-boon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Full Plan
              </button>
              <button
                onClick={startRoleplay}
                disabled={!generatedPlan}
                className={`flex-1 md:flex-none px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-1 ${
                  viewMode === 'practice' ? 'bg-white text-boon-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Practice
              </button>
            </div>

            {generatedPlan && viewMode !== 'practice' && (
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl bg-boon-text text-white hover:bg-black font-bold text-xs flex items-center transition-all shadow-sm"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:overflow-y-auto">
            {viewMode === 'practice' ? (
              // ROLEPLAY VIEW
              <div className="flex flex-col h-full">
                {/* Intro Card */}
                <div className="bg-gradient-to-r from-boon-lightBlue/30 to-purple-50 p-4 rounded-2xl border border-boon-lightBlue/50 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full text-boon-blue shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-boon-text text-sm">Practice Mode</h4>
                      <p className="text-xs text-gray-500">Roleplay this conversation and get feedback</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                  {roleplayMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-boon-blue text-white rounded-tr-none'
                          : 'bg-gray-100 text-boon-text rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isRoleplayLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>

                {/* Evaluation Result */}
                {evaluation && (
                  <div className="mb-4 bg-gradient-to-br from-gray-50 to-white border-2 border-boon-blue/20 rounded-2xl p-6 animate-fade-in">
                    <h3 className="text-lg font-extrabold text-boon-text mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-boon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Coach's Evaluation
                    </h3>
                    <FormattedText text={evaluation} />
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setEvaluation(null)}
                        className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-500 font-bold text-sm hover:border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Review Chat
                      </button>
                      <button
                        onClick={resetRoleplay}
                        className="flex-1 py-3 rounded-xl bg-boon-blue text-white font-bold text-sm hover:bg-boon-darkBlue transition-colors shadow-lg shadow-boon-blue/20 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Input Area */}
                {!evaluation && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={roleplayInput}
                        onChange={(e) => setRoleplayInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRoleplaySend()}
                        placeholder="Type your response..."
                        className="flex-1 p-4 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-boon-blue focus:outline-none transition-all"
                      />
                      <button
                        onClick={handleRoleplaySend}
                        disabled={!roleplayInput.trim() || isRoleplayLoading}
                        className="p-4 bg-boon-blue text-white rounded-xl hover:bg-boon-darkBlue disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>

                    {roleplayMessages.length > 2 && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          Turn {Math.floor(roleplayMessages.length / 2)}
                        </span>
                        <button
                          onClick={handleEvaluate}
                          disabled={isEvaluating}
                          className="py-2 px-4 rounded-xl border border-gray-200 bg-white text-gray-500 font-bold text-xs hover:border-boon-blue hover:text-boon-blue hover:bg-boon-lightBlue/20 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          {isEvaluating ? 'Analyzing...' : 'End & Evaluate'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // CONTENT VIEW (Guide, Rapid, Full)
              <>
                <div className="prose prose-slate max-w-none text-gray-600 leading-relaxed">
                  <FormattedText text={currentContent} large={viewMode === 'rapid'} />
                </div>

                {viewMode === 'rapid' && fullPlan && (
                  <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <button
                      onClick={() => setViewMode('full')}
                      className="text-sm font-bold text-boon-blue hover:underline flex items-center justify-center mx-auto gap-1"
                    >
                      Open Full Plan
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                )}

                {!generatedPlan && viewMode === 'guide' && (
                  <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-gray-400 text-sm">
                      Add your situation on the left to get a personalized action plan
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
