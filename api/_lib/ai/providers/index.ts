/**
 * AI Provider registry with lazy loading.
 *
 * Uses dynamic imports to avoid loading ALL provider SDKs at module load time.
 * This is required for Vercel serverless compatibility: static top-level imports
 * of heavy SDKs (openai, @anthropic-ai/sdk) cause FUNCTION_INVOCATION_FAILED
 * because Vercel's bundler may fail to resolve them in ESM context.
 */
import type { AIProvider, AIProviderName, AIRequest, AIResponse } from '../types';
import { getAvailableProviders } from '../../env';

const providerCache = new Map<AIProviderName, AIProvider>();

export async function getProvider(providerName: AIProviderName): Promise<AIProvider> {
  const cached = providerCache.get(providerName);
  if (cached) return cached;

  let provider: AIProvider;
  if (providerName === 'gemini') {
    const { GeminiProvider } = await import('./gemini');
    provider = new GeminiProvider();
  } else if (providerName === 'openai') {
    const { OpenAIProvider } = await import('./openai');
    provider = new OpenAIProvider();
  } else {
    const { AnthropicProvider } = await import('./anthropic');
    provider = new AnthropicProvider();
  }

  providerCache.set(providerName, provider);
  return provider;
}

/**
 * Synchronous provider getter for backward compatibility with agents-run.ts.
 * Note: this still loads providers lazily - the class is instantiated lazily.
 */
export function getProviderSync(providerName: AIProviderName): AIProvider {
  const cached = providerCache.get(providerName);
  if (cached) return cached;

  // For sync access, we need to import synchronously - use require-style dynamic import trick
  // This works because all provider implementations use CommonJS-compatible exports
  let provider: AIProvider;
  if (providerName === 'gemini') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GeminiProvider } = require('./gemini');
    provider = new GeminiProvider();
  } else if (providerName === 'openai') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAIProvider } = require('./openai');
    provider = new OpenAIProvider();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AnthropicProvider } = require('./anthropic');
    provider = new AnthropicProvider();
  }

  providerCache.set(providerName, provider);
  return provider;
}

/**
 * Default fallback model per provider (used by standalone endpoints).
 */
const DEFAULT_MODELS: Record<AIProviderName, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
};

export interface FallbackCompleteOptions {
  preferredProvider?: AIProviderName;
  model?: string;
  request: Omit<AIRequest, 'model'>;
}

/**
 * Calls an AI provider with automatic fallback to other configured providers.
 * Tries the preferred provider first, then falls through the remaining
 * configured providers in order (gemini -> openai -> anthropic).
 */
export async function completeWithFallback(options: FallbackCompleteOptions): Promise<AIResponse> {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error(
      'AI_NO_PROVIDERS: Nenhum provider de IA configurado. ' +
      'Configure GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY.',
    );
  }

  const ordered: AIProviderName[] = [];
  if (options.preferredProvider && available.includes(options.preferredProvider)) {
    ordered.push(options.preferredProvider);
  }
  for (const p of available) {
    if (!ordered.includes(p)) ordered.push(p);
  }

  let lastError: unknown;
  for (const providerName of ordered) {
    try {
      const provider = await getProvider(providerName);
      const model = providerName === ordered[0] && options.model
        ? options.model
        : DEFAULT_MODELS[providerName];

      const response = await provider.complete({ ...options.request, model });
      return response;
    } catch (err) {
      console.error(
        `[completeWithFallback] ${providerName} failed:`,
        (err as Error).message,
      );
      lastError = err;
    }
  }

  throw lastError ?? new Error('All AI providers failed.');
}
