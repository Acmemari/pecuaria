// api/ask-assistant.ts
/**
 * Vercel Serverless Function para processar perguntas do assistente
 * Endpoint: POST /api/ask-assistant
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callAssistant } from './assistantClient';

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
    const result = await callAssistant(question.trim());
    console.log('[API] Resposta recebida com sucesso, tamanho:', result.answer.length);
    
    // Salvar uso de tokens no banco de dados (se disponível)
    if (result.usage && req.body.userId) {
      try {
        // Usar Supabase client com service role para inserir dados
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          await supabase.from('ai_token_usage').insert({
            user_id: req.body.userId,
            tokens_input: result.usage.prompt_tokens || 0,
            tokens_output: result.usage.completion_tokens || 0,
            total_tokens: result.usage.total_tokens || 0,
            model: result.model || 'unknown',
          });
          
          console.log('[API] Uso de tokens salvo:', result.usage);
        } else {
          console.warn('[API] Variáveis do Supabase não configuradas, pulando salvamento de tokens');
        }
      } catch (tokenError: any) {
        // Não falhar a requisição se houver erro ao salvar tokens
        console.error('[API] Erro ao salvar uso de tokens (não crítico):', tokenError);
      }
    }

    return res.status(200).json({
      answer: result.answer,
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

