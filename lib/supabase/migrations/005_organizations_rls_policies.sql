-- Migration: Ensure complete RLS policies for organizations table
-- This migration ensures all CRUD operations are properly secured

-- Enable RLS if not already enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT: Users can create organizations where they are the owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Users can insert their own organizations'
  ) THEN
    CREATE POLICY "Users can insert their own organizations"
      ON organizations FOR INSERT
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- Policy for DELETE: Users can delete organizations they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Users can delete their own organizations'
  ) THEN
    CREATE POLICY "Users can delete their own organizations"
      ON organizations FOR DELETE
      USING (auth.uid() = owner_id);
  END IF;
END $$;

-- Policy for UPDATE: Ensure users can only update organizations they own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Users can update their own organization'
  ) THEN
    CREATE POLICY "Users can update their own organization"
      ON organizations FOR UPDATE
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- Admins can view all organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Admins can view all organizations'
  ) THEN
    CREATE POLICY "Admins can view all organizations"
      ON organizations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Admins can update all organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Admins can update all organizations'
  ) THEN
    CREATE POLICY "Admins can update all organizations"
      ON organizations FOR UPDATE
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

