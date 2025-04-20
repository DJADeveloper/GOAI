import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Import useAuth hook
import { useTheme } from './context/ThemeContext'; // Import useTheme hook

// Import Page components
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword';
import GoalWizardPage from './pages/GoalWizard';
import DashboardPage from './pages/Dashboard';
import GoalsPage from './pages/Goals';
import GoalDetailPage from './pages/GoalDetail';
import TasksPage from './pages/Tasks';
import HabitsPage from './pages/Habits';
import BrainDumpPage from './pages/BrainDump';
import AnalyticsPage from './pages/Analytics';
import SettingsPage from './pages/Settings';
import ProfilePage from './pages/Profile';
import CalendarPage from './pages/CalendarPage';

// Import Nav components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Mock auth state - replace with actual auth context later
// const isAuthenticated = false; // REMOVE MOCK STATE

function App() {
  const { session, loading: authLoading } = useAuth(); // Use the Auth context
  const { theme } = useTheme(); // Get current theme
  const isAuthenticated = !!session; // Determine auth status from session
  const loading = authLoading; // Combine loading states if theme had one

  // Show loading indicator while checking auth status initially
  if (loading) {
    return (
      // Apply theme to loading state background and text
      <div className="flex items-center justify-center h-screen bg-neutral-lighter dark:bg-neutral-darker">
         <div className="text-neutral-dark dark:text-neutral-light">Loading...</div> {/* Replace with a proper spinner/loader component */}
      </div>
    );
  }

  return (
    // Apply theme to the outermost container
    <div className="flex flex-col min-h-screen bg-neutral-lighter dark:bg-neutral-darker">
      <Navbar />
      <div className="flex flex-1 pt-16"> {/* Add pt-16 assuming Navbar height */} 
        {isAuthenticated && <Sidebar />}
        {/* Apply theme text color to main content area */}
        <main className={`flex-1 p-4 ${isAuthenticated ? 'ml-64' : ''} text-neutral-darker dark:text-neutral-light`}>
          <Routes>
            {/* Unauthenticated Routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
            <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />

            {/* Onboarding Routes */}
            <Route path="/onboarding/goal-wizard" element={<GoalWizardPage />} />

            {/* Authenticated Routes - Protected */}
            <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
            <Route path="/goals" element={isAuthenticated ? <GoalsPage /> : <Navigate to="/login" />} />
            <Route path="/goals/:id" element={isAuthenticated ? <GoalDetailPage /> : <Navigate to="/login" />} />
            <Route path="/tasks" element={isAuthenticated ? <TasksPage /> : <Navigate to="/login" />} />
            <Route path="/habits" element={isAuthenticated ? <HabitsPage /> : <Navigate to="/login" />} />
            <Route path="/brain-dump" element={isAuthenticated ? <BrainDumpPage /> : <Navigate to="/login" />} />
            <Route path="/calendar" element={isAuthenticated ? <CalendarPage /> : <Navigate to="/login" />} />
            <Route path="/analytics" element={isAuthenticated ? <AnalyticsPage /> : <Navigate to="/login" />} />
            <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} />
            <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} />

            {/* Default Redirects */}
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            <Route path="*" element={<div className="text-center mt-10"><h1>404 Not Found</h1></div>} /> {/* Basic 404 */} 
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App; 