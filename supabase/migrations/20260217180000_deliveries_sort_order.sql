-- Add sort_order column for manual ordering of deliveries within a project
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_deliveries_sort_order ON public.deliveries(sort_order);
