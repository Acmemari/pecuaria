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
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não definida nas variáveis de ambiente do servidor");
  }
  return apiKey;
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
  
  // 1) Criar thread + run
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
    throw new Error("Erro ao criar run: " + errorText);
  }

  const runData = await runRes.json();
  const threadId = runData.thread_id;
  const runId = runData.id;

  // 2) Checar o status até completar
  let status = runData.status;
  while (status === "queued" || status === "in_progress") {
    await sleep(1200);

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
      throw new Error("Erro ao verificar status: " + errorText);
    }

    const checkData = await checkRes.json();
    status = checkData.status;
  }

  if (status !== "completed") {
    throw new Error("Run finalizou com status: " + status);
  }

  // 3) Buscar a última resposta (mensagem do assistente)
  const msgRes = await fetch(
    `https://api.openai.com/v1/threads/${threadId}/messages?limit=1`,
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
    throw new Error("Erro ao buscar mensagens: " + errorText);
  }

  const messagesData = await msgRes.json();
  const lastMsg = messagesData.data[0];

  if (!lastMsg || !lastMsg.content || !lastMsg.content[0]) {
    throw new Error("Resposta vazia do assistente");
  }

  const answer = lastMsg.content[0].text.value;
  return answer;
}

