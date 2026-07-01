/*
# Content Management System Schema

This migration adds comprehensive content management for the study platform.

## New Tables

### question_bank
- Questions for each unit
- `id` (uuid, primary key)
- `unit_id` (uuid, references units)
- `question_text` (text, not null)
- `question_number` (integer, for ordering)
- `image_url` (text, nullable - for question images)
- `pdf_url` (text, nullable - for question PDFs)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### solutions
- Solutions for questions or unit-level solutions
- `id` (uuid, primary key)
- `unit_id` (uuid, references units)
- `question_id` (uuid, nullable - references question_bank for question-specific solutions)
- `title` (text, not null)
- `content_text` (text, nullable - for text-based solutions)
- `pdf_url` (text, nullable - for PDF solutions)
- `pdf_file_name` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### content_items
- Generic content items for units (study materials, notes, etc.)
- `id` (uuid, primary key)
- `unit_id` (uuid, references units)
- `content_type` (enum: study_material, note, resource)
- `title` (text, not null)
- `content_text` (text, nullable - for rich text notes)
- `pdf_url` (text, nullable)
- `pdf_file_name` (text, nullable)
- `order_index` (integer, for ordering)
- `created_by` (uuid, references profiles)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Security
- RLS enabled on all tables
- Teachers can CRUD all content
- Students can read all content
*/

-- Create question_bank table
CREATE TABLE IF NOT EXISTS question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  question_number integer DEFAULT 0,
  question_text text NOT NULL,
  image_url text,
  pdf_url text,
  pdf_file_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create solutions table
CREATE TABLE IF NOT EXISTS solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  question_id uuid REFERENCES question_bank(id) ON DELETE SET NULL,
  title text NOT NULL,
  content_text text,
  pdf_url text,
  pdf_file_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create content_items table for study materials and notes
CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  content_type text NOT NULL DEFAULT 'study_material' CHECK (content_type IN ('study_material', 'note', 'resource')),
  title text NOT NULL,
  content_text text,
  pdf_url text,
  pdf_file_name text,
  order_index integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Question Bank Policies
DROP POLICY IF EXISTS "question_bank_select_all" ON question_bank;
CREATE POLICY "question_bank_select_all" ON question_bank FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "question_bank_insert_teachers" ON question_bank;
CREATE POLICY "question_bank_insert_teachers" ON question_bank FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "question_bank_update_teachers" ON question_bank;
CREATE POLICY "question_bank_update_teachers" ON question_bank FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id IN (SELECT subject_id FROM units WHERE units.id = question_bank.unit_id) AND subjects.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "question_bank_delete_teachers" ON question_bank;
CREATE POLICY "question_bank_delete_teachers" ON question_bank FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id IN (SELECT subject_id FROM units WHERE units.id = question_bank.unit_id) AND subjects.created_by = auth.uid())
  );

-- Solutions Policies
DROP POLICY IF EXISTS "solutions_select_all" ON solutions;
CREATE POLICY "solutions_select_all" ON solutions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "solutions_insert_teachers" ON solutions;
CREATE POLICY "solutions_insert_teachers" ON solutions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "solutions_update_teachers" ON solutions;
CREATE POLICY "solutions_update_teachers" ON solutions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id IN (SELECT subject_id FROM units WHERE units.id = solutions.unit_id) AND subjects.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "solutions_delete_teachers" ON solutions;
CREATE POLICY "solutions_delete_teachers" ON solutions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects WHERE subjects.id IN (SELECT subject_id FROM units WHERE units.id = solutions.unit_id) AND subjects.created_by = auth.uid())
  );

-- Content Items Policies
DROP POLICY IF EXISTS "content_items_select_all" ON content_items;
CREATE POLICY "content_items_select_all" ON content_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "content_items_insert_teachers" ON content_items;
CREATE POLICY "content_items_insert_teachers" ON content_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "content_items_update_teachers" ON content_items;
CREATE POLICY "content_items_update_teachers" ON content_items FOR UPDATE
  TO authenticated USING (created_by = auth.uid()) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')
  );

DROP POLICY IF EXISTS "content_items_delete_teachers" ON content_items;
CREATE POLICY "content_items_delete_teachers" ON content_items FOR DELETE
  TO authenticated USING (created_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_bank_unit_id ON question_bank(unit_id);
CREATE INDEX IF NOT EXISTS idx_solutions_unit_id ON solutions(unit_id);
CREATE INDEX IF NOT EXISTS idx_solutions_question_id ON solutions(question_id);
CREATE INDEX IF NOT EXISTS idx_content_items_unit_id ON content_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_content_items_created_by ON content_items(created_by);