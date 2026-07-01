import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Edit, Clock, Calendar, BookOpen, Plus, Trash2,
  MoreVertical, CheckCircle, Circle, GripVertical
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, LoadingSpinner, Modal, Input, Alert } from '../../components/common';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  lecture_date: string | null;
  status: string;
  duration_minutes: number | null;
  notes: string | null;
  roadmap_id: string | null;
}

interface Topic {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  notes: string | null;
  parent_id: string | null;
  is_completed: boolean;
  children?: Topic[];
}

export default function LectureDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isTeacher = profile?.role === 'teacher';

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTopicId, setDeleteTopicId] = useState<string | null>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [parentTopicId, setParentTopicId] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    duration_minutes: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const [lectureRes, topicsRes] = await Promise.all([
        supabase
          .from('lecture_plans')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('lecture_topics')
          .select('*')
          .eq('lecture_id', id)
          .order('order_index', { ascending: true })
      ]);

      if (lectureRes.error) throw lectureRes.error;

      setLecture(lectureRes.data);

      // Build hierarchical structure for topics
      const allTopics = topicsRes.data || [];
      const rootTopics = allTopics.filter((t: Topic) => !t.parent_id);
      const buildChildren = (parentId: string): Topic[] => {
        return allTopics
          .filter((t: Topic) => t.parent_id === parentId)
          .map((t: Topic) => ({ ...t, children: buildChildren(t.id) }));
      };
      const hierarchicalTopics = rootTopics.map((t: Topic) => ({
        ...t,
        children: buildChildren(t.id)
      }));

      setTopics(hierarchicalTopics);
    } catch (error) {
      console.error('Error fetching lecture:', error);
      navigate('/teaching/lectures');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTopic = async () => {
    if (!topicForm.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const maxOrder = topics.reduce((max, t) => Math.max(max, t.order_index), 0);

      if (editingTopic) {
        const { error } = await supabase
          .from('lecture_topics')
          .update({
            title: topicForm.title.trim(),
            description: topicForm.description.trim() || null,
            duration_minutes: topicForm.duration_minutes ? parseInt(topicForm.duration_minutes) : null,
            notes: topicForm.notes.trim() || null,
          })
          .eq('id', editingTopic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lecture_topics')
          .insert({
            lecture_id: id,
            title: topicForm.title.trim(),
            description: topicForm.description.trim() || null,
            duration_minutes: topicForm.duration_minutes ? parseInt(topicForm.duration_minutes) : null,
            notes: topicForm.notes.trim() || null,
            parent_id: parentTopicId,
            order_index: maxOrder + 1,
          });
        if (error) throw error;
      }

      setShowTopicModal(false);
      setEditingTopic(null);
      setParentTopicId(null);
      setTopicForm({ title: '', description: '', duration_minutes: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving topic:', error);
      setError('Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!deleteTopicId) return;

    try {
      const { error } = await supabase
        .from('lecture_topics')
        .delete()
        .eq('id', deleteTopicId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting topic:', error);
    } finally {
      setDeleteTopicId(null);
    }
  };

  const handleToggleComplete = async (topicId: string, currentStatus: boolean) => {
    if (isTeacher) {
      // Teacher marks topic as completed for teaching purposes
      try {
        const { error } = await supabase
          .from('lecture_topics')
          .update({ is_completed: !currentStatus })
          .eq('id', topicId);
        if (error) throw error;
        fetchData();
      } catch (error) {
        console.error('Error updating topic:', error);
      }
    } else {
      // Student marks topic as completed for learning purposes
      try {
        if (currentStatus) {
          // Remove completion
          await supabase
            .from('topic_completions')
            .delete()
            .eq('topic_id', topicId)
            .eq('student_id', profile!.id);
        } else {
          // Add completion
          await supabase
            .from('topic_completions')
            .insert({
              topic_id: topicId,
              student_id: profile!.id,
            });
        }
        fetchData();
      } catch (error) {
        console.error('Error updating completion:', error);
      }
    }
  };

  const openAddTopicModal = (parentId: string | null = null) => {
    setParentTopicId(parentId);
    setEditingTopic(null);
    setTopicForm({ title: '', description: '', duration_minutes: '', notes: '' });
    setShowTopicModal(true);
  };

  const openEditTopicModal = (topic: Topic) => {
    setTopicForm({
      title: topic.title,
      description: topic.description || '',
      duration_minutes: topic.duration_minutes?.toString() || '',
      notes: topic.notes || '',
    });
    setEditingTopic(topic);
    setParentTopicId(null);
    setShowTopicModal(true);
  };

  const updateLectureStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from('lecture_plans')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setLecture({ ...lecture!, status });
    } catch (error) {
      console.error('Error updating status:', error);
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

  if (!lecture) return null;

  const completedTopics = topics.filter((t) => t.is_completed).length;
  const progress = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0;

  return (
    <SimpleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <button onClick={() => navigate('/teaching/lectures')} className="hover:text-emerald-400">
                Lectures
              </button>
              <ChevronRight className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold text-white">{lecture.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-gray-400 text-sm">
              {lecture.lecture_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(lecture.lecture_date).toLocaleDateString()}
                </span>
              )}
              {lecture.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {lecture.duration_minutes} min
                </span>
              )}
            </div>
          </div>
          {isTeacher && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate(`/teaching/lectures/${id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <select
                value={lecture.status}
                onChange={(e) => updateLectureStatus(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Progress */}
        {topics.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-white font-medium">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span>{completedTopics} of {topics.length} topics completed</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {lecture.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-300">{lecture.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Topics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Topics</h2>
            {isTeacher && (
              <Button size="sm" onClick={() => openAddTopicModal()}>
                <Plus className="w-4 h-4 mr-1" />
                Add Topic
              </Button>
            )}
          </div>

          {topics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No topics yet</h3>
                <p className="text-gray-400 mb-4">
                  {isTeacher
                    ? 'Add topics to organize your lecture content'
                    : 'No topics have been added to this lecture yet'}
                </p>
                {isTeacher && (
                  <Button onClick={() => openAddTopicModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Topic
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => (
                <TopicItem
                  key={topic.id}
                  topic={topic}
                  isTeacher={isTeacher}
                  profileId={profile?.id}
                  onToggleComplete={handleToggleComplete}
                  onEdit={() => openEditTopicModal(topic)}
                  onAddSubtopic={() => openAddTopicModal(topic.id)}
                  onDelete={() => setDeleteTopicId(topic.id)}
                  menuOpen={menuOpen}
                  setMenuOpen={setMenuOpen}
                />
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {lecture.notes && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{lecture.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Topic Modal */}
        {showTopicModal && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowTopicModal(false);
              setEditingTopic(null);
              setParentTopicId(null);
            }}
            title={editingTopic ? 'Edit Topic' : parentTopicId ? 'Add Subtopic' : 'Add Topic'}
          >
            <div className="space-y-4">
              {error && (
                <Alert type="error" message={error} onDismiss={() => setError(null)} />
              )}

              <Input
                label="Title"
                type="text"
                value={topicForm.title}
                onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                placeholder="e.g., Introduction to derivatives"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Brief description of this topic"
                />
              </div>

              <Input
                label="Duration (minutes, optional)"
                type="number"
                value={topicForm.duration_minutes}
                onChange={(e) => setTopicForm({ ...topicForm, duration_minutes: e.target.value })}
                placeholder="e.g., 15"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={topicForm.notes}
                  onChange={(e) => setTopicForm({ ...topicForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Teaching notes or reminders"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setShowTopicModal(false);
                  setEditingTopic(null);
                  setParentTopicId(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTopic} loading={saving}>
                  {editingTopic ? 'Save Changes' : 'Add Topic'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTopicId && (
          <Modal isOpen={true} onClose={() => setDeleteTopicId(null)} title="Delete Topic">
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this topic? Subtopics will also be deleted.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteTopicId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDeleteTopic}>
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

// Topic Item Component
function TopicItem({
  topic,
  isTeacher,
  profileId,
  onToggleComplete,
  onEdit,
  onAddSubtopic,
  onDelete,
  menuOpen,
  setMenuOpen,
  depth = 0,
}: {
  topic: Topic;
  isTeacher: boolean;
  profileId?: string;
  onToggleComplete: (id: string, status: boolean) => void;
  onEdit: () => void;
  onAddSubtopic: () => void;
  onDelete: () => void;
  menuOpen: string | null;
  setMenuOpen: (id: string | null) => void;
  depth?: number;
}) {
  const hasChildren = topic.children && topic.children.length > 0;

  return (
    <>
      <Card className={depth > 0 ? 'ml-8 border-l-2 border-l-emerald-500/30' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => onToggleComplete(topic.id, topic.is_completed)}
              className="mt-0.5"
            >
              {topic.is_completed ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600 hover:text-gray-400" />
              )}
            </button>

            <div className="flex-1">
              <h3 className={`font-medium ${topic.is_completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                {topic.title}
              </h3>
              {topic.description && (
                <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
              )}
              {topic.duration_minutes && (
                <span className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {topic.duration_minutes} min
                </span>
              )}
            </div>

            {isTeacher && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === topic.id ? null : topic.id)}
                  className="p-1 hover:bg-gray-800 rounded"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
                {menuOpen === topic.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-6 z-20 w-36 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
                      <button
                        onClick={() => {
                          onEdit();
                          setMenuOpen(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-t-lg w-full text-sm"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          onAddSubtopic();
                          setMenuOpen(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 w-full text-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Subtopic
                      </button>
                      <button
                        onClick={() => {
                          onDelete();
                          setMenuOpen(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-800 rounded-b-lg w-full text-sm"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasChildren && topic.children!.map((child) => (
        <TopicItem
          key={child.id}
          topic={child}
          isTeacher={isTeacher}
          profileId={profileId}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onAddSubtopic={onAddSubtopic}
          onDelete={onDelete}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
