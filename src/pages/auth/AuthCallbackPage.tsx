import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner, Alert } from '../../components/common';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, initialized, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for OAuth error in URL
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      const errorDescription = params.get('error_description');

      if (errorParam) {
        setLocalError(errorDescription || errorParam);
        setProcessing(false);
        return;
      }

      // Wait for auth to initialize
      if (!initialized) return;

      // Check for auth errors
      if (error) {
        setLocalError(error);
        setProcessing(false);
        return;
      }

      // Success - redirect to dashboard
      if (user && profile) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // No user after initialization complete
      if (!user) {
        const message = location.state?.message;
        if (message) {
          // Show message (e.g., email confirmation needed)
          setLocalError(null);
          setProcessing(false);
        } else {
          setLocalError('Authentication failed. Please try again.');
          setProcessing(false);
        }
      }
    };

    handleCallback();
  }, [user, profile, initialized, error, navigate, location.state]);

  if (processing) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <BookOpen className="w-12 h-12 text-emerald-500 mb-6" />
        <LoadingSpinner size="lg" text="Completing sign in..." />
      </div>
    );
  }

  const message = location.state?.message;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <BookOpen className="w-12 h-12 text-emerald-500 mb-6" />
      {localError && (
        <div className="w-full max-w-md mb-4">
          <Alert type="error" message={localError} />
        </div>
      )}
      {message && (
        <div className="w-full max-w-md mb-4">
          <Alert type="success" message={message} />
        </div>
      )}
      <button
        onClick={() => navigate('/login')}
        className="text-emerald-500 hover:text-emerald-400 font-medium"
      >
        Return to sign in
      </button>
    </div>
  );
}
