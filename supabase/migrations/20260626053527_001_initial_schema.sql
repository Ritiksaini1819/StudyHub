/*
# StudyHub Initial Schema

This migration creates the core tables for the StudyHub study material management platform.

## Tables Created

### profiles
- Extends auth.users with role information (student/teacher)
- `id` (uuid, primary key, references auth.users)
- `full_name` (text)
- `role` (text, either 'student' or 'teacher')
- `avatar_url` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### subjects
- Created by teachers, visible to students
- `id` (uuid, primary key)
- `name` (text, not null)
- `description` (text)
- `created_by` (uuid, references profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### units
- Belongs to subjects
- `id` (uuid, primary key)
- `subject_id` (uuid, references subjects)
- `name` (text, not null)
- `description` (text)
- `order_index` (integer, for ordering)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### study_materials
- Files uploaded by teachers
- `id` (uuid, primary key)
- `subject_id` (uuid, references subjects)
- `unit_id` (uuid, references units, nullable)
- `title` (text, not null)
- `description` (text)
- `file_name` (text, not null)
- `file_type` (text, not null)
- `file_size` (bigint)
- `storage_path` (text, not null)
- `uploaded_by` (uuid, references profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Security
- RLS enabled on all tables
- Owner-scoped policies for subjects and study_materials (teachers can CRUD their own)
- Students can read subjects, units, and study_materials
- Teachers can manage their own content
- Profiles are readable by authenticated users, editable by owner

## Important Notes
1. This is a multi-user application with sign-in required
2. Teachers create and manage content; students consume it
3. All policies use auth.uid() for ownership checks
4. Cascade deletes configured for referential integrity
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create study_materials table
CREATE TABLE IF NOT EXISTS study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Subjects policies - teachers can CRUD, students can read
DROP POLICY IF EXISTS "subjects_select_all" ON subjects;
CREATE POLICY "subjects_select_all" ON subjects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "subjects_insert_teachers" ON subjects;
CREATE POLICY "subjects_insert_teachers" ON subjects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "subjects_update_owner" ON subjects;
CREATE POLICY "subjects_update_owner" ON subjects FOR UPDATE
  TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "subjects_delete_owner" ON subjects;
CREATE POLICY "subjects_delete_owner" ON subjects FOR DELETE
  TO authenticated USING (created_by = auth.uid());

-- Units policies - teachers can CRUD, students can read
DROP POLICY IF EXISTS "units_select_all" ON units;
CREATE POLICY "units_select_all" ON units FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "units_insert_teachers" ON units;
CREATE POLICY "units_insert_teachers" ON units FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "units_update_teachers" ON units;
CREATE POLICY "units_update_teachers" ON units FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id = units.subject_id AND subjects.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id = units.subject_id AND subjects.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "units_delete_teachers" ON units;
CREATE POLICY "units_delete_teachers" ON units FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id = units.subject_id AND subjects.created_by = auth.uid())
  );

-- Study materials policies - teachers can CRUD, students can read
DROP POLICY IF EXISTS "study_materials_select_all" ON study_materials;
CREATE POLICY "study_materials_select_all" ON study_materials FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "study_materials_insert_teachers" ON study_materials;
CREATE POLICY "study_materials_insert_teachers" ON study_materials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "study_materials_update_owner" ON study_materials;
CREATE POLICY "study_materials_update_owner" ON study_materials FOR UPDATE
  TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "study_materials_delete_owner" ON study_materials;
CREATE POLICY "study_materials_delete_owner" ON study_materials FOR DELETE
  TO authenticated USING (uploaded_by = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_created_by ON subjects(created_by);
CREATE INDEX IF NOT EXISTS idx_units_subject_id ON units(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_subject_id ON study_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_unit_id ON study_materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_study_materials_uploaded_by ON study_materials(uploaded_by);

-- Create storage bucket for study materials
-- Note: Storage bucket creation is done separately via Supabase dashboard or API