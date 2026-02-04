-- Migration: Create questionnaire_questions table
-- Stores questions for the Gente/Gestão/Produção questionnaire (admin-managed, used in QuestionnaireFiller)

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

-- Index for listing by category and order
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_category ON questionnaire_questions(category);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_perg_number ON questionnaire_questions(perg_number);

-- RLS
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (for the questionnaire)
CREATE POLICY "Authenticated users can read questionnaire questions"
  ON questionnaire_questions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert, update, delete
CREATE POLICY "Admins can insert questionnaire questions"
  ON questionnaire_questions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update questionnaire questions"
  ON questionnaire_questions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete questionnaire questions"
  ON questionnaire_questions FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE questionnaire_questions IS 'Perguntas do questionário Gente/Gestão/Produção. applicable_types: Ciclo Completo, Cria, Recria-Engorda.';
