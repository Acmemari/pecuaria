-- Add percent weight column to initiatives (Macro Atividades)
-- Represents how much this activity contributes to the delivery progress (0-100%)
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS percent integer NOT NULL DEFAULT 0
  CONSTRAINT initiatives_percent_check CHECK (percent >= 0 AND percent <= 100);

COMMENT ON COLUMN public.initiatives.percent IS
  'Peso da macro atividade na entrega (0-100%). Progress = tarefas concluídas / total tarefas × percent.';
