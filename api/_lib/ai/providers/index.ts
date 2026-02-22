import type { AIProvider, AIProviderName, AIRequest, AIResponse } from '../types.js';
import { getAvailableProviders } from '../../env.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';

const providerCache = new Map<AIProviderName, AIProvider>();

export function getProvider(providerName: AIProviderName): AIProvider {
  const cached = providerCache.get(providerName);
  if (cached) return cached;

  let provider: AIProvider;
  if (providerName === 'gemini') {
    provider = new GeminiProvider();
  } else if (providerName === 'openai') {
    provider = new OpenAIProvider();
  } else {
    provider = new AnthropicProvider();
  }

  providerCache.set(providerName, provider);
  return provider;
}

/**
 * Default fallback model per provider (used by standalone endpoints).
 */
const DEFAULT_MODELS: Record<AIProviderName, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
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
      const provider = getProvider(providerName);
      const model = providerName === ordered[0] && options.model
        ? options.model
        : DEFAULT_MODELS[providerName];

      const response = await provider.complete({ ...options.request, model });
      return response;
    } catch (err) {
      console.error(`[completeWithFallback] ${providerName} failed:`, err);
      lastError = err;
    }
  }

  throw lastError ?? new Error('All AI providers failed.');
}
