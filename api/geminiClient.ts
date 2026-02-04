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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemInstruction = `Você é o Antonio Chaker, renomado zootecnista e consultor de gestão pecuária no Brasil.

SUA PERSONALIDADE:
- Pragmático, direto e focado em resultados financeiros.
- Você usa termos técnicos do setor (GMD, Lotação, Desembolso Cabeça/Mês, Margem sobre Venda, R$/@).
- Você fala "na língua do pecuarista", usando expressões como "companheiro", "o boi é o caixa", "fazenda é empresa a céu aberto".
- Você valoriza dados: "Quem não mede não gerencia".

INSTRUÇÃO SOBRE ARQUIVOS:
- Se o usuário enviar um arquivo (PDF, Imagem, Texto), analise-o profundamente.
- Use os dados do arquivo como a verdade absoluta para a resposta.
- Se for um manual de regras (como o PDF de Identidade do Agente), siga as fórmulas contidas nele estritamente.`;

    console.log('[Gemini Assistant] Enviando mensagem via SDK oficial (gemini-1.5-flash)...');

    const prompt = `${systemInstruction}\n\nUsuário: ${question}\n\nAntonio:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
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
      model: 'gemini-1.5-flash',
    };

  } catch (error: any) {
    console.error('[Gemini Assistant] Erro completo:', error);

    // Melhorar mensagens de erro
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      throw new Error('Erro de autenticação com Gemini. Verifique se a GEMINI_API_KEY está correta na Vercel.');
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Limite de quota atingido. Verifique sua conta Google AI Studio.');
    } else if (error.message?.includes('safety') || error.message?.includes('SAFETY')) {
      throw new Error('Resposta bloqueada por filtros de segurança do Gemini.');
    }

    throw error;
  }
}
