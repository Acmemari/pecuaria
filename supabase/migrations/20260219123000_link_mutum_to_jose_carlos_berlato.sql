-- Migration: vincular Fazenda Mutum ao cliente José Carlos Berlato
-- Idempotente: pode rodar múltiplas vezes sem duplicar vínculo.

DO $$
DECLARE
  v_client_id UUID;
  v_farm_id UUID;
BEGIN
  SELECT c.id
    INTO v_client_id
  FROM public.clients c
  WHERE c.name ILIKE 'josé carlos berlato'
     OR c.name ILIKE 'jose carlos berlato'
     OR c.name ILIKE '%josé carlos berlato%'
     OR c.name ILIKE '%jose carlos berlato%'
  ORDER BY c.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Cliente "José Carlos Berlato" não encontrado. Nenhuma alteração aplicada.';
    RETURN;
  END IF;

  SELECT f.id
    INTO v_farm_id
  FROM public.farms f
  WHERE f.name ILIKE 'mutum'
     OR f.name ILIKE '%mutum%'
  ORDER BY f.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_farm_id IS NULL THEN
    RAISE NOTICE 'Fazenda "Mutum" não encontrada. Nenhuma alteração aplicada.';
    RETURN;
  END IF;

  -- Garante vínculo direto no cadastro da fazenda
  UPDATE public.farms
     SET client_id = v_client_id,
         updated_at = NOW()
   WHERE id = v_farm_id
     AND client_id IS DISTINCT FROM v_client_id;

  -- Garante vínculo na tabela de relação cliente-fazenda
  INSERT INTO public.client_farms (client_id, farm_id)
  SELECT v_client_id, v_farm_id
  WHERE NOT EXISTS (
    SELECT 1
      FROM public.client_farms cf
     WHERE cf.client_id = v_client_id
       AND cf.farm_id = v_farm_id
  );

  RAISE NOTICE 'Vínculo aplicado: fazenda % -> cliente %', v_farm_id, v_client_id;
END
$$;
