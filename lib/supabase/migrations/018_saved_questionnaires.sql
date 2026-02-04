-- Tabela para questionários preenchidos (Meus Salvos)
CREATE TABLE IF NOT EXISTS saved_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  farm_id TEXT,
  farm_name TEXT,
  production_system TEXT,
  questionnaire_id TEXT,
  answers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_questionnaires_user_id ON saved_questionnaires(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_questionnaires_created_at ON saved_questionnaires(created_at DESC);

ALTER TABLE saved_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved questionnaires"
  ON saved_questionnaires FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved questionnaires"
  ON saved_questionnaires FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved questionnaires"
  ON saved_questionnaires FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved questionnaires"
  ON saved_questionnaires FOR DELETE USING (auth.uid() = user_id);
