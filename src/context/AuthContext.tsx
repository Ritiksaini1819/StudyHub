import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  needsPassword: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  onPasswordSet: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INIT_TIMEOUT = 10000;
const PROFILE_FETCH_TIMEOUT = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
    initialized: false,
    needsPassword: false,
  });

  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const clearInitTimeout = useCallback(() => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  }, []);

  const createProfile = useCallback(async (
    userId: string,
    session: Session,
    role: UserRole,
    storedReferralCode?: string | null
  ): Promise<{ profile: Profile | null; error?: string }> => {
    const fullName = session.user.user_metadata?.full_name ||
                     session.user.user_metadata?.name ||
                     session.user.email?.split('@')[0] || 'User';
    const email = session.user.email || null;

    // For teacher OAuth signup, validate referral code server-side
    if (role === 'teacher' && storedReferralCode) {
      try {
        const { data: validationData, error: validationError } = await supabase.functions.invoke(
          'validate-teacher-oauth',
          {
            body: {
              userId,
              referralCode: storedReferralCode,
              email,
              fullName,
            },
          }
        );

        if (validationError || validationData?.error) {
          return {
            profile: null,
            error: validationData?.error || 'Invalid referral code. Teacher account could not be created.'
          };
        }

        // Teacher profile created by edge function
        const profile = await fetchProfile(userId);
        return { profile };
      } catch (err) {
        console.error('OAuth teacher validation error:', err);
        return { profile: null, error: 'Failed to validate teacher registration. Please try again.' };
      }
    }

    // Regular profile creation - use upsert to handle existing profile
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      role: role,
      email: email,
      has_password: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    // Ignore 409 conflict - profile already exists is fine
    if (upsertError && !upsertError.message?.includes('duplicate') && upsertError.code !== '23505') {
      console.error('Profile upsert error:', upsertError);
      // Still try to fetch the profile - it might exist
    }

    const profile = await fetchProfile(userId);
    return { profile };
  }, [fetchProfile]);

  const initializeAuth = useCallback(async (session: Session | null) => {
    if (!mountedRef.current) return;

    clearInitTimeout();

    if (!session?.user) {
      setState((prev) => ({
        ...prev,
        user: null,
        profile: null,
        session: null,
        loading: false,
        initialized: true,
        needsPassword: false,
        error: null,
      }));
      return;
    }

    // Try to fetch existing profile first
    let profile = await fetchProfile(session.user.id);

    if (!mountedRef.current) return;

    // If profile doesn't exist, create it
    if (!profile) {
      const storedRole = localStorage.getItem('oauth_role') as UserRole | null;
      const storedReferralCode = localStorage.getItem('oauth_referral_code');
      const role = storedRole || 'student';

      // Clear stored values
      localStorage.removeItem('oauth_role');
      localStorage.removeItem('oauth_referral_code');

      const result = await createProfile(session.user.id, session, role, storedReferralCode);

      if (result.error) {
        // Sign out on validation error (invalid referral code)
        await supabase.auth.signOut();
        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          session: null,
          loading: false,
          initialized: true,
          needsPassword: false,
          error: result.error,
        }));
        return;
      }

      profile = result.profile;
    }

    if (!mountedRef.current) return;

    // Determine if user needs to set password
    const needsPassword = profile ? !profile.has_password : false;
    const profileWithEmail = profile ? { ...profile, email: session.user.email || null } : null;

    setState((prev) => ({
      ...prev,
      user: session.user,
      profile: profileWithEmail,
      session,
      loading: false,
      initialized: true,
      needsPassword,
      error: null, // Clear any previous errors on successful auth
    }));
  }, [fetchProfile, createProfile, clearInitTimeout]);

  useEffect(() => {
    mountedRef.current = true;

    initTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !state.initialized) {
        console.warn('Auth initialization timed out');
        setState((prev) => ({
          ...prev,
          loading: false,
          initialized: true,
          error: 'Authentication initialization timed out. Please refresh.',
        }));
      }
    }, INIT_TIMEOUT);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      initializeAuth(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_OUT') {
        clearInitTimeout();
        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          session: null,
          loading: false,
          initialized: true,
          needsPassword: false,
          error: null,
        }));
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        initializeAuth(session);
      }
    });

    return () => {
      mountedRef.current = false;
      clearInitTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false }));
        return { error: error.message };
      }

      if (!data.user) {
        setState((prev) => ({ ...prev, loading: false }));
        return { error: 'Failed to create account' };
      }

      return { error: null };
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }));
      return { error: 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false }));
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }));
      return { error: 'An unexpected error occurred' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      await supabase.auth.signOut();
      setState((prev) => ({
        ...prev,
        user: null,
        profile: null,
        session: null,
        loading: false,
        needsPassword: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    if (profile && mountedRef.current) {
      const profileWithEmail = { ...profile, email: state.user.email || null };
      setState((prev) => ({ ...prev, profile: profileWithEmail }));
    }
  };

  const onPasswordSet = () => {
    setState((prev) => ({ ...prev, needsPassword: false, error: null }));
    refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        clearError,
        refreshProfile,
        onPasswordSet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
