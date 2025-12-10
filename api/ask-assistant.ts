// api/ask-assistant.ts
/**
 * Vercel Serverless Function para processar perguntas do assistente
 * Endpoint: POST /api/ask-assistant
 * 
 * Integração com n8n webhook para processamento das mensagens
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Obtém a URL do webhook n8n do ambiente
 */
function getWebhookUrl(): string {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.trim() === '') {
    const errorMsg = "N8N_WEBHOOK_URL não configurada nas variáveis de ambiente do servidor. " +
      "Configure a variável N8N_WEBHOOK_URL no painel do Vercel (Settings > Environment Variables).";
    console.error('[API]', errorMsg);
    throw new Error(errorMsg);
  }
  return webhookUrl.trim();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('[API] Requisição recebida:', req.method, req.url);
  
  // Verificar webhook URL antes de processar
  try {
    getWebhookUrl();
  } catch (error: any) {
    console.error('[API] Webhook URL não configurada');
    return res.status(500).json({
      error: 'Configuração de servidor incompleta: N8N_WEBHOOK_URL não está configurada. Configure nas variáveis de ambiente do Vercel.',
      code: 'MISSING_WEBHOOK_URL'
    });
  }
  
  // Permitir apenas POST
  if (req.method !== 'POST') {
    console.log('[API] Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { question, userId } = req.body;
    console.log('[API] Pergunta recebida:', question ? question.substring(0, 100) : 'vazia');
    console.log('[API] User ID:', userId);

    if (!question || typeof question !== 'string' || !question.trim()) {
      console.log('[API] Pergunta inválida');
      return res.status(400).json({
        error: "O campo 'question' é obrigatório e deve ser uma string não vazia.",
      });
    }

    const webhookUrl = getWebhookUrl();
    console.log('[API] Chamando webhook n8n:', webhookUrl);

    const requestPayload = {
      message: question.trim(), // n8n espera 'message', não 'question'
      userId: userId || null,
      timestamp: new Date().toISOString(),
    };

    // Chamar webhook n8n com timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido');
      console.error('[API] Erro na chamada ao webhook:', response.status, errorText);
      throw new Error(`Webhook retornou erro (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('[API] Resposta recebida do webhook, tamanho:', JSON.stringify(data).length);

    // Extrair resposta do webhook
    // O n8n pode retornar diferentes formatos, vamos ser flexíveis
    let answer = '';
    
    if (data.output) {
      answer = data.output;
    } else if (data.answer) {
      answer = data.answer;
    } else if (data.response) {
      answer = data.response;
    } else if (data.message) {
      answer = data.message;
    } else if (data.text) {
      answer = data.text;
    } else if (typeof data === 'string') {
      answer = data;
    } else {
      console.warn('[API] Formato de resposta não reconhecido:', data);
      answer = 'Resposta recebida, mas formato não reconhecido.';
    }

    if (!answer || answer.trim() === '') {
      console.error('[API] Resposta vazia do webhook');
      throw new Error('Webhook retornou resposta vazia');
    }

    console.log('[API] Resposta processada com sucesso, tamanho:', answer.length);

    return res.status(200).json({
      answer: answer,
    });

  } catch (err: any) {
    console.error('[API] Erro completo no assistente:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      webhookUrlPresent: !!(process.env.N8N_WEBHOOK_URL || process.env.WEBHOOK_URL),
    });
    
    // Identificar tipo de erro
    let statusCode = 500;
    let errorMessage = err.message || 'Erro interno no assistente.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (err.message?.includes('N8N_WEBHOOK_URL não configurada') || err.message?.includes('MISSING_WEBHOOK_URL')) {
      statusCode = 500;
      errorCode = 'MISSING_WEBHOOK_URL';
      errorMessage = 'Configuração incompleta: N8N_WEBHOOK_URL não está configurada no servidor.';
    } else if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      statusCode = 504;
      errorCode = 'TIMEOUT';
      errorMessage = 'Timeout ao processar solicitação no webhook. Tente novamente.';
    } else if (err.message?.includes('Webhook retornou erro')) {
      statusCode = 502;
      errorCode = 'WEBHOOK_ERROR';
      errorMessage = 'Erro ao processar solicitação no webhook n8n.';
    } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
      statusCode = 503;
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Erro de conexão com o webhook. Verifique se o serviço está disponível.';
    }
    
    console.error(`[API] Retornando erro ${statusCode} (${errorCode}):`, errorMessage);
    
    return res.status(statusCode).json({
      error: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}

