import type { AIProvider, AIRequest, AIResponse } from '../types';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;

  async complete(_request: AIRequest): Promise<AIResponse> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    throw new Error(
      'OpenAIProvider stub: SDK integration is not implemented yet. ' +
      'Wire the OpenAI SDK in api/_lib/ai/providers/openai.ts.'
    );
  }
}

