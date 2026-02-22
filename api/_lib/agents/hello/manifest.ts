import { z } from 'zod';
import type { AgentManifest } from '../../ai/types.js';

export const helloInputSchema = z.object({
  name: z.string().min(1, 'name is required'),
});

export const helloOutputSchema = z.object({
  greeting: z.string(),
  timestamp: z.string(),
});

export type HelloInput = z.infer<typeof helloInputSchema>;
export type HelloOutput = z.infer<typeof helloOutputSchema>;

export const helloManifest: AgentManifest = {
  id: 'hello',
  version: '1.0.0',
  name: 'Hello Agent',
  description: 'Dummy agent to validate end-to-end infra pipeline.',
  inputSchema: helloInputSchema,
  outputSchema: helloOutputSchema,
  modelPolicy: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    fallback: [
      { provider: 'openai', model: 'gpt-4o-mini' },
      { provider: 'anthropic', model: 'claude-3-5-haiku-latest' },
    ],
  },
  estimatedTokensPerCall: 100,
};

