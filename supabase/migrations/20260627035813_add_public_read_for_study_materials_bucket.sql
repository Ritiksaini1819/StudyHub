-- Add public read access for study-materials bucket
-- Allow anon (unauthenticated) users to view files in public bucket
CREATE POLICY "Public can view study materials"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'study-materials');