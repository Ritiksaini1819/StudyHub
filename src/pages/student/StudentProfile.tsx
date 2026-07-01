import { useState } from 'react';
import { User } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Alert } from '../../components/common';
import { supabase } from '../../lib/supabase';

export default function StudentProfile() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!profile) return;

    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setSuccess(true);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-gray-400 mt-1">Manage your profile information</p>
        </div>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message="Profile updated successfully" />}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <p className="text-white font-medium">{profile?.full_name || 'Student'}</p>
                <p className="text-gray-400 text-sm capitalize">{profile?.role}</p>
              </div>
            </div>

            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />

            <Input
              label="Email"
              value={profile?.id || ''}
              disabled
              helpText="Email cannot be changed"
            />

            <Input
              label="Role"
              value="Student"
              disabled
              helpText="Contact administrator to change role"
            />

            <div className="pt-4">
              <Button onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
