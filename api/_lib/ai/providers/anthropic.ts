import type { AIProvider, AIRequest, AIResponse } from '../types';
import { getProviderKey } from '../../env';

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

  async complete(request: AIRequest): Promise<AIResponse> {
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const apiKey = getProviderKey('anthropic');

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY / CLOUD_API_KEY is not configured.');
    }

    const payload = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      system: request.systemPrompt?.trim() || undefined,
      messages: [{ role: 'user', content: request.userPrompt }],
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text();
          const err = new Error(`Anthropic API error: ${response.status} - ${body}`) as any;
          err.status = response.status;
          throw err;
        }

        const data: any = await response.json();

        let content = '';
        if (data.content && Array.isArray(data.content)) {
          for (const block of data.content) {
            if (block.type === 'text') {
              content += block.text;
            }
          }
        }

        if (!content) throw new Error('Anthropic returned an empty response.');

        const usage = data.usage;
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
