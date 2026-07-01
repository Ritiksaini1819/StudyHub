import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Briefcase, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Alert, Card, CardContent } from '../../components/common';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, loading: authLoading, error, clearError } = useAuth();

  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [referralCode, setReferralCode] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    clearError();
    setSubmitError(null);

    // Store selected role in localStorage for callback to use
    localStorage.setItem('oauth_role', role);

    // Teacher Google sign-in requires referral code
    if (role === 'teacher') {
      if (!referralCode.trim()) {
        setSubmitError('Please enter a referral code before signing up as a teacher');
        return;
      }
      localStorage.setItem('oauth_referral_code', referralCode.trim());
    } else {
      localStorage.removeItem('oauth_referral_code');
    }

    const result = await signInWithGoogle();
    if (result.error) {
      setSubmitError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <BookOpen className="w-10 h-10 text-emerald-500" />
            <span className="text-2xl font-bold text-white">StudyHub</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-500 hover:text-emerald-400">
              Sign in
            </Link>
          </p>
        </div>

        {(error || submitError) && (
          <div className="mb-6">
            <Alert type="error" message={error || submitError || ''} onDismiss={() => { clearError(); setSubmitError(null); }} />
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    role === 'student'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <GraduationCap className="w-8 h-8" />
                  <span className="font-medium">Student</span>
                  <span className="text-xs opacity-75">Join & Learn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    role === 'teacher'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Briefcase className="w-8 h-8" />
                  <span className="font-medium">Teacher</span>
                  <span className="text-xs opacity-75">Create & Manage</span>
                </button>
              </div>
            </div>

            {/* Referral Code - Only for Teachers */}
            {role === 'teacher' && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-400">Teacher Referral Code Required</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Teacher accounts require a valid referral code. Enter your code below.
                </p>
                <Input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code"
                  autoComplete="off"
                />
              </div>
            )}

            {/* Google Sign Up Button */}
            <Button
              variant="primary"
              fullWidth
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="bg-white hover:bg-gray-100 text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {role === 'teacher' && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Your referral code will be validated after Google sign-in.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
