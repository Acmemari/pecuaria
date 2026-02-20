-- Migração de contextos do feedback: trabalho -> desempenho, lideranca -> comportamento
-- Mantém compatibilidade com dados existentes
UPDATE public.saved_feedbacks SET context = 'desempenho' WHERE context = 'trabalho';
UPDATE public.saved_feedbacks SET context = 'comportamento' WHERE context = 'lideranca';

-- Atualiza agent_registry input_schema com os novos valores de context
UPDATE public.agent_registry
SET input_schema = jsonb_set(
  input_schema,
  '{properties,context,enum}',
  '["desempenho", "comportamento", "pessoal"]'::jsonb
)
WHERE id = 'feedback' AND version = '1.0.0';
