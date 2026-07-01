-- Simplify RLS policies to allow all authenticated users CRUD access
-- No teacher/student role separation

-- First, drop existing restrictive policies
DROP POLICY IF EXISTS subjects_insert_teachers ON subjects;
DROP POLICY IF EXISTS units_insert_teachers ON units;
DROP POLICY IF EXISTS units_update_teachers ON units;
DROP POLICY IF EXISTS units_delete_teachers ON units;
DROP POLICY IF EXISTS question_bank_insert_teachers ON question_bank;
DROP POLICY IF EXISTS question_bank_update_teachers ON question_bank;
DROP POLICY IF EXISTS question_bank_delete_teachers ON question_bank;
DROP POLICY IF EXISTS solutions_insert_teachers ON solutions;
DROP POLICY IF EXISTS solutions_update_teachers ON solutions;
DROP POLICY IF EXISTS solutions_delete_teachers ON solutions;
DROP POLICY IF EXISTS content_items_insert_teachers ON content_items;
DROP POLICY IF EXISTS content_items_update_teachers ON content_items;
DROP POLICY IF EXISTS content_items_delete_teachers ON content_items;
DROP POLICY IF EXISTS study_materials_insert_teachers ON study_materials;

-- Create new simplified policies for subjects
CREATE POLICY "subjects_insert_authenticated" ON subjects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Units - any authenticated user can manage units
CREATE POLICY "units_insert_authenticated" ON units
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "units_update_authenticated" ON units
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "units_delete_authenticated" ON units
  FOR DELETE TO authenticated USING (true);

-- Question bank - any authenticated user can manage
CREATE POLICY "question_bank_insert_authenticated" ON question_bank
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "question_bank_update_authenticated" ON question_bank
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "question_bank_delete_authenticated" ON question_bank
  FOR DELETE TO authenticated USING (true);

-- Solutions - any authenticated user can manage
CREATE POLICY "solutions_insert_authenticated" ON solutions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "solutions_update_authenticated" ON solutions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solutions_delete_authenticated" ON solutions
  FOR DELETE TO authenticated USING (true);

-- Content items - any authenticated user can manage
CREATE POLICY "content_items_insert_authenticated" ON content_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "content_items_update_authenticated" ON content_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "content_items_delete_authenticated" ON content_items
  FOR DELETE TO authenticated USING (true);

-- Study materials - any authenticated user can upload
CREATE POLICY "study_materials_insert_authenticated" ON study_materials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);