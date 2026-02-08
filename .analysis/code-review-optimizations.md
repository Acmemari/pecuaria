# Otimizações Sugeridas - Revisão de Código

## 🎯 Prioridade Alta (Aplicar antes do commit)

### 1. Limpar Arquivos de Teste
```bash
# Remover arquivos de teste temporários
rm test-api-rest.ts test-api-simple.ts test-direct.ts test-first-gemini.ts
rm test-handler.ts test-models.ts test-rest-generate.ts list-models.ts find-flash.ts
rm test-output.txt models-list.txt models.txt 2>/dev/null
```

### 2. Consolidar Logs de Erro (api/geminiClient.ts)
**Linha ~110-113**
```typescript
// ANTES
console.error('[Gemini Assistant] Erro completo:', error);
console.error('[Gemini Assistant] Tipo:', error.constructor?.name);
console.error('[Gemini Assistant] Status:', error.status);
console.error('[Gemini Assistant] StatusText:', error.statusText);

// DEPOIS
console.error('[Gemini Assistant] Erro:', {
  message: error.message,
  type: error.constructor?.name,
  status: error.status,
  statusText: error.statusText,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
```

## 📊 Prioridade Média (Considerar para próximo PR)

### 3. Extrair Constantes (api/geminiClient.ts)
```typescript
// No topo do arquivo
const GEMINI_CONFIG = {
  MODEL: 'models/gemini-2.5-flash' as const,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

const ERROR_MESSAGES = {
  MODEL_NOT_FOUND: 'Modelo não encontrado (404). Verifique se a chave da API está correta e se o modelo está disponível.',
  AUTH_ERROR: 'Erro de autenticação com Gemini. Verifique se a GEMINI_API_KEY está correta.',
  RATE_LIMIT: 'Limite de quota atingido. Verifique sua conta Google AI Studio.',
  SAFETY_BLOCK: 'Resposta bloqueada por filtros de segurança do Gemini.',
} as const;
```

### 4. Refatorar server-dev.ts
```typescript
// Criar helper para mocks Vercel
function createVercelMocks(req: express.Request, res: express.Response) {
  let statusCode = 200;
  
  const vercelReq = {
    method: req.method,
    body: req.body,
    headers: req.headers,
    query: req.query
  } as VercelRequest;
  
  const vercelRes = {
    status: (code: number) => {
      statusCode = code;
      return vercelRes;
    },
    json: (data: any) => {
      res.status(statusCode).json(data);
    }
  } as unknown as VercelResponse;
  
  return { vercelReq, vercelRes };
}

// Criar handler genérico
async function handleApiRoute(
  routePath: string,
  req: express.Request,
  res: express.Response
) {
  console.log(`[server-dev] ${req.method} ${routePath}`);
  
  try {
    const module = await import(`.${routePath}.ts`);
    const handler = module.default;
    const { vercelReq, vercelRes } = createVercelMocks(req, res);
    
    await handler(vercelReq, vercelRes);
  } catch (error: any) {
    console.error(`[server-dev] Erro em ${routePath}:`, {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: error.message || 'Erro interno',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// Usar nos endpoints
app.post('/api/ask-assistant', (req, res) => 
  handleApiRoute('/api/ask-assistant', req, res)
);

app.post('/api/questionnaire-insights', (req, res) => 
  handleApiRoute('/api/questionnaire-insights', req, res)
);
```

## 🔄 Prioridade Baixa (Melhorias futuras)

### 5. Adicionar Validação de Input
```typescript
// Em api/geminiClient.ts
export async function callAssistant(question: string): Promise<AssistantResponse> {
  // Validação
  if (!question || question.trim().length === 0) {
    throw new Error('Pergunta vazia não é permitida');
  }
  
  if (question.length > 10000) {
    throw new Error('Pergunta muito longa (máximo 10000 caracteres)');
  }
  
  // ... resto do código
}
```

### 6. Adicionar Retry Logic
```typescript
// Helper para retry
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      // Retry apenas em erros temporários
      if (error.status === 429 || error.status === 503) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 7. Melhorar Logs de Produção
```typescript
// Criar logger condicional
const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};

// Usar no código
logger.log('[Gemini Assistant] Enviando mensagem...');
```

## ✅ Checklist Final

Antes de fazer commit:
- [ ] Deletar arquivos de teste temporários
- [ ] Consolidar logs de erro
- [ ] Verificar se não há console.log desnecessários
- [ ] Testar funcionalidade "Gerar Insights com IA"
- [ ] Verificar se o servidor inicia corretamente
- [ ] Rodar testes (se houver)

## 📝 Mensagem de Commit Sugerida

```
fix: Corrigir integração com Gemini API e melhorar UX

- Atualizar modelo para gemini-2.5-flash (404 fix)
- Remover personalidade "Antonio Chaker" das respostas
- Adicionar instrução para iniciar com "Analisando seus resultados..."
- Melhorar tratamento de erros (404, safety, rate limit)
- Converter server-dev.mjs para TypeScript
- Adicionar logs detalhados para debug

Closes #[número-da-issue]
```
