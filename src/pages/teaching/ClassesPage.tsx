import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, MoreVertical, Edit, Trash2, UserPlus } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, LoadingSpinner, Modal, Input, Alert } from '../../components/common';

interface ClassItem {
  id: string;
  name: string;
  section: string;
  teacher_id: string | null;
  subject_id: string | null;
  academic_year: string | null;
  description: string | null;
  student_count?: number;
}

interface Enrollment {
  id: string;
  student_id: string;
  profiles: { id: string; full_name: string; email: string } | null;
}

export default function ClassesPage() {
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string; email: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    section: '',
    subject_id: '',
    academic_year: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchClasses();
    }
  }, [profile]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          class_enrollments(count)
        `)
        .eq('teacher_id', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const classesWithCount = data?.map((c) => ({
        ...c,
        student_count: c.class_enrollments?.[0]?.count || 0,
      })) || [];

      setClasses(classesWithCount);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async (classId: string) => {
    try {
      const { data } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          student_id,
          profiles(id, full_name, email)
        `)
        .eq('class_id', classId);
      setEnrollments(data || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.section.trim()) {
      setError('Name and section are required');
      return;
    }

    setSaving(true);

    try {
      const classData = {
        name: formData.name.trim(),
        section: formData.section.trim(),
        subject_id: formData.subject_id || null,
        academic_year: formData.academic_year.trim() || null,
        description: formData.description.trim() || null,
        teacher_id: profile!.id,
      };

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('classes')
          .insert(classData);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingClass(null);
      setFormData({ name: '', section: '', subject_id: '', academic_year: '', description: '' });
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      setError('Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      setClasses(classes.filter((c) => c.id !== deleteId));
    } catch (error) {
      console.error('Error deleting class:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const handleEnrollStudent = async (studentId: string) => {
    if (!selectedClassId) return;

    try {
      const { error } = await supabase
        .from('class_enrollments')
        .insert({
          class_id: selectedClassId,
          student_id: studentId,
        });
      if (error) throw error;
      fetchEnrollments(selectedClassId);
      fetchClasses();
    } catch (error) {
      console.error('Error enrolling student:', error);
    }
  };

  const handleUnenrollStudent = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('id', enrollmentId);
      if (error) throw error;
      if (selectedClassId) {
        fetchEnrollments(selectedClassId);
        fetchClasses();
      }
    } catch (error) {
      console.error('Error unenrolling student:', error);
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', section: '', subject_id: '', academic_year: '', description: '' });
    setEditingClass(null);
    setShowModal(true);
  };

  const openEditModal = (classItem: ClassItem) => {
    setFormData({
      name: classItem.name,
      section: classItem.section,
      subject_id: classItem.subject_id || '',
      academic_year: classItem.academic_year || '',
      description: classItem.description || '',
    });
    setEditingClass(classItem);
    setShowModal(true);
  };

  const openEnrollmentModal = (classId: string) => {
    setSelectedClassId(classId);
    fetchEnrollments(classId);
    fetchStudents();
    setShowEnrollmentModal(true);
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading classes..." />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Classes</h1>
            <p className="text-gray-400 mt-1">Manage your classes and enroll students</p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            New Class
          </Button>
        </div>

        {/* Classes List */}
        {classes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No classes yet</h2>
              <p className="text-gray-400 mb-6">
                Create a class to organize your students and lectures
              </p>
              <Button onClick={openAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {classItem.name} - {classItem.section}
                      </h3>
                      {classItem.academic_year && (
                        <p className="text-sm text-gray-400">{classItem.academic_year}</p>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === classItem.id ? null : classItem.id)}
                        className="p-1 hover:bg-gray-800 rounded"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      {menuOpen === classItem.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-8 z-20 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
                            <button
                              onClick={() => {
                                openEnrollmentModal(classItem.id);
                                setMenuOpen(null);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-t-lg w-full"
                            >
                              <UserPlus className="w-4 h-4" /> Manage Students
                            </button>
                            <button
                              onClick={() => {
                                openEditModal(classItem);
                                setMenuOpen(null);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 w-full"
                            >
                              <Edit className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(classItem.id);
                                setMenuOpen(null);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-800 rounded-b-lg w-full"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-400">
                    {classItem.subject_id && subjects?.find((s) => s.id === classItem.subject_id) && (
                      <p>Subject: {subjects.find((s) => s.id === classItem.subject_id)?.name}</p>
                    )}
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {classItem.student_count || 0} students
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => openEnrollmentModal(classItem.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Manage Students
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Class Modal */}
        {showModal && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowModal(false);
              setEditingClass(null);
            }}
            title={editingClass ? 'Edit Class' : 'Create New Class'}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Class Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mathematics"
                  required
                />
                <Input
                  label="Section"
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., A"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject (Optional)
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select subject</option>
                  {subjects?.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Academic Year (Optional)"
                type="text"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="e.g., 2024-2025"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Brief description of this class"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editingClass ? 'Save Changes' : 'Create Class'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Student Enrollment Modal */}
        {showEnrollmentModal && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowEnrollmentModal(false);
              setSelectedClassId(null);
              setEnrollments([]);
            }}
            title="Manage Students"
            size="lg"
          >
            <div className="space-y-4">
              {/* Enrolled Students */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Enrolled Students</h4>
                {enrollments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No students enrolled yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {enrollment.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-gray-400 text-sm">{enrollment.profiles?.email}</p>
                        </div>
                        <button
                          onClick={() => handleUnenrollStudent(enrollment.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Students */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Add Students</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {students
                    .filter(
                      (s) => !enrollments.some((e) => e.student_id === s.id)
                    )
                    .map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">{student.full_name}</p>
                          <p className="text-gray-400 text-sm">{student.email}</p>
                        </div>
                        <button
                          onClick={() => handleEnrollStudent(student.id)}
                          className="text-emerald-400 hover:text-emerald-300 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  {students.filter((s) => !enrollments.some((e) => e.student_id === s.id))
                    .length === 0 && (
                    <p className="text-gray-500 text-sm">All students are already enrolled</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEnrollmentModal(false);
                    setSelectedClassId(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <Modal isOpen={true} onClose={() => setDeleteId(null)} title="Delete Class">
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this class? All student enrollments will be removed.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </SimpleLayout>
  );
}
