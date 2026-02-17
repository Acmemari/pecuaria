-- Migration: project hierarchy with deliveries and tasks
-- Adds:
-- 1) deliveries (level 1)
-- 2) initiatives.delivery_id (level 2 -> level 1 link)
-- 3) initiative_tasks (level 4, linked to milestones)

-- Reusable updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_created_by ON public.deliveries(created_by);
CREATE INDEX IF NOT EXISTS idx_deliveries_name ON public.deliveries(name);

DROP TRIGGER IF EXISTS deliveries_set_updated_at ON public.deliveries;
CREATE TRIGGER deliveries_set_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deliveries select own or admin" ON public.deliveries;
CREATE POLICY "Deliveries select own or admin"
  ON public.deliveries FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Deliveries insert owner or admin" ON public.deliveries;
CREATE POLICY "Deliveries insert owner or admin"
  ON public.deliveries FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Deliveries update own or admin" ON public.deliveries;
CREATE POLICY "Deliveries update own or admin"
  ON public.deliveries FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Deliveries delete own or admin" ON public.deliveries;
CREATE POLICY "Deliveries delete own or admin"
  ON public.deliveries FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );

COMMENT ON TABLE public.deliveries IS 'Cadastro de entregas para vincular iniciativas.';

-- 2) Link initiatives -> deliveries (mandatory in app flow)
ALTER TABLE public.initiatives
  ADD COLUMN IF NOT EXISTS delivery_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'initiatives_delivery_id_fkey'
      AND conrelid = 'public.initiatives'::regclass
  ) THEN
    ALTER TABLE public.initiatives
      ADD CONSTRAINT initiatives_delivery_id_fkey
      FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_initiatives_delivery_id ON public.initiatives(delivery_id);

COMMENT ON COLUMN public.initiatives.delivery_id IS 'Entrega vinculada à iniciativa (nível obrigatório no fluxo da aplicação).';

-- 3) Initiative tasks table (level 4)
CREATE TABLE IF NOT EXISTS public.initiative_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.initiative_milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiative_tasks_milestone_id ON public.initiative_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_initiative_tasks_sort_order ON public.initiative_tasks(sort_order);
CREATE INDEX IF NOT EXISTS idx_initiative_tasks_completed ON public.initiative_tasks(completed);

DROP TRIGGER IF EXISTS initiative_tasks_set_updated_at ON public.initiative_tasks;
CREATE TRIGGER initiative_tasks_set_updated_at
  BEFORE UPDATE ON public.initiative_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

ALTER TABLE public.initiative_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks select initiative owner or admin" ON public.initiative_tasks;
CREATE POLICY "Tasks select initiative owner or admin"
  ON public.initiative_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.initiative_milestones im
      JOIN public.initiatives i ON i.id = im.initiative_id
      WHERE im.id = initiative_tasks.milestone_id
        AND (
          i.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Tasks insert initiative owner or admin" ON public.initiative_tasks;
CREATE POLICY "Tasks insert initiative owner or admin"
  ON public.initiative_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.initiative_milestones im
      JOIN public.initiatives i ON i.id = im.initiative_id
      WHERE im.id = initiative_tasks.milestone_id
        AND (
          i.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Tasks update initiative owner or admin" ON public.initiative_tasks;
CREATE POLICY "Tasks update initiative owner or admin"
  ON public.initiative_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.initiative_milestones im
      JOIN public.initiatives i ON i.id = im.initiative_id
      WHERE im.id = initiative_tasks.milestone_id
        AND (
          i.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.initiative_milestones im
      JOIN public.initiatives i ON i.id = im.initiative_id
      WHERE im.id = initiative_tasks.milestone_id
        AND (
          i.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Tasks delete initiative owner or admin" ON public.initiative_tasks;
CREATE POLICY "Tasks delete initiative owner or admin"
  ON public.initiative_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.initiative_milestones im
      JOIN public.initiatives i ON i.id = im.initiative_id
      WHERE im.id = initiative_tasks.milestone_id
        AND (
          i.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'admin'
          )
        )
    )
  );

COMMENT ON TABLE public.initiative_tasks IS 'Tarefas vinculadas aos marcos das iniciativas.';
