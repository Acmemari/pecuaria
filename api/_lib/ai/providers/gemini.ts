/**
 * Gemini AI provider using native fetch() instead of @google/genai SDK.
 *
 * The @google/genai package is ESM-only ("type": "module") which causes
 * FUNCTION_INVOCATION_FAILED on Vercel serverless functions. Using the
 * native fetch() API avoids all bundling issues.
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

interface GeminiRequest {
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

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsage;
  error?: { code?: number; message?: string };
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
    const url = `${GEMINI_BASE}/${request.model}:generateContent?key=${apiKey}`;

    const body: GeminiRequest = {
      contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const remaining = timeoutMs - (Date.now() - startedAt);
        const timer = setTimeout(() => controller.abort(), remaining);

        let fetchRes: Response;
        try {
          fetchRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const rawData = await fetchRes.json() as GeminiResponse;

        if (!fetchRes.ok) {
          const errMsg = rawData?.error?.message ?? `Gemini HTTP ${fetchRes.status}`;
          const statusErr = Object.assign(new Error(errMsg), { status: fetchRes.status });
          if (RETRYABLE_STATUS.has(fetchRes.status)) throw statusErr;
          throw statusErr;
        }

        if (rawData.error) throw new Error(rawData.error.message ?? 'Gemini API error');

        const content = rawData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!content) throw new Error('Gemini returned an empty response.');

        const meta = rawData.usageMetadata;
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
        const e = err as Error & { status?: number };
        if (e.name === 'AbortError') break;
        if (Date.now() - startedAt >= timeoutMs) break;
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
