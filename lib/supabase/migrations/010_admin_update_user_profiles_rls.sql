-- Migration: Allow admins to update user_profiles
-- This migration adds RLS policy to allow administrators to update user profiles

-- Policy for UPDATE: Admins can update any user profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Admins can update user profiles'
  ) THEN
    CREATE POLICY "Admins can update user profiles"
      ON user_profiles FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      );
  END IF;
END $$;

