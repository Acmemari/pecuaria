import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AnthropicProvider } from '../api/_lib/ai/providers/anthropic';

async function test() {
  const provider = new AnthropicProvider();
  console.log('Testing Anthropic native fetch request...');

  try {
    const res = await provider.complete({
      model: 'claude-3-haiku-20240307',
      userPrompt: 'Diz "Ola mundo" em 2 palavras.',
      systemPrompt: 'You are a helpful assistant',
      maxTokens: 50,
      temperature: 0.1,
    });
    console.log('✅ Anthropic Successful:', res);
  } catch (err) {
    console.error('❌ Anthropic Failed:');
    console.error(err);
  }
}

test();
