-- Add class/section system and enhance lecture planning

-- Classes/Sections table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  academic_year TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, section, academic_year)
);

-- Class enrollments (students enrolled in classes)
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Enhance lecture_plans with additional fields
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS learning_objectives TEXT;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS attachments TEXT[];
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS lecture_time TIME;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE lecture_plans ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- Enable RLS on new tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "classes_select_authenticated" ON classes FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "classes_insert_teacher" ON classes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "classes_update_teacher" ON classes FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id);

CREATE POLICY "classes_delete_teacher" ON classes FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- RLS Policies for class_enrollments
CREATE POLICY "enrollments_select_authenticated" ON class_enrollments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "enrollments_insert_teacher" ON class_enrollments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
  );

CREATE POLICY "enrollments_delete_teacher" ON class_enrollments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
  );

-- Drop old lecture select policy and recreate
DROP POLICY IF EXISTS "lectures_select_authenticated" ON lecture_plans;

-- New RLS Policy for lecture_plans - teachers see their own, students see published
CREATE POLICY "lectures_select_own_or_published" ON lecture_plans FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid() 
    OR is_published = true
  );

-- Drop old lecture insert policy and recreate with new conditions
DROP POLICY IF EXISTS "lectures_insert_teacher" ON lecture_plans;
CREATE POLICY "lectures_insert_teacher" ON lecture_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

-- Update policy for teachers
DROP POLICY IF EXISTS "lectures_update_teacher" ON lecture_plans;
CREATE POLICY "lectures_update_teacher" ON lecture_plans FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- Delete policy for teachers
DROP POLICY IF EXISTS "lectures_delete_teacher" ON lecture_plans;
CREATE POLICY "lectures_delete_teacher" ON lecture_plans FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- Indexes for performance
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_subject ON classes(subject_id);
CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_lectures_class ON lecture_plans(class_id);
CREATE INDEX idx_lectures_published ON lecture_plans(is_published, lecture_date);
CREATE INDEX idx_lectures_draft ON lecture_plans(is_draft, teacher_id);

-- Function to automatically set published_at
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    NEW.published_at := now();
    NEW.is_draft := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_published_at
  BEFORE UPDATE ON lecture_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_published_at();