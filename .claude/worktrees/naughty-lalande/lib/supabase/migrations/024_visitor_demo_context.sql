-- ============================================================
-- MIGRATION 024: Visitor Demo Context
-- Creates a fixed demo client for visitor access to farms/scenarios.
-- analyst_id uses the admin user (antonio@inttegra.com) as anchor.
-- ============================================================

-- 1. Insert the demo client with a fixed UUID
INSERT INTO clients (id, name, phone, email, analyst_id, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Visitante Demo',
  '',
  'visitante@sistema.interno',
  '0238f4f4-5967-429e-9dce-3f6cc03f5a80',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Visitors can SELECT the demo client (bypasses analyst_id check)
CREATE POLICY "Visitantes podem ver cliente demo"
  ON clients FOR SELECT
  USING (
    id = '00000000-0000-0000-0000-000000000002'::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND qualification = 'visitante'
    )
  );

-- 3. RLS: Visitors can SELECT farms of demo client
CREATE POLICY "Visitantes podem ver fazendas demo"
  ON farms FOR SELECT
  USING (
    client_id = '00000000-0000-0000-0000-000000000002'::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND qualification = 'visitante'
    )
  );

-- 4. RLS: Visitors can INSERT farms into demo client
CREATE POLICY "Visitantes podem criar fazendas demo"
  ON farms FOR INSERT
  WITH CHECK (
    client_id = '00000000-0000-0000-0000-000000000002'::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND qualification = 'visitante'
    )
  );

-- 5. RLS: Visitors can UPDATE demo farms
CREATE POLICY "Visitantes podem atualizar fazendas demo"
  ON farms FOR UPDATE
  USING (
    client_id = '00000000-0000-0000-0000-000000000002'::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND qualification = 'visitante'
    )
  )
  WITH CHECK (client_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- 6. RLS: Visitors can DELETE demo farms
CREATE POLICY "Visitantes podem excluir fazendas demo"
  ON farms FOR DELETE
  USING (
    client_id = '00000000-0000-0000-0000-000000000002'::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND qualification = 'visitante'
    )
  );
