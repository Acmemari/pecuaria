-- Migration: Create clients, client_farms, and client_analysts tables
-- This migration creates the structure for client management

-- Table: clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  analyst_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: client_farms (relação muitos-para-muitos entre clientes e fazendas)
CREATE TABLE IF NOT EXISTS client_farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  farm_id TEXT NOT NULL, -- Referência ao ID da fazenda (pode ser do localStorage ou futura tabela)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, farm_id)
);

-- Table: client_analysts (relação cliente-analista)
-- Esta tabela já está coberta pelo campo analyst_id em clients, mas mantemos para histórico
CREATE TABLE IF NOT EXISTS client_analysts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  analyst_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, analyst_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_analyst_id ON clients(analyst_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_client_farms_client_id ON client_farms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_farms_farm_id ON client_farms(farm_id);
CREATE INDEX IF NOT EXISTS idx_client_analysts_client_id ON client_analysts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_analysts_analyst_id ON client_analysts(analyst_id);

-- RLS Policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_analysts ENABLE ROW LEVEL SECURITY;

-- Policies for clients table
-- Analistas e admins podem ver todos os clientes
CREATE POLICY "Analysts and admins can view all clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

-- Analistas podem inserir clientes vinculados a si mesmos
CREATE POLICY "Analysts can insert clients for themselves"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.qualification = 'analista'
    )
    AND analyst_id = auth.uid() -- Analista só pode criar clientes vinculados a ele mesmo
  );

-- Admins podem inserir clientes para qualquer analista
CREATE POLICY "Admins can insert clients for any analyst"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Analistas e admins podem atualizar clientes
CREATE POLICY "Analysts and admins can update clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

-- Analistas e admins podem deletar clientes
CREATE POLICY "Analysts and admins can delete clients"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

-- Policies for client_farms table
CREATE POLICY "Analysts and admins can view client farms"
  ON client_farms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

CREATE POLICY "Analysts and admins can manage client farms"
  ON client_farms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

-- Policies for client_analysts table
CREATE POLICY "Analysts and admins can view client analysts"
  ON client_analysts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

CREATE POLICY "Analysts and admins can manage client analysts"
  ON client_analysts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();
