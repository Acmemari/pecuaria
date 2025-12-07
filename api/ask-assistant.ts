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
  console.log('[API] Requisição recebida:', req.method, req.url);
  
  // Permitir apenas POST
  if (req.method !== 'POST') {
    console.log('[API] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { question } = req.body;
    console.log('[API] Pergunta recebida:', question ? question.substring(0, 100) : 'vazia');

    if (!question || typeof question !== 'string' || !question.trim()) {
      console.log('[API] Pergunta inválida');
      return res.status(400).json({
        error: "O campo 'question' é obrigatório e deve ser uma string não vazia.",
      });
    }

    console.log('[API] Chamando callAssistant...');
    const answer = await callAssistant(question.trim());
    console.log('[API] Resposta recebida com sucesso, tamanho:', answer.length);

    return res.status(200).json({
      answer,
    });
  } catch (err: any) {
    console.error('[API] Erro completo no assistente:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    
    // Retornar mensagem de erro mais descritiva
    const errorMessage = err.message || 'Erro interno no assistente.';
    console.error('[API] Retornando erro 500:', errorMessage);
    
    return res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

