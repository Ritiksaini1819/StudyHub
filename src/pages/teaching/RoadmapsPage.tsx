import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Plus, MoreVertical, Trash2, Edit, Eye } from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Button, LoadingSpinner, Modal } from '../../components/common';

interface Roadmap {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  subject_id: string | null;
  created_at: string;
}

export default function RoadmapsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchRoadmaps();
    }
  }, [profile]);

  const fetchRoadmaps = async () => {
    try {
      const { data, error } = await supabase
        .from('teaching_roadmaps')
        .select('*')
        .eq('teacher_id', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoadmaps(data || []);
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('teaching_roadmaps')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setRoadmaps(roadmaps.filter((r) => r.id !== deleteId));
    } catch (error) {
      console.error('Error deleting roadmap:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('teaching_roadmaps')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setRoadmaps(roadmaps.map((r) =>
        r.id === id ? { ...r, is_active: !currentStatus } : r
      ));
    } catch (error) {
      console.error('Error updating roadmap:', error);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading roadmaps..." />
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
            <h1 className="text-2xl font-bold text-white">Teaching Roadmaps</h1>
            <p className="text-gray-400 mt-1">Plan and organize your teaching schedule</p>
          </div>
          <Button onClick={() => navigate('/teaching/roadmaps/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Roadmap
          </Button>
        </div>

        {/* Roadmaps List */}
        {roadmaps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No roadmaps yet</h2>
              <p className="text-gray-400 mb-6">
                Create your first teaching roadmap to plan your lectures effectively
              </p>
              <Button onClick={() => navigate('/teaching/roadmaps/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Roadmap
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roadmaps.map((roadmap) => (
              <Card key={roadmap.id} className="relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link to={`/teaching/roadmaps/${roadmap.id}`}>
                        <h3 className="font-semibold text-white text-lg hover:text-emerald-400 transition-colors">
                          {roadmap.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {roadmap.description || 'No description'}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === roadmap.id ? null : roadmap.id)}
                        className="p-1 hover:bg-gray-800 rounded"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      {menuOpen === roadmap.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 w-40 bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
                            <Link
                              to={`/teaching/roadmaps/${roadmap.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-t-lg"
                            >
                              <Eye className="w-4 h-4" /> View
                            </Link>
                            <Link
                              to={`/teaching/roadmaps/${roadmap.id}/edit`}
                              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800"
                            >
                              <Edit className="w-4 h-4" /> Edit
                            </Link>
                            <button
                              onClick={() => {
                                setDeleteId(roadmap.id);
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
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(roadmap.start_date).toLocaleDateString()} - {new Date(roadmap.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => toggleActive(roadmap.id, roadmap.is_active)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roadmap.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}
                    >
                      {roadmap.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <Modal isOpen={true} onClose={() => setDeleteId(null)} title="Delete Roadmap">
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this roadmap? This will also delete all associated weeks and lectures.
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
