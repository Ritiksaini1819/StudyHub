-- Update content tables to inherit subject visibility

-- Update units RLS policies
DROP POLICY IF EXISTS "units_select_authenticated" ON units;
DROP POLICY IF EXISTS "units_insert_authenticated" ON units;
DROP POLICY IF EXISTS "units_update_authenticated" ON units;
DROP POLICY IF EXISTS "units_delete_authenticated" ON units;

-- SELECT: Users can see units from subjects they have access to
CREATE POLICY "units_select_with_subject_access" ON units FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = units.subject_id 
      AND (subjects.visibility = 'public' OR subjects.created_by = auth.uid())
    )
  );

-- INSERT: Users can create units in subjects they own
CREATE POLICY "units_insert_subject_owner" ON units FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = units.subject_id 
      AND subjects.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update units in subjects they own
CREATE POLICY "units_update_subject_owner" ON units FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = units.subject_id 
      AND subjects.created_by = auth.uid()
    )
  );

-- DELETE: Users can delete units in subjects they own
CREATE POLICY "units_delete_subject_owner" ON units FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = units.subject_id 
      AND subjects.created_by = auth.uid()
    )
  );

-- Update study_materials RLS policies
DROP POLICY IF EXISTS "materials_select_authenticated" ON study_materials;
DROP POLICY IF EXISTS "materials_insert_authenticated" ON study_materials;
DROP POLICY IF EXISTS "materials_update_authenticated" ON study_materials;
DROP POLICY IF EXISTS "materials_delete_authenticated" ON study_materials;

-- SELECT: Users can see materials from subjects they have access to
CREATE POLICY "materials_select_with_subject_access" ON study_materials FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = study_materials.subject_id 
      AND (subjects.visibility = 'public' OR subjects.created_by = auth.uid())
    )
  );

-- INSERT: Users can create materials in subjects they own
CREATE POLICY "materials_insert_subject_owner" ON study_materials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = study_materials.subject_id 
      AND subjects.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update materials in subjects they own
CREATE POLICY "materials_update_subject_owner" ON study_materials FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = study_materials.subject_id 
      AND subjects.created_by = auth.uid()
    )
  );

-- DELETE: Users can delete materials in subjects they own
CREATE POLICY "materials_delete_subject_owner" ON study_materials FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM subjects 
      WHERE subjects.id = study_materials.subject_id 
      AND subjects.created_by = auth.uid()
    )
  );

-- Update content_items RLS policies
DROP POLICY IF EXISTS "content_items_select_authenticated" ON content_items;
DROP POLICY IF EXISTS "content_items_insert_authenticated" ON content_items;
DROP POLICY IF EXISTS "content_items_update_authenticated" ON content_items;
DROP POLICY IF EXISTS "content_items_delete_authenticated" ON content_items;

-- SELECT: Users can see content items from units they have access to
CREATE POLICY "content_select_with_unit_access" ON content_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = content_items.unit_id 
      AND (s.visibility = 'public' OR s.created_by = auth.uid())
    )
  );

-- INSERT: Users can create content in units they own
CREATE POLICY "content_insert_unit_owner" ON content_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = content_items.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update content in units they own
CREATE POLICY "content_update_unit_owner" ON content_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = content_items.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- DELETE: Users can delete content in units they own
CREATE POLICY "content_delete_unit_owner" ON content_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = content_items.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- Update question_bank RLS policies
DROP POLICY IF EXISTS "questions_select_authenticated" ON question_bank;
DROP POLICY IF EXISTS "questions_insert_authenticated" ON question_bank;
DROP POLICY IF EXISTS "questions_update_authenticated" ON question_bank;
DROP POLICY IF EXISTS "questions_delete_authenticated" ON question_bank;

-- SELECT: Users can see questions from units they have access to
CREATE POLICY "questions_select_with_unit_access" ON question_bank FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = question_bank.unit_id 
      AND (s.visibility = 'public' OR s.created_by = auth.uid())
    )
  );

-- INSERT: Users can create questions in units they own
CREATE POLICY "questions_insert_unit_owner" ON question_bank FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = question_bank.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update questions in units they own
CREATE POLICY "questions_update_unit_owner" ON question_bank FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = question_bank.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- DELETE: Users can delete questions in units they own
CREATE POLICY "questions_delete_unit_owner" ON question_bank FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = question_bank.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- Update solutions RLS policies
DROP POLICY IF EXISTS "solutions_select_authenticated" ON solutions;
DROP POLICY IF EXISTS "solutions_insert_authenticated" ON solutions;
DROP POLICY IF EXISTS "solutions_update_authenticated" ON solutions;
DROP POLICY IF EXISTS "solutions_delete_authenticated" ON solutions;

-- SELECT: Users can see solutions from units they have access to
CREATE POLICY "solutions_select_with_unit_access" ON solutions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = solutions.unit_id 
      AND (s.visibility = 'public' OR s.created_by = auth.uid())
    )
  );

-- INSERT: Users can create solutions in units they own
CREATE POLICY "solutions_insert_unit_owner" ON solutions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = solutions.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- UPDATE: Users can update solutions in units they own
CREATE POLICY "solutions_update_unit_owner" ON solutions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = solutions.unit_id 
      AND s.created_by = auth.uid()
    )
  );

-- DELETE: Users can delete solutions in units they own
CREATE POLICY "solutions_delete_unit_owner" ON solutions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN subjects s ON s.id = u.subject_id
      WHERE u.id = solutions.unit_id 
      AND s.created_by = auth.uid()
    )
  );