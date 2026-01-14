-- Migration: Create analyst_farms table
-- This migration creates a direct relationship between analysts and farms

-- Table: analyst_farms (relação muitos-para-muitos entre analistas e fazendas)
CREATE TABLE IF NOT EXISTS analyst_farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id TEXT NOT NULL, -- Referência ao ID da fazenda (pode ser do localStorage ou futura tabela)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(analyst_id, farm_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyst_farms_analyst_id ON analyst_farms(analyst_id);
CREATE INDEX IF NOT EXISTS idx_analyst_farms_farm_id ON analyst_farms(farm_id);

-- RLS Policies
ALTER TABLE analyst_farms ENABLE ROW LEVEL SECURITY;

-- Policies for analyst_farms table
CREATE POLICY "Analysts and admins can view analyst farms"
  ON analyst_farms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

CREATE POLICY "Analysts can manage their own farms"
  ON analyst_farms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
    AND (
      analyst_id = auth.uid() -- Analista só pode gerenciar suas próprias fazendas
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
      ) -- Admins podem gerenciar todas
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
    AND (
      analyst_id = auth.uid() -- Analista só pode gerenciar suas próprias fazendas
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
      ) -- Admins podem gerenciar todas
    )
  );
