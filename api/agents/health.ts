/**
 * Health check endpoint for the agents pipeline.
 * GET /api/agents/health
 *
 * Verifies env vars, AI providers, DB tables, and webhook
 * required for all AI-powered endpoints.
 * Does not require authentication.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerEnv, getAvailableProviders } from '../_lib/env';

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const checks: Record<string, { ok: boolean; message?: string }> = {};
  let overallOk = true;

  // 1. Core env vars (Supabase)
  let envLoaded = false;
  try {
    const env = getServerEnv();
    envLoaded = true;

    checks.supabase_url = {
      ok: true,
      message: `ok (source: ${process.env.SUPABASE_URL ? 'SUPABASE_URL' : 'VITE_SUPABASE_URL'})`,
    };
    checks.supabase_service_role = { ok: true, message: 'ok' };

    // 5. n8n webhook (for /api/ask-assistant)
    checks.n8n_webhook = {
      ok: !!env.N8N_WEBHOOK_URL,
      message: env.N8N_WEBHOOK_URL ? 'ok' : 'N8N_WEBHOOK_URL not configured (chat will not work)',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.server_env = { ok: false, message: msg };
    overallOk = false;
  }

  // 2. AI provider keys
  const available = envLoaded ? getAvailableProviders() : [];
  const hasGemini = available.includes('gemini');
  const hasOpenai = available.includes('openai');
  const hasAnthropic = available.includes('anthropic');
  const hasAnyProvider = available.length > 0;

  checks.ai_providers = {
    ok: hasAnyProvider,
    message: hasAnyProvider
      ? `ok (gemini:${hasGemini}, openai:${hasOpenai}, anthropic:${hasAnthropic})`
      : 'No AI provider key configured (GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY)',
  };
  if (!checks.ai_providers.ok) overallOk = false;

  // 3. Fallback coverage
  if (hasAnyProvider) {
    const fallbackCount = available.length;
    checks.ai_fallback = {
      ok: fallbackCount >= 2,
      message: fallbackCount >= 2
        ? `ok (${fallbackCount} providers available for fallback)`
        : `warn: only 1 provider (${available[0]}), no fallback if it fails`,
    };
  }

  // 4. DB tables (only if Supabase is configured)
  if (envLoaded) {
    try {
      const { supabaseAdmin } = await import('../_lib/supabaseAdmin');
      const { data, error } = await supabaseAdmin
        .from('plan_limits')
        .select('plan_id')
        .limit(1);

      checks.plan_limits = {
        ok: !error && Array.isArray(data) && data.length > 0,
        message: error ? `DB error: ${error.message}` : 'ok',
      };
      if (!checks.plan_limits.ok) overallOk = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.plan_limits = {
        ok: false,
        message: `Failed to query plan_limits: ${msg}`,
      };
      overallOk = false;
    }
  } else {
    checks.plan_limits = { ok: false, message: 'Skipped (Supabase not configured)' };
    overallOk = false;
  }

  return res.status(overallOk ? 200 : 503).json({
    status: overallOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
}
