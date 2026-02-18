import type { AIProvider, AIRequest, AIResponse } from '../types';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const;

  async complete(_request: AIRequest): Promise<AIResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    throw new Error(
      'AnthropicProvider stub: SDK integration is not implemented yet. ' +
      'Wire the Anthropic SDK in api/_lib/ai/providers/anthropic.ts.'
    );
  }
}

