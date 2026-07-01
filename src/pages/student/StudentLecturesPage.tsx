import { useEffect, useState, useCallback } from 'react';
import {
  Calendar, Clock, BookOpen, FileText, Target, ChevronRight,
  CheckCircle, AlertCircle, Users, User, Link, X, List
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, LoadingSpinner } from '../../components/common';

interface EnrolledClass {
  id: string;
  name: string;
  section: string;
  subject_id: string | null;
  subjects: { name: string } | null;
  teacher_id: string | null;
}

interface LectureTopic {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  parent_id: string | null;
  children?: LectureTopic[];
}

interface PublishedLecture {
  id: string;
  title: string;
  lecture_date: string | null;
  lecture_time: string | null;
  chapter: string | null;
  status: string;
  duration_minutes: number | null;
  learning_objectives: string | null;
  instructions: string | null;
  attachments: string[] | null;
  class_id: string | null;
  subject_id: string | null;
  teacher_id: string;
  classes: { name: string; section: string } | null;
  subjects: { name: string } | null;
  profiles: { full_name: string } | null;
  topics?: LectureTopic[];
}

export default function StudentLecturesPage() {
  const { profile } = useAuth();
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [lectures, setLectures] = useState<PublishedLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedLecture, setSelectedLecture] = useState<PublishedLecture | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const fetchEnrolledClasses = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select(`
          class_id,
          classes!inner(
            id,
            name,
            section,
            subject_id,
            teacher_id,
            subjects!left(name)
          )
        `)
        .eq('student_id', profile.id);

      if (error) throw error;

      const flatData = (data || []).map((item: any) => ({
        id: item.class_id,
        name: item.classes.name,
        section: item.classes.section,
        subject_id: item.classes.subject_id,
        subjects: item.classes.subjects,
        teacher_id: item.classes.teacher_id,
      }));

      setEnrolledClasses(flatData);
    } catch (error) {
      console.error('Error fetching enrolled classes:', error);
    }
  }, [profile?.id]);

  const fetchLectures = useCallback(async () => {
    if (enrolledClasses.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const classIds = selectedClassId === 'all'
        ? enrolledClasses.map((c) => c.id)
        : [selectedClassId];

      if (classIds.length === 0) {
        setLectures([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('lecture_plans')
        .select(`
          id,
          title,
          lecture_date,
          lecture_time,
          chapter,
          status,
          duration_minutes,
          learning_objectives,
          instructions,
          attachments,
          class_id,
          subject_id,
          teacher_id,
          classes!left(name, section),
          subjects!left(name),
          profiles!lecture_plans_teacher_id_fkey(full_name)
        `)
        .eq('is_published', true)
        .in('class_id', classIds)
        .order('lecture_date', { ascending: true });

      if (error) throw error;
      setLectures(data || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
    } finally {
      setLoading(false);
    }
  }, [enrolledClasses, selectedClassId]);

  const fetchLectureTopics = useCallback(async (lectureId: string) => {
    setLoadingTopics(true);
    try {
      const { data, error } = await supabase
        .from('lecture_topics')
        .select('*')
        .eq('lecture_id', lectureId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Build hierarchical structure for topics
      const allTopics = data || [];
      const rootTopics = allTopics.filter((t) => !t.parent_id);
      const buildChildren = (parentId: string): LectureTopic[] => {
        return allTopics
          .filter((t) => t.parent_id === parentId)
          .map((t) => ({ ...t, children: buildChildren(t.id) }));
      };
      const hierarchicalTopics = rootTopics.map((t) => ({
        ...t,
        children: buildChildren(t.id)
      }));

      setSelectedLecture((prev) =>
        prev ? { ...prev, topics: hierarchicalTopics } : null
      );
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  // Initial setup and subscribe to changes
  useEffect(() => {
    if (profile?.id) {
      fetchEnrolledClasses();
    }
  }, [profile?.id, fetchEnrolledClasses]);

  // Fetch lectures when enrolled classes change
  useEffect(() => {
    if (enrolledClasses.length > 0) {
      fetchLectures();
    }
  }, [enrolledClasses, fetchLectures]);

  // Set up real-time subscription for lecture changes
  useEffect(() => {
    if (enrolledClasses.length === 0 || !profile?.id) return;

    const classIds = enrolledClasses.map((c) => c.id);

    const channel = supabase
      .channel('student-lectures-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lecture_plans',
          filter: `class_id=in.(${classIds.join(',')})`,
        },
        () => {
          fetchLectures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enrolledClasses, profile?.id, fetchLectures]);

  // Fetch topics when lecture is selected
  useEffect(() => {
    if (selectedLecture?.id && !selectedLecture.topics) {
      fetchLectureTopics(selectedLecture.id);
    }
  }, [selectedLecture?.id, selectedLecture?.topics, fetchLectureTopics]);

  // Categorize lectures
  const today = new Date().toISOString().split('T')[0];

  const categorizeLectures = () => {
    const todayLectures: PublishedLecture[] = [];
    const upcomingLectures: PublishedLecture[] = [];
    const completedLectures: PublishedLecture[] = [];

    lectures.forEach((lecture) => {
      if (lecture.status === 'completed' || (lecture.lecture_date && lecture.lecture_date < today)) {
        completedLectures.push(lecture);
      } else if (lecture.lecture_date === today) {
        todayLectures.push(lecture);
      } else {
        upcomingLectures.push(lecture);
      }
    });

    return { todayLectures, upcomingLectures, completedLectures };
  };

  const { todayLectures, upcomingLectures, completedLectures } = categorizeLectures();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Date TBA';
    const date = new Date(dateStr);
    const todayDate = new Date();
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === todayDate.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const openLectureDetail = (lecture: PublishedLecture) => {
    setSelectedLecture(lecture);
  };

  const closeLectureDetail = () => {
    setSelectedLecture(null);
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading your lectures..." />
        </div>
      </SimpleLayout>
    );
  }

  if (enrolledClasses.length === 0) {
    return (
      <SimpleLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Not enrolled in any classes</h2>
              <p className="text-gray-400">
                Your teacher needs to enroll you in a class before you can view lectures.
              </p>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">My Lectures</h1>
          <p className="text-gray-400 mt-1">View lectures published by your teachers</p>
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Filter by class:</span>
          <button
            onClick={() => setSelectedClassId('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedClassId === 'all'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            All Classes
          </button>
          {enrolledClasses.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedClassId === cls.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              {cls.name} - {cls.section}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{todayLectures.length}</p>
              <p className="text-sm text-gray-400">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">{upcomingLectures.length}</p>
              <p className="text-sm text-gray-400">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{completedLectures.length}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Lectures */}
        {todayLectures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-white">Today's Lectures</h2>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                {todayLectures.length}
              </span>
            </div>
            <div className="space-y-3">
              {todayLectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onClick={() => openLectureDetail(lecture)}
                  showTodayBadge
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Lectures */}
        {upcomingLectures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-white">Upcoming Lectures</h2>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {upcomingLectures.length}
              </span>
            </div>
            <div className="space-y-3">
              {upcomingLectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onClick={() => openLectureDetail(lecture)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Lectures */}
        {completedLectures.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-white">Completed Lectures</h2>
              <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                {completedLectures.length}
              </span>
            </div>
            <div className="space-y-3">
              {completedLectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onClick={() => openLectureDetail(lecture)}
                  isCompleted
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {lectures.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No lectures available</h3>
              <p className="text-gray-400">
                Your teacher hasn't published any lectures yet. Check back later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lecture Detail Modal */}
        {selectedLecture && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeLectureDetail}
          >
            <div
              className="bg-gray-900 border border-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white truncate pr-4">
                  {selectedLecture.title}
                </h2>
                <button
                  onClick={closeLectureDetail}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedLecture.classes && (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Users className="w-4 h-4" />
                      <span>{selectedLecture.classes.name} - {selectedLecture.classes.section}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(selectedLecture.lecture_date)}</span>
                  </div>
                  {selectedLecture.lecture_time && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{selectedLecture.lecture_time}</span>
                    </div>
                  )}
                  {selectedLecture.duration_minutes && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>{selectedLecture.duration_minutes} min</span>
                    </div>
                  )}
                </div>

                {/* Teacher */}
                {selectedLecture.profiles && (
                  <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Teacher</p>
                      <p className="font-medium text-white">{selectedLecture.profiles.full_name}</p>
                    </div>
                  </div>
                )}

                {/* Subject */}
                {selectedLecture.subjects && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Subject</h3>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-500" />
                      <span className="text-white">{selectedLecture.subjects.name}</span>
                    </div>
                  </div>
                )}

                {/* Chapter */}
                {selectedLecture.chapter && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Chapter</h3>
                    <p className="text-white bg-gray-800 rounded-lg px-4 py-2">{selectedLecture.chapter}</p>
                  </div>
                )}

                {/* Topics/Subtopics */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                    <List className="w-4 h-4 text-blue-500" />
                    Topics / Subtopics
                  </h3>
                  {loadingTopics ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="sm" text="Loading topics..." />
                    </div>
                  ) : selectedLecture.topics && selectedLecture.topics.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLecture.topics.map((topic) => (
                        <TopicItem key={topic.id} topic={topic} depth={0} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 bg-gray-800 rounded-lg px-4 py-3">
                      No topics have been added to this lecture yet.
                    </p>
                  )}
                </div>

                {/* Learning Objectives */}
                {selectedLecture.learning_objectives && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      Learning Objectives
                    </h3>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {selectedLecture.learning_objectives}
                      </p>
                    </div>
                  </div>
                )}

                {/* Teacher Notes/Instructions */}
                {selectedLecture.instructions && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Teacher Notes / Instructions
                    </h3>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {selectedLecture.instructions}
                      </p>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedLecture.attachments && selectedLecture.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Attachments
                    </h3>
                    <div className="space-y-2">
                      {selectedLecture.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Link className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-400 hover:text-blue-300 truncate">
                            {attachment}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SimpleLayout>
  );
}

// Lecture Card Component
function LectureCard({
  lecture,
  onClick,
  showTodayBadge = false,
  isCompleted = false,
}: {
  lecture: PublishedLecture;
  onClick: () => void;
  showTodayBadge?: boolean;
  isCompleted?: boolean;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isToday = lecture.lecture_date === today;

  return (
    <Card
      className={`cursor-pointer hover:border-gray-700 transition-colors ${
        isToday && !isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : ''
      } ${isCompleted ? 'opacity-70' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
            isCompleted ? 'bg-gray-700' :
            isToday ? 'bg-emerald-500/20' : 'bg-purple-500/10'
          }`}>
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-gray-400" />
            ) : isToday ? (
              <Calendar className="w-6 h-6 text-emerald-500" />
            ) : (
              <FileText className="w-6 h-6 text-purple-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-medium truncate ${isCompleted ? 'text-gray-400' : 'text-white'}`}>
                {lecture.title}
              </h3>
              {showTodayBadge && isToday && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  Today
                </span>
              )}
              {isCompleted && (
                <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                  Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
              {lecture.classes && (
                <span className="text-emerald-400">
                  {lecture.classes.name} - {lecture.classes.section}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {lecture.lecture_date
                  ? new Date(lecture.lecture_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'TBA'}
              </span>
              {lecture.lecture_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lecture.lecture_time}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
              {lecture.profiles && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {lecture.profiles.full_name}
                </span>
              )}
              {lecture.subjects && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {lecture.subjects.name}
                </span>
              )}
              {lecture.chapter && (
                <span>{lecture.chapter}</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// Topic Item Component with Hierarchy
function TopicItem({ topic, depth }: { topic: LectureTopic; depth: number }) {
  return (
    <>
      <div
        className={`flex items-start gap-3 p-3 rounded-lg ${
          depth > 0 ? 'ml-6 bg-gray-800/50' : 'bg-gray-800'
        }`}
      >
        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
          topic.is_completed ? 'bg-emerald-500/20' : 'bg-gray-700'
        }`}>
          {topic.is_completed ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : (
            <span className="text-xs text-gray-400">{depth + 1}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${topic.is_completed ? 'text-gray-400 line-through' : 'text-white'}`}>
            {topic.title}
          </p>
          {topic.description && (
            <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
          )}
          {topic.duration_minutes && (
            <p className="text-xs text-gray-500 mt-1">{topic.duration_minutes} min</p>
          )}
        </div>
      </div>
      {topic.children && topic.children.length > 0 && (
        <div className="space-y-1 mt-1">
          {topic.children.map((child) => (
            <TopicItem key={child.id} topic={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
}
