import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIRequest, AIResponse } from '../types.js';
import { getProviderKey } from '../../env.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (typeof e?.status === 'number' && RETRYABLE_STATUS.has(e.status)) return true;
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('rate limit') || msg.includes('overloaded') || msg.includes('temporar');
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const;
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const key = getProviderKey('anthropic');
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY is not configured.');
    }
    this.client = new Anthropic({ apiKey: key });
    return this.client;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const client = this.getClient();
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const createParams = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      system: request.systemPrompt?.trim() || undefined,
      messages: [{ role: 'user' as const, content: request.userPrompt }],
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const message = await client.messages.create(createParams, {
          signal: controller.signal,
        });

        clearTimeout(timer);

        let content = '';
        for (const block of message.content) {
          if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block) {
            content += (block as { text: string }).text;
          }
        }
        if (!content) throw new Error('Anthropic returned an empty response.');

        const usage = message.usage;
        const inputTokens = usage?.input_tokens ?? 0;
        const outputTokens = usage?.output_tokens ?? 0;
        const totalTokens = inputTokens + outputTokens;

        return {
          content,
          usage: { inputTokens, outputTokens, totalTokens },
          model: request.model,
          provider: this.name,
          latencyMs: Math.max(1, Date.now() - startedAt),
        };
      } catch (err) {
        lastError = err;
        if (Date.now() - startedAt >= timeoutMs) break;
        if (!isRetryableError(err) || attempt === 1) break;
        await sleep(250 * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('AnthropicProvider failed without a specific error.');
  }
}
