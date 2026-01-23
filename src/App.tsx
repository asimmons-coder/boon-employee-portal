import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { fetchSessions, fetchProgressData, fetchBaseline, fetchWelcomeSurveyScale, fetchCompetencyScores, fetchProgramType, fetchActionItems, fetchReflection, fetchCheckpoints, fetchPendingSurvey, fetchCoachingWins, addCoachingWin } from './lib/dataFetcher';
import { getCoachingState, type CoachingStateData, type CoachingState } from './lib/coachingState';
import type { View, Session, SurveyResponse, BaselineSurvey, WelcomeSurveyScale, CompetencyScore, ProgramType, ActionItem, ReflectionResponse, Checkpoint, PendingSurvey, CoachingWin } from './lib/types';

// Pages
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import NoEmployeeFound from './pages/NoEmployeeFound';
import WelcomePage from './pages/WelcomePage';
import MatchingPage from './pages/MatchingPage';
import FeedbackPage from './pages/FeedbackPage';

// Components
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SessionsPage from './components/Sessions';
import ProgressPage from './components/Progress';
import Practice from './components/Practice';
import Resources from './components/Resources';
import CoachPage from './components/Coach';
import Settings from './components/Settings';
import ReflectionFlow from './components/ReflectionFlow';
import CheckpointFlow from './components/CheckpointFlow';
import AdminStatePreview from './components/AdminStatePreview';
import SurveyModal from './components/SurveyModal';

// Configuration - Replace with actual survey URL
const WELCOME_SURVEY_URL = 'https://boon.typeform.com/welcome'; // TODO: Update with actual URL

function ProtectedApp() {
  const { employee, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [progress, setProgress] = useState<SurveyResponse[]>([]);
  const [baseline, setBaseline] = useState<BaselineSurvey | null>(null);
  const [competencyScores, setCompetencyScores] = useState<CompetencyScore[]>([]);
  const [programType, setProgramType] = useState<ProgramType | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [reflection, setReflection] = useState<ReflectionResponse | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [welcomeSurveyScale, setWelcomeSurveyScale] = useState<WelcomeSurveyScale | null>(null);
  const [coachingWins, setCoachingWins] = useState<CoachingWin[]>([]);
  const [showReflectionFlow, setShowReflectionFlow] = useState(false);
  const [showCheckpointFlow, setShowCheckpointFlow] = useState(false);
  const [stateOverride, setStateOverride] = useState<CoachingState | null>(null);
  const [programTypeOverride, setProgramTypeOverride] = useState<string | null>(null);

  // Native survey system state
  const [pendingSurvey, setPendingSurvey] = useState<PendingSurvey | null>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!employee?.id || !employee?.company_email) return;

      // Debug: Log employee data for session lookup debugging
      console.log('[App.loadData] Employee data:', {
        id: employee.id,
        company_email: employee.company_email,
        coach_id: employee.coach_id,
        booking_link: employee.booking_link ? 'SET' : 'NOT_SET',
        program: employee.program,
        status: employee.status
      });

      setDataLoading(true);
      try {
        const [sessionsData, progressData, baselineData, welcomeSurveyScaleData, competencyData, programTypeData, actionItemsData, reflectionData, checkpointsData, winsData] = await Promise.all([
          fetchSessions(employee.id, employee.company_email),
          fetchProgressData(employee.company_email),
          fetchBaseline(employee.company_email),
          fetchWelcomeSurveyScale(employee.company_email),
          fetchCompetencyScores(employee.company_email),
          fetchProgramType(employee.program),
          fetchActionItems(employee.company_email),
          fetchReflection(employee.company_email),
          fetchCheckpoints(employee.company_email),
          fetchCoachingWins(employee.company_email),
        ]);

        // Debug: Log sessions loaded
        console.log('[App.loadData] Sessions loaded:', {
          count: sessionsData.length,
          sessions: sessionsData.map(s => ({ id: s.id, employee_id: s.employee_id, status: s.status, coach_name: s.coach_name }))
        });

        // Debug: Log all data loaded
        console.log('[App.loadData] Data loaded:', {
          sessionsCount: sessionsData.length,
          progressCount: progressData.length,
          hasBaseline: !!baselineData,
          hasWelcomeSurveyScale: !!welcomeSurveyScaleData,
          welcomeSurveyScaleData: welcomeSurveyScaleData,
          competencyCount: competencyData.length,
          programType: programTypeData,
          employeeProgram: employee.program,
          actionItemsCount: actionItemsData.length,
          hasReflection: !!reflectionData,
          checkpointsCount: checkpointsData.length,
          winsCount: winsData.length,
        });

        setSessions(sessionsData);
        setProgress(progressData);
        setBaseline(baselineData);
        setWelcomeSurveyScale(welcomeSurveyScaleData);
        setCompetencyScores(competencyData);

        // Derive program type - multiple fallback strategies
        let finalProgramType = programTypeData;

        // Fallback 1: Check session program_name
        if (!finalProgramType && sessionsData.length > 0) {
          const sessionProgramName = sessionsData[0]?.program_name?.toUpperCase() || '';
          console.log('[App.loadData] Fallback 1: checking session program_name:', sessionProgramName);
          if (sessionProgramName.includes('SCALE') || sessionProgramName.includes('SLX')) {
            finalProgramType = 'SCALE';
            console.log('[App.loadData] Derived SCALE from session program_name');
          } else if (sessionProgramName.includes('GROW')) {
            finalProgramType = 'GROW';
            console.log('[App.loadData] Derived GROW from session program_name');
          } else if (sessionProgramName.includes('EXEC')) {
            finalProgramType = 'EXEC';
            console.log('[App.loadData] Derived EXEC from session program_name');
          }
        }

        // Fallback 2: If user has welcome_survey_scale data, they're SCALE
        if (!finalProgramType && welcomeSurveyScaleData) {
          console.log('[App.loadData] Fallback 2: User has welcome_survey_scale, deriving SCALE');
          finalProgramType = 'SCALE';
        }

        setProgramType(finalProgramType);
        setActionItems(actionItemsData);
        setReflection(reflectionData);
        setCheckpoints(checkpointsData);
        setCoachingWins(winsData);

        // Check for pending survey after data loads
        // Pass program type to help detect GROW vs SCALE surveys
        const pending = await fetchPendingSurvey(employee.company_email, programTypeData);
        if (pending) {
          setPendingSurvey(pending);
          setShowSurveyModal(true);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, [employee?.id, employee?.company_email, employee?.program]);

  async function reloadActionItems() {
    if (!employee?.company_email) return;
    const items = await fetchActionItems(employee.company_email);
    setActionItems(items);
  }

  // Handle reflection completion - update state and close modal
  function handleReflectionComplete(newReflection: ReflectionResponse) {
    setReflection(newReflection);
    setShowReflectionFlow(false);
    // Optionally navigate to Progress to show the newly unlocked Leadership Profile
    setView('progress');
  }

  // Handle checkpoint completion - update state and close modal
  function handleCheckpointComplete(newCheckpoint: Checkpoint) {
    setCheckpoints(prev => [...prev, newCheckpoint]);
    setShowCheckpointFlow(false);
    // Navigate to Progress to show the updated trendline
    setView('progress');
  }

  // Handle native survey completion
  async function handleSurveyComplete() {
    setShowSurveyModal(false);
    setPendingSurvey(null);
    // Refresh coaching wins in case user added one during the survey
    if (employee?.company_email) {
      const updatedWins = await fetchCoachingWins(employee.company_email);
      setCoachingWins(updatedWins);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-boon-bg flex items-center justify-center">
        <div className="flex flex-col items-center">
          <img 
            src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Icon_Blue_10_i8hkao.png" 
            className="w-12 h-12 animate-bounce mb-4" 
            alt="Loading..." 
          />
          <p className="text-boon-blue font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return <NoEmployeeFound />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-boon-bg flex items-center justify-center">
        <div className="flex flex-col items-center">
          <img
            src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Icon_Blue_10_i8hkao.png"
            className="w-12 h-12 animate-bounce mb-4"
            alt="Loading..."
          />
          <p className="text-boon-blue font-medium">Getting your dashboard ready...</p>
        </div>
      </div>
    );
  }

  // Determine coaching state (single source of truth)
  // Pass welcomeSurveyScale to detect if user has completed onboarding
  // Pass programType (from database lookup) to ensure accurate SCALE detection
  const actualCoachingState: CoachingStateData = getCoachingState(employee, sessions, baseline, competencyScores, reflection, checkpoints, welcomeSurveyScale, programType);

  // Effective program type (actual or overridden for admin preview)
  const effectiveProgramType = programTypeOverride || programType;

  // Mock data for admin preview states
  const mockCoachName = sessions[0]?.coach_name || 'Darcy Roberts';

  // Mock upcoming session (for Pre-First Session and Active Program previews)
  const mockUpcomingSession: Session = {
    id: 'preview-session-upcoming',
    employee_id: employee?.id || '',
    employee_email: employee?.company_email || '',
    employee_name: employee?.first_name || 'there',
    session_date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 7); // One week from now
      date.setHours(14, 0, 0, 0); // 2:00 PM
      return date.toISOString();
    })(),
    status: 'Upcoming',
    coach_name: mockCoachName,
    leadership_management_skills: false,
    communication_skills: false,
    mental_well_being: false,
    other_themes: null,
    summary: null,
    goals: null,
    plan: null,
    duration_minutes: null,
    company_id: null,
    account_name: null,
    program_name: 'GROW',
    program_title: null,
    appointment_number: 7,
    created_at: new Date().toISOString(),
    zoom_join_link: 'https://zoom.us/j/123456789',
    employee_pre_session_note: null,
  };

  // Mock completed sessions (for Active Program preview)
  const mockCompletedSessions: Session[] = Array.from({ length: 6 }, (_, i) => ({
    id: `preview-session-${i + 1}`,
    employee_id: employee?.id || '',
    employee_email: employee?.company_email || '',
    employee_name: employee?.first_name || 'there',
    session_date: (() => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i) * 14); // Every 2 weeks going back
      date.setHours(14, 0, 0, 0);
      return date.toISOString();
    })(),
    status: 'Completed' as const,
    coach_name: mockCoachName,
    leadership_management_skills: i >= 3,
    communication_skills: i >= 2,
    mental_well_being: i >= 4,
    other_themes: null,
    summary: i === 5 ? 'Great progress on reframing feedback as a gift. Next session we\'ll work on handling defensive reactions.' : null,
    goals: i === 5 ? 'Practice delivering constructive feedback to direct reports while maintaining psychological safety.' : null,
    plan: i === 5 ? 'Focus on separating observation from judgment when giving feedback. Practice the SBI model with your next direct report check-in.' : null,
    duration_minutes: 45,
    company_id: null,
    account_name: null,
    program_name: 'GROW',
    program_title: null,
    appointment_number: i + 1,
    created_at: new Date().toISOString(),
    zoom_join_link: null,
    employee_pre_session_note: null,
  }));

  const mockBaseline: BaselineSurvey = {
    id: 'preview-baseline-1',
    email: employee?.company_email || '',
    created_at: new Date().toISOString(),
    coaching_goals: "I want to get better at giving direct feedback without damaging relationships, and develop more confidence in high-stakes conversations.",
    satisfaction: 4,
    productivity: 3,
    work_life_balance: 3,
    motivation: 4,
    comp_adaptability_and_resilience: 3,
    comp_building_relationships_at_work: 4,
    comp_change_management: 2,
    comp_delegation_and_accountability: 3,
    comp_effective_communication: 4,
    comp_effective_planning_and_execution: 3,
    comp_emotional_intelligence: 4,
    comp_giving_and_receiving_feedback: 2,
    comp_persuasion_and_influence: 3,
    comp_self_confidence_and_imposter_syndrome: 2,
    comp_strategic_thinking: 3,
    comp_time_management_and_productivity: 4,
  };

  // Determine if we need mock data for preview
  const isPreviewingPreFirstSession = stateOverride === 'MATCHED_PRE_FIRST_SESSION';
  const isPreviewingActiveProgram = stateOverride === 'ACTIVE_PROGRAM';

  // Build effective sessions based on preview state
  let effectiveSessions = sessions;
  if (isPreviewingPreFirstSession) {
    // Pre-first session: just one upcoming session
    effectiveSessions = [{ ...mockUpcomingSession, appointment_number: 1 }];
  } else if (isPreviewingActiveProgram) {
    // Active program: completed sessions + upcoming session
    effectiveSessions = [...mockCompletedSessions, mockUpcomingSession];
  }

  const effectiveBaseline = (isPreviewingPreFirstSession || isPreviewingActiveProgram) ? mockBaseline : baseline;

  // Mock action items for Active Program preview
  const mockActionItems: ActionItem[] = isPreviewingActiveProgram ? [
    {
      id: 'mock-action-1',
      email: employee?.company_email || '',
      session_id: 6,
      coach_name: mockCoachName,
      action_text: 'Practice the SBI model in your next 1:1 with a direct report',
      due_date: null,
      status: 'pending',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      completed_at: null,
    },
    {
      id: 'mock-action-2',
      email: employee?.company_email || '',
      session_id: 5,
      coach_name: mockCoachName,
      action_text: 'Journal about a recent difficult feedback conversation and what you would do differently',
      due_date: null,
      status: 'pending',
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
      completed_at: null,
    },
    {
      id: 'mock-action-3',
      email: employee?.company_email || '',
      session_id: 4,
      coach_name: mockCoachName,
      action_text: 'Schedule a skip-level meeting with someone on your team',
      due_date: null,
      status: 'pending',
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks ago
      completed_at: null,
    },
  ] : [];

  const effectiveActionItems = isPreviewingActiveProgram ? mockActionItems : actionItems;

  // Apply state override if set (for admin preview)
  const coachingState: CoachingStateData = (stateOverride || programTypeOverride)
    ? {
        ...actualCoachingState,
        state: stateOverride || actualCoachingState.state,
        // Update derived flags based on override
        isPendingReflection: stateOverride === 'PENDING_REFLECTION',
        hasReflection: stateOverride === 'COMPLETED_PROGRAM',
        isScale: effectiveProgramType === 'SCALE',
        isGrowOrExec: effectiveProgramType === 'GROW' || effectiveProgramType === 'EXEC',
        scaleCheckpointStatus: effectiveProgramType === 'SCALE'
          ? {
              ...actualCoachingState.scaleCheckpointStatus,
              isScaleUser: true,
              // For SCALE preview, simulate checkpoint being due if no checkpoints exist
              isCheckpointDue: actualCoachingState.completedSessionCount >= 6 && checkpoints.length === 0,
            }
          : {
              isScaleUser: false,
              currentCheckpointNumber: 0,
              sessionsSinceLastCheckpoint: 0,
              nextCheckpointDueAtSession: 0,
              isCheckpointDue: false,
              checkpoints: [],
              latestCheckpoint: null,
            },
      }
    : actualCoachingState;

  // Route to appropriate page based on coaching state
  if (coachingState.state === 'NOT_SIGNED_UP') {
    return (
      <>
        <WelcomePage welcomeSurveyUrl={WELCOME_SURVEY_URL} />
        <AdminStatePreview
          currentState={actualCoachingState.state}
          overrideState={stateOverride}
          onStateOverride={setStateOverride}
          programType={programType}
          programTypeOverride={programTypeOverride}
          onProgramTypeOverride={setProgramTypeOverride}
        />
      </>
    );
  }

  if (coachingState.state === 'SIGNED_UP_NOT_MATCHED') {
    return (
      <>
        <MatchingPage />
        <AdminStatePreview
          currentState={actualCoachingState.state}
          overrideState={stateOverride}
          onStateOverride={setStateOverride}
          programType={programType}
          programTypeOverride={programTypeOverride}
          onProgramTypeOverride={setProgramTypeOverride}
        />
      </>
    );
  }

  // Pre-first-session and beyond - render full dashboard with navigation
  // The individual components handle the pre-first-session state appropriately
  const handleStartReflection = () => setShowReflectionFlow(true);
  const handleStartCheckpoint = () => setShowCheckpointFlow(true);

  const handleAddWin = async (winText: string): Promise<boolean> => {
    if (!employee) return false;
    const result = await addCoachingWin(
      employee.company_email,
      employee.id,
      winText
    );
    if (result.success) {
      // Refresh wins list
      const updatedWins = await fetchCoachingWins(employee.company_email);
      setCoachingWins(updatedWins);
      return true;
    }
    return false;
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard profile={employee} sessions={effectiveSessions} actionItems={effectiveActionItems} baseline={effectiveBaseline} welcomeSurveyScale={welcomeSurveyScale} programType={programType} competencyScores={competencyScores} onActionUpdate={reloadActionItems} coachingState={coachingState} userEmail={employee?.company_email || ''} onNavigate={setView} onStartReflection={handleStartReflection} checkpoints={checkpoints} onStartCheckpoint={handleStartCheckpoint} />;
      case 'sessions':
        return <SessionsPage sessions={sessions} coachingState={coachingState} />;
      case 'progress':
        return <ProgressPage progress={progress} baseline={baseline} welcomeSurveyScale={welcomeSurveyScale} competencyScores={competencyScores} sessions={sessions} actionItems={effectiveActionItems} programType={programType} coachingState={coachingState} onStartReflection={handleStartReflection} checkpoints={checkpoints} onStartCheckpoint={handleStartCheckpoint} coachingWins={coachingWins} onAddWin={handleAddWin} />;
      case 'practice':
        const practiceCoachName = sessions.length > 0 ? sessions[0].coach_name : "Your Coach";
        return <Practice sessions={sessions} coachName={practiceCoachName} userEmail={employee?.company_email || ''} coachingState={coachingState} competencyScores={competencyScores} />;
      case 'resources':
        return <Resources />;
      case 'coach':
        const currentCoachName = sessions.length > 0 ? sessions[0].coach_name : "Your Coach";
        return <CoachPage coachName={currentCoachName} sessions={sessions} bookingLink={employee?.booking_link || null} programType={programType} employeeId={employee?.id || null} userEmail={employee?.company_email || null} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard profile={employee} sessions={effectiveSessions} actionItems={effectiveActionItems} baseline={effectiveBaseline} welcomeSurveyScale={welcomeSurveyScale} programType={programType} competencyScores={competencyScores} onActionUpdate={reloadActionItems} coachingState={coachingState} userEmail={employee?.company_email || ''} onNavigate={setView} onStartReflection={handleStartReflection} checkpoints={checkpoints} onStartCheckpoint={handleStartCheckpoint} />;
    }
  };

  return (
    <Layout currentView={view} setView={setView} coachingState={coachingState}>
      {renderView()}
      {/* Reflection Flow Modal */}
      {showReflectionFlow && (
        <ReflectionFlow
          userEmail={employee?.company_email || ''}
          baseline={baseline}
          onComplete={handleReflectionComplete}
          onClose={() => setShowReflectionFlow(false)}
        />
      )}
      {/* Checkpoint Flow Modal (for SCALE users) */}
      {showCheckpointFlow && (() => {
        // Get the most recent completed session for the check-in
        const completedSessions = sessions.filter(s => s.status === 'Completed');
        const lastSession = completedSessions.length > 0
          ? completedSessions.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0]
          : null;

        return (
          <CheckpointFlow
            userEmail={employee?.company_email || ''}
            employeeId={employee?.id || ''}
            sessionId={lastSession?.id || ''}
            sessionNumber={coachingState.scaleCheckpointStatus.nextCheckpointDueAtSession}
            coachName={lastSession?.coach_name || sessions[0]?.coach_name || 'your coach'}
            firstName={employee?.first_name || null}
            lastName={employee?.last_name || null}
            companyName={employee?.company_name || null}
            coachingProgram={employee?.coaching_program || null}
            companyId={employee?.company_id || null}
            onComplete={handleCheckpointComplete}
            onClose={() => setShowCheckpointFlow(false)}
          />
        );
      })()}
      {/* Native Survey Modal (for pending feedback surveys) */}
      {showSurveyModal && pendingSurvey && (
        <SurveyModal
          isOpen={showSurveyModal}
          surveyType={pendingSurvey.survey_type}
          sessionId={pendingSurvey.session_id}
          sessionNumber={pendingSurvey.session_number}
          coachName={pendingSurvey.coach_name}
          userEmail={employee?.company_email || ''}
          employeeId={employee?.id}
          onComplete={handleSurveyComplete}
        />
      )}
      {/* Admin State Preview Panel */}
      <AdminStatePreview
        currentState={actualCoachingState.state}
        overrideState={stateOverride}
        onStateOverride={setStateOverride}
        programType={programType}
        programTypeOverride={programTypeOverride}
        onProgramTypeOverride={setProgramTypeOverride}
      />
    </Layout>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-boon-bg flex items-center justify-center">
        <div className="flex flex-col items-center">
          <img 
            src="https://res.cloudinary.com/djbo6r080/image/upload/v1764863780/Icon_Blue_10_i8hkao.png" 
            className="w-12 h-12 animate-bounce mb-4" 
            alt="Loading..." 
          />
          <p className="text-boon-blue font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/feedback"
        element={
          <AuthGuard>
            <FeedbackPage />
          </AuthGuard>
        }
      />
      <Route
        path="/"
        element={
          <AuthGuard>
            <ProtectedApp />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
