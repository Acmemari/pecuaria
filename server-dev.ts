// server-dev.ts
// Servidor de desenvolvimento para processar API routes localmente
// Execute: tsx server-dev.ts (em paralelo com npm run dev)
// OU use: npm run dev:all (para rodar ambos juntos)

import dotenv from 'dotenv';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Carrega .env padrão
dotenv.config();

// Carrega .env.local se existir (para segredos locais)
if (fs.existsSync('.env.local')) {
  console.log('📄 Carregando variáveis de .env.local');
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const app = express();
const PORT = 3001; // Porta diferente do Vite (3000)

app.use(cors());
app.use(express.json());

// Importar o handler dinamicamente
app.post('/api/ask-assistant', async (req, res) => {
  try {
    const module = await import('./api/ask-assistant.ts');
    const handler = module.default;
    const vercelReq = { method: req.method, body: req.body, headers: req.headers, query: req.query } as VercelRequest;
    let statusCode = 200;
    const vercelRes = {
      status: (code: number) => { statusCode = code; return vercelRes; },
      json: (data: any) => { res.status(statusCode).json(data); }
    } as unknown as VercelResponse;
    await handler(vercelReq, vercelRes);
  } catch (error: any) {
    console.error('❌ Erro no servidor dev:', error);
    res.status(500).json({ error: error.message || 'Erro interno no servidor de desenvolvimento' });
  }
});

app.post('/api/questionnaire-insights', async (req, res) => {
  console.log('[server-dev] Recebendo requisição para /api/questionnaire-insights');
  console.log('[server-dev] Body:', JSON.stringify(req.body).substring(0, 100));

  try {
    console.log('[server-dev] Tentando importar módulo...');
    const module = await import('./api/questionnaire-insights.ts');
    console.log('[server-dev] Módulo importado');

    const handler = module.default;
    const vercelReq = { method: req.method, body: req.body, headers: req.headers, query: req.query } as VercelRequest;
    let statusCode = 200;
    const vercelRes = {
      status: (code: number) => { statusCode = code; return vercelRes; },
      json: (data: any) => { res.status(statusCode).json(data); }
    } as unknown as VercelResponse;

    console.log('[server-dev] Chamando handler...');
    await handler(vercelReq, vercelRes);
    console.log('[server-dev] Handler executado');
  } catch (error: any) {
    console.error('[server-dev] ❌ Erro:', error.message);
    console.error('[server-dev] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Erro ao gerar insights', stack: error.stack });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor de desenvolvimento da API rodando em http://localhost:${PORT}`);
  console.log(`📝 O Vite está configurado para fazer proxy de /api/* para este servidor\n`);
});
