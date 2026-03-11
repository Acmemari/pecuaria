-- Migration: Fix RLS policy for clients table
-- This migration ensures that analysts can only see their own clients, while admins can see all clients

-- Drop the existing policy that allows all analysts to see all clients
DROP POLICY IF EXISTS "Analysts and admins can view all clients" ON clients;

-- Create separate policies for admins and analysts
-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Analysts can only view their own clients
CREATE POLICY "Analysts can view their own clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.qualification = 'analista'
    )
    AND analyst_id = auth.uid() -- Analista só pode ver clientes vinculados a ele
  );
