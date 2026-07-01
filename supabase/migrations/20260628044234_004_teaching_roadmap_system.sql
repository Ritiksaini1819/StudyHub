-- Teaching roadmap and lecture planning system

-- Teaching roadmaps (main container for planning)
CREATE TABLE teaching_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roadmap weeks (break down roadmap into weeks)
CREATE TABLE roadmap_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES teaching_roadmaps(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  title TEXT,
  goals TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(roadmap_id, week_number)
);

-- Lecture plans (individual class sessions)
CREATE TABLE lecture_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES teaching_roadmaps(id) ON DELETE SET NULL,
  week_id UUID REFERENCES roadmap_weeks(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  lecture_date DATE,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  resources TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lecture topics (topics covered in a lecture)
CREATE TABLE lecture_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lecture_plans(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES lecture_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Topic completions (track which students completed which topics)
CREATE TABLE topic_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES lecture_topics(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(topic_id, student_id)
);

-- Enable RLS on all new tables
ALTER TABLE teaching_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teaching_roadmaps
CREATE POLICY "roadmaps_select_authenticated" ON teaching_roadmaps FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "roadmaps_insert_teacher" ON teaching_roadmaps FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "roadmaps_update_teacher" ON teaching_roadmaps FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "roadmaps_delete_teacher" ON teaching_roadmaps FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- RLS Policies for roadmap_weeks
CREATE POLICY "weeks_select_authenticated" ON roadmap_weeks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "weeks_insert_teacher" ON roadmap_weeks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM teaching_roadmaps WHERE id = roadmap_id AND teacher_id = auth.uid())
  );

CREATE POLICY "weeks_update_teacher" ON roadmap_weeks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM teaching_roadmaps WHERE id = roadmap_id AND teacher_id = auth.uid())
  );

CREATE POLICY "weeks_delete_teacher" ON roadmap_weeks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM teaching_roadmaps WHERE id = roadmap_id AND teacher_id = auth.uid())
  );

-- RLS Policies for lecture_plans
CREATE POLICY "lectures_select_authenticated" ON lecture_plans FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "lectures_insert_teacher" ON lecture_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "lectures_update_teacher" ON lecture_plans FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "lectures_delete_teacher" ON lecture_plans FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- RLS Policies for lecture_topics
CREATE POLICY "topics_select_authenticated" ON lecture_topics FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "topics_insert_teacher" ON lecture_topics FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM lecture_plans WHERE id = lecture_id AND teacher_id = auth.uid())
  );

CREATE POLICY "topics_update_teacher" ON lecture_topics FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM lecture_plans WHERE id = lecture_id AND teacher_id = auth.uid())
  );

CREATE POLICY "topics_delete_teacher" ON lecture_topics FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM lecture_plans WHERE id = lecture_id AND teacher_id = auth.uid())
  );

-- RLS Policies for topic_completions
CREATE POLICY "completions_select_authenticated" ON topic_completions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "completions_insert_own" ON topic_completions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "completions_update_own" ON topic_completions FOR UPDATE
  TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "completions_delete_own" ON topic_completions FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- Indexes for performance
CREATE INDEX idx_roadmaps_teacher ON teaching_roadmaps(teacher_id);
CREATE INDEX idx_roadmaps_subject ON teaching_roadmaps(subject_id);
CREATE INDEX idx_roadmaps_dates ON teaching_roadmaps(start_date, end_date);
CREATE INDEX idx_weeks_roadmap ON roadmap_weeks(roadmap_id);
CREATE INDEX idx_lectures_teacher ON lecture_plans(teacher_id);
CREATE INDEX idx_lectures_roadmap ON lecture_plans(roadmap_id);
CREATE INDEX idx_lectures_week ON lecture_plans(week_id);
CREATE INDEX idx_lectures_date ON lecture_plans(lecture_date);
CREATE INDEX idx_topics_lecture ON lecture_topics(lecture_id);
CREATE INDEX idx_topics_parent ON lecture_topics(parent_id);
CREATE INDEX idx_completions_topic ON topic_completions(topic_id);
CREATE INDEX idx_completions_student ON topic_completions(student_id);