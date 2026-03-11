-- Migration: vincular 3 clientes/fazendas à analista Maria Fernanda
-- Idempotente: pode rodar múltiplas vezes sem duplicar vínculos.

DO $$
DECLARE
  v_analyst_id UUID;
BEGIN
  -- Busca a analista por nome no perfil (com e sem acentos).
  SELECT up.id
    INTO v_analyst_id
  FROM public.user_profiles up
  WHERE up.qualification = 'analista'
    AND (
      up.name ILIKE 'Maria Fernanda Guimarães Pereira'
      OR up.name ILIKE 'Maria Fernanda Guimaraes Pereira'
      OR up.name ILIKE '%Maria Fernanda%'
    )
  ORDER BY up.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_analyst_id IS NULL THEN
    RAISE NOTICE 'Analista "Maria Fernanda" não encontrada. Nenhuma alteração aplicada.';
    RETURN;
  END IF;

  -- Atualiza os 3 clientes/fazendas selecionados.
  UPDATE public.clients c
     SET analyst_id = v_analyst_id,
         updated_at = NOW()
   WHERE (
      c.name ILIKE 'Marcos'
      OR c.name ILIKE 'José Carlos Berlato'
      OR c.name ILIKE 'Jose Carlos Berlato'
      OR c.name ILIKE 'Heloísa Bueno'
      OR c.name ILIKE 'Heloisa Bueno'
   )
     AND c.analyst_id IS DISTINCT FROM v_analyst_id;

  -- Mantém também a relação em client_analysts, quando a tabela existir.
  IF to_regclass('public.client_analysts') IS NOT NULL THEN
    INSERT INTO public.client_analysts (client_id, analyst_id)
    SELECT c.id, v_analyst_id
      FROM public.clients c
     WHERE c.name ILIKE 'Marcos'
        OR c.name ILIKE 'José Carlos Berlato'
        OR c.name ILIKE 'Jose Carlos Berlato'
        OR c.name ILIKE 'Heloísa Bueno'
        OR c.name ILIKE 'Heloisa Bueno'
    ON CONFLICT (client_id, analyst_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Vínculo aplicado para Marcos, José Carlos Berlato e Heloísa Bueno -> Maria Fernanda.';
END
$$;
