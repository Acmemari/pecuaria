import type { AIProvider, AIProviderName } from '../types';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';

const providerCache = new Map<AIProviderName, AIProvider>();

export function getProvider(providerName: AIProviderName): AIProvider {
  const cached = providerCache.get(providerName);
  if (cached) return cached;

  let provider: AIProvider;
  if (providerName === 'gemini') provider = new GeminiProvider();
  else if (providerName === 'openai') provider = new OpenAIProvider();
  else provider = new AnthropicProvider();

  providerCache.set(providerName, provider);
  return provider;
}

