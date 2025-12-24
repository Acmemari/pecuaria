-- Migration: Fix infinite recursion in admin update policy
-- The previous policy caused recursion by querying user_profiles within itself
-- Solution: Use a function with SECURITY DEFINER to check admin role without recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;

-- Create a function to check if current user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Create new policy using the function (no recursion)
CREATE POLICY "Admins can update user profiles"
  ON user_profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

COMMENT ON FUNCTION public.is_admin IS 'Checks if the current authenticated user is an admin. Uses SECURITY DEFINER to avoid RLS recursion.';

