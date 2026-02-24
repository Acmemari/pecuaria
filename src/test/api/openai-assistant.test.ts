// src/test/api/openai-assistant.test.ts
/**
 * Testes para validar a integração com OpenAI Assistant API
 * Execute: npm test -- openai-assistant
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { callAssistant } from '../../../lib/server/openai/assistantClient';

const hasApiKey = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasApiKey)('OpenAI Assistant API Integration', () => {
  // Verificar se a API key está configurada
  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('OPENAI_API_KEY não está configurada. Testes de OpenAI serão pulados.');
    }
  });

  it('deve ter OPENAI_API_KEY configurada', () => {
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    expect(process.env.OPENAI_API_KEY).not.toBe('');
    expect(process.env.OPENAI_API_KEY.startsWith('sk-')).toBe(true);
  });

  it('deve responder a uma pergunta simples', async () => {
    const question = 'Olá, como você está?';
    const response = await callAssistant(question);

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
    expect(typeof response.answer).toBe('string');
    expect(response.answer.length).toBeGreaterThan(0);
    console.log('✅ Resposta recebida:', response.answer.substring(0, 100));
  }, 90000); // Timeout de 90 segundos

  it('deve responder sobre gestão pecuária', async () => {
    const question = 'O que é GMD na pecuária?';
    const response = await callAssistant(question);

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
    expect(typeof response.answer).toBe('string');
    expect(response.answer.length).toBeGreaterThan(10);
    console.log('✅ Resposta sobre GMD:', response.answer.substring(0, 150));
  }, 90000);

  it('deve responder sobre cálculo de lucro', async () => {
    const question = 'Como calcular o lucro por cabeça de gado?';
    const response = await callAssistant(question);

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
    expect(typeof response.answer).toBe('string');
    expect(response.answer.length).toBeGreaterThan(20);
    console.log('✅ Resposta sobre lucro:', response.answer.substring(0, 150));
  }, 90000);

  it('deve lidar com perguntas em português', async () => {
    const question = 'Explique sobre lotação de pasto';
    const response = await callAssistant(question);

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
    expect(typeof response.answer).toBe('string');
    expect(response.answer.length).toBeGreaterThan(10);
    console.log('✅ Resposta em português:', response.answer.substring(0, 150));
  }, 90000);

  it('deve retornar erro para pergunta vazia', async () => {
    await expect(callAssistant('')).rejects.toThrow();
  }, 30000);

  it('deve retornar resposta em tempo razoável', async () => {
    const startTime = Date.now();
    const question = 'O que é pecuária?';
    const response = await callAssistant(question);
    const elapsed = Date.now() - startTime;

    expect(response).toBeDefined();
    expect(response.answer).toBeDefined();
    expect(elapsed).toBeLessThan(60000); // Deve responder em menos de 60 segundos
    console.log(`✅ Tempo de resposta: ${elapsed}ms`);
  }, 90000);
});
