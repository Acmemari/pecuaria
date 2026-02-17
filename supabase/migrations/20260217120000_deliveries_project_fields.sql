-- =============================================================================
-- Migration: Campos de projeto no cadastro de entregas (Inttegra)
-- Nome do Projeto = name (já existe, apenas rótulo na UI)
-- Descrição das transformações e conquistas, Prazo, Matriz de Stakeholder
-- =============================================================================

-- Descrição das transformações e conquistas
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS transformations_achievements TEXT;

COMMENT ON COLUMN public.deliveries.transformations_achievements IS 'Descrição das transformações e conquistas do projeto.';

-- Prazo do projeto
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS due_date DATE;

COMMENT ON COLUMN public.deliveries.due_date IS 'Prazo final do projeto.';

-- Matriz de Stakeholder: array de { "name": "Nome", "activity": "Atividade" }
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS stakeholder_matrix JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.deliveries.stakeholder_matrix IS 'Matriz de stakeholder: responsáveis e atividades (nome digitado, sem vínculo com cadastro de pessoas).';

CREATE INDEX IF NOT EXISTS idx_deliveries_due_date ON public.deliveries(due_date);
