import type { AIProvider } from '../../ai/types.js';
import { safeJsonParseWithRepair } from '../../ai/json-repair.js';
import { damagesGenOutputSchema, type DamagesGenInput, type DamagesGenOutput } from './manifest.js';

const BASE_SYSTEM_PROMPT = `Você é um consultor especializado em gestão pecuária e comportamento organizacional.
Sua tarefa é deduzir e descrever os prejuízos (operacionais, financeiros ou de clima) decorrentes de uma situação específica.

REGRAS:
- Seja direto e profissional.
- Use o tom pragmático do Método Antonio Chaker.
- Foque em consequências reais na fazenda (ex: atraso na pesagem, perda de janela de manejo, desmotivação da equipe, retrabalho, custos extras).
- Gere uma lista curta de 3 a 5 itens, um por linha.
- Não use números, use apenas marcadores (como • ou -).
- Responda apenas em formato JSON.`;

const JSON_FORMAT_INSTRUCTIONS = `{
  "damages": "• Item 1\\n• Item 2\\n• Item 3"
}`;

const SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}\n\nFORMATO JSON:\n${JSON_FORMAT_INSTRUCTIONS}`;

export async function runDamagesGenAgent(args: {
  input: DamagesGenInput;
  provider: AIProvider;
  model: string;
  systemPrompt?: string;
}): Promise<{
  data: DamagesGenOutput;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
}> {
  const userPrompt = `Gere os prejuízos para esta situação:
Objetivo do feedback: ${args.input.objective}
O que ocorreu: ${args.input.whatHappened}
Contexto: ${args.input.context || 'Geral'}`;

  const finalSystemPrompt = args.systemPrompt
    ? `${args.systemPrompt}\n\nIMPORTANTE: Você deve obrigatoriamente retornar a resposta no formato JSON abaixo:\n${JSON_FORMAT_INSTRUCTIONS}`
    : SYSTEM_PROMPT;

  const response = await args.provider.complete({
    model: args.model,
    systemPrompt: finalSystemPrompt,
    userPrompt,
    responseFormat: 'json',
    temperature: 0.7,
    maxTokens: 500,
    timeoutMs: 30_000,
  });

  const parsed = safeJsonParseWithRepair<DamagesGenOutput>(response.content, damagesGenOutputSchema);

  if (!parsed.success) {
    throw new Error('Falha ao gerar prejuízos automaticamente.');
  }

  return {
    data: parsed.data,
    rawContent: response.content,
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}
