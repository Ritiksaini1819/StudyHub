import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Filter, Send, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, LoadingSpinner, Input } from '../../components/common';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  lecture_date: string | null;
  lecture_time: string | null;
  status: string;
  duration_minutes: number | null;
  roadmap_id: string | null;
  subject_id: string | null;
  class_id: string | null;
  is_published: boolean;
  is_draft: boolean;
  classes: { name: string; section: string } | null;
}

export default function LecturesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [publishFilter, setPublishFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchLectures();
    }
  }, [profile]);

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lecture_plans')
        .select(`
          id, title, description, lecture_date, lecture_time, status, duration_minutes,
          roadmap_id, subject_id, class_id, is_published, is_draft,
          classes(name, section)
        `)
        .eq('teacher_id', profile!.id)
        .order('lecture_date', { ascending: true });

      if (error) throw error;
      setLectures(data || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('lecture_plans')
        .update({
          is_published: !currentStatus,
          is_draft: currentStatus ? true : false,
          published_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;
      setLectures(lectures.map((l) =>
        l.id === id ? { ...l, is_published: !currentStatus, is_draft: currentStatus ? true : false } : l
      ));
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  };

  const filteredLectures = lectures.filter((lecture) => {
    const matchesStatus = statusFilter === 'all' || lecture.status === statusFilter;
    const matchesPublish = publishFilter === 'all' ||
      (publishFilter === 'published' && lecture.is_published) ||
      (publishFilter === 'draft' && !lecture.is_published);
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPublish && matchesSearch;
  });

  const statusCounts = {
    all: lectures.length,
    planned: lectures.filter((l) => l.status === 'planned').length,
    in_progress: lectures.filter((l) => l.status === 'in_progress').length,
    completed: lectures.filter((l) => l.status === 'completed').length,
    cancelled: lectures.filter((l) => l.status === 'cancelled').length,
  };

  const publishCounts = {
    published: lectures.filter((l) => l.is_published).length,
    draft: lectures.filter((l) => !l.is_published).length,
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading lectures..." />
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
            <h1 className="text-2xl font-bold text-white">Lecture Plans</h1>
            <p className="text-gray-400 mt-1">Create and publish lectures for your students</p>
          </div>
          <Button onClick={() => navigate('/teaching/lectures/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Lecture
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{lectures.length}</p>
              <p className="text-sm text-gray-400">Total Lectures</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{publishCounts.published}</p>
              <p className="text-sm text-gray-400">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{publishCounts.draft}</p>
              <p className="text-sm text-gray-400">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">{statusCounts.planned}</p>
              <p className="text-sm text-gray-400">Planned</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search lectures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 mr-2">Status:</span>
            {(['all', 'planned', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-300'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Visibility:</span>
            {(['all', 'published', 'draft'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setPublishFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  publishFilter === filter
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-300'
                }`}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Lectures List */}
        {filteredLectures.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                {lectures.length === 0 ? 'No lectures yet' : 'No matching lectures'}
              </h2>
              <p className="text-gray-400 mb-6">
                {lectures.length === 0
                  ? 'Create your first lecture plan to organize your teaching content'
                  : 'Try adjusting your search or filter criteria'}
              </p>
              {lectures.length === 0 && (
                <Button onClick={() => navigate('/teaching/lectures/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Lecture
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLectures.map((lecture) => (
              <Card key={lecture.id} className="hover:border-gray-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Link to={`/teaching/lectures/${lecture.id}`} className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0">
                          <ClipboardList className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-white">{lecture.title}</h3>
                            {lecture.is_published ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                                Published
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/30">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            {lecture.classes && (
                              <span className="text-emerald-400">
                                {lecture.classes.name} - {lecture.classes.section}
                              </span>
                            )}
                            {lecture.lecture_date && (
                              <span>{new Date(lecture.lecture_date).toLocaleDateString()}</span>
                            )}
                            {lecture.lecture_time && (
                              <span>{lecture.lecture_time}</span>
                            )}
                            {lecture.duration_minutes && (
                              <span>{lecture.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => togglePublish(lecture.id, lecture.is_published)}
                        title={lecture.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {lecture.is_published ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>
                      <Link to={`/teaching/lectures/${lecture.id}`}>
                        <Button variant="secondary" size="sm">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SimpleLayout>
  );
}
