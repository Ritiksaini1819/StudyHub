import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FullPageLoader } from './components/common';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { SetPasswordPopup } from './components/auth/SetPasswordPopup';

// Lazy load pages for code splitting
const LandingPage = React.lazy(() => import('./pages/landing/LandingPage'));
const SignupPage = React.lazy(() => import('./pages/auth/SignupPage'));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const AuthCallbackPage = React.lazy(() => import('./pages/auth/AuthCallbackPage'));

// Simple role-agnostic study pages
const Dashboard = React.lazy(() => import('./pages/study/Dashboard'));
const ProfilePage = React.lazy(() => import('./pages/study/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/study/SettingsPage'));
import { SubjectsPage, SubjectDetailPage } from './pages/study/SubjectsPage';
const UnitContentPage = React.lazy(() => import('./pages/study/UnitContentPage'));

// Teacher-specific pages
const RoadmapsPage = React.lazy(() => import('./pages/teaching/RoadmapsPage'));
const RoadmapEditorPage = React.lazy(() => import('./pages/teaching/RoadmapEditorPage'));
const RoadmapDetailPage = React.lazy(() => import('./pages/teaching/RoadmapDetailPage'));
const LecturesPage = React.lazy(() => import('./pages/teaching/LecturesPage'));
const LectureEditorPage = React.lazy(() => import('./pages/teaching/LectureEditorPage'));
const LectureDetailPage = React.lazy(() => import('./pages/teaching/LectureDetailPage'));
const ClassesPage = React.lazy(() => import('./pages/teaching/ClassesPage'));

// Student-specific pages
const StudentLecturesPage = React.lazy(() => import('./pages/student/StudentLecturesPage'));

// Password popup wrapper
function PasswordPopupWrapper() {
  const { user, needsPassword, onPasswordSet } = useAuth();

  if (!needsPassword || !user) return null;

  return (
    <SetPasswordPopup
      userId={user.id}
      email={user.email || ''}
      onSuccess={onPasswordSet}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PasswordPopupWrapper />
        <Suspense fallback={<FullPageLoader text="Loading..." />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected Routes - No role separation */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedRoute>
                  <SubjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/:subjectId"
              element={
                <ProtectedRoute>
                  <SubjectDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/units/:unitId"
              element={
                <ProtectedRoute>
                  <UnitContentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Teaching Routes - Teacher only */}
            <Route
              path="/teaching/roadmaps"
              element={
                <ProtectedRoute>
                  <RoadmapsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/roadmaps/new"
              element={
                <ProtectedRoute>
                  <RoadmapEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/roadmaps/:id"
              element={
                <ProtectedRoute>
                  <RoadmapDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/roadmaps/:id/edit"
              element={
                <ProtectedRoute>
                  <RoadmapEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/lectures"
              element={
                <ProtectedRoute>
                  <LecturesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/lectures/new"
              element={
                <ProtectedRoute>
                  <LectureEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/lectures/:id"
              element={
                <ProtectedRoute>
                  <LectureDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/lectures/:id/edit"
              element={
                <ProtectedRoute>
                  <LectureEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teaching/classes"
              element={
                <ProtectedRoute>
                  <ClassesPage />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/my-lectures"
              element={
                <ProtectedRoute>
                  <StudentLecturesPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback - redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
