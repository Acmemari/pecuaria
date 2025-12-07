// src/test/api/openai-assistant.test.ts
/**
 * Testes para validar a integração com OpenAI Assistant API
 * Execute: npm test -- openai-assistant
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { callAssistant } from '../../../lib/server/openai/assistantClient';

describe('OpenAI Assistant API Integration', () => {
  // Verificar se a API key está configurada
  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY não está configurada. Configure no .env.local ou variáveis de ambiente.'
      );
    }
  });

  it('deve ter OPENAI_API_KEY configurada', () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    expect(process.env.OPENAI_API_KEY).not.toBe('');
    expect(process.env.OPENAI_API_KEY.startsWith('sk-')).toBe(true);
  });

  it('deve responder a uma pergunta simples', async () => {
    const question = 'Olá, como você está?';
    const answer = await callAssistant(question);

    expect(answer).toBeDefined();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(0);
    console.log('✅ Resposta recebida:', answer.substring(0, 100));
  }, 90000); // Timeout de 90 segundos

  it('deve responder sobre gestão pecuária', async () => {
    const question = 'O que é GMD na pecuária?';
    const answer = await callAssistant(question);

    expect(answer).toBeDefined();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(10);
    console.log('✅ Resposta sobre GMD:', answer.substring(0, 150));
  }, 90000);

  it('deve responder sobre cálculo de lucro', async () => {
    const question = 'Como calcular o lucro por cabeça de gado?';
    const answer = await callAssistant(question);

    expect(answer).toBeDefined();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(20);
    console.log('✅ Resposta sobre lucro:', answer.substring(0, 150));
  }, 90000);

  it('deve lidar com perguntas em português', async () => {
    const question = 'Explique sobre lotação de pasto';
    const answer = await callAssistant(question);

    expect(answer).toBeDefined();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(10);
    console.log('✅ Resposta em português:', answer.substring(0, 150));
  }, 90000);

  it('deve retornar erro para pergunta vazia', async () => {
    await expect(callAssistant('')).rejects.toThrow();
  }, 30000);

  it('deve retornar resposta em tempo razoável', async () => {
    const startTime = Date.now();
    const question = 'O que é pecuária?';
    const answer = await callAssistant(question);
    const elapsed = Date.now() - startTime;

    expect(answer).toBeDefined();
    expect(elapsed).toBeLessThan(60000); // Deve responder em menos de 60 segundos
    console.log(`✅ Tempo de resposta: ${elapsed}ms`);
  }, 90000);
});

