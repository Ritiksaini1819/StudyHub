import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Plus, Edit2, Trash2, BookMarked } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useUnits, useSubjects } from '../../hooks/useData';
import { Card, CardContent, LoadingSpinner, Alert, Button, Modal, Input, Select } from '../../components/common';
import { supabase } from '../../lib/supabase';
import type { Unit, Subject } from '../../types/database';

export default function TeacherUnits() {
  const { profile } = useAuth();
  const { data: subjects, loading: subjectsLoading } = useSubjects();
  const { data: allUnits, loading: unitsLoading, error, refetch } = useUnits();
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<(Unit & { subject_name?: string }) | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);

  const mySubjects = subjects?.filter((s) => s.created_by === profile?.id) || [];
  const myUnitIds = mySubjects.flatMap((s) => allUnits?.filter((u) => u.subject_id === s.id).map((u) => u.id) || []);
  const myUnits = allUnits?.filter((u) => myUnitIds.includes(u.id)) || [];

  // Enrich units with subject names
  const unitsWithSubject = myUnits.map((unit) => ({
    ...unit,
    subject_name: subjects?.find((s) => s.id === unit.subject_id)?.name || 'Unknown',
  }));

  const loading = subjectsLoading || unitsLoading;

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading units..." />
        </div>
      </DashboardLayout>
    );
  }

  const handleDelete = async (unit: Unit) => {
    try {
      const { error } = await supabase.from('units').delete().eq('id', unit.id);
      if (error) throw error;
      refetch();
      setDeletingUnit(null);
    } catch (err) {
      console.error('Failed to delete unit:', err);
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Units</h1>
            <p className="text-gray-400 mt-1">Organize your subjects into units</p>
          </div>
          <Button onClick={() => setShowModal(true)} disabled={mySubjects.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </Button>
        </div>

        {error && <Alert type="error" message={error} />}

        {mySubjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookMarked className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Create a subject first</h3>
              <p className="text-gray-400 mb-4">You need to create a subject before adding units.</p>
              <Link to="/teacher/subjects">
                <Button>Create Subject</Button>
              </Link>
            </CardContent>
          </Card>
        ) : unitsWithSubject.length > 0 ? (
          <div className="space-y-3">
            {unitsWithSubject.map((unit) => (
              <Card key={unit.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{unit.name}</h3>
                        <p className="text-sm text-gray-400">{unit.subject_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingUnit(unit)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingUnit(unit)}>
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
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No units yet</h3>
              <p className="text-gray-400 mb-4">Add units to organize your subjects.</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Unit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showModal || editingUnit) && (
        <UnitFormModal
          subjects={mySubjects}
          unit={editingUnit}
          onClose={() => {
            setShowModal(false);
            setEditingUnit(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingUnit(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirmation */}
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
              <Button variant="danger" onClick={() => handleDelete(deletingUnit)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function UnitFormModal({
  subjects,
  unit,
  onClose,
  onSuccess,
}: {
  subjects: Subject[];
  unit?: (Unit & { subject_name?: string }) | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(unit?.name || '');
  const [subjectId, setSubjectId] = useState(unit?.subject_id || subjects[0]?.id || '');
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

        <Select
          label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
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
