import type { AgentManifest, PlanId, RoutedModel } from './types';

const BASIC_MODEL_OVERRIDES: Partial<Record<'gemini' | 'openai' | 'anthropic', string>> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
};

export function routeAgent(manifest: AgentManifest, userPlan: PlanId): RoutedModel {
  if (userPlan === 'basic') {
    const basicModel = BASIC_MODEL_OVERRIDES[manifest.modelPolicy.provider];
    if (basicModel) {
      return {
        provider: manifest.modelPolicy.provider,
        model: basicModel,
      };
    }
  }

  return {
    provider: manifest.modelPolicy.provider,
    model: manifest.modelPolicy.model,
  };
}

export function getFallbackRoutes(manifest: AgentManifest): RoutedModel[] {
  return (manifest.modelPolicy.fallback ?? []).map((item) => ({
    provider: item.provider,
    model: item.model,
  }));
}

