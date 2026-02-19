/**
 * API: Resumo conclusivo (~200 caracteres) de uma entrega, gerado por IA.
 * POST /api/delivery-summary
 * Body: { name: string, description?: string | null, transformations_achievements?: string | null }
 * Response: { summary: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.0-flash';
const GEMINI_TIMEOUT_MS = 30_000;

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function stripTrailingEllipsis(text: string): string {
  return text.replace(/\s*[.…]{2,}\s*$/g, '').trim();
}

function trimToCompleteSentence(text: string, maxLen: number): string {
  const clean = text.replace(/\s*\n+\s*/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const truncated = clean.slice(0, maxLen);
  const lastDot = truncated.lastIndexOf('.');
  if (lastDot > maxLen * 0.4) return truncated.slice(0, lastDot + 1).trim();
  return truncated.trim().replace(/[,;:\s]+$/, '') + '.';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return res.status(500).json({
      error: 'GEMINI_API_KEY não está configurada no servidor.',
    });
  }

  try {
    const { name, description, transformations_achievements } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: "O campo 'name' é obrigatório e deve ser uma string não vazia.",
      });
    }

    const desc = typeof description === 'string' ? description.trim() : '';
    const trans = typeof transformations_achievements === 'string' ? transformations_achievements.trim() : '';
    const hasExtra = desc || trans;

    const prompt = `Você resume entregas de projetos em português de forma curta e conclusiva.

REGRAS OBRIGATÓRIAS:
- Escreva UM ÚNICO parágrafo com no máximo 200 caracteres.
- O parágrafo DEVE ser uma ideia completa e conclusiva. Nunca corte no meio.
- NUNCA termine com reticências (...) ou texto incompleto.
- A última frase deve ter ponto final.
- Sem título, sem prefixo, sem bullet points. Apenas o parágrafo.

Nome da entrega: ${name}
${hasExtra ? `Contexto adicional: ${desc || ''} ${trans || ''}`.trim() : ''}

Responda SOMENTE com o parágrafo resumido (máximo 200 caracteres, completo, com ponto final).`;

    const ai = new GoogleGenAI({ apiKey });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite excedido ao chamar a IA.')), GEMINI_TIMEOUT_MS);
    });

    const aiPromise = ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: 256,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    const answer = response.text ?? '';

    if (!answer.trim()) {
      return res.status(502).json({ error: 'Resposta vazia da IA.' });
    }

    const cleaned = stripTrailingEllipsis(answer.trim());
    const summary = trimToCompleteSentence(cleaned, 220);

    return res.status(200).json({ summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar resumo da entrega.';
    console.error('[delivery-summary]', message);
    return res.status(500).json({ error: message });
  }
}
