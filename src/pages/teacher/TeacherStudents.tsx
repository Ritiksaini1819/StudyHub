import { Users } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useStudents } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert } from '../../components/common';

export default function TeacherStudents() {
  const { data: students, loading, error } = useStudents();

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading students..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-gray-400 mt-1">View all registered students</p>
        </div>

        {error && <Alert type="error" message={error} />}

        {students && students.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-lg font-bold">
                      {student.full_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{student.full_name || 'Student'}</p>
                      <p className="text-sm text-gray-400">Student</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No students yet</h3>
              <p className="text-gray-400">Students will appear here once they sign up.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
