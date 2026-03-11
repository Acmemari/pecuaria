-- Fix: get_users_for_admin não retornava o campo client_id, causando perda do vínculo
-- ao reabrir o formulário de edição no AdminDashboard.
-- Também faz backfill: usuários com client_id definido devem ter qualification='cliente'.

-- 1. Backfill de qualificação: garante consistência para dados já existentes
UPDATE public.user_profiles
SET qualification = 'cliente'
WHERE client_id IS NOT NULL
  AND qualification IS DISTINCT FROM 'cliente';

-- 2. Recria a função adicionando client_id na resposta
-- DROP necessário pois o tipo de retorno muda (adição de client_id)
DROP FUNCTION IF EXISTS public.get_users_for_admin(INT, INT, TEXT);

CREATE FUNCTION public.get_users_for_admin(
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 200,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  avatar TEXT,
  plan TEXT,
  status TEXT,
  last_login TIMESTAMPTZ,
  organization_id UUID,
  client_id UUID,
  phone TEXT,
  qualification TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admin pode chamar
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.name,
    up.email,
    up.role,
    up.avatar,
    up.plan,
    up.status,
    up.last_login,
    up.organization_id,
    up.client_id,
    up.phone,
    up.qualification,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  WHERE up.role = 'client'
    AND (
      p_search IS NULL
      OR p_search = ''
      OR up.name ILIKE '%' || p_search || '%'
      OR up.email ILIKE '%' || p_search || '%'
    )
  ORDER BY up.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_for_admin(INT, INT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_users_for_admin(INT, INT, TEXT) IS
  'Lista usuários (role=client) para admin. Inclui client_id para exibição do vínculo com organização. Bypassa RLS. v2.';

