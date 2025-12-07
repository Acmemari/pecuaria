// server-dev.mjs
// Servidor de desenvolvimento para processar API routes localmente
// Execute: tsx server-dev.mjs (em paralelo com npm run dev)
// OU use: npm run dev:all (para rodar ambos juntos)

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001; // Porta diferente do Vite (3000)

app.use(cors());
app.use(express.json());

// Importar o handler dinamicamente
app.post('/api/ask-assistant', async (req, res) => {
  try {
    // Importar dinamicamente (precisa usar file extension para TypeScript)
    const module = await import('./api/ask-assistant.ts');
    const handler = module.default;
    
    // Criar objetos req/res compatíveis com Vercel
    const vercelReq = {
      method: req.method,
      body: req.body,
      headers: req.headers,
      query: req.query,
    };
    
    let statusCode = 200;
    const vercelRes = {
      status: (code) => {
        statusCode = code;
        return vercelRes;
      },
      json: (data) => {
        res.status(statusCode).json(data);
      },
    };
    
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error('❌ Erro no servidor dev:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno no servidor de desenvolvimento' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor de desenvolvimento da API rodando em http://localhost:${PORT}`);
  console.log(`📝 O Vite está configurado para fazer proxy de /api/* para este servidor\n`);
});

