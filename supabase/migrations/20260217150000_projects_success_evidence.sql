-- Evidências de sucesso do projeto (lista numerada)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS success_evidence JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.success_evidence IS 'Lista numerada de evidências de sucesso do projeto (array de textos).';
