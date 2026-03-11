-- Fix: Garantir que analistas possam inserir clientes vinculados a si
-- A política pode falhar se user_profiles tiver RLS restritivo (recursão).
-- Função SECURITY DEFINER bypassa RLS para o check de qualification.

CREATE OR REPLACE FUNCTION public.is_current_user_analyst()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND qualification = 'analista'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_current_user_analyst() IS 'Verifica se o usuário autenticado é analista. Usa SECURITY DEFINER para evitar recursão RLS em user_profiles.';

-- Recriar política de INSERT para analistas
DROP POLICY IF EXISTS "Analysts can insert clients for themselves" ON public.clients;
CREATE POLICY "Analysts can insert clients for themselves"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.is_current_user_analyst()
    AND analyst_id = auth.uid()
  );
