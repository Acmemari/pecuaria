-- App settings table for global feature flags and configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'true',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed: Paraguay disabled by default
INSERT INTO public.app_settings (key, value)
VALUES ('paraguay_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS: any authenticated user can read, only admins can update
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can update app_settings"
  ON public.app_settings FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());
