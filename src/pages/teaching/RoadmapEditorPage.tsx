import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Save, ArrowLeft } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, Input, LoadingSpinner, Alert } from '../../components/common';

export default function RoadmapEditorPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    start_date: '',
    end_date: '',
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && profile?.id) {
      fetchRoadmap();
    }
  }, [id, profile]);

  const fetchRoadmap = async () => {
    try {
      const { data, error } = await supabase
        .from('teaching_roadmaps')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', profile!.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          description: data.description || '',
          subject_id: data.subject_id || '',
          start_date: data.start_date,
          end_date: data.end_date,
        });
      }
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      setError('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      setError('Start and end dates are required');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date must be after start date');
      return;
    }

    setSaving(true);

    try {
      const roadmapData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        subject_id: formData.subject_id || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        teacher_id: profile!.id,
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('teaching_roadmaps')
          .update(roadmapData)
          .eq('id', id);
      } else {
        result = await supabase
          .from('teaching_roadmaps')
          .insert(roadmapData)
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      navigate(`/teaching/roadmaps${isEditing ? '' : '/' + result.data?.id}`);
    } catch (error) {
      console.error('Error saving roadmap:', error);
      setError('Failed to save roadmap');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading roadmap..." />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Roadmap' : 'Create New Roadmap'}
            </h1>
            <p className="text-gray-400 text-sm">
              {isEditing ? 'Update your teaching roadmap' : 'Plan your teaching schedule'}
            </p>
          </div>
        </div>

        {error && (
          <Alert type="error" message={error} onDismiss={() => setError(null)} />
        )}

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Mathematics - Fall 2024"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="What topics will you cover in this roadmap?"
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
                  <option value="">Select a subject</option>
                  {subjects?.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />

                <Input
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>

              {/* Date Range Preview */}
              {formData.start_date && formData.end_date && (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <span>
                      Duration: {Math.ceil(
                        (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)
                      )} days
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Save Changes' : 'Create Roadmap'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}
