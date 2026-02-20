-- Migration: Allow responsible analyst to add/update/remove other analysts on their farm
-- The existing policy only allows analysts to manage rows where analyst_id = auth.uid()
-- This adds ability for is_responsible analysts to manage rows for their farm

DROP POLICY IF EXISTS "Analysts can manage their own farms" ON public.analyst_farms;

-- Analysts can manage rows where they are the analyst (their own access)
CREATE POLICY "Analysts can manage their own analyst_farms rows"
  ON public.analyst_farms FOR ALL
  USING (
    analyst_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    analyst_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Responsible analysts can manage any analyst_farms row for farms they are responsible for
CREATE POLICY "Responsible analysts can manage farm permissions"
  ON public.analyst_farms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.analyst_farms af2
      WHERE af2.farm_id = analyst_farms.farm_id
      AND af2.analyst_id = auth.uid()
      AND af2.is_responsible = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyst_farms af2
      WHERE af2.farm_id = analyst_farms.farm_id
      AND af2.analyst_id = auth.uid()
      AND af2.is_responsible = true
    )
  );
