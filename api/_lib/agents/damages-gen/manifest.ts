import { z } from 'zod';
import type { AgentManifest } from '../../ai/types.js';

export const damagesGenInputSchema = z.object({
  objective: z.string(),
  whatHappened: z.string(),
  context: z.string().optional(),
});

export const damagesGenOutputSchema = z.object({
  damages: z.string(),
});

export type DamagesGenInput = z.infer<typeof damagesGenInputSchema>;
export type DamagesGenOutput = z.infer<typeof damagesGenOutputSchema>;

export const damagesGenManifest: AgentManifest = {
  id: 'damages-gen',
  version: '1.0.0',
  name: 'Gerenciador de Prejuízos',
  description: 'Gera uma descrição de prejuízos baseada em um ocorrido.',
  inputSchema: damagesGenInputSchema,
  outputSchema: damagesGenOutputSchema,
  modelPolicy: {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    fallback: [{ provider: 'openai', model: 'gpt-4o-mini' }],
  },
  estimatedTokensPerCall: 500,
};
