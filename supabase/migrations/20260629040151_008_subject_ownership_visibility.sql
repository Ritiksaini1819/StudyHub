-- Subject Ownership and Visibility System

-- Add ownership and visibility columns to subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS creator_role TEXT CHECK (creator_role IN ('student', 'teacher'));

-- Create indexes for faster queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_subjects_visibility ON subjects(visibility);
CREATE INDEX IF NOT EXISTS idx_subjects_creator_role ON subjects(creator_role);

-- Update existing subjects to have proper visibility based on creator's role
UPDATE subjects s
SET 
  visibility = CASE 
    WHEN p.role = 'teacher' THEN 'public'
    ELSE 'private'
  END,
  creator_role = p.role
FROM profiles p
WHERE s.created_by = p.id AND s.visibility IS NULL;

-- If created_by is NULL, assume it's a teacher-created (legacy) subject
UPDATE subjects
SET visibility = 'public', creator_role = 'teacher'
WHERE created_by IS NULL AND visibility IS NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "subjects_select_authenticated" ON subjects;
DROP POLICY IF EXISTS "subjects_insert_authenticated" ON subjects;
DROP POLICY IF EXISTS "subjects_update_authenticated" ON subjects;
DROP POLICY IF EXISTS "subjects_delete_authenticated" ON subjects;

-- New RLS Policies for subjects

-- SELECT: Users can see:
-- 1. All public subjects (created by teachers)
-- 2. Their own private subjects (created by themselves as students)
CREATE POLICY "subjects_select_own_or_public" ON subjects FOR SELECT
  TO authenticated USING (
    visibility = 'public' 
    OR created_by = auth.uid()
  );

-- INSERT: Users can create subjects
-- Teachers create public subjects, students create private subjects
CREATE POLICY "subjects_insert_authenticated" ON subjects FOR INSERT
  TO authenticated WITH CHECK (
    created_by = auth.uid()
  );

-- UPDATE: Only the creator can update their own subjects
CREATE POLICY "subjects_update_creator" ON subjects FOR UPDATE
  TO authenticated USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Only the creator can delete their own subjects
CREATE POLICY "subjects_delete_creator" ON subjects FOR DELETE
  TO authenticated USING (created_by = auth.uid());

-- Function to automatically set visibility based on creator role
CREATE OR REPLACE FUNCTION set_subject_visibility()
RETURNS TRIGGER AS $$
DECLARE
  creator_role_val TEXT;
BEGIN
  -- Get the role of the creator
  SELECT role INTO creator_role_val FROM profiles WHERE id = NEW.created_by;
  
  -- Set visibility based on role
  IF creator_role_val = 'teacher' THEN
    NEW.visibility := 'public';
  ELSE
    NEW.visibility := 'private';
  END IF;
  
  NEW.creator_role := creator_role_val;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set visibility on insert
DROP TRIGGER IF EXISTS trigger_set_subject_visibility ON subjects;
CREATE TRIGGER trigger_set_subject_visibility
  BEFORE INSERT ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION set_subject_visibility();