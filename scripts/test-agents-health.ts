// scripts/test-agents-health.ts
/**
 * Script para testar o health check do pipeline de agentes.
 * Execute: npm run test:agents-health
 *
 * Pré-requisito: servidor de API rodando em outro terminal:
 *   npm run dev:api   (ou npm run dev:all)
 *
 * Testa contra localhost:3001 ou URL em AGENTS_HEALTH_URL.
 */

const BASE_URL = process.env.AGENTS_HEALTH_URL ?? 'http://localhost:3001';

function fail(msg: string, hint?: string): never {
  console.error(msg);
  if (hint) console.log('\n' + hint);
  process.exitCode = 1;
  throw new Error(msg);
}

async function fetchHealth(baseUrl: string): Promise<{ res: Response; raw: string }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/agents-health`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const raw = await res.text();
  return { res, raw };
}

async function testAgentsHealth() {
  console.log(`🧪 Testando GET ${BASE_URL}/api/agents-health\n`);

  const hint =
    'Certifique-se de que o servidor de API está rodando em outro terminal:\n' +
    '  npm run dev:api\n' +
    'Ou use npm run dev:all para subir Vite + API juntos.';

  try {
    let res: Response;
    let raw: string;

    try {
      const result = await fetchHealth(BASE_URL);
      res = result.res;
      raw = result.raw;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        fail('❌ Não foi possível conectar à API (porta 3001). O servidor está rodando?', hint);
      }
      throw err;
    }

    let data: { status?: string; checks?: Record<string, unknown> } = {};
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      if (raw.startsWith('<!') || raw.includes('<!DOCTYPE')) {
        fail(
          '❌ Resposta HTML recebida. A API (porta 3001) não está respondendo com JSON.\n' +
            '   Provavelmente só o Vite está rodando. Inicie a API em outro terminal.',
          hint,
        );
      }
      if (raw.includes('Cannot GET') || raw.includes('Cannot POST')) {
        fail(
          '❌ Rota /api/agents-health não encontrada (404).\n' +
            '   Reinicie o servidor: Ctrl+C e depois npm run dev:api',
          hint,
        );
      }
      fail('❌ Resposta inesperada: ' + raw.slice(0, 150), hint);
    }

    if (!res.ok) {
      console.error('❌ Resposta não-OK:', res.status, res.statusText);
      console.log(JSON.stringify(data, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log('✅ Status:', data.status);
    console.log('📋 Checks:\n');
    for (const [key, check] of Object.entries(data.checks ?? {})) {
      const c = check as { ok: boolean; message?: string };
      const icon = c.ok ? '✓' : '✗';
      console.log(`  ${icon} ${key}: ${c.message ?? (c.ok ? 'ok' : 'failed')}`);
    }
    console.log('\n✅ Health check concluído.');
  } catch (err) {
    if (process.exitCode === 1) return;
    console.error('❌ Erro:', err instanceof Error ? err.message : err);
    console.log('\n' + hint);
    process.exitCode = 1;
  }
}

testAgentsHealth();
