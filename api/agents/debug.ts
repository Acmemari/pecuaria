/**
 * Temporary debug endpoint to identify which import crashes run.ts
 * GET /api/agents/debug
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = {};

  try { await import('../_lib/env'); results['env'] = 'ok'; }
  catch (e) { results['env'] = (e as Error).message; }

  try { await import('../_lib/supabaseAdmin'); results['supabaseAdmin'] = 'ok'; }
  catch (e) { results['supabaseAdmin'] = (e as Error).message; }

  try { await import('../_lib/ai/types'); results['ai/types'] = 'ok'; }
  catch (e) { results['ai/types'] = (e as Error).message; }

  try { await import('../_lib/ai/providers'); results['ai/providers'] = 'ok'; }
  catch (e) { results['ai/providers'] = (e as Error).message; }

  try { await import('../_lib/ai/router'); results['ai/router'] = 'ok'; }
  catch (e) { results['ai/router'] = (e as Error).message; }

  try { await import('../_lib/ai/rate-limit'); results['ai/rate-limit'] = 'ok'; }
  catch (e) { results['ai/rate-limit'] = (e as Error).message; }

  try { await import('../_lib/ai/usage'); results['ai/usage'] = 'ok'; }
  catch (e) { results['ai/usage'] = (e as Error).message; }

  try { await import('../_lib/ai/logging'); results['ai/logging'] = 'ok'; }
  catch (e) { results['ai/logging'] = (e as Error).message; }

  try { await import('../_lib/agents/registry'); results['agents/registry'] = 'ok'; }
  catch (e) { results['agents/registry'] = (e as Error).message; }

  try { await import('../_lib/agents/hello/handler'); results['agents/hello'] = 'ok'; }
  catch (e) { results['agents/hello'] = (e as Error).message; }

  try { await import('../_lib/agents/feedback/handler'); results['agents/feedback'] = 'ok'; }
  catch (e) { results['agents/feedback'] = (e as Error).message; }

  try { await import('../_lib/ai/json-repair'); results['ai/json-repair'] = 'ok'; }
  catch (e) { results['ai/json-repair'] = (e as Error).message; }

  try { const { z } = await import('zod'); z.string(); results['zod'] = 'ok'; }
  catch (e) { results['zod'] = (e as Error).message; }

  const allOk = Object.values(results).every((v) => v === 'ok');
  return res.status(allOk ? 200 : 500).json({ allOk, imports: results });
}
