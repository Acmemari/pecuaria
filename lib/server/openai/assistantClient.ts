// lib/server/openai/assistantClient.ts
/**
 * Cliente para interagir com o OpenAI Assistant API
 * Gerencia threads, runs e recuperação de respostas
 * 
 * IMPORTANTE: Este arquivo deve ser usado apenas em serverless functions (Vercel).
 * Não deve ser importado no código do frontend.
 */

// ID do assistente configurado no Playground
const ASSISTANT_ID = "asst_pxFD2qiuUYJOt5abVw8IWwUf";

/**
 * Obtém a chave da API OpenAI do ambiente
 * A validação acontece aqui para evitar erros durante o build do frontend
 */
function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const errorMsg = "OPENAI_API_KEY não definida nas variáveis de ambiente do servidor. " +
      "Configure a variável OPENAI_API_KEY no painel do Vercel (Settings > Environment Variables).";
    console.error('[OpenAI Assistant]', errorMsg);
    throw new Error(errorMsg);
  }
  
  // Validar formato básico da API key
  if (!apiKey.startsWith('sk-')) {
    console.warn('[OpenAI Assistant] API key não parece ter o formato correto (deve começar com "sk-")');
  }
  
  return apiKey.trim();
}

/**
 * Função auxiliar para esperar X milissegundos
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chama o assistente da OpenAI com uma pergunta e retorna a resposta
 * @param question Pergunta do usuário
 * @returns Resposta do assistente
 */
export async function callAssistant(question: string): Promise<string> {
  const OPENAI_API_KEY = getOpenAIApiKey();
  
  console.log('[OpenAI Assistant] Iniciando chamada para assistente:', ASSISTANT_ID);
  console.log('[OpenAI Assistant] Pergunta:', question.substring(0, 100) + '...');
  
  try {
    // 1) Criar thread + run
    console.log('[OpenAI Assistant] Criando thread e run...');
    const runRes = await fetch("https://api.openai.com/v1/threads/runs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        thread: {
          messages: [
            {
              role: "user",
              content: question,
            },
          ],
        },
      }),
    });

    if (!runRes.ok) {
      const errorText = await runRes.text();
      console.error('[OpenAI Assistant] Erro ao criar run:', runRes.status, errorText);
      throw new Error(`Erro ao criar run (${runRes.status}): ${errorText}`);
    }

    const runData = await runRes.json();
    console.log('[OpenAI Assistant] Run criado:', runData.id);
    
    if (!runData.thread_id || !runData.id) {
      throw new Error("Resposta inválida ao criar run: " + JSON.stringify(runData));
    }
    
    const threadId = runData.thread_id;
    const runId = runData.id;
    let status = runData.status;
    
    console.log('[OpenAI Assistant] Status inicial:', status);

    // 2) Checar o status até completar (com timeout de 60 segundos)
    const MAX_WAIT_TIME = 60000; // 60 segundos
    const startTime = Date.now();
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // Máximo de tentativas
    
    while ((status === "queued" || status === "in_progress") && attempts < MAX_ATTEMPTS) {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_WAIT_TIME) {
        throw new Error(`Timeout: Run não completou em ${MAX_WAIT_TIME}ms. Status atual: ${status}`);
      }
      
      await sleep(1200);
      attempts++;
      
      console.log(`[OpenAI Assistant] Verificando status (tentativa ${attempts}/${MAX_ATTEMPTS})...`);
      
      const checkRes = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      if (!checkRes.ok) {
        const errorText = await checkRes.text();
        console.error('[OpenAI Assistant] Erro ao verificar status:', checkRes.status, errorText);
        throw new Error(`Erro ao verificar status (${checkRes.status}): ${errorText}`);
      }

      const checkData = await checkRes.json();
      status = checkData.status;
      console.log(`[OpenAI Assistant] Status atual: ${status}`);
      
      // Verificar se há erro no run
      if (checkData.last_error) {
        console.error('[OpenAI Assistant] Erro no run:', checkData.last_error);
        throw new Error(`Erro no run: ${checkData.last_error.message || JSON.stringify(checkData.last_error)}`);
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      throw new Error(`Máximo de tentativas atingido. Status final: ${status}`);
    }

    if (status !== "completed") {
      console.error('[OpenAI Assistant] Run finalizou com status inválido:', status);
      throw new Error(`Run finalizou com status: ${status}. Verifique os logs para mais detalhes.`);
    }

    console.log('[OpenAI Assistant] Run completado, buscando mensagens...');

    // 3) Buscar a última resposta (mensagem do assistente)
    const msgRes = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/messages?limit=1&order=desc`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );

    if (!msgRes.ok) {
      const errorText = await msgRes.text();
      console.error('[OpenAI Assistant] Erro ao buscar mensagens:', msgRes.status, errorText);
      throw new Error(`Erro ao buscar mensagens (${msgRes.status}): ${errorText}`);
    }

    const messagesData = await msgRes.json();
    console.log('[OpenAI Assistant] Mensagens recebidas:', JSON.stringify(messagesData).substring(0, 200));
    
    if (!messagesData.data || !Array.isArray(messagesData.data) || messagesData.data.length === 0) {
      console.error('[OpenAI Assistant] Estrutura de mensagens inválida:', messagesData);
      throw new Error("Nenhuma mensagem encontrada na resposta do assistente");
    }

    const lastMsg = messagesData.data[0];
    console.log('[OpenAI Assistant] Última mensagem:', JSON.stringify(lastMsg).substring(0, 200));

    if (!lastMsg) {
      throw new Error("Mensagem vazia retornada pelo assistente");
    }

    // Verificar diferentes formatos de content
    let answer: string | null = null;
    
    if (lastMsg.content && Array.isArray(lastMsg.content)) {
      // Tentar diferentes formatos
      for (const contentItem of lastMsg.content) {
        if (contentItem.type === 'text' && contentItem.text) {
          answer = contentItem.text.value || contentItem.text;
          break;
        } else if (contentItem.text && typeof contentItem.text === 'string') {
          answer = contentItem.text;
          break;
        } else if (contentItem.text && contentItem.text.value) {
          answer = contentItem.text.value;
          break;
        }
      }
    } else if (lastMsg.content && typeof lastMsg.content === 'string') {
      answer = lastMsg.content;
    }

    if (!answer) {
      console.error('[OpenAI Assistant] Formato de conteúdo não reconhecido:', JSON.stringify(lastMsg.content));
      throw new Error("Formato de resposta não reconhecido. Estrutura: " + JSON.stringify(lastMsg.content));
    }

    console.log('[OpenAI Assistant] Resposta extraída com sucesso:', answer.substring(0, 100) + '...');
    return answer;
    
  } catch (error: any) {
    console.error('[OpenAI Assistant] Erro completo:', error);
    throw error;
  }
}

