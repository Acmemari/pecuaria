-- Migration: Add qualification field to user_profiles table
-- This migration adds a qualification field to classify users as 'visitante', 'cliente', or 'analista'
-- Default value is 'visitante' for all new registrations

-- Add qualification column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'qualification'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN qualification TEXT DEFAULT 'visitante' CHECK (qualification IN ('visitante', 'cliente', 'analista'));
    
    -- Update existing records to 'visitante' if they don't have a qualification
    UPDATE user_profiles SET qualification = 'visitante' WHERE qualification IS NULL;
    
    -- Add comment
    COMMENT ON COLUMN user_profiles.qualification IS 'User qualification: visitante (default), cliente, or analista';
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_qualification ON user_profiles(qualification);

