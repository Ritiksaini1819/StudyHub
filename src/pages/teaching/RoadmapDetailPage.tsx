import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Plus, MoreVertical, Edit, Trash2, ChevronRight,
  ClipboardList, Clock, CheckCircle, BookOpen
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, LoadingSpinner, Modal, Input, Alert } from '../../components/common';

interface Roadmap {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Week {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  title: string | null;
  goals: string | null;
}

interface Lecture {
  id: string;
  title: string;
  lecture_date: string | null;
  status: string;
  duration_minutes: number | null;
}

export default function RoadmapDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteWeekId, setDeleteWeekId] = useState<string | null>(null);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    start_date: '',
    end_date: '',
    title: '',
    goals: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id || !profile?.id) return;

    try {
      const [roadmapRes, weeksRes, lecturesRes] = await Promise.all([
        supabase
          .from('teaching_roadmaps')
          .select('*')
          .eq('id', id)
          .eq('teacher_id', profile.id)
          .single(),
        supabase
          .from('roadmap_weeks')
          .select('*')
          .eq('roadmap_id', id)
          .order('week_number', { ascending: true }),
        supabase
          .from('lecture_plans')
          .select('id, title, lecture_date, status, duration_minutes')
          .eq('roadmap_id', id)
          .order('lecture_date', { ascending: true })
      ]);

      if (roadmapRes.error) throw roadmapRes.error;
      setRoadmap(roadmapRes.data);
      setWeeks(weeksRes.data || []);
      setLectures(lecturesRes.data || []);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      navigate('/teaching/roadmaps');
    } finally {
      setLoading(false);
    }
  }, [id, profile?.id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveWeek = async () => {
    if (!weekForm.start_date || !weekForm.end_date) {
      setError('Start and end dates are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingWeek) {
        const { error } = await supabase
          .from('roadmap_weeks')
          .update({
            start_date: weekForm.start_date,
            end_date: weekForm.end_date,
            title: weekForm.title || null,
            goals: weekForm.goals || null,
          })
          .eq('id', editingWeek.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roadmap_weeks')
          .insert({
            roadmap_id: id,
            week_number: weekForm.week_number,
            start_date: weekForm.start_date,
            end_date: weekForm.end_date,
            title: weekForm.title || null,
            goals: weekForm.goals || null,
          });
        if (error) throw error;
      }

      setShowWeekModal(false);
      setEditingWeek(null);
      setWeekForm({ week_number: 1, start_date: '', end_date: '', title: '', goals: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving week:', error);
      setError('Failed to save week');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeek = async () => {
    if (!deleteWeekId) return;

    try {
      const { error } = await supabase
        .from('roadmap_weeks')
        .delete()
        .eq('id', deleteWeekId);
      if (error) throw error;
      setWeeks(weeks.filter((w) => w.id !== deleteWeekId));
    } catch (error) {
      console.error('Error deleting week:', error);
    } finally {
      setDeleteWeekId(null);
    }
  };

  const openAddWeekModal = () => {
    const nextWeek = weeks.length + 1;
    let startDate = roadmap?.start_date || '';
    let endDate = '';

    if (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1];
      const lastEndDate = new Date(lastWeek.end_date);
      lastEndDate.setDate(lastEndDate.getDate() + 1);
      startDate = lastEndDate.toISOString().split('T')[0];
      const newEndDate = new Date(lastEndDate);
      newEndDate.setDate(newEndDate.getDate() + 6);
      endDate = newEndDate.toISOString().split('T')[0];
    } else {
      startDate = roadmap?.start_date || '';
      const newEndDate = new Date(startDate);
      newEndDate.setDate(newEndDate.getDate() + 6);
      endDate = newEndDate.toISOString().split('T')[0];
    }

    setWeekForm({
      week_number: nextWeek,
      start_date: startDate,
      end_date: endDate,
      title: '',
      goals: ''
    });
    setEditingWeek(null);
    setShowWeekModal(true);
  };

  const openEditWeekModal = (week: Week) => {
    setWeekForm({
      week_number: week.week_number,
      start_date: week.start_date,
      end_date: week.end_date,
      title: week.title || '',
      goals: week.goals || ''
    });
    setEditingWeek(week);
    setShowWeekModal(true);
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

  if (!roadmap) return null;

  return (
    <SimpleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Link to="/teaching/roadmaps" className="hover:text-emerald-400">
                Roadmaps
              </Link>
              <ChevronRight className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-white">{roadmap.title}</h1>
            <p className="text-gray-400 mt-1">
              {new Date(roadmap.start_date).toLocaleDateString()} - {new Date(roadmap.end_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`/teaching/roadmaps/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button onClick={() => navigate(`/teaching/lectures/new?roadmap=${id}`)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lecture
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{weeks.length}</p>
                  <p className="text-sm text-gray-400">Weeks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{lectures.length}</p>
                  <p className="text-sm text-gray-400">Lectures</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    {lectures.filter((l) => l.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-400">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weeks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Weekly Plan</h2>
            <Button variant="secondary" size="sm" onClick={openAddWeekModal}>
              <Plus className="w-4 h-4 mr-1" />
              Add Week
            </Button>
          </div>

          {weeks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No weeks planned yet</h3>
                <p className="text-gray-400 mb-4">Break down your roadmap into weekly sections</p>
                <Button onClick={openAddWeekModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Week
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {weeks.map((week) => (
                <Card key={week.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                          <span className="text-amber-500 font-bold">W{week.week_number}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {week.title || `Week ${week.week_number}`}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
                          </p>
                          {week.goals && (
                            <p className="text-sm text-gray-500 mt-1">{week.goals}</p>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === week.id ? null : week.id)}
                          className="p-2 hover:bg-gray-800 rounded"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                        {menuOpen === week.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-8 z-20 w-36 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
                              <button
                                onClick={() => {
                                  openEditWeekModal(week);
                                  setMenuOpen(null);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-t-lg w-full"
                              >
                                <Edit className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteWeekId(week.id);
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Lectures */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Lectures</h2>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/teaching/lectures/new?roadmap=${id}`)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Lecture
            </Button>
          </div>

          {lectures.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No lectures planned</h3>
                <p className="text-gray-400">Add lectures to your roadmap</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lectures.map((lecture) => (
                <Link key={lecture.id} to={`/teaching/lectures/${lecture.id}`}>
                  <Card className="hover:border-gray-700 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple-500" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{lecture.title}</h3>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                              {lecture.lecture_date && (
                                <>
                                  <Clock className="w-3 h-3" />
                                  {new Date(lecture.lecture_date).toLocaleDateString()}
                                </>
                              )}
                              {lecture.duration_minutes && (
                                <span>({lecture.duration_minutes} min)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          lecture.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          lecture.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {lecture.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Week Modal */}
        {showWeekModal && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowWeekModal(false);
              setEditingWeek(null);
            }}
            title={editingWeek ? 'Edit Week' : 'Add Week'}
          >
            <div className="space-y-4">
              {error && (
                <Alert type="error" message={error} onDismiss={() => setError(null)} />
              )}

              <div className="p-3 bg-gray-800 rounded-lg text-center">
                <span className="text-amber-500 font-bold">Week {weekForm.week_number}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={weekForm.start_date}
                  onChange={(e) => setWeekForm({ ...weekForm, start_date: e.target.value })}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  value={weekForm.end_date}
                  onChange={(e) => setWeekForm({ ...weekForm, end_date: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Title (Optional)"
                type="text"
                value={weekForm.title}
                onChange={(e) => setWeekForm({ ...weekForm, title: e.target.value })}
                placeholder="e.g., Introduction to Algebra"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Goals (Optional)
                </label>
                <textarea
                  value={weekForm.goals}
                  onChange={(e) => setWeekForm({ ...weekForm, goals: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="What will students accomplish this week?"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setShowWeekModal(false);
                  setEditingWeek(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveWeek} loading={saving}>
                  {editingWeek ? 'Save Changes' : 'Add Week'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Week Modal */}
        {deleteWeekId && (
          <Modal isOpen={true} onClose={() => setDeleteWeekId(null)} title="Delete Week">
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this week? This will also remove any lectures assigned to it.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteWeekId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteWeek}>
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
