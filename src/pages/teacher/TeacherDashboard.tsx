import { Link } from 'react-router-dom';
import { BookMarked, FileText, Users, FolderOpen, Plus } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects, useStudyMaterials, useStudents } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button } from '../../components/common';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const { data: subjects, loading: subjectsLoading, error: subjectsError } = useSubjects();
  const { data: materials, loading: materialsLoading } = useStudyMaterials();
  const { data: students, loading: studentsLoading } = useStudents();

  const isLoading = subjectsLoading || materialsLoading || studentsLoading;

  // Filter subjects created by this teacher
  const mySubjects = subjects?.filter((s) => s.created_by === profile?.id) || [];
  const myMaterials = materials?.filter((m) => m.uploaded_by === profile?.id) || [];

  if (isLoading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {profile?.full_name || 'Teacher'}
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your subjects, units, and study materials
            </p>
          </div>
          <Link to="/teacher/subjects">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Subject
            </Button>
          </Link>
        </div>

        {(subjectsError) && (
          <Alert type="error" message={subjectsError} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{mySubjects.length}</p>
                  <p className="text-sm text-gray-400">My Subjects</p>
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
                  <p className="text-2xl font-bold text-white">{myMaterials.length}</p>
                  <p className="text-sm text-gray-400">Materials</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{students?.length || 0}</p>
                  <p className="text-sm text-gray-400">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{subjects?.length || 0}</p>
                  <p className="text-sm text-gray-400">Total Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/teacher/subjects">
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <BookMarked className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Manage Subjects</h3>
                    <p className="text-sm text-gray-400">Create and organize subjects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/teacher/units">
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Manage Units</h3>
                    <p className="text-sm text-gray-400">Organize content by units</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/teacher/materials">
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Upload Materials</h3>
                    <p className="text-sm text-gray-400">Add study materials</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">My Subjects</h3>
                <Link to="/teacher/subjects" className="text-sm text-emerald-500 hover:text-emerald-400">
                  View all
                </Link>
              </div>
              {mySubjects.length > 0 ? (
                <div className="space-y-3">
                  {mySubjects.slice(0, 5).map((subject) => (
                    <Link
                      key={subject.id}
                      to={`/teacher/subjects/${subject.id}`}
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
                <div className="text-center py-4">
                  <p className="text-gray-400">No subjects created yet</p>
                  <Link to="/teacher/subjects" className="text-sm text-emerald-500 hover:text-emerald-400">
                    Create your first subject
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Materials</h3>
                <Link to="/teacher/materials" className="text-sm text-emerald-500 hover:text-emerald-400">
                  View all
                </Link>
              </div>
              {myMaterials.length > 0 ? (
                <div className="space-y-3">
                  {myMaterials.slice(0, 5).map((material) => (
                    <Link
                      key={material.id}
                      to={`/teacher/materials/${material.id}`}
                      className="block p-3 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 transition-colors"
                    >
                      <p className="font-medium text-white">{material.title}</p>
                      <p className="text-sm text-gray-400">{material.file_type.toUpperCase()}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">No materials uploaded yet</p>
                  <Link to="/teacher/materials" className="text-sm text-emerald-500 hover:text-emerald-400">
                    Upload your first material
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
