-- Migration: Add is_responsible and permissions to analyst_farms
-- Allows granular permission control per analyst per farm

-- 1. Add columns
ALTER TABLE public.analyst_farms
  ADD COLUMN IF NOT EXISTS is_responsible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- 2. Set is_responsible for existing records
-- For each farm, mark the first analyst (or client's analyst) as responsible
DO $$
DECLARE
  rec RECORD;
  v_client_analyst_id UUID;
  v_first_analyst_id UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT farm_id FROM public.analyst_farms
  LOOP
    -- Get client's analyst_id via client_farms -> clients
    SELECT c.analyst_id INTO v_client_analyst_id
    FROM public.client_farms cf
    JOIN public.clients c ON c.id = cf.client_id
    WHERE cf.farm_id = rec.farm_id
    LIMIT 1;

    -- Get first analyst in analyst_farms for this farm
    SELECT analyst_id INTO v_first_analyst_id
    FROM public.analyst_farms
    WHERE farm_id = rec.farm_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- Prefer client's analyst; else use first in analyst_farms
    UPDATE public.analyst_farms
    SET is_responsible = (analyst_id = COALESCE(v_client_analyst_id, v_first_analyst_id))
    WHERE farm_id = rec.farm_id;
  END LOOP;
END$$;

-- 3. Ensure at least one responsible per farm (safety net)
DO $$
DECLARE
  rec RECORD;
  v_analyst_id UUID;
BEGIN
  FOR rec IN
    SELECT farm_id FROM public.analyst_farms
    GROUP BY farm_id
    HAVING NOT bool_or(is_responsible)
  LOOP
    SELECT analyst_id INTO v_analyst_id
    FROM public.analyst_farms
    WHERE farm_id = rec.farm_id
    ORDER BY created_at ASC
    LIMIT 1;
    UPDATE public.analyst_farms
    SET is_responsible = true
    WHERE farm_id = rec.farm_id AND analyst_id = v_analyst_id;
  END LOOP;
END$$;

COMMENT ON COLUMN public.analyst_farms.is_responsible IS 'Analyst responsible for the farm; only they can add/remove other analysts';
COMMENT ON COLUMN public.analyst_farms.permissions IS 'Map of permission key -> hidden|view|edit per entity';
