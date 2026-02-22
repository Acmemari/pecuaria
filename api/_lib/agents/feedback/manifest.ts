import { z } from 'zod';
import type { AgentManifest } from '../../ai/types';

const FEEDBACK_CONTEXTS = ['trabalho', 'lideranca', 'pessoal'] as const;
const FEEDBACK_TYPES = ['positivo', 'construtivo', 'misto'] as const;
const FEEDBACK_TONES = ['formal', 'direto', 'motivador', 'tecnico', 'informal'] as const;
const FEEDBACK_FORMATS = ['escrito', 'falado'] as const;
const FEEDBACK_STRUCTURES = ['sbi', 'sanduiche', 'feedforward', 'auto'] as const;
const FEEDBACK_LENGTHS = ['curto', 'medio', 'longo'] as const;

export const feedbackInputSchema = z.object({
  context: z.enum(FEEDBACK_CONTEXTS),
  feedbackType: z.enum(FEEDBACK_TYPES),
  objective: z.string().min(5, 'O objetivo deve ter pelo menos 5 caracteres.'),
  recipient: z.string().min(2, 'O destinatário deve ter pelo menos 2 caracteres.'),
  whatHappened: z.string().optional().default(''),
  eventDate: z.string().optional().default(''),
  eventMoment: z.string().optional().default(''),
  damages: z.string().optional().default(''),
  tone: z.enum(FEEDBACK_TONES),
  format: z.enum(FEEDBACK_FORMATS),
  model: z.enum(FEEDBACK_STRUCTURES),
  existingText: z.string().optional().default(''),
  lengthPreference: z.enum(FEEDBACK_LENGTHS),
});

export const feedbackOutputSchema = z.object({
  feedback: z.string().min(10),
  structure: z.enum(['SBI', 'Sanduíche', 'Feedforward']),
  tips: z.array(z.string()).max(6),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type FeedbackOutput = z.infer<typeof feedbackOutputSchema>;

export const feedbackManifest: AgentManifest = {
  id: 'feedback',
  version: '1.0.0',
  name: 'Assistente de Feedback',
  description: 'Gera, reescreve e adapta feedbacks construtivos com modelos profissionais.',
  inputSchema: feedbackInputSchema,
  outputSchema: feedbackOutputSchema,
  modelPolicy: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    fallback: [
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'anthropic', model: 'claude-3-5-haiku-latest' },
    ],
  },
  estimatedTokensPerCall: 1500,
};

