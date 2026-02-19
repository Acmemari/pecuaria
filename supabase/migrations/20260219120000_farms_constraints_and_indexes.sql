-- Migration: Melhorias de segurança e performance na tabela farms
-- FK constraints, indexes compostos, RLS INSERT mais restritiva

-- 1. FK nas junction tables (idempotente via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_client_farms_farm_id'
  ) THEN
    ALTER TABLE public.client_farms
      ADD CONSTRAINT fk_client_farms_farm_id
      FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_analyst_farms_farm_id'
  ) THEN
    ALTER TABLE public.analyst_farms
      ADD CONSTRAINT fk_analyst_farms_farm_id
      FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 2. Indexes para queries frequentes
CREATE INDEX IF NOT EXISTS idx_farms_client_id_name ON public.farms(client_id, name);
CREATE INDEX IF NOT EXISTS idx_farms_created_at ON public.farms(created_at DESC);

-- 3. RLS INSERT mais restritiva: analista só pode inserir fazenda
--    para cliente vinculado a ele (ou admin insere qualquer)
DROP POLICY IF EXISTS "Analysts can insert farms" ON public.farms;
CREATE POLICY "Analysts can insert farms"
  ON public.farms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.qualification = 'analista'
      )
      AND (
        client_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = farms.client_id
          AND clients.analyst_id = auth.uid()
        )
      )
    )
  );
