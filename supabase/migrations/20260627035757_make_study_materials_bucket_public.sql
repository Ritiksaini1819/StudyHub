-- Make study-materials bucket public for read access
UPDATE storage.buckets 
SET public = true 
WHERE name = 'study-materials';