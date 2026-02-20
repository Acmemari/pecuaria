import type { AIProvider } from '../../ai/types';
import { safeJsonParseWithRepair } from '../../ai/json-repair';
import { feedbackOutputSchema, type FeedbackInput, type FeedbackOutput } from './manifest';

const SYSTEM_PROMPT = [
  'Você é um especialista em comunicação interpessoal, desenvolvimento profissional e gestão de desempenho.',
  'Sua função é ajudar o usuário a criar feedbacks claros, objetivos, respeitosos e construtivos.',
  '',
  'Regras obrigatórias:',
  '- Responda sempre em português do Brasil.',
  '- Foque em comportamentos e fatos observáveis, nunca em ataques pessoais.',
  '- Evite termos absolutos como "sempre" e "nunca".',
  '- Evite julgamentos e rótulos, use comunicação não violenta.',
  '- Adapte tom conforme solicitado (formal, informal, técnico, motivador ou direto).',
  '- Escolha e aplique um modelo: SBI, Sanduíche ou Feedforward.',
  '- Se o usuário fornecer texto existente, reescreva mantendo a intenção e elevando qualidade.',
  '- Entregue saída APENAS em JSON válido.',
  '',
  'Formato JSON obrigatório:',
  '{',
  '  "feedback": "texto final completo",',
  '  "structure": "SBI|Sanduíche|Feedforward",',
  '  "tips": ["dica 1", "dica 2"]',
  '}',
].join('\n');

function labelOfModel(model: FeedbackInput['model']): string {
  if (model === 'sbi') return 'SBI';
  if (model === 'sanduiche') return 'Sanduíche';
  if (model === 'feedforward') return 'Feedforward';
  return 'Automático (escolha o melhor entre SBI, Sanduíche e Feedforward)';
}

function buildUserPrompt(input: FeedbackInput): string {
  const lines = [
    'Crie um feedback profissional com base nestes dados:',
    `Contexto: ${input.context}`,
    `Tipo de feedback: ${input.feedbackType}`,
    `Objetivo: ${input.objective}`,
    `Destinatário: ${input.recipient}`,
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
}): Promise<{
  data: FeedbackOutput;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
}> {
  const response = await args.provider.complete({
    model: args.model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(args.input),
    responseFormat: 'json',
    temperature: 0.5,
    maxTokens: 4000,
    timeoutMs: 45_000,
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

