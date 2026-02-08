// api/geminiClient.ts
/**
 * Cliente para interagir com o Google Gemini API (SDK atual: @google/genai)
 *
 * IMPORTANTE: Este arquivo deve ser usado apenas em serverless functions (Vercel).
 * Não deve ser importado no código do frontend.
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Obtém a chave da API Gemini do ambiente
 */
function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const errorMsg =
      'GEMINI_API_KEY não definida nas variáveis de ambiente do servidor. ' +
      'Configure a variável GEMINI_API_KEY no painel do Vercel (Settings > Environment Variables) ' +
      'ou no arquivo .env para desenvolvimento local.';
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

const MODEL = 'gemini-2.5-flash';

/**
 * Chama o modelo Gemini com uma pergunta e retorna a resposta
 */
export async function callAssistant(question: string): Promise<AssistantResponse> {
  const apiKey = getGeminiApiKey();

  console.log('[Gemini Assistant] Iniciando chamada para Gemini');
  console.log('[Gemini Assistant] Pergunta:', question.substring(0, 100) + '...');

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Você é um consultor especializado em gestão pecuária.

INSTRUÇÕES:
- Seja direto, pragmático e focado em resultados financeiros
- Use termos técnicos do setor quando apropriado (GMD, Lotação, Desembolso Cabeça/Mês, etc.)
- Baseie suas recomendações nos dados fornecidos
- IMPORTANTE: Sempre inicie sua resposta com "Analisando seus resultados, pudemos observar que..."
- Não use expressões informais como "companheiro" ou similares
- Mantenha um tom profissional e consultivo`;

    console.log(`[Gemini Assistant] Enviando mensagem via @google/genai (${MODEL})...`);

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${systemInstruction}\n\n${question}\n\nResposta:`,
    });

    const answer = response.text ?? '';

    if (!answer) {
      console.error('[Gemini Assistant] Resposta vazia');
      throw new Error('Resposta vazia do Gemini. Pode ter sido bloqueada por filtros de segurança.');
    }

    console.log('[Gemini Assistant] Resposta recebida com sucesso, tamanho:', answer.length);

    // Extrair informações de uso se disponíveis
    let usage: AssistantResponse['usage'] = undefined;
    const meta = response.usageMetadata;

    if (meta) {
      usage = {
        prompt_tokens: meta.promptTokenCount ?? 0,
        completion_tokens: meta.candidatesTokenCount ?? 0,
        total_tokens: meta.totalTokenCount ?? 0,
      };
    }

    return { answer, usage, model: MODEL };
  } catch (error: any) {
    console.error('[Gemini Assistant] Erro:', {
      message: error.message,
      type: error.constructor?.name,
      status: error.status,
      statusText: error.statusText,
    });

    // Melhorar mensagens de erro
    if (error.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
      throw new Error(`Modelo "${MODEL}" não encontrado (404). Verifique se a chave da API está correta.`);
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
