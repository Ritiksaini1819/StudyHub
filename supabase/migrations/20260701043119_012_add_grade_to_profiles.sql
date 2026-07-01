-- Add grade column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade TEXT;

-- Update profile type to allow easy grade/class updates
COMMENT ON COLUMN profiles.grade IS 'The grade or class the user studies in (e.g., "10th Grade", "Class 12")';