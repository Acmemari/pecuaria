ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_projects_sort_order
ON public.projects(sort_order);

WITH ranked_projects AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY created_by ORDER BY created_at, id) - 1 AS next_sort_order
  FROM public.projects
)
UPDATE public.projects p
SET sort_order = r.next_sort_order
FROM ranked_projects r
WHERE p.id = r.id
  AND p.sort_order = 0;
