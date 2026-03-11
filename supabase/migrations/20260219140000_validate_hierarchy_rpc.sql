-- Validates a persisted Analyst -> Client -> Farm chain in one roundtrip.
CREATE OR REPLACE FUNCTION public.validate_hierarchy(
  p_analyst_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_farm_id text DEFAULT NULL
)
RETURNS TABLE (
  analyst_valid boolean,
  client_valid boolean,
  farm_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_analyst_exists boolean := false;
  v_client_exists boolean := false;
  v_farm_exists boolean := false;
BEGIN
  IF p_analyst_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = p_analyst_id
        AND up.qualification = 'analista'
    ) INTO v_analyst_exists;
  END IF;

  IF p_client_id IS NOT NULL THEN
    IF p_analyst_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.id = p_client_id
          AND c.analyst_id = p_analyst_id
      ) INTO v_client_exists;
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.id = p_client_id
      ) INTO v_client_exists;
    END IF;
  END IF;

  IF p_farm_id IS NOT NULL THEN
    IF p_client_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.farms f
        WHERE f.id = p_farm_id
          AND f.client_id = p_client_id
      ) INTO v_farm_exists;
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM public.farms f
        WHERE f.id = p_farm_id
      ) INTO v_farm_exists;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(v_analyst_exists, false),
    COALESCE(v_client_exists, false),
    COALESCE(v_farm_exists, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_hierarchy(uuid, uuid, text) TO authenticated;
