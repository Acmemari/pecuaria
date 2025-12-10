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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:24',message:'Handler iniciado',data:{method:req.method,url:req.url,body:req.body},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'ALL'})}).catch(()=>{});
  // #endregion
  
  console.log('[API] Requisição recebida:', req.method, req.url);
  
  // Verificar webhook URL antes de processar
  try {
    const webhookUrl = getWebhookUrl();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:32',message:'Webhook URL obtida',data:{webhookUrl:webhookUrl,env_N8N:!!process.env.N8N_WEBHOOK_URL,env_WEBHOOK:!!process.env.WEBHOOK_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:36',message:'ERRO: Webhook URL não configurada',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
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
      question: question.trim(),
      userId: userId || null,
      timestamp: new Date().toISOString(),
    };

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:67',message:'Antes de chamar webhook',data:{webhookUrl:webhookUrl,requestPayload:requestPayload},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    // Chamar webhook n8n com timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:84',message:'Resposta recebida do webhook',data:{status:response.status,statusText:response.statusText,ok:response.ok,headers:Object.fromEntries(response.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H3'})}).catch(()=>{});
      // #endregion
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:89',message:'ERRO na chamada fetch ao webhook',data:{error:fetchError.message,name:fetchError.name,stack:fetchError.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H4'})}).catch(()=>{});
      // #endregion
      throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:101',message:'Webhook retornou erro (status não OK)',data:{status:response.status,errorText:errorText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      console.error('[API] Erro na chamada ao webhook:', response.status, errorText);
      throw new Error(`Webhook retornou erro (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:110',message:'JSON parseado do webhook',data:{responseData:data,dataType:typeof data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    console.log('[API] Resposta recebida do webhook, tamanho:', JSON.stringify(data).length);

    // Extrair resposta do webhook
    // O n8n pode retornar diferentes formatos, vamos ser flexíveis
    let answer = '';
    
    if (data.answer) {
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

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:137',message:'Resposta extraída',data:{answer:answer,answerLength:answer?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

    if (!answer || answer.trim() === '') {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:143',message:'ERRO: Resposta vazia do webhook',data:{answer:answer},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      console.error('[API] Resposta vazia do webhook');
      throw new Error('Webhook retornou resposta vazia');
    }

    console.log('[API] Resposta processada com sucesso, tamanho:', answer.length);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:153',message:'Retornando sucesso ao cliente',data:{answerLength:answer.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion

    return res.status(200).json({
      answer: answer,
    });

  } catch (err: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4b33b8f5-4f94-45fe-8ae7-056602ec0e73',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ask-assistant.ts:163',message:'ERRO capturado no catch principal',data:{error:err.message,name:err.name,stack:err.stack,webhookUrlPresent:!!(process.env.N8N_WEBHOOK_URL||process.env.WEBHOOK_URL)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    
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

