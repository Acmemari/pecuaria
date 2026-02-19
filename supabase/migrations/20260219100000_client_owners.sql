-- Migration: Proprietários Gestores vinculados a clientes
-- Permite cadastrar um ou mais sócios gestores por cliente

CREATE TABLE IF NOT EXISTS public.client_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_owners_client_id ON public.client_owners(client_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_owners_set_updated_at ON public.client_owners;
CREATE TRIGGER client_owners_set_updated_at
  BEFORE UPDATE ON public.client_owners
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- RLS
ALTER TABLE public.client_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_owners select admin" ON public.client_owners;
CREATE POLICY "client_owners select admin"
  ON public.client_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "client_owners select analyst" ON public.client_owners;
CREATE POLICY "client_owners select analyst"
  ON public.client_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_owners.client_id AND c.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client_owners insert admin or analyst" ON public.client_owners;
CREATE POLICY "client_owners insert admin or analyst"
  ON public.client_owners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_owners.client_id AND c.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client_owners update admin or analyst" ON public.client_owners;
CREATE POLICY "client_owners update admin or analyst"
  ON public.client_owners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_owners.client_id AND c.analyst_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_owners.client_id AND c.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client_owners delete admin or analyst" ON public.client_owners;
CREATE POLICY "client_owners delete admin or analyst"
  ON public.client_owners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_owners.client_id AND c.analyst_id = auth.uid()
    )
  );

COMMENT ON TABLE public.client_owners IS 'Proprietários gestores vinculados aos clientes.';
