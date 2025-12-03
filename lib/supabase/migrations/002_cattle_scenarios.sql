-- Migration: Create cattle_scenarios table
-- This table stores saved cattle calculator scenarios/simulations

CREATE TABLE IF NOT EXISTS cattle_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inputs JSONB NOT NULL, -- Stores CattleCalculatorInputs
  results JSONB, -- Stores CalculationResults (optional, for quick preview)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_user_id ON cattle_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_cattle_scenarios_created_at ON cattle_scenarios(created_at DESC);

-- RLS Policies
ALTER TABLE cattle_scenarios ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scenarios
CREATE POLICY "Users can view their own scenarios"
  ON cattle_scenarios FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scenarios
CREATE POLICY "Users can insert their own scenarios"
  ON cattle_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scenarios
CREATE POLICY "Users can update their own scenarios"
  ON cattle_scenarios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scenarios
CREATE POLICY "Users can delete their own scenarios"
  ON cattle_scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all scenarios
CREATE POLICY "Admins can view all scenarios"
  ON cattle_scenarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cattle_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_cattle_scenarios_updated_at
  BEFORE UPDATE ON cattle_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_cattle_scenarios_updated_at();

