-- =============================================================================
-- NÃO COLE O NOME DO ARQUIVO NO SUPABASE.
-- Abra este arquivo, selecione TODO o conteúdo (Ctrl+A) e copie (Ctrl+C).
-- No Supabase → SQL Editor → New query → cole o que você copiou → Run.
-- =============================================================================

-- 1) Garantir que a função is_admin() existe (usada pelas políticas RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- 2) Criar tabela questionnaire_questions
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perg_number INTEGER,
  category TEXT NOT NULL CHECK (category IN ('Gente', 'Gestão', 'Produção')),
  "group" TEXT NOT NULL,
  question TEXT NOT NULL,
  positive_answer TEXT NOT NULL CHECK (positive_answer IN ('Sim', 'Não')),
  applicable_types TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_category ON questionnaire_questions(category);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_perg_number ON questionnaire_questions(perg_number);

ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (remover antes de recriar, para evitar conflito se já existirem)
DROP POLICY IF EXISTS "Authenticated users can read questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Admins can insert questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Admins can update questionnaire questions" ON questionnaire_questions;
DROP POLICY IF EXISTS "Admins can delete questionnaire questions" ON questionnaire_questions;

CREATE POLICY "Authenticated users can read questionnaire questions"
  ON questionnaire_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert questionnaire questions"
  ON questionnaire_questions FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update questionnaire questions"
  ON questionnaire_questions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete questionnaire questions"
  ON questionnaire_questions FOR DELETE TO authenticated USING (public.is_admin());

COMMENT ON TABLE questionnaire_questions IS 'Perguntas do questionário Gente/Gestão/Produção.';
