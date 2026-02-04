# Criar tabelas do questionário (perguntas e salvos)

Se você vê o aviso **"Tabela de perguntas ainda não existe no banco"** na página de Questionários, ou se os questionários preenchidos não aparecem em Meus Salvos, crie as tabelas no Supabase.

## Forma recomendada: Supabase CLI (sem abrir o painel)

As migrações estão em `supabase/migrations/`. Basta vincular o projeto uma vez e depois aplicar as migrações pelo terminal.

### Primeira vez (vincular o projeto)

No terminal, na pasta do projeto:

```bash
npm run db:link
```

Quando pedir, informe:
- **Project ref**: o ID do projeto no Supabase (em Dashboard → Project Settings → General)
- **Database password**: a senha do banco que você definiu ao criar o projeto

### Aplicar as migrações (criar/atualizar tabelas)

Sempre que quiser aplicar as migrações pendentes (criar ou atualizar tabelas):

```bash
npm run db:push
```

Isso aplica as migrações em `supabase/migrations/`, criando por exemplo:
- `questionnaire_questions` (e a função `is_admin()` se precisar)
- `saved_questionnaires`

Não é necessário abrir o Supabase no navegador.

---

## Forma manual (SQL no painel)

Se preferir ou se o CLI não estiver disponível:

1. Acesse o **Supabase** do seu projeto: https://supabase.com/dashboard
2. No menu lateral, clique em **SQL Editor** → **New query**
3. Abra o arquivo **`lib/supabase/run_questionnaire_table.sql`** do projeto e copie **todo** o conteúdo
4. Cole no editor do Supabase e clique em **Run** (ou Ctrl+Enter)
5. Para a tabela de questionários salvos, repita com o conteúdo de **`lib/supabase/run_saved_questionnaires.sql`**

O script do questionário cria a função `is_admin()` (se ainda não existir) e a tabela `questionnaire_questions` com as políticas RLS. Basta executar uma vez.

## SQL de referência (se executar manualmente)

```sql
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
```

## Se der erro "function public.is_admin() does not exist"

Isso indica que a migration **011** (que cria a função `is_admin`) ainda não foi executada. Nesse caso:

1. No SQL Editor do Supabase, execute primeiro o conteúdo do arquivo `lib/supabase/migrations/011_fix_admin_update_policy_recursion.sql` do projeto (cria a função `is_admin()`).
2. Depois execute o SQL da migration 017 acima.

## Depois de executar

- Recarregue a página de **Configurações** → **Questionários**.
- O aviso deve sumir e a lista de perguntas deve carregar (vazia até você importar um CSV ou adicionar perguntas manualmente).
