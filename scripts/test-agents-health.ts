#!/usr/bin/env npx tsx
/**
 * Testa GET /api/agents/health e POST /api/agents/run (401 sem token).
 * Execute com o servidor rodando: npm run dev:api (em outro terminal)
 * Nota: Se port 3001 estiver ocupada (ex: Vite), use API_URL=http://localhost:3002
 */
async function main() {
  const base = process.env.API_URL || 'http://localhost:3001';
  console.log('Testing', base);
  // 1. Health
  console.log('\n1. GET /api/agents/health');
  try {
    const res = await fetch(base + '/api/agents/health');
    const text = await res.text();
    console.log('Status:', res.status);
    try {
      const json = JSON.parse(text);
      console.log('Body:', JSON.stringify(json, null, 2));
    } catch {
      console.log('Body (raw):', text.slice(0, 300));
    }
  } catch (e) {
    console.error('Error:', (e as Error).message);
  }
  // 2. Agents run (deve retornar 401 sem token)
  console.log('\n2. POST /api/agents/run (sem auth)');
  try {
    const res = await fetch(base + '/api/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'feedback',
        input: {
          context: 'desempenho',
          feedbackType: 'construtivo',
          objective: 'teste objetivo',
          recipient: 'Teste',
          tone: 'motivador',
          format: 'escrito',
          model: 'auto',
          lengthPreference: 'medio',
        },
      }),
    });
    const text = await res.text();
    console.log('Status:', res.status, res.status === 401 ? '(esperado sem token)' : '');
    if (res.status === 401) console.log('OK: endpoint acessível, auth requerida');
  } catch (e) {
    console.error('Error:', (e as Error).message);
  }
}
main();
