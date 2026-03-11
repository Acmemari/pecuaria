-- Migration: Robustness for Work Program
-- Adds ON DELETE CASCADE to ensure referential integrity and cleans up any orphaned records.

BEGIN;

-- 1) Fix deliveries -> projects constraint to CASCADE
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_project_id_fkey;
ALTER TABLE public.deliveries 
  ADD CONSTRAINT deliveries_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 2) Fix initiatives -> deliveries constraint to CASCADE
ALTER TABLE public.initiatives DROP CONSTRAINT IF EXISTS initiatives_delivery_id_fkey;
ALTER TABLE public.initiatives 
  ADD CONSTRAINT initiatives_delivery_id_fkey 
  FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE CASCADE;

-- (The milestones -> initiatives and tasks -> milestones are already CASCADE according to previous migrations)
-- e.g. initiative_tasks -> milestones (ON DELETE CASCADE)
--      initiative_milestones -> initiatives (ON DELETE CASCADE)
--      initiative_team -> initiatives (ON DELETE CASCADE)

COMMIT;
