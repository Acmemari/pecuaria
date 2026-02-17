-- =============================================================================
-- Migration: Link deliveries to client + Strengthen RLS with farm access
-- =============================================================================

-- 1) Add client_id to deliveries (nullable for existing/global deliveries)
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_client_id ON public.deliveries(client_id);

COMMENT ON COLUMN public.deliveries.client_id IS 'Cliente vinculado à entrega. NULL = entrega global do analista.';

-- 2) STRENGTHEN RLS on initiatives: check analyst has access to the farm
--    If farm_id is NULL, fall back to created_by check.
--    If farm_id is set, verify analyst has that farm in analyst_farms.

DROP POLICY IF EXISTS "initiatives_select" ON public.initiatives;
CREATE POLICY "initiatives_select"
  ON public.initiatives FOR SELECT
  USING (
    current_user_is_admin()
    OR (
      created_by = auth.uid()
      AND (
        farm_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.analyst_farms af
          WHERE af.analyst_id = auth.uid()
            AND af.farm_id = initiatives.farm_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "initiatives_insert" ON public.initiatives;
CREATE POLICY "initiatives_insert"
  ON public.initiatives FOR INSERT
  WITH CHECK (
    current_user_is_admin()
    OR (
      created_by = auth.uid()
      AND (
        farm_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.analyst_farms af
          WHERE af.analyst_id = auth.uid()
            AND af.farm_id = initiatives.farm_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "initiatives_update" ON public.initiatives;
CREATE POLICY "initiatives_update"
  ON public.initiatives FOR UPDATE
  USING (
    current_user_is_admin()
    OR (
      created_by = auth.uid()
      AND (
        farm_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.analyst_farms af
          WHERE af.analyst_id = auth.uid()
            AND af.farm_id = initiatives.farm_id
        )
      )
    )
  )
  WITH CHECK (
    current_user_is_admin()
    OR (
      created_by = auth.uid()
      AND (
        farm_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.analyst_farms af
          WHERE af.analyst_id = auth.uid()
            AND af.farm_id = initiatives.farm_id
        )
      )
    )
  );

DROP POLICY IF EXISTS "initiatives_delete" ON public.initiatives;
CREATE POLICY "initiatives_delete"
  ON public.initiatives FOR DELETE
  USING (
    current_user_is_admin()
    OR (
      created_by = auth.uid()
      AND (
        farm_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.analyst_farms af
          WHERE af.analyst_id = auth.uid()
            AND af.farm_id = initiatives.farm_id
        )
      )
    )
  );

-- 3) STRENGTHEN RLS on deliveries: check ownership or admin

DROP POLICY IF EXISTS "Deliveries select own or admin" ON public.deliveries;
CREATE POLICY "Deliveries select own or admin"
  ON public.deliveries FOR SELECT
  USING (
    current_user_is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Deliveries insert owner or admin" ON public.deliveries;
CREATE POLICY "Deliveries insert owner or admin"
  ON public.deliveries FOR INSERT
  WITH CHECK (
    current_user_is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Deliveries update own or admin" ON public.deliveries;
CREATE POLICY "Deliveries update own or admin"
  ON public.deliveries FOR UPDATE
  USING (
    current_user_is_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    current_user_is_admin()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Deliveries delete own or admin" ON public.deliveries;
CREATE POLICY "Deliveries delete own or admin"
  ON public.deliveries FOR DELETE
  USING (
    current_user_is_admin()
    OR created_by = auth.uid()
  );

-- 4) initiative_milestones and initiative_tasks RLS cascade from
--    the strengthened initiatives policy (no changes needed).
