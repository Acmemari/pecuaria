import type { AIProvider } from '../../ai/types';
import { safeJsonParseWithRepair } from '../../ai/json-repair';
import { helloOutputSchema, type HelloInput, type HelloOutput } from './manifest';

export async function runHelloAgent(args: {
  input: HelloInput;
  provider: AIProvider;
  model: string;
}): Promise<{
  data: HelloOutput;
  rawContent: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
}> {
  const prompt = [
    'Return only valid JSON with keys: greeting and timestamp.',
    `Name: ${args.input.name}`,
    'greeting must be a friendly short sentence in Portuguese.',
    'timestamp must be an ISO datetime string.',
  ].join('\n');

  const response = await args.provider.complete({
    model: args.model,
    systemPrompt: 'You are a deterministic JSON API generator.',
    userPrompt: prompt,
    responseFormat: 'json',
    temperature: 0,
    maxTokens: 200,
    timeoutMs: 30_000,
  });

  const parsed = safeJsonParseWithRepair<HelloOutput>(response.content, helloOutputSchema);
  if (!parsed.success) {
    throw new Error(`HELLO_AGENT_OUTPUT_INVALID: ${parsed.error}`);
  }

  return {
    data: parsed.data,
    rawContent: response.content,
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

