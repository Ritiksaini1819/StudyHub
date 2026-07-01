import { Link, useNavigate } from 'react-router-dom';
import {
  BookMarked, FolderOpen, FileText, BookOpen, Calendar, Clock,
  CheckCircle, Users, Plus, ArrowRight, ClipboardList, User
} from 'lucide-react';
import { SimpleLayout } from '../../components/layout/SimpleLayout';
import { useAuth } from '../../context/AuthContext';
import { useSubjects, useUnits } from '../../hooks/useData';
import { Card, CardContent, Button, LoadingSpinner } from '../../components/common';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';

interface Roadmap {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface TeacherLecture {
  id: string;
  title: string;
  lecture_date: string | null;
  status: string;
}

interface EnrolledClass {
  id: string;
  name: string;
  section: string;
}

interface StudentLecture {
  id: string;
  title: string;
  lecture_date: string | null;
  lecture_time: string | null;
  chapter: string | null;
  classes: { name: string; section: string } | null;
  subjects: { name: string } | null;
  profiles: { full_name: string } | null;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: subjects, loading: subjectsLoading } = useSubjects();
  const { data: units, loading: unitsLoading } = useUnits();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [lectures, setLectures] = useState<TeacherLecture[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [studentLectures, setStudentLectures] = useState<{
    today: StudentLecture[];
    upcoming: StudentLecture[];
  }>({ today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    if (profile?.id) {
      if (isTeacher) {
        fetchTeacherData();
      } else {
        fetchStudentData();
      }
    }
  }, [profile, isTeacher]);

  const fetchTeacherData = async () => {
    try {
      const [roadmapsRes, lecturesRes] = await Promise.all([
        supabase
          .from('teaching_roadmaps')
          .select('id, title, start_date, end_date, is_active')
          .eq('teacher_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('lecture_plans')
          .select('id, title, lecture_date, status')
          .eq('teacher_id', profile!.id)
          .order('lecture_date', { ascending: true })
          .limit(5)
      ]);

      setRoadmaps(roadmapsRes.data || []);
      setLectures(lecturesRes.data || []);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    try {
      // Get enrolled classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select(`
          class_id,
          classes!inner(id, name, section)
        `)
        .eq('student_id', profile!.id);

      const classes = (enrollments || []).map((e: any) => ({
        id: e.class_id,
        name: e.classes.name,
        section: e.classes.section,
      }));
      setEnrolledClasses(classes);

      if (classes.length === 0) {
        setLoading(subjectsLoading || unitsLoading);
        return;
      }

      // Get published lectures
      const classIds = classes.map((c) => c.id);
      const today = new Date().toISOString().split('T')[0];

      const { data: lectureData } = await supabase
        .from('lecture_plans')
        .select(`
          id,
          title,
          lecture_date,
          lecture_time,
          chapter,
          classes!left(name, section),
          subjects!left(name),
          profiles!lecture_plans_teacher_id_fkey(full_name)
        `)
        .eq('is_published', true)
        .in('class_id', classIds)
        .or(`lecture_date.gte.${today},lecture_date.is.null`)
        .order('lecture_date', { ascending: true })
        .limit(10);

      // Categorize lectures
      const todayLectures: StudentLecture[] = [];
      const upcomingLectures: StudentLecture[] = [];

      (lectureData || []).forEach((lecture) => {
        if (lecture.lecture_date === today) {
          todayLectures.push(lecture);
        } else {
          upcomingLectures.push(lecture);
        }
      });

      setStudentLectures({ today: todayLectures, upcoming: upcomingLectures });
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      </SimpleLayout>
    );
  }

  return (
    <SimpleLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isTeacher ? 'Teacher Dashboard' : 'Student Dashboard'}
            </h1>
            <p className="text-gray-400 mt-1">
              {isTeacher ? 'Manage your teaching roadmap and lectures' : 'Track your learning progress'}
            </p>
          </div>
          {isTeacher && (
            <Button onClick={() => navigate('/teaching/roadmaps/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Roadmap
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{subjects?.length || 0}</p>
                  <p className="text-sm text-gray-400">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{units?.length || 0}</p>
                  <p className="text-sm text-gray-400">Units</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isTeacher ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{roadmaps.length}</p>
                      <p className="text-sm text-gray-400">Roadmaps</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{lectures.length}</p>
                      <p className="text-sm text-gray-400">Lectures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{enrolledClasses.length}</p>
                      <p className="text-sm text-gray-400">Enrolled Classes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {studentLectures.today.length + studentLectures.upcoming.length}
                      </p>
                      <p className="text-sm text-gray-400">Lectures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Teacher-specific sections */}
        {isTeacher && (
          <>
            {/* Active Roadmaps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Teaching Roadmaps</h2>
                <Link to="/teaching/roadmaps" className="text-emerald-500 hover:text-emerald-400 text-sm flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {roadmaps.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No roadmaps yet</h3>
                    <p className="text-gray-400 mb-4">Create your first teaching roadmap to plan your lectures</p>
                    <Button onClick={() => navigate('/teaching/roadmaps/new')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Roadmap
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roadmaps.map((roadmap) => (
                    <Link key={roadmap.id} to={`/teaching/roadmaps/${roadmap.id}`}>
                      <Card className="hover:border-gray-700 transition-colors cursor-pointer h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-white text-lg">{roadmap.title}</h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {new Date(roadmap.start_date).toLocaleDateString()} - {new Date(roadmap.end_date).toLocaleDateString()}
                              </p>
                            </div>
                            {roadmap.is_active && (
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Lectures */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Upcoming Lectures</h2>
                <Link to="/teaching/lectures" className="text-emerald-500 hover:text-emerald-400 text-sm flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {lectures.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No lectures planned</h3>
                    <p className="text-gray-400">Add lectures to your roadmap or create standalone lecture plans</p>
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
                                <FileText className="w-5 h-5 text-purple-500" />
                              </div>
                              <div>
                                <h3 className="font-medium text-white">{lecture.title}</h3>
                                <p className="text-sm text-gray-400">
                                  {lecture.lecture_date ? new Date(lecture.lecture_date).toLocaleDateString() : 'No date set'}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              lecture.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                              lecture.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-gray-700 text-gray-400'
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
          </>
        )}

        {/* Student-specific sections */}
        {!isTeacher && (
          <>
            {/* Today's Lectures */}
            {studentLectures.today.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <h2 className="text-xl font-semibold text-white">Today's Lectures</h2>
                </div>
                <div className="space-y-3">
                  {studentLectures.today.map((lecture) => (
                    <Link key={lecture.id} to="/my-lectures">
                      <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{lecture.title}</h3>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                  Today
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                                {lecture.classes && (
                                  <span className="text-emerald-400">
                                    {lecture.classes.name} - {lecture.classes.section}
                                  </span>
                                )}
                                {lecture.lecture_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {lecture.lecture_time}
                                  </span>
                                )}
                                {lecture.profiles && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {lecture.profiles.full_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Lectures */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Upcoming Lectures</h2>
                <Link to="/my-lectures" className="text-emerald-500 hover:text-emerald-400 text-sm flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {studentLectures.upcoming.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No upcoming lectures</h3>
                    <p className="text-gray-400">Your teacher hasn't published any lectures yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {studentLectures.upcoming.slice(0, 5).map((lecture) => (
                    <Link key={lecture.id} to="/my-lectures">
                      <Card className="hover:border-gray-700 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-white">{lecture.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
                                {lecture.classes && (
                                  <span className="text-emerald-400">
                                    {lecture.classes.name} - {lecture.classes.section}
                                  </span>
                                )}
                                {lecture.lecture_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(lecture.lecture_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                )}
                                {lecture.lecture_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {lecture.lecture_time}
                                  </span>
                                )}
                                {lecture.profiles && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {lecture.profiles.full_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolled Classes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">My Classes</h2>
              </div>
              {enrolledClasses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Not enrolled in any classes</h3>
                    <p className="text-gray-400">Your teacher needs to enroll you in a class</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledClasses.map((cls) => (
                    <Card key={cls.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{cls.name}</h3>
                            <p className="text-sm text-gray-400">Section {cls.section}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/subjects">
                  <Card className="hover:border-gray-700 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Browse Subjects</h3>
                          <p className="text-sm text-gray-400">View and study all subjects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/my-lectures">
                  <Card className="hover:border-gray-700 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">View All Lectures</h3>
                          <p className="text-sm text-gray-400">See all published lectures</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Recent Subjects - Common for both */}
        {subjects && subjects.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Recent Subjects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.slice(0, 6).map((subject) => (
                <Link key={subject.id} to={`/subjects/${subject.id}`}>
                  <Card className="hover:border-gray-700 transition-colors cursor-pointer h-full">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                          <BookMarked className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{subject.name}</h3>
                          <p className="text-sm text-gray-400 line-clamp-1">
                            {subject.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </SimpleLayout>
  );
}
