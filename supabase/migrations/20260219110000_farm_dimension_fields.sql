-- Migration: Novos campos de dimensões da fazenda
-- Adiciona volumoso, agricultura própria/arrendada e outros

ALTER TABLE IF EXISTS public.farms
  ADD COLUMN IF NOT EXISTS forage_production_area NUMERIC,
  ADD COLUMN IF NOT EXISTS agriculture_area_owned NUMERIC,
  ADD COLUMN IF NOT EXISTS agriculture_area_leased NUMERIC,
  ADD COLUMN IF NOT EXISTS other_area NUMERIC;

-- Migração de dados legados:
-- o antigo agriculture_area passa a representar agricultura própria.
UPDATE public.farms
SET agriculture_area_owned = agriculture_area
WHERE agriculture_area IS NOT NULL
  AND agriculture_area_owned IS NULL;
