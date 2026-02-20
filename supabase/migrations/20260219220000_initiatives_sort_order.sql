-- Adiciona sort_order a initiatives para reordenação no workbench
ALTER TABLE public.initiatives ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- RPC para carregar tarefas por initiative_id (across all milestones)
CREATE OR REPLACE FUNCTION public.get_tasks_by_initiative(p_initiative_id UUID)
RETURNS SETOF public.initiative_tasks
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.*
  FROM public.initiative_tasks t
  JOIN public.initiative_milestones m ON m.id = t.milestone_id
  WHERE m.initiative_id = p_initiative_id
  ORDER BY t.sort_order;
$$;
