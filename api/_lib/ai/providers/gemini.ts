/**
 * Gemini AI provider using native fetch() instead of @google/genai SDK.
 * This avoids the ESM bundle incompatibility that causes FUNCTION_INVOCATION_FAILED
 * on Vercel serverless functions when using the @google/genai package.
 */
import type { AIProvider, AIRequest, AIResponse } from '../types';
import { getProviderKey } from '../../env';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GeminiContent {
  parts: Array<{ text: string }>;
  role: string;
}

interface GeminiGenerateRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
  error?: { code?: number; message?: string; status?: string };
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;

  private getApiKey(): string {
    const key = getProviderKey('gemini');
    if (!key) throw new Error('GEMINI_API_KEY is not configured.');
    return key;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const apiKey = this.getApiKey();
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const model = request.model;
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

    const body: GeminiGenerateRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs - (Date.now() - startedAt));

        let fetchResponse: Response;
        try {
          fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!fetchResponse.ok && RETRYABLE_STATUS.has(fetchResponse.status)) {
          const errBody = await fetchResponse.json().catch(() => ({})) as GeminiResponse;
          const err = new Error(
            errBody?.error?.message ?? `Gemini HTTP ${fetchResponse.status}`
          ) as Error & { status: number };
          err.status = fetchResponse.status;
          throw err;
        }

        if (!fetchResponse.ok) {
          const errBody = await fetchResponse.json().catch(() => ({})) as GeminiResponse;
          throw new Error(errBody?.error?.message ?? `Gemini HTTP ${fetchResponse.status}`);
        }

        const data = await fetchResponse.json() as GeminiResponse;

        if (data.error) {
          throw new Error(data.error.message ?? 'Gemini API error');
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!content) throw new Error('Gemini returned an empty response.');

        const meta = data.usageMetadata;
        const inputTokens = meta?.promptTokenCount ?? 0;
        const outputTokens = meta?.candidatesTokenCount ?? 0;
        const totalTokens = meta?.totalTokenCount ?? inputTokens + outputTokens;

        return {
          content,
          usage: { inputTokens, outputTokens, totalTokens },
          model,
          provider: this.name,
          latencyMs: Math.max(1, Date.now() - startedAt),
        };
      } catch (err) {
        lastError = err;
        if (Date.now() - startedAt >= timeoutMs) break;
        const e = err as Error & { status?: number; name?: string };
        if (e.name === 'AbortError') break;
        const isRetryable =
          (typeof e.status === 'number' && RETRYABLE_STATUS.has(e.status)) ||
          String(e.message).toLowerCase().includes('rate limit');
        if (!isRetryable || attempt === 1) break;
        await sleep(250 * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('GeminiProvider failed without a specific error.');
  }
}
