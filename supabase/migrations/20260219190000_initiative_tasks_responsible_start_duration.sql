ALTER TABLE public.initiative_tasks
  ADD COLUMN IF NOT EXISTS responsible_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS activity_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER;

ALTER TABLE public.initiative_tasks
  DROP CONSTRAINT IF EXISTS initiative_tasks_duration_days_non_negative;

ALTER TABLE public.initiative_tasks
  ADD CONSTRAINT initiative_tasks_duration_days_non_negative
  CHECK (duration_days IS NULL OR duration_days >= 0);

CREATE INDEX IF NOT EXISTS idx_initiative_tasks_responsible_person_id
  ON public.initiative_tasks(responsible_person_id);

CREATE INDEX IF NOT EXISTS idx_initiative_tasks_activity_date
  ON public.initiative_tasks(activity_date);
