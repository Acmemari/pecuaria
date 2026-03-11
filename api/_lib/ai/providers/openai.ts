import type { AIProvider, AIRequest, AIResponse } from '../types.js';
import { getProviderKey } from '../../env.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const e = err as { status?: number; message?: string; code?: string };
  if (typeof e?.status === 'number' && RETRYABLE_STATUS.has(e.status)) return true;
  const msg = String(e?.message || '').toLowerCase();
  return (
    msg.includes('timeout') || msg.includes('rate limit') || msg.includes('econnreset') || msg.includes('temporar')
  );
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;

  async complete(request: AIRequest): Promise<AIResponse> {
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const apiKey = getProviderKey('openai');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (request.systemPrompt?.trim()) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.userPrompt });

    const payload = {
      model: request.model,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      ...(request.responseFormat === 'json' && { response_format: { type: 'json_object' } }),
    };

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text();
          const err = new Error(`OpenAI API error: ${response.status} - ${body}`) as any;
          err.status = response.status;
          throw err;
        }

        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content ?? '';

        if (!content) throw new Error('OpenAI returned an empty response.');

        const usage = data.usage;
        const inputTokens = usage?.prompt_tokens ?? 0;
        const outputTokens = usage?.completion_tokens ?? 0;
        const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;

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

    throw lastError ?? new Error('OpenAIProvider failed without a specific error.');
  }
}
