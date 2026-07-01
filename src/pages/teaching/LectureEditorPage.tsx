import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye, FileText, BookOpen, Calendar, Clock } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects, useUnits } from '../../hooks/useData';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, Input, LoadingSpinner, Alert } from '../../components/common';

interface Roadmap {
  id: string;
  title: string;
}

interface Week {
  id: string;
  title: string | null;
  week_number: number;
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
}

export default function LectureEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const { data: units } = useUnits();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lecture_date: '',
    lecture_time: '',
    duration_minutes: '60',
    status: 'planned',
    notes: '',
    roadmap_id: searchParams.get('roadmap') || '',
    week_id: '',
    subject_id: '',
    unit_id: '',
    class_id: '',
    chapter: '',
    learning_objectives: '',
    instructions: '',
    is_published: false,
    is_draft: true,
  });
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchRoadmaps();
      fetchClasses();
      if (isEditing) fetchLecture();
    }
  }, [profile, isEditing]);

  useEffect(() => {
    if (formData.roadmap_id) {
      fetchWeeks(formData.roadmap_id);
    }
  }, [formData.roadmap_id]);

  const fetchRoadmaps = async () => {
    try {
      const { data } = await supabase
        .from('teaching_roadmaps')
        .select('id, title')
        .eq('teacher_id', profile!.id)
        .order('created_at', { ascending: false });
      setRoadmaps(data || []);
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('id, name, section')
        .eq('teacher_id', profile!.id)
        .order('name', { ascending: true });
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchWeeks = async (roadmapId: string) => {
    try {
      const { data } = await supabase
        .from('roadmap_weeks')
        .select('id, title, week_number')
        .eq('roadmap_id', roadmapId)
        .order('week_number', { ascending: true });
      setWeeks(data || []);
    } catch (error) {
      console.error('Error fetching weeks:', error);
    }
  };

  const fetchLecture = async () => {
    try {
      const { data, error } = await supabase
        .from('lecture_plans')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', profile!.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          description: data.description || '',
          lecture_date: data.lecture_date || '',
          lecture_time: data.lecture_time || '',
          duration_minutes: data.duration_minutes?.toString() || '60',
          status: data.status,
          notes: data.notes || '',
          roadmap_id: data.roadmap_id || '',
          week_id: data.week_id || '',
          subject_id: data.subject_id || '',
          unit_id: data.unit_id || '',
          class_id: data.class_id || '',
          chapter: data.chapter || '',
          learning_objectives: data.learning_objectives || '',
          instructions: data.instructions || '',
          is_published: data.is_published || false,
          is_draft: data.is_draft ?? true,
        });
        if (data.roadmap_id) {
          fetchWeeks(data.roadmap_id);
        }
      }
    } catch (error) {
      console.error('Error fetching lecture:', error);
      setError('Failed to load lecture');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (publishNow: boolean = false) => {
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);

    try {
      const lectureData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        lecture_date: formData.lecture_date || null,
        lecture_time: formData.lecture_time || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        status: formData.status,
        notes: formData.notes.trim() || null,
        roadmap_id: formData.roadmap_id || null,
        week_id: formData.week_id || null,
        subject_id: formData.subject_id || null,
        unit_id: formData.unit_id || null,
        class_id: formData.class_id || null,
        chapter: formData.chapter.trim() || null,
        learning_objectives: formData.learning_objectives.trim() || null,
        instructions: formData.instructions.trim() || null,
        is_published: publishNow ? true : (formData.is_published || false),
        is_draft: publishNow ? false : true,
        teacher_id: profile!.id,
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('lecture_plans')
          .update(lectureData)
          .eq('id', id);
      } else {
        result = await supabase
          .from('lecture_plans')
          .insert(lectureData)
          .select('id')
          .single();
      }

      if (result.error) throw result.error;

      navigate(`/teaching/lectures${isEditing ? '' : '/' + result.data?.id}`);
    } catch (error) {
      console.error('Error saving lecture:', error);
      setError('Failed to save lecture');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading lecture..." />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Lecture' : 'Create New Lecture'}
            </h1>
            <p className="text-gray-400 text-sm">
              {isEditing ? 'Update your lecture plan' : 'Plan your lecture content and schedule'}
            </p>
          </div>
          {isEditing && formData.is_published && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-sm rounded-full border border-emerald-500/30">
              Published
            </span>
          )}
        </div>

        {error && (
          <Alert type="error" message={error} onDismiss={() => setError(null)} />
        )}

        {/* Form */}
        <form className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              <div className="space-y-4">
                <Input
                  label="Lecture Title *"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction to Calculus"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Brief description of what will be covered"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Date"
                      type="date"
                      value={formData.lecture_date}
                      onChange={(e) => setFormData({ ...formData, lecture_date: e.target.value })}
                    />
                    <Input
                      label="Time"
                      type="time"
                      value={formData.lecture_time}
                      onChange={(e) => setFormData({ ...formData, lecture_time: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duration
                      </label>
                      <select
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                        <option value="90">90 min</option>
                        <option value="120">120 min</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Input
                  label="Chapter"
                  type="text"
                  value={formData.chapter}
                  onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                  placeholder="e.g., Chapter 1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Class & Subject */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Class & Subject</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Class/Section *
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Subject
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
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives & Instructions */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Content Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Learning Objectives
                  </label>
                  <textarea
                    value={formData.learning_objectives}
                    onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="What should students learn from this lecture?&#10;- Objective 1&#10;- Objective 2&#10;- Objective 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instructions / Notes for Students
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Any special instructions or materials students need to prepare"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roadmap Association */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Roadmap Association (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Roadmap
                  </label>
                  <select
                    value={formData.roadmap_id}
                    onChange={(e) => setFormData({ ...formData, roadmap_id: e.target.value, week_id: '' })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Not linked to roadmap</option>
                    {roadmaps.map((roadmap) => (
                      <option key={roadmap.id} value={roadmap.id}>
                        {roadmap.title}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.roadmap_id && weeks.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Week
                    </label>
                    <select
                      value={formData.week_id}
                      onChange={(e) => setFormData({ ...formData, week_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Not assigned to week</option>
                      {weeks.map((week) => (
                        <option key={week.id} value={week.id}>
                          {week.title || `Week ${week.week_number}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Private Notes */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Private Notes</h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Personal notes (not visible to students)"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => handleSubmit(false)}
              loading={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              loading={saving}
            >
              <Send className="w-4 h-4 mr-2" />
              {!formData.is_published ? 'Publish' : 'Save & Publish'}
            </Button>
          </div>
        </form>
      </div>
    </SimpleLayout>
  );
}
