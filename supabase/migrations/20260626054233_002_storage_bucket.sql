/*
# Create Storage Bucket for Study Materials

This migration creates the storage bucket needed for file uploads.

## Storage Bucket
- `study-materials` - For storing PDF, DOC, PPT, TXT files uploaded by teachers

## Security
- Public bucket (files are accessible via signed URLs for authenticated users)
- RLS policies applied at database level for metadata
*/

-- Insert the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-materials',
  'study-materials',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for authenticated users
DROP POLICY IF EXISTS "Anyone can view study materials" ON storage.objects;
CREATE POLICY "Anyone can view study materials" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'study-materials');

DROP POLICY IF EXISTS "Teachers can upload study materials" ON storage.objects;
CREATE POLICY "Teachers can upload study materials" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'study-materials' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "Teachers can update their study materials" ON storage.objects;
CREATE POLICY "Teachers can update their study materials" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Teachers can delete their study materials" ON storage.objects;
CREATE POLICY "Teachers can delete their study materials" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'study-materials' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );