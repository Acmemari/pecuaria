-- Garante que o nome do analista apareça mesmo quando user_profiles está vazio
-- Fallback para auth.users (raw_user_meta_data, email)

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
         COALESCE(
           up.name,
           au.raw_user_meta_data->>'full_name',
           au.raw_user_meta_data->>'name',
           au.email::TEXT
         ) AS analyst_name,
         COALESCE(up.email, au.email::TEXT) AS analyst_email
  FROM public.analyst_farms af
  LEFT JOIN public.user_profiles up ON up.id = af.analyst_id
  LEFT JOIN auth.users au ON au.id = af.analyst_id
  WHERE af.farm_id = p_farm_id;
$$;
