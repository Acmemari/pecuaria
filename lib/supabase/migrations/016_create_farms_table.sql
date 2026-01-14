-- Migration: Create farms table
-- This migration creates a table to store farm data in the database

CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Dimensões (em hectares)
  total_area NUMERIC,
  pasture_area NUMERIC,
  agriculture_area NUMERIC,
  other_crops NUMERIC,
  infrastructure NUMERIC,
  reserve_and_app NUMERIC,
  property_value NUMERIC,
  
  -- Valores de operação
  operation_pecuary NUMERIC,
  operation_agricultural NUMERIC,
  other_operations NUMERIC,
  agriculture_variation NUMERIC DEFAULT 0,
  
  -- Dados da propriedade
  property_type TEXT NOT NULL DEFAULT 'Própria' CHECK (property_type IN ('Própria', 'Arrendada')),
  weight_metric TEXT NOT NULL DEFAULT 'Arroba (@)' CHECK (weight_metric IN ('Arroba (@)', 'Quilograma (Kg)')),
  
  -- Dados do rebanho
  average_herd NUMERIC,
  herd_value NUMERIC,
  commercializes_genetics BOOLEAN DEFAULT false,
  production_system TEXT CHECK (production_system IN ('Cria', 'Recria-Engorda', 'Ciclo Completo')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_farms_client_id ON farms(client_id);
CREATE INDEX IF NOT EXISTS idx_farms_name ON farms(name);
CREATE INDEX IF NOT EXISTS idx_farms_city ON farms(city);
CREATE INDEX IF NOT EXISTS idx_farms_state ON farms(state);

-- RLS Policies
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view farms linked to their clients or their own farms
CREATE POLICY "Users can view farms linked to their clients"
  ON farms FOR SELECT
  USING (
    -- Admin can see all farms
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR
    -- Analista can see farms linked to their clients
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = farms.client_id
      AND clients.analyst_id = auth.uid()
    )
    OR
    -- Users can see farms linked to analyst_farms
    EXISTS (
      SELECT 1 FROM analyst_farms
      WHERE analyst_farms.farm_id = farms.id
      AND analyst_farms.analyst_id = auth.uid()
    )
  );

-- Policy: Analysts can insert farms
CREATE POLICY "Analysts can insert farms"
  ON farms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

-- Policy: Analysts can update farms linked to their clients
CREATE POLICY "Analysts can update farms"
  ON farms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = farms.client_id
      AND clients.analyst_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM analyst_farms
      WHERE analyst_farms.farm_id = farms.id
      AND analyst_farms.analyst_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = farms.client_id
      AND clients.analyst_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM analyst_farms
      WHERE analyst_farms.farm_id = farms.id
      AND analyst_farms.analyst_id = auth.uid()
    )
  );

-- Policy: Analysts can delete farms linked to their clients
CREATE POLICY "Analysts can delete farms"
  ON farms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = farms.client_id
      AND clients.analyst_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM analyst_farms
      WHERE analyst_farms.farm_id = farms.id
      AND analyst_farms.analyst_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_farms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER farms_updated_at
  BEFORE UPDATE ON farms
  FOR EACH ROW
  EXECUTE FUNCTION update_farms_updated_at();

COMMENT ON TABLE farms IS 'Tabela para armazenar dados das fazendas cadastradas no sistema';
COMMENT ON COLUMN farms.name IS 'Nome da fazenda';
COMMENT ON COLUMN farms.id IS 'ID único da fazenda (pode ser do formato farm-{timestamp}-{random})';
