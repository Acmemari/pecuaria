/**
 * Health check endpoint for the agents pipeline.
 * GET /api/agents-health
 *
 * Verifies env vars, AI providers, DB tables, and webhook.
 * Does not require authentication.
 *
 * IMPORTANT: This file must NEVER crash. It reads process.env directly
 * (no imports from _lib/) so that missing env vars are reported as
 * failed checks instead of causing FUNCTION_INVOCATION_FAILED.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function trimOrNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const checks: Record<string, { ok: boolean; message?: string }> = {};
  let overallOk = true;

  try {
    // 1. Supabase env vars (read directly — no imports that could crash)
    const supabaseUrl = trimOrNull(process.env.SUPABASE_URL)
      ?? trimOrNull(process.env.VITE_SUPABASE_URL);
    const serviceRoleKey = trimOrNull(process.env.SUPABASE_SERVICE_ROLE_KEY);

    checks.supabase_url = {
      ok: !!supabaseUrl,
      message: supabaseUrl
        ? `ok (source: ${process.env.SUPABASE_URL ? 'SUPABASE_URL' : 'VITE_SUPABASE_URL'})`
        : 'SUPABASE_URL and VITE_SUPABASE_URL are both missing',
    };
    checks.supabase_service_role = {
      ok: !!serviceRoleKey,
      message: serviceRoleKey ? 'ok' : 'SUPABASE_SERVICE_ROLE_KEY is missing',
    };

    if (!checks.supabase_url.ok || !checks.supabase_service_role.ok) {
      overallOk = false;
    }

    // 2. AI provider keys
    const hasGemini = !!trimOrNull(process.env.GEMINI_API_KEY);
    const hasOpenai = !!trimOrNull(process.env.OPENAI_API_KEY);
    const hasAnthropic = !!trimOrNull(process.env.ANTHROPIC_API_KEY);
    const hasAnyProvider = hasGemini || hasOpenai || hasAnthropic;
    const providerCount = [hasGemini, hasOpenai, hasAnthropic].filter(Boolean).length;

    checks.ai_providers = {
      ok: hasAnyProvider,
      message: hasAnyProvider
        ? `ok (gemini:${hasGemini}, openai:${hasOpenai}, anthropic:${hasAnthropic})`
        : 'No AI provider key configured (GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY)',
    };
    if (!checks.ai_providers.ok) overallOk = false;

    // 3. Fallback coverage
    if (hasAnyProvider) {
      checks.ai_fallback = {
        ok: providerCount >= 2,
        message: providerCount >= 2
          ? `ok (${providerCount} providers available for fallback)`
          : `warn: only 1 provider, no fallback if it fails`,
      };
    }

    // 4. n8n webhook
    const webhookUrl = trimOrNull(process.env.N8N_WEBHOOK_URL)
      ?? trimOrNull(process.env.WEBHOOK_URL);
    checks.n8n_webhook = {
      ok: !!webhookUrl,
      message: webhookUrl ? 'ok' : 'N8N_WEBHOOK_URL not configured (chat will not work)',
    };

    // 5. DB tables (only if Supabase is configured)
    if (supabaseUrl && serviceRoleKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const client = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await client
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
        checks.plan_limits = { ok: false, message: `Failed: ${msg}` };
        overallOk = false;
      }
    } else {
      checks.plan_limits = { ok: false, message: 'Skipped (Supabase not configured)' };
      overallOk = false;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.unexpected_error = { ok: false, message: msg };
    overallOk = false;
  }

  return res.status(overallOk ? 200 : 503).json({
    status: overallOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
}
