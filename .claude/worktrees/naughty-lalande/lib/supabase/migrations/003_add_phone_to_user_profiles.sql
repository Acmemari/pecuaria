-- Migration: Add phone field to user_profiles table
-- This migration adds a phone number field to store user contact information

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone TEXT;
    
    -- Add comment
    COMMENT ON COLUMN user_profiles.phone IS 'User phone number for contact purposes';
  END IF;
END $$;

