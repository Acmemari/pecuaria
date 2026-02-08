// api/geminiClient.ts
/**
 * Cliente para interagir com o Google Gemini API
 * Gerencia conversas e respostas do modelo Gemini
 * 
 * IMPORTANTE: Este arquivo deve ser usado apenas em serverless functions (Vercel).
 * Não deve ser importado no código do frontend.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Obtém a chave da API Gemini do ambiente
 */
function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const errorMsg = "GEMINI_API_KEY não definida nas variáveis de ambiente do servidor. " +
      "Configure a variável GEMINI_API_KEY no painel do Vercel (Settings > Environment Variables) " +
      "ou no arquivo .env para desenvolvimento local.";
    console.error('[Gemini Assistant]', errorMsg);
    throw new Error(errorMsg);
  }

  return apiKey.trim();
}

/**
 * Interface para retornar resposta e uso de tokens
 */
export interface AssistantResponse {
  answer: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

/**
 * Chama o modelo Gemini com uma pergunta e retorna a resposta
 * @param question Pergunta do usuário
 * @returns Resposta do assistente com informações de uso
 */
export async function callAssistant(question: string): Promise<AssistantResponse> {
  const GEMINI_API_KEY = getGeminiApiKey();

  console.log('[Gemini Assistant] Iniciando chamada para Gemini');
  console.log('[Gemini Assistant] Pergunta:', question.substring(0, 100) + '...');

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

    const systemInstruction = `Você é um consultor especializado em gestão pecuária.

INSTRUÇÕES:
- Seja direto, pragmático e focado em resultados financeiros
- Use termos técnicos do setor quando apropriado (GMD, Lotação, Desembolso Cabeça/Mês, etc.)
- Baseie suas recomendações nos dados fornecidos
- IMPORTANTE: Sempre inicie sua resposta com "Analisando seus resultados, pudemos observar que..."
- Não use expressões informais como "companheiro" ou similares
- Mantenha um tom profissional e consultivo`;

    console.log('[Gemini Assistant] Enviando mensagem via SDK oficial (gemini-2.5-flash)...');

    const prompt = `${systemInstruction}\n\n${question}\n\nResposta:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Verificar se a resposta foi bloqueada
    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error('[Gemini Assistant] Resposta bloqueada ou vazia');
      throw new Error('Resposta bloqueada por filtros de segurança ou sem candidatos disponíveis');
    }

    const candidate = response.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('[Gemini Assistant] Resposta finalizada com motivo:', candidate.finishReason);
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Resposta bloqueada por filtros de segurança do Gemini');
      }
    }

    const answer = response.text();

    console.log('[Gemini Assistant] Resposta recebida com sucesso, tamanho:', answer.length);

    // Extrair informações de uso se disponíveis
    let usage = undefined;
    const usageMetadata = response.usageMetadata;

    if (usageMetadata) {
      usage = {
        prompt_tokens: usageMetadata.promptTokenCount || 0,
        completion_tokens: usageMetadata.candidatesTokenCount || 0,
        total_tokens: usageMetadata.totalTokenCount || 0,
      };
    }

    return {
      answer,
      usage,
      model: 'gemini-2.5-flash',
    };

  } catch (error: any) {
    console.error('[Gemini Assistant] Erro:', {
      message: error.message,
      type: error.constructor?.name,
      status: error.status,
      statusText: error.statusText,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Melhorar mensagens de erro
    if (error.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
      throw new Error('Modelo não encontrado (404). Verifique se a chave da API está correta e se o modelo "gemini-1.5-flash" está disponível.');
    } else if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      throw new Error('Erro de autenticação com Gemini. Verifique se a GEMINI_API_KEY está correta na Vercel.');
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Limite de quota atingido. Verifique sua conta Google AI Studio.');
    } else if (error.message?.includes('safety') || error.message?.includes('SAFETY')) {
      throw new Error('Resposta bloqueada por filtros de segurança do Gemini.');
    }

    throw error;
  }
}
