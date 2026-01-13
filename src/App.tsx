import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { fetchSessions, fetchProgressData, fetchBaseline, fetchActionItems } from './lib/dataFetcher';
import type { View, Session, SurveyResponse, BaselineSurvey, ActionItem } from './lib/types';

// Pages
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import NoEmployeeFound from './pages/NoEmployeeFound';

// Components
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SessionsPage from './components/Sessions';
import ProgressPage from './components/Progress';
import Resources from './components/Resources';
import CoachPage from './components/Coach';
import Settings from './components/Settings';

function ProtectedApp() {
  const { employee, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [dataLoading, setDataLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [progress, setProgress] = useState<SurveyResponse[]>([]);
  const [baseline, setBaseline] = useState<BaselineSurvey | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!employee?.id || !employee?.company_email) return;
      
      setDataLoading(true);
      try {
        const [sessionsData, progressData, baselineData, actionItemsData] = await Promise.all([
          fetchSessions(employee.id),
          fetchProgressData(employee.company_email),
          fetchBaseline(employee.company_email),
          fetchActionItems(employee.company_email),
        ]);

        setSessions(sessionsData);
        setProgress(progressData);
        setBaseline(baselineData);
        setActionItems(actionItemsData);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, [employee?.id, employee?.company_email]);

  async function reloadActionItems() {
    if (!employee?.company_email) return;
    const items = await fetchActionItems(employee.company_email);
    setActionItems(items);
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

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard profile={employee} sessions={sessions} actionItems={actionItems} baseline={baseline} onActionUpdate={reloadActionItems} />;
      case 'sessions':
        return <SessionsPage sessions={sessions} />;
      case 'progress':
        return <ProgressPage progress={progress} baseline={baseline} sessions={sessions} actionItems={actionItems} />;
      case 'resources':
        return <Resources />;
      case 'coach':
        const currentCoachName = sessions.length > 0 ? sessions[0].coach_name : "Your Coach";
        return <CoachPage coachName={currentCoachName} sessions={sessions} bookingLink={employee?.booking_link || null} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard profile={employee} sessions={sessions} actionItems={actionItems} baseline={baseline} onActionUpdate={reloadActionItems} />;
    }
  };

  return (
    <Layout currentView={view} setView={setView}>
      {renderView()}
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
