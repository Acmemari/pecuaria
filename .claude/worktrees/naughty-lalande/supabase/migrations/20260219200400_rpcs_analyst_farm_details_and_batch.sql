-- RPCs para otimização de performance e segurança nas permissões de fazendas

-- 1. Retorna analyst_farms + nomes de analistas em uma única query (bypassa RLS em user_profiles)
CREATE OR REPLACE FUNCTION public.get_analyst_farm_details(p_farm_id TEXT)
RETURNS TABLE(
  id UUID,
  analyst_id UUID,
  farm_id TEXT,
  is_responsible BOOLEAN,
  permissions JSONB,
  analyst_name TEXT,
  analyst_email TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT af.id, af.analyst_id, af.farm_id,
         af.is_responsible, af.permissions,
         up.name, up.email
  FROM public.analyst_farms af
  LEFT JOIN public.user_profiles up ON up.id = af.analyst_id
  WHERE af.farm_id = p_farm_id;
$$;

-- 2. Retorna permissões em batch para múltiplas fazendas (elimina N+1 queries)
CREATE OR REPLACE FUNCTION public.get_farm_permissions_batch(p_farm_ids TEXT[], p_user_id UUID)
RETURNS TABLE(farm_id TEXT, is_responsible BOOLEAN, permissions JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT af.farm_id, af.is_responsible, af.permissions
  FROM public.analyst_farms af
  WHERE af.farm_id = ANY(p_farm_ids)
    AND af.analyst_id = p_user_id;
$$;
