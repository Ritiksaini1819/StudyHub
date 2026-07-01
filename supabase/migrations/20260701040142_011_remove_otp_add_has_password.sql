-- Add has_password column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

-- Update existing profiles that have passwords (created via email signup)
-- For now, we'll assume existing users have passwords set
UPDATE profiles SET has_password = true WHERE has_password IS NULL;

-- Drop OTP-related tables
DROP TABLE IF EXISTS otp_rate_limits;
DROP TABLE IF EXISTS pending_registrations;

-- Drop OTP-related functions
DROP FUNCTION IF EXISTS cleanup_expired_registrations();
DROP FUNCTION IF EXISTS check_email_exists(TEXT);

-- Drop referral code usage table (keep referral_codes for teacher registration)
DROP TABLE IF EXISTS referral_code_usage;