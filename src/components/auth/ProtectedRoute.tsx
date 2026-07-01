import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageLoader } from '../common';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'teacher')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, initialized, error, needsPassword } = useAuth();
  const location = useLocation();

  // Still initializing - show loader with timeout protection
  if (!initialized && loading) {
    return <FullPageLoader text="Verifying authentication..." />;
  }

  // User needs to set password - show loader while popup is displayed
  // The SetPasswordPopup is rendered at App level, so we just need to not redirect
  if (needsPassword && user) {
    return <FullPageLoader text="Setting up your account..." />;
  }

  // Initialization complete but errored (and user not logged in)
  if (error && !user) {
    return <Navigate to="/" state={{ authError: error }} replace />;
  }

  // No session - redirect to home
  if (!user) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  // User exists but profile is loading - show loader
  if (!profile) {
    return <FullPageLoader text="Loading profile..." />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

interface PublicRouteProps {
  children: React.ReactNode;
  redirectAuthenticated?: boolean;
}

export function PublicRoute({ children, redirectAuthenticated = true }: PublicRouteProps) {
  const { user, profile, initialized, loading, needsPassword } = useAuth();
  const location = useLocation();

  // Still initializing
  if (!initialized && loading) {
    return <FullPageLoader text="Loading..." />;
  }

  // User needs to set password - don't redirect, let them see the public page
  // The SetPasswordPopup is handled at App level
  if (needsPassword && user) {
    return <>{children}</>;
  }

  // Authenticated user with profile - redirect to dashboard
  if (user && profile && redirectAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
}
