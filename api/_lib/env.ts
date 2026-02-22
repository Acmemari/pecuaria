/**
 * Centralized server-side environment configuration.
 *
 * Every API route should read env vars through this module so that:
 *  - validation happens once and errors are surfaced clearly;
 *  - both canonical names (SUPABASE_URL) and legacy names (VITE_SUPABASE_URL)
 *    are accepted;
 *  - AI provider availability is always known upfront.
 */

import type { AIProviderName } from './ai/types';

export interface ServerEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GEMINI_API_KEY: string | null;
  OPENAI_API_KEY: string | null;
  ANTHROPIC_API_KEY: string | null;
  N8N_WEBHOOK_URL: string | null;
}

let _cached: ServerEnv | null = null;

function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

/**
 * Loads and validates all required server-side environment variables.
 * Results are cached for the lifetime of the process / warm invocation.
 */
export function getServerEnv(): ServerEnv {
  if (_cached) return _cached;

  const supabaseUrl = trimOrNull(process.env.SUPABASE_URL)
    ?? trimOrNull(process.env.VITE_SUPABASE_URL);
  const serviceRoleKey = trimOrNull(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL (ou VITE_SUPABASE_URL)');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    const msg = `[ENV] Variáveis obrigatórias ausentes: ${missing.join(', ')}. ` +
      'Configure no painel do Vercel (Settings > Environment Variables) ou no .env.local.';
    console.error(msg);
    throw new Error(msg);
  }

  const gemini = trimOrNull(process.env.GEMINI_API_KEY);
  const openai = trimOrNull(process.env.OPENAI_API_KEY);
  const anthropic = trimOrNull(process.env.ANTHROPIC_API_KEY);

  if (!gemini && !openai && !anthropic) {
    console.warn(
      '[ENV] Nenhuma chave de IA configurada (GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY). ' +
      'Endpoints de IA retornarão erro.',
    );
  }

  _cached = {
    SUPABASE_URL: supabaseUrl!,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey!,
    GEMINI_API_KEY: gemini,
    OPENAI_API_KEY: openai,
    ANTHROPIC_API_KEY: anthropic,
    N8N_WEBHOOK_URL: trimOrNull(process.env.N8N_WEBHOOK_URL)
      ?? trimOrNull(process.env.WEBHOOK_URL),
  };

  return _cached;
}

/**
 * Returns the list of AI providers whose API keys are configured.
 * Does NOT require Supabase variables — safe to call from any endpoint.
 */
export function getAvailableProviders(): AIProviderName[] {
  const gemini = trimOrNull(process.env.GEMINI_API_KEY);
  const openai = trimOrNull(process.env.OPENAI_API_KEY);
  const anthropic = trimOrNull(process.env.ANTHROPIC_API_KEY);
  const providers: AIProviderName[] = [];
  if (gemini) providers.push('gemini');
  if (openai) providers.push('openai');
  if (anthropic) providers.push('anthropic');
  return providers;
}

/**
 * Returns the API key for a specific provider, or null if not configured.
 * Does NOT require Supabase variables — safe to call from any endpoint.
 */
export function getProviderKey(provider: AIProviderName): string | null {
  switch (provider) {
    case 'gemini': return trimOrNull(process.env.GEMINI_API_KEY);
    case 'openai': return trimOrNull(process.env.OPENAI_API_KEY);
    case 'anthropic': return trimOrNull(process.env.ANTHROPIC_API_KEY);
  }
}

/** Reset cache — only for tests. */
export function _resetEnvCache(): void {
  _cached = null;
}
