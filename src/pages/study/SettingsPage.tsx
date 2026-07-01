import { useState, useEffect } from 'react';
import { Settings, LogOut, Info, User, Key, GraduationCap, Briefcase, Lock, Save } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { Card, CardContent, CardHeader, CardTitle, Button, Alert } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ReferralCodePopup } from '../../components/settings/ReferralCodePopup';
import { ChangePasswordModal } from '../../components/settings/ChangePasswordModal';

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setGrade(profile.grade || '');
      setSelectedRole(profile.role);
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          grade: grade || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        setError('Failed to save profile changes');
        return;
      }

      await refreshProfile();
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Save profile error:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (newRole: 'student' | 'teacher') => {
    if (newRole === selectedRole) return;

    if (newRole === 'teacher' && profile?.role === 'student') {
      // Show referral code popup for student -> teacher
      setSelectedRole('teacher');
      setShowReferralPopup(true);
    } else {
      // Direct role change (teacher -> student)
      setSelectedRole(newRole);
      applyRoleChange(newRole);
    }
  };

  const applyRoleChange = async (newRole: 'student' | 'teacher', referralCode?: string) => {
    if (!user) return { success: false, error: 'User not found' };

    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-role-change', {
        body: {
          userId: user.id,
          newRole,
          referralCode,
        },
      });

      if (fnError) {
        return { success: false, error: fnError.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      if (data?.success) {
        await refreshProfile();
        return { success: true };
      }

      return { success: false, error: 'Failed to update role' };
    } catch (err) {
      console.error('Role change error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const handleReferralCodeSubmit = async (referralCode: string) => {
    const result = await applyRoleChange('teacher', referralCode);

    if (result.success) {
      setShowReferralPopup(false);
      setSuccess('Role updated to Teacher');
      return { success: true };
    }

    return { success: false, error: result.error };
  };

  const handleReferralPopupClose = () => {
    setShowReferralPopup(false);
    // Reset selected role to current role
    if (profile) {
      setSelectedRole(profile.role);
    }
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    setSuccess('Password changed successfully');
  };

  return (
    <SimpleLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account settings</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert type="success" message={success} onDismiss={() => setSuccess(null)} />
        )}
        {error && (
          <Alert type="error" message={error} onDismiss={() => setError(null)} />
        )}

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full Name */}
            <div className="py-3 border-b border-gray-800">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Grade/Class */}
            <div className="py-3 border-b border-gray-800">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Grade/Class
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g., 10th Grade, Class 12, College"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Role Selection */}
            <div className="py-3 border-b border-gray-800">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    selectedRole === 'student'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <GraduationCap className="w-8 h-8" />
                  <span className="font-medium">Student</span>
                  <span className="text-xs opacity-75">Learn & Study</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('teacher')}
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    selectedRole === 'teacher'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Briefcase className="w-8 h-8" />
                  <span className="font-medium">Teacher</span>
                  <span className="text-xs opacity-75">Create & Manage</span>
                </button>
              </div>
              {profile?.role === 'student' && selectedRole === 'teacher' && !showReferralPopup && (
                <p className="text-xs text-amber-400 mt-2">
                  Referral code required to become a teacher
                </p>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button
                onClick={handleSaveProfile}
                loading={saving}
                disabled={fullName === profile?.full_name && grade === (profile?.grade || '')}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <div>
                <p className="text-white font-medium">Change Password</p>
                <p className="text-sm text-gray-400">Update your account password</p>
              </div>
              <Button variant="secondary" onClick={() => setShowChangePassword(true)}>
                <Key className="w-4 h-4 mr-2" />
                Change
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <div>
                <p className="text-white font-medium">Sign Out</p>
                <p className="text-sm text-gray-400">Sign out of your account on this device</p>
              </div>
              <Button variant="secondary" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">StudyHub v1.0.0</p>
            <p className="text-sm text-gray-500 mt-2">
              A streamlined platform for managing study materials.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Popup */}
      {showReferralPopup && (
        <ReferralCodePopup
          onClose={handleReferralPopupClose}
          onSubmit={handleReferralCodeSubmit}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && user && (
        <ChangePasswordModal
          userId={user.id}
          email={user.email || ''}
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChanged}
        />
      )}
    </SimpleLayout>
  );
}
