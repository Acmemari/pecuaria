/**
 * Diagnostic endpoint to identify which _lib/ import causes FUNCTION_INVOCATION_FAILED.
 * GET /api/diag
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const results: Record<string, string> = {};

    // Test 1: env
    try {
        const { getServerEnv } = await import('./_lib/env');
        getServerEnv();
        results.env = 'ok';
    } catch (e) {
        results.env = String((e as Error).message);
    }

    // Test 2: supabaseAdmin
    try {
        const { getSupabaseAdmin } = await import('./_lib/supabaseAdmin');
        getSupabaseAdmin();
        results.supabaseAdmin = 'ok';
    } catch (e) {
        results.supabaseAdmin = String((e as Error).message);
    }

    // Test 3: gemini provider
    try {
        const { GeminiProvider } = await import('./_lib/ai/providers/gemini');
        const p = new GeminiProvider();
        results.gemini = p.name + ' ok';
    } catch (e) {
        results.gemini = String((e as Error).message);
    }

    // Test 4: openai provider
    try {
        const { OpenAIProvider } = await import('./_lib/ai/providers/openai');
        const p = new OpenAIProvider();
        results.openai = p.name + ' ok';
    } catch (e) {
        results.openai = String((e as Error).message);
    }

    // Test 5: anthropic provider
    try {
        const { AnthropicProvider } = await import('./_lib/ai/providers/anthropic');
        const p = new AnthropicProvider();
        results.anthropic = p.name + ' ok';
    } catch (e) {
        results.anthropic = String((e as Error).message);
    }

    // Test 6: providers/index
    try {
        await import('./_lib/ai/providers/index');
        results.providersIndex = 'ok';
    } catch (e) {
        results.providersIndex = String((e as Error).message);
    }

    // Test 7: zod
    try {
        const { z } = await import('zod');
        z.string();
        results.zod = 'ok';
    } catch (e) {
        results.zod = String((e as Error).message);
    }

    // Test 8: rate-limit
    try {
        await import('./_lib/ai/rate-limit');
        results.rateLimit = 'ok';
    } catch (e) {
        results.rateLimit = String((e as Error).message);
    }

    return res.status(200).json({ ok: true, results });
}
