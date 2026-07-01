import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookMarked, Plus, Edit2, Trash2, FolderOpen, ChevronRight, ArrowLeft, FileText } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects, useUnits, useSubject } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button, Modal, Input } from '../../components/common';
import { supabase } from '../../lib/supabase';
import type { Subject, Unit } from '../../types/database';

export function SubjectsPage() {
  const { profile } = useAuth();
  const { data: subjects, loading, error, refetch } = useSubjects();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const handleDelete = async (subject: Subject) => {
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
      if (error) throw error;
      refetch();
      setDeletingSubject(null);
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading subjects..." />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Subjects</h1>
            <p className="text-gray-400 mt-1">Create and manage your subjects</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Subject
          </Button>
        </div>

        {error && <Alert type="error" message={error} />}

        {subjects && subjects.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onEdit={() => setEditingSubject(subject)}
                onDelete={() => setDeletingSubject(subject)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookMarked className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No subjects yet</h3>
              <p className="text-gray-400 mb-4">Create your first subject to get started.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Subject
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <SubjectFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSubject && (
        <SubjectFormModal
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSuccess={() => {
            setEditingSubject(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingSubject && (
        <Modal isOpen={true} onClose={() => setDeletingSubject(null)} title="Delete Subject">
          <div className="p-6">
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{deletingSubject.name}"? This will also delete all units and materials associated with this subject.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingSubject(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deletingSubject)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </SimpleLayout>
  );
}

function SubjectCard({
  subject,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: units } = useUnits(subject.id);

  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">{subject.name}</h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {subject.description || 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <FolderOpen className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">{units?.length || 0} units</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <Link to={`/subjects/${subject.id}`}>
            <Button variant="secondary" size="sm">
              View
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectFormModal({
  subject,
  onClose,
  onSuccess,
}: {
  subject?: Subject | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuth();
  const [name, setName] = useState(subject?.name || '');
  const [description, setDescription] = useState(subject?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError(null);
    setSaving(true);

    try {
      if (subject) {
        const { error } = await supabase
          .from('subjects')
          .update({
            name,
            description: description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subject.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('subjects').insert({
          name,
          description: description || null,
          created_by: profile.id,
        });

        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={subject ? 'Edit Subject' : 'Create Subject'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Mathematics"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the subject"
            rows={3}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {subject ? 'Save Changes' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data: subject, loading: subjectLoading, error: subjectError } = useSubject(subjectId || '');
  const { data: units, loading: unitsLoading, refetch: refetchUnits } = useUnits(subjectId);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  const loading = subjectLoading || unitsLoading;

  const handleDeleteUnit = async (unit: Unit) => {
    try {
      const { error } = await supabase.from('units').delete().eq('id', unit.id);
      if (error) throw error;
      refetchUnits();
      setDeletingUnit(null);
    } catch (err) {
      console.error('Failed to delete unit:', err);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading subject..." />
        </div>
      </SimpleLayout>
    );
  }

  if (subjectError || !subject) {
    return (
      <SimpleLayout>
        <div className="space-y-6">
          <Link to="/subjects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subjects
            </Button>
          </Link>
          <Alert type="error" message={subjectError || 'Subject not found'} />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/subjects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">{subject.name}</h1>
          <p className="text-gray-400 mt-1">{subject.description || 'No description'}</p>
        </div>

        {/* Units */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Units</h2>
            <Button size="sm" onClick={() => setShowUnitModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </div>

          {units && units.length > 0 ? (
            <div className="space-y-3">
              {units.map((unit) => (
                <Card key={unit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{unit.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{unit.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/units/${unit.id}`}>
                          <Button variant="secondary" size="sm">
                            <FileText className="w-4 h-4 mr-1.5" />
                            Content
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUnit(unit)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingUnit(unit)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No units yet</p>
                <Button size="sm" className="mt-4" onClick={() => setShowUnitModal(true)}>
                  Add Unit
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Unit Modal */}
      {(showUnitModal || editingUnit) && (
        <UnitFormModal
          subjectId={subject.id}
          unit={editingUnit}
          onClose={() => {
            setShowUnitModal(false);
            setEditingUnit(null);
          }}
          onSuccess={() => {
            setShowUnitModal(false);
            setEditingUnit(null);
            refetchUnits();
          }}
        />
      )}

      {/* Delete Unit Modal */}
      {deletingUnit && (
        <Modal isOpen={true} onClose={() => setDeletingUnit(null)} title="Delete Unit">
          <div className="p-6">
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{deletingUnit.name}"? Materials in this unit will become unassigned.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeletingUnit(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDeleteUnit(deletingUnit)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </SimpleLayout>
  );
}

function UnitFormModal({
  subjectId,
  unit,
  onClose,
  onSuccess,
}: {
  subjectId: string;
  unit?: Unit | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(unit?.name || '');
  const [description, setDescription] = useState(unit?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (unit) {
        const { error } = await supabase
          .from('units')
          .update({
            name,
            description: description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', unit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('units').insert({
          subject_id: subjectId,
          name,
          description: description || null,
          order_index: 0,
        });
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={unit ? 'Edit Unit' : 'Add Unit'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Unit Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Algebra"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            rows={3}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {unit ? 'Save Changes' : 'Add Unit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
