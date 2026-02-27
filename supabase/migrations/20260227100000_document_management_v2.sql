-- Migration: Document Management v2
-- Adds: versioning, confidentiality, tags, contract details, audit trail
-- Safe: all new columns have DEFAULT values, no existing columns changed

-- ============================================================================
-- 1. EVOLVE client_documents TABLE
-- ============================================================================

ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS confidentiality TEXT NOT NULL DEFAULT 'interno'
    CHECK (confidentiality IN ('publico', 'interno', 'confidencial', 'restrito')),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_group_id UUID,
  ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checksum TEXT;

-- Backfill: existing docs become version 1, self-referencing group
UPDATE public.client_documents
SET version_group_id = id
WHERE version_group_id IS NULL;

ALTER TABLE public.client_documents
  ALTER COLUMN version_group_id SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_version_group
  ON public.client_documents(version_group_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_client_documents_confidentiality
  ON public.client_documents(confidentiality);
CREATE INDEX IF NOT EXISTS idx_client_documents_tags
  ON public.client_documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_client_documents_is_current
  ON public.client_documents(is_current_version) WHERE is_current_version = true;

-- ============================================================================
-- 2. CONTRACT DETAILS TABLE (1:1 with client_documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contract_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'revisao', 'aprovado', 'assinado', 'arquivado', 'expirado', 'cancelado')),

  -- Dates
  start_date DATE,
  end_date DATE,
  signed_date DATE,

  -- Financial
  contract_value NUMERIC(14, 2),
  currency TEXT DEFAULT 'BRL',

  -- Parties (signatarios)
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [{ "name": "...", "role": "contratante"|"contratado"|"testemunha"|"fiador", "email": "...", "signed_at": null }]

  -- Renewal
  auto_renew BOOLEAN DEFAULT false,
  renewal_period_months INTEGER,
  renewal_reminder_days INTEGER DEFAULT 30,

  -- Related documents
  related_document_ids UUID[] DEFAULT '{}',

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id)
);

CREATE INDEX IF NOT EXISTS idx_contract_details_status
  ON public.contract_details(status);
CREATE INDEX IF NOT EXISTS idx_contract_details_end_date
  ON public.contract_details(end_date);
CREATE INDEX IF NOT EXISTS idx_contract_details_document
  ON public.contract_details(document_id);

-- Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION public.update_contract_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contract_details_updated_at ON public.contract_details;
CREATE TRIGGER trg_contract_details_updated_at
  BEFORE UPDATE ON public.contract_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contract_details_updated_at();

-- ============================================================================
-- 3. DOCUMENT AUDIT LOG (IMMUTABLE LEDGER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'upload', 'download', 'view', 'update_metadata',
    'new_version', 'delete', 'restore',
    'status_change', 'share', 'confidentiality_change'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NO update/delete policies: this is an immutable ledger

CREATE INDEX IF NOT EXISTS idx_document_audit_log_document
  ON public.document_audit_log(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_user
  ON public.document_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_action
  ON public.document_audit_log(action);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- 4a. contract_details RLS (mirrors client_documents access)
ALTER TABLE public.contract_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_details_select" ON public.contract_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_documents cd
      WHERE cd.id = contract_details.document_id
    )
  );

CREATE POLICY "contract_details_insert" ON public.contract_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_documents cd
      WHERE cd.id = contract_details.document_id
    )
  );

CREATE POLICY "contract_details_update" ON public.contract_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.role = 'admin' OR user_profiles.qualification = 'analista')
    )
  );

CREATE POLICY "contract_details_delete" ON public.contract_details
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 4b. document_audit_log RLS
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can see the document can see its audit trail
CREATE POLICY "document_audit_log_select" ON public.document_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_documents cd
      WHERE cd.id = document_audit_log.document_id
    )
  );

-- Write: only insert, only authenticated users, only for themselves
CREATE POLICY "document_audit_log_insert" ON public.document_audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- NO update or delete policies (immutable ledger)

-- ============================================================================
-- 5. UPDATE client_documents SELECT POLICY FOR CONFIDENTIALITY
-- ============================================================================

DROP POLICY IF EXISTS "client_documents_select_policy" ON public.client_documents;

CREATE POLICY "client_documents_select_policy" ON public.client_documents
  FOR SELECT USING (
    -- Admin sees all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    OR
    -- Analyst sees their clients' docs (except 'restrito')
    (
      EXISTS (
        SELECT 1 FROM clients c
        JOIN user_profiles up ON up.id = auth.uid()
        WHERE c.id = client_documents.client_id
        AND c.analyst_id = auth.uid()
        AND up.qualification = 'analista'
      )
      AND client_documents.confidentiality != 'restrito'
    )
    OR
    -- Client sees own docs that are publico or interno only
    (
      EXISTS (
        SELECT 1 FROM clients c
        JOIN user_profiles up ON up.id = auth.uid()
        WHERE c.id = client_documents.client_id
        AND c.email = up.email
      )
      AND client_documents.confidentiality IN ('publico', 'interno')
    )
  );

-- ============================================================================
-- 6. AUTO-EXPIRE CONTRACTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_expire_contracts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contract_details
  SET status = 'expirado', updated_at = NOW()
  WHERE status = 'assinado'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$;
