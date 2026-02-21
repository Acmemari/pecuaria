import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from './_lib/ai/providers';
import { getAvailableProviders } from './_lib/env';
import {
  feedbackManifest,
  feedbackInputSchema,
} from './_lib/agents/feedback/manifest';
import { runFeedbackAgent } from './_lib/agents/feedback/handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const parsed = feedbackInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }

    // Build ordered provider list: preferred first, then fallbacks, filtered to available keys
    const available = getAvailableProviders();
    if (available.length === 0) {
      console.error('[feedback-assist] No AI provider keys configured.');
      return res.status(503).json({
        error: 'Serviço de IA não configurado. Contate o suporte.',
      });
    }

    const policy = feedbackManifest.modelPolicy;
    const fallbackChain = [
      { provider: policy.provider, model: policy.model },
      ...(policy.fallback ?? []),
    ].filter((entry) => available.includes(entry.provider));

    if (fallbackChain.length === 0) {
      console.error('[feedback-assist] Preferred providers not available:', policy.provider, policy.fallback);
      return res.status(503).json({
        error: 'Nenhum provider de IA disponível. Contate o suporte.',
      });
    }

    let lastError: unknown;
    for (const { provider: providerName, model } of fallbackChain) {
      try {
        const provider = getProvider(providerName);
        const result = await runFeedbackAgent({ input: parsed.data, provider, model });

        return res.status(200).json({
          data: result.data,
          usage: result.usage,
          model,
          provider: providerName,
        });
      } catch (err: any) {
        if (String(err?.message || '').startsWith('FEEDBACK_AGENT_OUTPUT_INVALID:')) {
          throw err; // Output parse errors should not trigger fallback
        }
        console.warn(`[feedback-assist] Provider ${providerName} failed, trying next:`, err?.message);
        lastError = err;
      }
    }

    throw lastError;
  } catch (err: any) {
    console.error('[feedback-assist] Error:', err?.message || err);
    if (String(err?.message || '').startsWith('FEEDBACK_AGENT_OUTPUT_INVALID:')) {
      const parseError = String(err.message).replace('FEEDBACK_AGENT_OUTPUT_INVALID:', '').trim();
      return res.status(502).json({ error: `Falha ao interpretar resposta da IA: ${parseError}` });
    }
    return res.status(500).json({ error: 'Erro ao gerar feedback. Tente novamente.' });
  }
}

