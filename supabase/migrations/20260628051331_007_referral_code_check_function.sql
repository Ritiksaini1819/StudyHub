-- Add function to check referral code validity without using it
CREATE OR REPLACE FUNCTION check_referral_code_valid(input_code TEXT)
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

  RETURN true;
END;
$$;