import { Link } from 'react-router-dom';
import { BookMarked, FileText, BookOpen } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects, useStudyMaterials } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert } from '../../components/common';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const { data: subjects, loading: subjectsLoading, error: subjectsError } = useSubjects();
  const { data: materials, loading: materialsLoading, error: materialsError } = useStudyMaterials();

  const isLoading = subjectsLoading || materialsLoading;
  const error = subjectsError || materialsError;

  if (isLoading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {profile?.full_name || 'Student'}
          </h1>
          <p className="text-gray-400 mt-1">
            Access your study materials and track your progress
          </p>
        </div>

        {error && (
          <Alert type="error" message={error} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{subjects?.length || 0}</p>
                  <p className="text-sm text-gray-400">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{materials?.length || 0}</p>
                  <p className="text-sm text-gray-400">Materials</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">Active</p>
                  <p className="text-sm text-gray-400">Learning</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Subjects */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Subjects</h3>
              {subjects && subjects.length > 0 ? (
                <div className="space-y-3">
                  {subjects.slice(0, 5).map((subject) => (
                    <Link
                      key={subject.id}
                      to={`/student/subjects/${subject.id}`}
                      className="block p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-colors"
                    >
                      <p className="font-medium text-white">{subject.name}</p>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {subject.description || 'No description'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No subjects available yet</p>
              )}
              <Link
                to="/student/subjects"
                className="block mt-4 text-center text-sm text-emerald-500 hover:text-emerald-400"
              >
                View all subjects
              </Link>
            </CardContent>
          </Card>

          {/* Recent Materials */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Materials</h3>
              {materials && materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.slice(0, 5).map((material) => (
                    <Link
                      key={material.id}
                      to={`/student/materials/${material.id}`}
                      className="block p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-colors"
                    >
                      <p className="font-medium text-white">{material.title}</p>
                      <p className="text-sm text-gray-400 mt-1">{material.file_type.toUpperCase()}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No materials available yet</p>
              )}
              <Link
                to="/student/materials"
                className="block mt-4 text-center text-sm text-emerald-500 hover:text-emerald-400"
              >
                View all materials
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
