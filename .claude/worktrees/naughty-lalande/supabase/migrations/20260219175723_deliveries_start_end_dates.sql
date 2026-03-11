ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN public.deliveries.start_date IS 'Data inicial planejada da entrega.';
COMMENT ON COLUMN public.deliveries.end_date IS 'Data final planejada da entrega.';

UPDATE public.deliveries
SET end_date = due_date
WHERE end_date IS NULL
  AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_start_date ON public.deliveries(start_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_end_date ON public.deliveries(end_date);;
