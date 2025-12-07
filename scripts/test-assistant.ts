// scripts/test-assistant.ts
/**
 * Script para testar manualmente a API do OpenAI Assistant
 * Execute: tsx scripts/test-assistant.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { callAssistant } from '../lib/server/openai/assistantClient';

// Carregar variáveis de ambiente do .env.local
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function testAssistant() {
  console.log('🧪 Testando OpenAI Assistant API...\n');

  // Verificar API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não está configurada!');
    console.log('Configure no .env.local ou variáveis de ambiente.');
    process.exit(1);
  }

  console.log('✅ OPENAI_API_KEY configurada\n');

  const testQuestions = [
    'Olá, como você está?',
    'O que é GMD na pecuária?',
    'Como calcular o lucro por cabeça de gado?',
    'Explique sobre lotação de pasto',
  ];

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`\n📝 Teste ${i + 1}/${testQuestions.length}`);
    console.log(`Pergunta: ${question}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const answer = await callAssistant(question);
      const elapsed = Date.now() - startTime;

      console.log(`✅ Resposta recebida em ${elapsed}ms:`);
      console.log(answer);
      console.log('─'.repeat(60));
    } catch (error: any) {
      console.error(`❌ Erro no teste ${i + 1}:`);
      console.error(error.message);
      console.error(error.stack);
      console.log('─'.repeat(60));
    }

    // Aguardar um pouco entre testes para não sobrecarregar a API
    if (i < testQuestions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ Todos os testes concluídos!');
}

testAssistant().catch(console.error);

