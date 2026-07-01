import { Link, useParams } from 'react-router-dom';
import { BookMarked, FolderOpen, ChevronRight, ArrowLeft, FileText } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useSubjects, useUnits, useStudyMaterials, useSubject } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button } from '../../components/common';

export function StudentSubjects() {
  const { data: subjects, loading, error } = useSubjects();

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading subjects..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subjects</h1>
          <p className="text-gray-400 mt-1">Browse all available subjects</p>
        </div>

        {error && <Alert type="error" message={error} />}

        {subjects && subjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookMarked className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No subjects yet</h3>
              <p className="text-gray-400">Subjects will appear here once teachers create them.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function SubjectCard({ subject }: { subject: { id: string; name: string; description: string | null } }) {
  const { data: units } = useUnits(subject.id);

  return (
    <Link to={`/student/subjects/${subject.id}`}>
      <Card hover className="h-full">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white">{subject.name}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                {subject.description || 'No description available'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <FolderOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">{units?.length || 0} units</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function StudentSubjectDetail() {
  const { subjectId } = useParams();
  const { data: subject, loading: subjectLoading, error: subjectError } = useSubject(subjectId || '');
  const { data: units, loading: unitsLoading } = useUnits(subjectId);
  const { data: materials, loading: materialsLoading } = useStudyMaterials(subjectId);

  const loading = subjectLoading || unitsLoading || materialsLoading;

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading subject..." />
        </div>
      </DashboardLayout>
    );
  }

  if (subjectError || !subject) {
    return (
      <DashboardLayout role="student">
        <div className="space-y-6">
          <Link to="/student/subjects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subjects
            </Button>
          </Link>
          <Alert type="error" message={subjectError || 'Subject not found'} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/student/subjects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{subject.name}</h1>
            <p className="text-gray-400 mt-1">{subject.description || 'No description'}</p>
          </div>
          <Link to={`/student/content/${subject.id}`}>
            <Button>
              <BookMarked className="w-4 h-4 mr-2" />
              View Study Content
            </Button>
          </Link>
        </div>

        {/* Units */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Units</h2>
          {units && units.length > 0 ? (
            <div className="space-y-3">
              {units.map((unit) => {
                const unitMaterials = materials?.filter((m) => m.unit_id === unit.id) || [];
                return (
                  <Card key={unit.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">{unit.name}</h3>
                          <p className="text-sm text-gray-400 mt-1">{unit.description || 'No description'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-500">{unitMaterials.length} materials</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No units available for this subject</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* All Materials */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">All Materials</h2>
          {materials && materials.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <Link key={material.id} to={`/student/materials/${material.id}`}>
                  <Card hover>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{material.title}</p>
                          <p className="text-sm text-gray-400">{material.file_type.toUpperCase()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No materials available for this subject</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
