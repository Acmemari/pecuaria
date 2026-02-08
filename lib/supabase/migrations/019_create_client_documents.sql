-- Migration: Criar tabela de documentos de clientes para mentoria
-- Permite upload de PDF, WORD, XLSX
-- Analistas e clientes podem fazer upload
-- Apenas analistas podem excluir

-- Criar bucket de storage para documentos (se não existir)
-- NOTA: Execute no dashboard do Supabase: Storage > New Bucket > "client-documents" (private)

-- Tabela de metadados dos documentos
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadados do arquivo
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'doc', 'xlsx', 'xls')),
  file_size INTEGER NOT NULL, -- em bytes
  storage_path TEXT NOT NULL, -- caminho no Supabase Storage
  
  -- Categorização
  category TEXT DEFAULT 'geral' CHECK (category IN ('geral', 'contrato', 'relatorio', 'financeiro', 'tecnico', 'outro')),
  description TEXT,
  
  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON client_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_client_documents_created_at ON client_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_documents_category ON client_documents(category);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_client_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_documents_updated_at ON client_documents;
CREATE TRIGGER trigger_update_client_documents_updated_at
  BEFORE UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_client_documents_updated_at();

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: 
-- - Admin vê todos
-- - Analista vê documentos de seus clientes
-- - Cliente vê apenas seus próprios documentos
CREATE POLICY "client_documents_select_policy" ON client_documents
  FOR SELECT USING (
    -- Admin vê tudo
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    OR
    -- Analista vê documentos de seus clientes
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = client_documents.client_id
      AND c.analyst_id = auth.uid()
      AND up.qualification = 'analista'
    )
    OR
    -- Cliente vê seus próprios documentos (via user_profiles.email, NÃO auth.users)
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = client_documents.client_id
      AND c.email = up.email
    )
  );

-- Política de INSERT:
-- - Admin pode inserir em qualquer cliente
-- - Analista pode inserir em seus clientes
-- - Cliente pode inserir em seu próprio registro
CREATE POLICY "client_documents_insert_policy" ON client_documents
  FOR INSERT WITH CHECK (
    -- Admin pode inserir em qualquer lugar
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    OR
    -- Analista pode inserir em seus clientes
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = client_documents.client_id
      AND c.analyst_id = auth.uid()
      AND up.qualification = 'analista'
    )
    OR
    -- Cliente pode inserir em seu próprio registro (via user_profiles.email, NÃO auth.users)
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = client_documents.client_id
      AND c.email = up.email
    )
  );

-- Política de DELETE:
-- APENAS Admin e Analistas podem excluir (clientes NÃO podem)
CREATE POLICY "client_documents_delete_policy" ON client_documents
  FOR DELETE USING (
    -- Admin pode excluir qualquer documento
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    OR
    -- Analista pode excluir documentos de seus clientes
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = client_documents.client_id
      AND c.analyst_id = auth.uid()
      AND up.qualification = 'analista'
    )
  );

-- Política de UPDATE (apenas metadados como description, category)
CREATE POLICY "client_documents_update_policy" ON client_documents
  FOR UPDATE USING (
    -- Admin pode atualizar qualquer documento
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    OR
    -- Analista pode atualizar documentos de seus clientes
    EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE c.id = client_documents.client_id
      AND c.analyst_id = auth.uid()
      AND up.qualification = 'analista'
    )
  );

-- ============================================================================
-- Storage Policies (executar separadamente no dashboard ou via SQL Editor)
-- ============================================================================
-- NOTA: Criar bucket "client-documents" como PRIVATE no dashboard do Supabase

-- Após criar o bucket, execute estas políticas:
/*
-- Política de SELECT para storage
CREATE POLICY "client_documents_storage_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM client_documents cd
      JOIN clients c ON c.id = cd.client_id
      WHERE cd.storage_path = name
      AND (c.analyst_id = auth.uid() OR c.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  )
);

-- Política de INSERT para storage
CREATE POLICY "client_documents_storage_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents'
  AND auth.uid() IS NOT NULL
);

-- Política de DELETE para storage (apenas admin e analistas)
CREATE POLICY "client_documents_storage_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents'
  AND (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND qualification = 'analista')
  )
);
*/
