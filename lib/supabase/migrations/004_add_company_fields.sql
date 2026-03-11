-- Migration: Add company registration fields to organizations table
-- This migration adds comprehensive company information fields for proper registration

-- Add company registration fields if they don't exist
DO $$ 
BEGIN
  -- CNPJ (Brazilian company registration number)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE organizations ADD COLUMN cnpj TEXT;
    COMMENT ON COLUMN organizations.cnpj IS 'CNPJ (Brazilian company registration number)';
  END IF;

  -- Company email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'email'
  ) THEN
    ALTER TABLE organizations ADD COLUMN email TEXT;
    COMMENT ON COLUMN organizations.email IS 'Company contact email';
  END IF;

  -- Company phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'phone'
  ) THEN
    ALTER TABLE organizations ADD COLUMN phone TEXT;
    COMMENT ON COLUMN organizations.phone IS 'Company contact phone';
  END IF;

  -- Company address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'address'
  ) THEN
    ALTER TABLE organizations ADD COLUMN address TEXT;
    COMMENT ON COLUMN organizations.address IS 'Company full address';
  END IF;

  -- City
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'city'
  ) THEN
    ALTER TABLE organizations ADD COLUMN city TEXT;
    COMMENT ON COLUMN organizations.city IS 'Company city';
  END IF;

  -- State
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'state'
  ) THEN
    ALTER TABLE organizations ADD COLUMN state TEXT;
    COMMENT ON COLUMN organizations.state IS 'Company state (UF)';
  END IF;

  -- ZIP code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE organizations ADD COLUMN zip_code TEXT;
    COMMENT ON COLUMN organizations.zip_code IS 'Company ZIP code (CEP)';
  END IF;

  -- Company description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'description'
  ) THEN
    ALTER TABLE organizations ADD COLUMN description TEXT;
    COMMENT ON COLUMN organizations.description IS 'Company description or business activity';
  END IF;

  -- Status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));
    COMMENT ON COLUMN organizations.status IS 'Company status: active, inactive, or pending';
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizations_cnpj ON organizations(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

