-- =============================================================================
-- Migration: Performance & Security improvements
-- 1. Index on initiatives.internal_leader (query performance)
-- 2. Function is_visitor() with SECURITY DEFINER (avoids repeated subqueries
--    in visitor RLS policies and eliminates risk of recursion)
-- =============================================================================

-- 1. Index on internal_leader (matches existing idx_initiatives_leader pattern)
CREATE INDEX IF NOT EXISTS idx_initiatives_internal_leader
  ON public.initiatives(internal_leader);

-- 2. is_visitor() helper — analogous to is_admin() / current_user_is_admin()
CREATE OR REPLACE FUNCTION public.is_visitor()
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
      AND qualification = 'visitante'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_visitor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_visitor() TO anon;

COMMENT ON FUNCTION public.is_visitor IS
  'Returns true if the current authenticated user has qualification = ''visitante''. '
  'Uses SECURITY DEFINER to avoid RLS recursion inside visitor policies.';
