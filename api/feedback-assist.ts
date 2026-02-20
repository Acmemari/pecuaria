import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from './_lib/ai/providers';
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

    const providerName = feedbackManifest.modelPolicy.provider;
    const model = feedbackManifest.modelPolicy.model;
    const provider = getProvider(providerName);

    const result = await runFeedbackAgent({
      input: parsed.data,
      provider,
      model,
    });

    return res.status(200).json({
      data: result.data,
      usage: result.usage,
      model,
      provider: providerName,
    });
  } catch (err: any) {
    console.error('[feedback-assist] Error:', err?.message || err);
    if (String(err?.message || '').startsWith('FEEDBACK_AGENT_OUTPUT_INVALID:')) {
      const parseError = String(err.message).replace('FEEDBACK_AGENT_OUTPUT_INVALID:', '').trim();
      return res.status(502).json({ error: `Falha ao interpretar resposta da IA: ${parseError}` });
    }
    return res.status(500).json({ error: 'Erro ao gerar feedback. Tente novamente.' });
  }
}

