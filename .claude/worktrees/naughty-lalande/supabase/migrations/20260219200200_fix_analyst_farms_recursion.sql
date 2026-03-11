-- Fix: infinite recursion in analyst_farms RLS policy
-- The "Responsible analysts can manage farm permissions" policy queries
-- analyst_farms itself, which triggers RLS again → infinite loop.
-- Solution: use a SECURITY DEFINER function to bypass RLS for the check.

-- 1. Create helper function (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_farm_responsible(p_farm_id TEXT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.analyst_farms
    WHERE farm_id = p_farm_id
      AND analyst_id = p_user_id
      AND is_responsible = true
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Responsible analysts can manage farm permissions" ON public.analyst_farms;

-- 3. Drop the existing policy too so we can recreate a single combined one
DROP POLICY IF EXISTS "Analysts can manage their own analyst_farms rows" ON public.analyst_farms;

-- 4. Recreate a single non-recursive policy
CREATE POLICY "Analysts can manage analyst_farms"
  ON public.analyst_farms FOR ALL
  USING (
    -- Own row
    analyst_id = auth.uid()
    -- Admin
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    -- Responsible for this farm (via SECURITY DEFINER function, no recursion)
    OR public.is_farm_responsible(farm_id, auth.uid())
  )
  WITH CHECK (
    analyst_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR public.is_farm_responsible(farm_id, auth.uid())
  );
