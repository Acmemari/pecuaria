-- Migration: Add RLS policy for admins to update agent_registry
-- Created at: 2026-02-22

BEGIN;

-- Allow authenticated users to update the agent_registry if they have the 'admin' role
DROP POLICY IF EXISTS "Admins can update agent registry" ON public.agent_registry;

CREATE POLICY "Admins can update agent registry"
  ON public.agent_registry
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

COMMIT;
