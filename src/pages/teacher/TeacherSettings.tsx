import { Settings } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TeacherSettings() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account settings</p>
        </div>

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
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">StudyHub v1.0.0</p>
            <p className="text-sm text-gray-500 mt-2">
              A streamlined platform for managing study materials.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
