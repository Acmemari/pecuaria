-- Fix: Admin deve ver todos os analistas na listagem (produção vs local)
-- RLS em user_profiles restringe o que cada usuário vê. Em produção, admin pode
-- ver apenas 1 registro quando as políticas filtram por organização ou perfil próprio.
-- Esta RPC usa SECURITY DEFINER para bypassar RLS e retornar todos os analistas
-- quando o chamador for admin.

CREATE OR REPLACE FUNCTION public.get_analysts_for_admin(
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, name TEXT, email TEXT, qualification TEXT, role TEXT)
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
  SELECT up.id, up.name, up.email, up.qualification, up.role
  FROM public.user_profiles up
  WHERE up.qualification = 'analista'
    AND (p_search IS NULL OR p_search = '' OR up.name ILIKE '%' || p_search || '%')
  ORDER BY up.name ASC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_analysts_for_admin(INT, INT, TEXT) IS
  'Lista analistas para admin. Bypassa RLS em user_profiles. Chamável apenas por role=admin.';
