-- Referral codes system for teacher registration

-- Create referral_codes table for admin management
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default teacher referral code
INSERT INTO referral_codes (code, description, is_active)
VALUES ('STUDY2026', 'Default teacher registration code', true);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow all authenticated users to read active codes for validation
CREATE POLICY "referral_codes_select_authenticated" ON referral_codes FOR SELECT
  TO authenticated USING (is_active = true);

-- Only service role can insert/update (for admin management later)
-- No public policies for insert/update/delete - must go through edge function

-- Create index for fast lookups
CREATE INDEX idx_referral_codes_code ON referral_codes(code) WHERE is_active = true;

-- Track code usage (optional - for analytics)
CREATE TABLE referral_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE referral_code_usage ENABLE ROW LEVEL SECURITY;

-- Only service role can manage this table
CREATE POLICY "usage_select_own" ON referral_code_usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Function to validate and use a referral code
-- This is called server-side (from edge function) with service role privileges
CREATE OR REPLACE FUNCTION validate_and_use_referral_code(
  input_code TEXT,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record RECORD;
BEGIN
  -- Find the active code
  SELECT * INTO code_record
  FROM referral_codes
  WHERE code = input_code AND is_active = true;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if expired
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN false;
  END IF;

  -- Check max uses
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN false;
  END IF;

  -- Increment usage count
  UPDATE referral_codes
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = code_record.id;

  -- Record usage
  INSERT INTO referral_code_usage (code_id, user_id)
  VALUES (code_record.id, user_id);

  RETURN true;
END;
$$;