-- Migration: vincular cliente Martin e fazenda Morro do Arara ao analista André Vicente
-- Idempotente: pode rodar múltiplas vezes sem duplicar vínculos.

DO $$
DECLARE
  v_analyst_id UUID;
  v_client_id UUID;
  v_farm_id TEXT;
BEGIN
  -- Busca analista André Vicente (com e sem acento, nome parcial e completo).
  SELECT up.id
    INTO v_analyst_id
  FROM public.user_profiles up
  WHERE up.qualification = 'analista'
    AND (
      up.name ILIKE 'André Vicente Bastos'
      OR up.name ILIKE 'Andre Vicente Bastos'
      OR up.name ILIKE 'André Vicente'
      OR up.name ILIKE 'Andre Vicente'
      OR up.name ILIKE '%André Vicente%'
      OR up.name ILIKE '%Andre Vicente%'
    )
  ORDER BY up.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_analyst_id IS NULL THEN
    RAISE NOTICE 'Analista "André Vicente" não encontrado. Nenhuma alteração aplicada.';
    RETURN;
  END IF;

  -- Busca cliente Martin (aceita nome parcial).
  SELECT c.id
    INTO v_client_id
  FROM public.clients c
  WHERE c.name ILIKE 'Martin'
     OR c.name ILIKE '%Martin%'
  ORDER BY c.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Cliente "Martin" não encontrado. Nenhuma alteração aplicada.';
    RETURN;
  END IF;

  -- Vincula o cliente ao analista.
  UPDATE public.clients c
     SET analyst_id = v_analyst_id,
         updated_at = NOW()
   WHERE c.id = v_client_id
     AND c.analyst_id IS DISTINCT FROM v_analyst_id;

  IF to_regclass('public.client_analysts') IS NOT NULL THEN
    INSERT INTO public.client_analysts (client_id, analyst_id)
    SELECT v_client_id, v_analyst_id
    WHERE NOT EXISTS (
      SELECT 1
        FROM public.client_analysts ca
       WHERE ca.client_id = v_client_id
         AND ca.analyst_id = v_analyst_id
    );
  END IF;

  -- Busca fazenda Morro do Arara.
  SELECT f.id
    INTO v_farm_id
  FROM public.farms f
  WHERE f.name ILIKE 'Morro do Arara'
     OR f.name ILIKE '%Morro do Arara%'
  ORDER BY f.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_farm_id IS NULL THEN
    RAISE NOTICE 'Fazenda "Morro do Arara" não encontrada. Vínculo de cliente aplicado; fazenda não alterada.';
    RETURN;
  END IF;

  -- Vincula fazenda ao cliente.
  UPDATE public.farms f
     SET client_id = v_client_id,
         updated_at = NOW()
   WHERE f.id = v_farm_id
     AND f.client_id IS DISTINCT FROM v_client_id;

  IF to_regclass('public.client_farms') IS NOT NULL THEN
    INSERT INTO public.client_farms (client_id, farm_id)
    SELECT v_client_id, v_farm_id
    WHERE NOT EXISTS (
      SELECT 1
        FROM public.client_farms cf
       WHERE cf.client_id = v_client_id
         AND cf.farm_id = v_farm_id
    );
  END IF;

  -- Vincula fazenda ao analista (tabela de relação, se existir).
  IF to_regclass('public.analyst_farms') IS NOT NULL THEN
    INSERT INTO public.analyst_farms (analyst_id, farm_id)
    SELECT v_analyst_id, v_farm_id
    WHERE NOT EXISTS (
      SELECT 1
        FROM public.analyst_farms af
       WHERE af.analyst_id = v_analyst_id
         AND af.farm_id = v_farm_id
    );
  END IF;

  RAISE NOTICE 'Vínculos aplicados: cliente Martin -> André Vicente; fazenda Morro do Arara -> Martin e André Vicente.';
END
$$;
