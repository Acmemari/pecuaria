-- Migration: vincular fazenda "Estancia do Lago" ao cliente "Marcos"
-- Idempotente: pode ser executada mais de uma vez sem duplicar vínculo.

DO $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Seleciona um cliente chamado Marcos (case-insensitive).
  SELECT c.id
    INTO v_client_id
  FROM public.clients c
  WHERE LOWER(TRIM(c.name)) = 'marcos'
  ORDER BY c.created_at ASC
  LIMIT 1;

  -- Se não existir cliente Marcos, não aplica alterações.
  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Cliente "Marcos" não encontrado; vínculo não aplicado.';
    RETURN;
  END IF;

  -- Vincula diretamente na tabela farms.
  UPDATE public.farms
     SET client_id = v_client_id,
         updated_at = NOW()
   WHERE LOWER(TRIM(name)) IN ('estancia do lago', 'estância do lago');

  -- Mantém também a relação em client_farms, quando a tabela existir.
  IF to_regclass('public.client_farms') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.client_farms (client_id, farm_id)
      SELECT $1, f.id
      FROM public.farms f
      WHERE LOWER(TRIM(f.name)) IN ('estancia do lago', 'estância do lago')
      ON CONFLICT (client_id, farm_id) DO NOTHING
    $sql$
    USING v_client_id;
  END IF;

  RAISE NOTICE 'Vínculo aplicado para a fazenda "Estancia do Lago" -> cliente "Marcos".';
END $$;
