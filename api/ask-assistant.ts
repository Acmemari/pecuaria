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
  
  // Verificar API key antes de processar
  if (!process.env.OPENAI_API_KEY) {
    console.error('[API] OPENAI_API_KEY não configurada no Vercel');
    return res.status(500).json({
      error: 'Configuração de servidor incompleta: OPENAI_API_KEY não está configurada. Configure nas variáveis de ambiente do Vercel.',
      code: 'MISSING_API_KEY'
    });
  }
  
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
      apiKeyPresent: !!process.env.OPENAI_API_KEY,
      apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'não configurada'
    });
    
    // Identificar tipo de erro
    let statusCode = 500;
    let errorMessage = err.message || 'Erro interno no assistente.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (err.message?.includes('OPENAI_API_KEY não definida')) {
      statusCode = 500;
      errorCode = 'MISSING_API_KEY';
      errorMessage = 'Configuração incompleta: OPENAI_API_KEY não está configurada no servidor.';
    } else if (err.message?.includes('Erro ao criar run') || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      statusCode = 401;
      errorCode = 'OPENAI_AUTH_ERROR';
      errorMessage = 'Erro de autenticação com OpenAI. Verifique se a API key está correta.';
    } else if (err.message?.includes('Timeout') || err.message?.includes('timeout')) {
      statusCode = 504;
      errorCode = 'TIMEOUT';
      errorMessage = 'Timeout ao processar solicitação. Tente novamente.';
    }
    
    console.error(`[API] Retornando erro ${statusCode} (${errorCode}):`, errorMessage);
    
    return res.status(statusCode).json({
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

