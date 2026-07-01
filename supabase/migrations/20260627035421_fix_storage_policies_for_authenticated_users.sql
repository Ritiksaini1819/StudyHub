-- Fix storage policies to allow all authenticated users to upload
-- Remove teacher-only restriction from storage

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Teachers can upload study materials" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their study materials" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their study materials" ON storage.objects;

-- Create new policies allowing all authenticated users

-- INSERT: Allow any authenticated user to upload to study-materials bucket
CREATE POLICY "Authenticated users can upload study materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study-materials');

-- UPDATE: Allow any authenticated user to update files in study-materials bucket
CREATE POLICY "Authenticated users can update study materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'study-materials')
WITH CHECK (bucket_id = 'study-materials');

-- DELETE: Allow any authenticated user to delete files in study-materials bucket
CREATE POLICY "Authenticated users can delete study materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'study-materials');