-- Migration: Add client_id and farm_id to cattle_scenarios
-- This enables filtering scenarios by client and farm for better organization

-- Add columns to cattle_scenarios (farm_id is TEXT to match farms.id type)
ALTER TABLE cattle_scenarios 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS farm_id TEXT,
ADD COLUMN IF NOT EXISTS farm_name TEXT;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_client_id ON cattle_scenarios(client_id);
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_farm_id ON cattle_scenarios(farm_id);

-- Add client_id to saved_questionnaires if not exists
ALTER TABLE saved_questionnaires 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Create index for client filtering in questionnaires
CREATE INDEX IF NOT EXISTS idx_saved_questionnaires_client_id ON saved_questionnaires(client_id);
CREATE INDEX IF NOT EXISTS idx_saved_questionnaires_farm_id ON saved_questionnaires(farm_id);

-- Update RLS policies for cattle_scenarios to allow analysts to view client scenarios
-- Drop existing select policies that might conflict
DROP POLICY IF EXISTS "Analysts can view client scenarios" ON cattle_scenarios;

-- Analysts can view scenarios of their clients
CREATE POLICY "Analysts can view client scenarios"
  ON cattle_scenarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = cattle_scenarios.client_id
      AND c.analyst_id = auth.uid()
    )
  );

-- Drop existing insert policy for analysts if exists
DROP POLICY IF EXISTS "Analysts can insert client scenarios" ON cattle_scenarios;

-- Analysts can insert scenarios for their clients
CREATE POLICY "Analysts can insert client scenarios"
  ON cattle_scenarios FOR INSERT
  WITH CHECK (
    client_id IS NULL OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = cattle_scenarios.client_id
      AND c.analyst_id = auth.uid()
    )
  );

-- Drop existing update policy for analysts if exists
DROP POLICY IF EXISTS "Analysts can update client scenarios" ON cattle_scenarios;

-- Analysts can update scenarios of their clients
CREATE POLICY "Analysts can update client scenarios"
  ON cattle_scenarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = cattle_scenarios.client_id
      AND c.analyst_id = auth.uid()
    )
  );

-- Drop existing delete policy for analysts if exists
DROP POLICY IF EXISTS "Analysts can delete client scenarios" ON cattle_scenarios;

-- Analysts can delete scenarios of their clients
CREATE POLICY "Analysts can delete client scenarios"
  ON cattle_scenarios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = cattle_scenarios.client_id
      AND c.analyst_id = auth.uid()
    )
  );

-- Update RLS for saved_questionnaires to support client filtering
DROP POLICY IF EXISTS "Analysts can view client questionnaires" ON saved_questionnaires;

CREATE POLICY "Analysts can view client questionnaires"
  ON saved_questionnaires FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = saved_questionnaires.client_id
      AND c.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Analysts can insert client questionnaires" ON saved_questionnaires;

CREATE POLICY "Analysts can insert client questionnaires"
  ON saved_questionnaires FOR INSERT
  WITH CHECK (
    client_id IS NULL OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = saved_questionnaires.client_id
      AND c.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Analysts can update client questionnaires" ON saved_questionnaires;

CREATE POLICY "Analysts can update client questionnaires"
  ON saved_questionnaires FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = saved_questionnaires.client_id
      AND c.analyst_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Analysts can delete client questionnaires" ON saved_questionnaires;

CREATE POLICY "Analysts can delete client questionnaires"
  ON saved_questionnaires FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = saved_questionnaires.client_id
      AND c.analyst_id = auth.uid()
    )
  );

COMMENT ON COLUMN cattle_scenarios.client_id IS 'ID do cliente associado ao cenário';
COMMENT ON COLUMN cattle_scenarios.farm_id IS 'ID da fazenda associada ao cenário';
COMMENT ON COLUMN cattle_scenarios.farm_name IS 'Nome da fazenda (cache para exibição rápida)';
