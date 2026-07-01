-- Email OTP Verification System

-- Table to store pending registrations with OTP
CREATE TABLE pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  referral_code TEXT,
  otp_code TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  otp_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table to track OTP rate limiting per email
CREATE TABLE otp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  request_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies - only service role can access these tables
-- No public access - all operations go through edge functions
CREATE POLICY "pending_regs_service_only" ON pending_registrations FOR ALL
  TO authenticated USING (false);

CREATE POLICY "rate_limits_service_only" ON otp_rate_limits FOR ALL
  TO authenticated USING (false);

-- Indexes
CREATE INDEX idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX idx_pending_registrations_otp ON pending_registrations(otp_code, email);
CREATE INDEX idx_otp_rate_limits_email ON otp_rate_limits(email, request_at);

-- Function to clean up expired pending registrations (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_registrations()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_registrations WHERE otp_expires_at < now();
  DELETE FROM otp_rate_limits WHERE request_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email already exists
CREATE OR REPLACE FUNCTION check_email_exists(input_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  profile_count INTEGER;
  auth_count INTEGER;
BEGIN
  -- Check profiles table
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE email = input_email;
  IF profile_count > 0 THEN RETURN true; END IF;
  
  -- Check auth users via profile existence
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;