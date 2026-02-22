import type { AIProvider } from '../../ai/types.js';
import { safeJsonParseWithRepair } from '../../ai/json-repair.js';
import { feedbackOutputSchema, type FeedbackInput, type FeedbackOutput } from './manifest.js';

const BASE_SYSTEM_PROMPT = [
  'Você é um especialista em comunicação interpessoal, desenvolvimento profissional e gestão de desempenho.',
  'Sua função é ajudar o usuário a criar feedbacks claros, objetivos, respeitosos e construtivos.',
  '',
  'Regras obrigatórias:',
  '- Responda sempre em português do Brasil.',
  '- NUNCA alucine: o feedback deve mencionar APENAS fatos, comportamentos e situações que estejam explícitos no contexto fornecido pelo usuário (O que ocorreu, objetivo, etc.). Não invente situações não descritas (ex.: interromper colegas, tom elevado) se não constarem no conteúdo alimentado.',
  '- Foque em comportamentos e fatos observáveis, nunca em ataques pessoais.',
  '- Evite termos absolutos como "sempre" e "nunca".',
  '- Evite julgamentos e rótulos, use comunicação não violenta.',
  '- Adapte tom conforme solicitado (formal, informal, técnico, motivador ou direto).',
  '- Escolha e aplique o modelo especificado: Sanduíche, Feedforward ou MARCA (Momento, Ação, Resultado, Caminho, Acordo).',
  '- MÉTODO MARCA: M-Momento (contexto sem acusações), A-Ação (comportamentos práticos), R-Resultado (consequências dos atos), C-Caminho (orientação futura e solução), A-Acordo (verificar entendimento). O texto deve ser corrido sem mencionar explicitamente a sigla ou as letras do método.',
  '- Se o usuário fornecer texto existente, reescreva mantendo a intenção e elevando qualidade.',
  '- Entregue saída APENAS em JSON válido.',
].join('\n');

const JSON_FORMAT_INSTRUCTIONS = `
Formato JSON obrigatório:
{
  "feedback": "texto final completo",
  "structure": "Sanduíche|Feedforward|MARCA",
  "tips": ["dica 1", "dica 2"]
}`;

const SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}\n${JSON_FORMAT_INSTRUCTIONS}`;

function labelOfModel(model: FeedbackInput['model']): string {
  if (model === 'sanduiche') return 'Sanduíche';
  if (model === 'feedforward') return 'Feedforward';
  if (model === 'marca') return 'Método MARCA (Momento, Ação, Resultado, Caminho, Acordo)';
  return 'Automático (escolha o melhor entre MARCA e Feedforward; não use Sanduíche)';
}

function buildUserPrompt(input: FeedbackInput): string {
  const lines = [
    'Crie um feedback profissional com base nestes dados:',
    `Contexto: ${input.context}`,
    `Tipo de feedback: ${input.feedbackType}`,
    `Objetivo: ${input.objective}`,
    `Destinatário: ${input.recipient}`,
    `O que ocorreu: ${input.whatHappened || 'Não informado'}`,
    `Data do ocorrido: ${input.eventDate || 'Não informada'}`,
    `Momento do ocorrido: ${input.eventMoment || 'Não informado'}`,
    `Prejuízos para a fazenda e pessoais: ${input.damages || 'Não informado'}`,
    `Tom desejado: ${input.tone}`,
    `Formato de uso: ${input.format}`,
    `Estrutura preferida: ${labelOfModel(input.model)}`,
    `Tamanho desejado: ${input.lengthPreference}`,
  ];

  if (input.existingText?.trim()) {
    lines.push('Texto atual para melhorar:');
    lines.push(input.existingText.trim());
  }

  lines.push(
    'Inclua no campo "tips" orientações práticas para melhorar a conversa de feedback.'
  );

  return lines.join('\n');
}

export async function runFeedbackAgent(args: {
  input: FeedbackInput;
  provider: AIProvider;
  model: string;
  systemPrompt?: string;
}): Promise<{
  data: FeedbackOutput;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
}> {
  const finalSystemPrompt = args.systemPrompt
    ? `${args.systemPrompt}\n\nIMPORTANTE: Você deve obrigatoriamente retornar a resposta no formato JSON abaixo:\n${JSON_FORMAT_INSTRUCTIONS}`
    : SYSTEM_PROMPT;

  const response = await args.provider.complete({
    model: args.model,
    systemPrompt: finalSystemPrompt,
    userPrompt: buildUserPrompt(args.input),
    responseFormat: 'json',
    temperature: 0.5,
    maxTokens: 4000,
    timeoutMs: 55_000,
  });

  const parsed = safeJsonParseWithRepair<FeedbackOutput>(response.content, feedbackOutputSchema);
  if (!parsed.success) {
    const parseError = 'error' in parsed ? parsed.error : 'unknown parse error';
    throw new Error(`FEEDBACK_AGENT_OUTPUT_INVALID: ${parseError}`);
  }

  return {
    data: parsed.data,
    rawContent: response.content,
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

