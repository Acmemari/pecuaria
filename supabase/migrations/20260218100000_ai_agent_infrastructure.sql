-- AI Agent Infrastructure
-- Base tables for provider abstraction, token wallet, rate limits, and execution audit
-- Reuses existing: organizations(id), user_profiles(id, organization_id, role, plan)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Plan limits (token/cost/rate budgets by plan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan_id TEXT PRIMARY KEY CHECK (plan_id IN ('basic', 'pro', 'enterprise')),
  monthly_token_limit BIGINT NOT NULL CHECK (monthly_token_limit >= 0),
  monthly_cost_limit_usd NUMERIC(12, 6) NOT NULL CHECK (monthly_cost_limit_usd >= 0),
  max_requests_per_minute_org INTEGER NOT NULL CHECK (max_requests_per_minute_org >= 1),
  max_requests_per_minute_user INTEGER NOT NULL CHECK (max_requests_per_minute_user >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed defaults (upsert)
INSERT INTO public.plan_limits (
  plan_id,
  monthly_token_limit,
  monthly_cost_limit_usd,
  max_requests_per_minute_org,
  max_requests_per_minute_user
)
VALUES
  ('basic', 50000, 1.000000, 30, 10),
  ('pro', 500000, 10.000000, 120, 60),
  ('enterprise', 5000000, 100.000000, 500, 240)
ON CONFLICT (plan_id) DO UPDATE
SET
  monthly_token_limit = EXCLUDED.monthly_token_limit,
  monthly_cost_limit_usd = EXCLUDED.monthly_cost_limit_usd,
  max_requests_per_minute_org = EXCLUDED.max_requests_per_minute_org,
  max_requests_per_minute_user = EXCLUDED.max_requests_per_minute_user,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 2) Current period budget bucket by org
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  tokens_used BIGINT NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  tokens_reserved BIGINT NOT NULL DEFAULT 0 CHECK (tokens_reserved >= 0),
  cost_used_usd NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (cost_used_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, period)
);

CREATE INDEX IF NOT EXISTS idx_token_budgets_org_period ON public.token_budgets(org_id, period);

-- ---------------------------------------------------------------------------
-- 3) Immutable wallet ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_run_id UUID NULL,
  action TEXT NOT NULL CHECK (action IN ('reserve', 'commit', 'release')),
  tokens BIGINT NOT NULL CHECK (tokens >= 0),
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_ledger_org_created_at ON public.token_ledger(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_ledger_user_created_at ON public.token_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_ledger_action ON public.token_ledger(action);

-- ---------------------------------------------------------------------------
-- 4) Agent registry (catalog/version metadata)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_registry (
  id TEXT NOT NULL,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_provider TEXT NOT NULL CHECK (default_provider IN ('gemini', 'openai', 'anthropic')),
  default_model TEXT NOT NULL,
  estimated_tokens_per_call INTEGER NOT NULL DEFAULT 0 CHECK (estimated_tokens_per_call >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_registry_status ON public.agent_registry(status);

-- Seed dummy Hello agent row (upsert)
INSERT INTO public.agent_registry (
  id,
  version,
  name,
  description,
  input_schema,
  output_schema,
  default_provider,
  default_model,
  estimated_tokens_per_call,
  status
)
VALUES (
  'hello',
  '1.0.0',
  'Hello Agent',
  'Dummy agent for end-to-end pipeline validation.',
  '{"type":"object","required":["name"],"properties":{"name":{"type":"string","minLength":1}}}'::jsonb,
  '{"type":"object","required":["greeting","timestamp"],"properties":{"greeting":{"type":"string"},"timestamp":{"type":"string"}}}'::jsonb,
  'gemini',
  'gemini-2.5-flash',
  100,
  'active'
)
ON CONFLICT (id, version) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  default_provider = EXCLUDED.default_provider,
  default_model = EXCLUDED.default_model,
  estimated_tokens_per_call = EXCLUDED.estimated_tokens_per_call,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 5) Agent execution audit runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai', 'anthropic')),
  model TEXT NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens BIGINT NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_agent_runs_registry
    FOREIGN KEY (agent_id, agent_version)
    REFERENCES public.agent_registry(id, version)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_org_created_at ON public.agent_runs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_created_at ON public.agent_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON public.agent_runs(agent_id, agent_version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);

-- Add FK from token_ledger to agent_runs after table exists
ALTER TABLE public.token_ledger
  DROP CONSTRAINT IF EXISTS fk_token_ledger_agent_run;
ALTER TABLE public.token_ledger
  ADD CONSTRAINT fk_token_ledger_agent_run
  FOREIGN KEY (agent_run_id)
  REFERENCES public.agent_runs(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 6) Rate limit counters (rolling minute buckets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL, -- e.g. org:{org_id} or user:{user_id}
  window_start TIMESTAMPTZ NOT NULL, -- truncated to minute UTC
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON public.rate_limits(key, window_start DESC);

-- ---------------------------------------------------------------------------
-- Utility trigger function for updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_limits_updated_at ON public.plan_limits;
CREATE TRIGGER trg_plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_token_budgets_updated_at ON public.token_budgets;
CREATE TRIGGER trg_token_budgets_updated_at
  BEFORE UPDATE ON public.token_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_agent_registry_updated_at ON public.agent_registry;
CREATE TRIGGER trg_agent_registry_updated_at
  BEFORE UPDATE ON public.agent_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_rate_limits_updated_at ON public.rate_limits;
CREATE TRIGGER trg_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- plan_limits: authenticated read-only
DROP POLICY IF EXISTS "Authenticated users can read plan limits" ON public.plan_limits;
CREATE POLICY "Authenticated users can read plan limits"
  ON public.plan_limits
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- token_budgets: users in same org can read; admins can read all
DROP POLICY IF EXISTS "Users can read token budgets for their org" ON public.token_budgets;
CREATE POLICY "Users can read token budgets for their org"
  ON public.token_budgets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.organization_id = token_budgets.org_id
          OR up.role = 'admin'
        )
    )
  );

-- token_ledger: users in same org can read; writes only via service role
DROP POLICY IF EXISTS "Users can read token ledger for their org" ON public.token_ledger;
CREATE POLICY "Users can read token ledger for their org"
  ON public.token_ledger
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.organization_id = token_ledger.org_id
          OR up.role = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "Service role can manage token ledger" ON public.token_ledger;
CREATE POLICY "Service role can manage token ledger"
  ON public.token_ledger
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- agent_registry: authenticated read-only; service role full
DROP POLICY IF EXISTS "Authenticated users can read agent registry" ON public.agent_registry;
CREATE POLICY "Authenticated users can read agent registry"
  ON public.agent_registry
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can manage agent registry" ON public.agent_registry;
CREATE POLICY "Service role can manage agent registry"
  ON public.agent_registry
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- agent_runs: users in same org can read; service role writes
DROP POLICY IF EXISTS "Users can read agent runs for their org" ON public.agent_runs;
CREATE POLICY "Users can read agent runs for their org"
  ON public.agent_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.organization_id = agent_runs.org_id
          OR up.role = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "Service role can manage agent runs" ON public.agent_runs;
CREATE POLICY "Service role can manage agent runs"
  ON public.agent_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- token_budgets: service role manages counters
DROP POLICY IF EXISTS "Service role can manage token budgets" ON public.token_budgets;
CREATE POLICY "Service role can manage token budgets"
  ON public.token_budgets
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- rate_limits: service-role only
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
