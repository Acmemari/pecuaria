-- Seed feedback agent into agent_registry for FK compliance with agent_runs
INSERT INTO public.agent_registry (
  id,
  version,
  name,
  description,
  input_schema,
  output_schema,
  default_provider,
  default_model,
  estimated_tokens_per_call,
  status
)
VALUES (
  'feedback',
  '1.0.0',
  'Assistente de Feedback',
  'Gera, reescreve e adapta feedbacks construtivos com modelos profissionais.',
  '{
    "type": "object",
    "required": ["context", "feedbackType", "objective", "recipient", "tone", "format", "model", "lengthPreference"],
    "properties": {
      "context": {"type": "string", "enum": ["desempenho", "comportamento", "pessoal"]},
      "feedbackType": {"type": "string", "enum": ["positivo", "construtivo", "misto"]},
      "objective": {"type": "string", "minLength": 5},
      "recipient": {"type": "string", "minLength": 2},
      "tone": {"type": "string", "enum": ["formal", "direto", "motivador", "tecnico", "informal"]},
      "format": {"type": "string", "enum": ["escrito", "falado"]},
      "model": {"type": "string", "enum": ["sbi", "sanduiche", "feedforward", "auto"]},
      "lengthPreference": {"type": "string", "enum": ["curto", "medio", "longo"]}
    }
  }'::jsonb,
  '{
    "type": "object",
    "required": ["feedback", "structure", "tips"],
    "properties": {
      "feedback": {"type": "string", "minLength": 10},
      "structure": {"type": "string", "enum": ["SBI", "Sanduíche", "Feedforward"]},
      "tips": {"type": "array", "items": {"type": "string"}, "maxItems": 6}
    }
  }'::jsonb,
  'gemini',
  'gemini-2.5-flash',
  1500,
  'active'
)
ON CONFLICT (id, version) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  default_provider = EXCLUDED.default_provider,
  default_model = EXCLUDED.default_model,
  estimated_tokens_per_call = EXCLUDED.estimated_tokens_per_call,
  status = EXCLUDED.status,
  updated_at = NOW();
