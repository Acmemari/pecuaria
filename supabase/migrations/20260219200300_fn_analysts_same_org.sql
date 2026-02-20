-- Fix: Analistas da mesma empresa nao aparecem no modal de permissoes
-- RLS em user_profiles so permite nao-admin ver o proprio perfil.
-- Funcao SECURITY DEFINER bypassa RLS para listar analistas da mesma org.

CREATE OR REPLACE FUNCTION public.get_analysts_same_org(p_org_id UUID, p_exclude_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.id, up.name, up.email
  FROM public.user_profiles up
  WHERE up.qualification = 'analista'
    AND up.organization_id = p_org_id
    AND up.id != p_exclude_user_id
  ORDER BY up.name;
$$;
