import { GoogleGenAI } from '@google/genai';
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
  return msg.includes('timeout') || msg.includes('rate limit') || msg.includes('temporar');
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.client) return this.client;
    const key = getProviderKey('gemini');
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    this.client = new GoogleGenAI({ apiKey: key });
    return this.client;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const client = this.getClient();
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const prompt = [request.systemPrompt, request.userPrompt].filter(Boolean).join('\n\n');

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await client.models.generateContent({
          model: request.model,
          contents: prompt,
          config: {
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
            responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
          },
        });

        const content = response.text ?? '';
        if (!content) throw new Error('Gemini returned an empty response.');

        const meta = response.usageMetadata;
        const inputTokens = meta?.promptTokenCount ?? 0;
        const outputTokens = meta?.candidatesTokenCount ?? 0;
        const totalTokens = meta?.totalTokenCount ?? inputTokens + outputTokens;

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

    throw lastError ?? new Error('GeminiProvider failed without a specific error.');
  }
}
