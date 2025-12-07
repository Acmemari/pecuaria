// api/ask-assistant.ts
/**
 * Vercel Serverless Function para processar perguntas do assistente
 * Endpoint: POST /api/ask-assistant
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callAssistant } from '../lib/server/openai/assistantClient';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        error: "O campo 'question' é obrigatório e deve ser uma string não vazia.",
      });
    }

    const answer = await callAssistant(question.trim());

    return res.status(200).json({
      answer,
    });
  } catch (err: any) {
    console.error('Erro no assistente:', err);
    return res.status(500).json({
      error: err.message ?? 'Erro interno no assistente.',
    });
  }
}

