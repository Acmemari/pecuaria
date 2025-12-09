# Configuração da API no Vercel - `/api/ask-assistant`

## Como Funciona

O Vercel detecta automaticamente arquivos TypeScript na pasta `api/` e os compila para JavaScript durante o deploy.

### Estrutura do Arquivo

```
api/
  └── ask-assistant.ts  ← Arquivo TypeScript (fonte)
```

**Em produção, o Vercel compila para:**
```
/api/ask-assistant.js  ← Arquivo JavaScript compilado (automático)
```

## Verificação

### 1. Verificar se o arquivo está sendo detectado

No Vercel Dashboard:
1. Vá em **Functions**
2. Procure por `api/ask-assistant`
3. Se aparecer, está configurado corretamente ✅

### 2. Verificar os Logs

1. No Vercel Dashboard, vá em **Functions**
2. Clique em `api/ask-assistant`
3. Vá na aba **Logs**
4. Faça uma requisição de teste
5. Procure por mensagens como:
   - `[API] Requisição recebida` ✅ Funcionando
   - `[API] OPENAI_API_KEY não configurada` ❌ Problema

### 3. Testar o Endpoint

Você pode testar diretamente fazendo uma requisição POST:

```bash
curl -X POST https://seu-projeto.vercel.app/api/ask-assistant \
  -H "Content-Type: application/json" \
  -d '{"question": "Olá"}'
```

Ou usando o navegador (apenas para verificar se o endpoint existe):
- Acesse: `https://seu-projeto.vercel.app/api/ask-assistant`
- Deve retornar: `{"error":"Método não permitido"}` (porque é GET, mas o endpoint aceita apenas POST)

## Problemas Comuns

### Erro: "Function not found" ou 404

**Causa:** Arquivo não está sendo detectado pelo Vercel

**Solução:**
1. Verifique se o arquivo está em `api/ask-assistant.ts` (não `api/ask-assistant.js`)
2. Certifique-se de que o arquivo exporta um `default` handler
3. Faça um novo deploy

### Erro: "Module not found" ou erro de importação

**Causa:** Dependências não estão instaladas ou caminho incorreto

**Solução:**
1. Verifique se `@vercel/node` está em `dependencies` ou `devDependencies`
2. Verifique se o caminho do import está correto: `'../lib/server/openai/assistantClient'`
3. Certifique-se de que o arquivo `lib/server/openai/assistantClient.ts` existe

### Erro: "OPENAI_API_KEY não configurada"

**Causa:** Variável de ambiente não está configurada

**Solução:**
1. Vá em **Settings** → **Environment Variables**
2. Adicione `OPENAI_API_KEY` (maiúsculas)
3. Faça um **Redeploy**

## Estrutura Correta

```typescript
// api/ask-assistant.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callAssistant } from '../lib/server/openai/assistantClient';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ... código do handler
}
```

## Checklist

- [ ] Arquivo está em `api/ask-assistant.ts` (TypeScript)
- [ ] Exporta um `default` handler
- [ ] Usa `@vercel/node` para tipos
- [ ] Importa corretamente o `callAssistant`
- [ ] Variável `OPENAI_API_KEY` está configurada no Vercel
- [ ] Um deploy foi feito após adicionar/modificar arquivos

## Debug

Para ver logs detalhados:

1. Adicione `console.log` no início do handler:
```typescript
export default async function handler(req, res) {
  console.log('[DEBUG] Handler chamado');
  console.log('[DEBUG] OPENAI_API_KEY presente:', !!process.env.OPENAI_API_KEY);
  // ... resto do código
}
```

2. Verifique os logs no Vercel Dashboard (Functions → Logs)

3. Se necessário, adicione tratamento de erro mais detalhado:
```typescript
catch (err: any) {
  console.error('[DEBUG] Erro completo:', {
    message: err.message,
    stack: err.stack,
    env: {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
  // ... resto do tratamento
}
```

