// api/geminiClient.ts
/**
 * Cliente para interagir com o Google Gemini API
 * Gerencia conversas e respostas do modelo Gemini
 * 
 * IMPORTANTE: Este arquivo deve ser usado apenas em serverless functions (Vercel).
 * Não deve ser importado no código do frontend.
 */

// Usando API REST diretamente para maior compatibilidade

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

    console.log('[Gemini Assistant] Enviando mensagem via API REST (gemini-1.5-flash)...');

    // Usar API REST diretamente (gemini-1.5-flash é estável e rápido)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: `${systemInstruction}\n\nUsuário: ${question}\n\nAntonio:`
        }]
      }],
      generationConfig: {
        temperature: 0.5,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini Assistant] Erro na API:', response.status, errorText);
      throw new Error(`Erro na API Gemini (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error("Resposta inválida do Gemini: " + JSON.stringify(data));
    }

    const answer = data.candidates[0].content.parts[0].text;
    console.log('[Gemini Assistant] Resposta recebida com sucesso, tamanho:', answer.length);

    // Extrair informações de uso se disponíveis
    let usage = undefined;
    let model = 'gemini-1.5-flash';

    if (data.usageMetadata) {
      usage = {
        prompt_tokens: data.usageMetadata.promptTokenCount || 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata.totalTokenCount || 0,
      };
    }

    return {
      answer,
      usage,
      model,
    };

  } catch (error: any) {
    console.error('[Gemini Assistant] Erro completo:', error);

    // Melhorar mensagens de erro
    if (error.message?.includes('API key')) {
      throw new Error('Erro de autenticação com Gemini. Verifique se a GEMINI_API_KEY está correta na Vercel.');
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Limite de quota atingido. Verifique sua conta Google AI Studio.');
    } else if (error.message?.includes('safety')) {
      throw new Error('Resposta bloqueada por filtros de segurança do Gemini.');
    }

    throw error;
  }
}
