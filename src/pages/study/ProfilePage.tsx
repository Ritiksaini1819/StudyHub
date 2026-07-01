import { useState } from 'react';
import { User } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, LoadingSpinner, Alert, Button, Input } from '../../components/common';
import { supabase } from '../../lib/supabase';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!profile) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </SimpleLayout>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-gray-400 mt-1">Manage your account information</p>
        </div>

        {success && (
          <Alert type="success" message="Profile updated successfully!" />
        )}

        <Card>
          <CardContent className="p-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {error && <Alert type="error" message={error} />}

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                    {name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">{name || 'Your Name'}</p>
                    <p className="text-sm text-gray-400">{profile.email || 'user@example.com'}</p>
                  </div>
                </div>

                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />

                <div className="flex justify-end gap-3">
                  <Button variant="secondary" type="button" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">{profile.full_name || 'Your Name'}</p>
                    <p className="text-sm text-gray-400">{profile.email || 'user@example.com'}</p>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <p className="text-white">{profile.email || 'Not set'}</p>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Account Created</label>
                  <p className="text-white">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}
