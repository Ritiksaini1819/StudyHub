import React, { useState } from 'react';
import { Key, X } from 'lucide-react';
import { Button, Alert } from '../common';

interface ReferralCodePopupProps {
  onClose: () => void;
  onSubmit: (referralCode: string) => Promise<{ success: boolean; error?: string }>;
}

export function ReferralCodePopup({ onClose, onSubmit }: ReferralCodePopupProps) {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!referralCode.trim()) {
      setError('Please enter a referral code');
      return;
    }

    setLoading(true);
    const result = await onSubmit(referralCode.trim());
    setLoading(false);

    if (result.success) {
      onClose();
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Teacher Referral Code</h2>
              <p className="text-gray-400 text-sm">Required to become a teacher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <Alert type="error" message={error} onDismiss={() => setError(null)} />
          )}

          <div>
            <p className="text-gray-300 mb-4">
              To become a teacher, you need a valid referral code. Enter your code below to verify and upgrade your account.
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Referral Code
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!referralCode.trim()}
              className="flex-1"
            >
              Verify & Upgrade
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
