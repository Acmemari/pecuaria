# Checklist para Implantar Novos Agentes de IA

Este documento descreve os passos necessários para adicionar um novo agente ao pipeline unificado sem quebrar produção.

## Pré-requisitos

- Familiaridade com a estrutura em [api/_lib/agents/](api/_lib/agents/)
- Variáveis de ambiente configuradas: [docs/ENVIRONMENT.md](ENVIRONMENT.md)

## Passos

### 1. Criar o Manifest e Handler

1. Crie a pasta do agente em `api/_lib/agents/<nome-do-agente>/`
2. Crie `manifest.ts` com:
   - `id`: identificador único (ex: `'feedback'`, `'hello'`)
   - `version`: semver (ex: `'1.0.0'`)
   - `inputSchema`: schema Zod para validação da entrada
   - `outputSchema`: schema Zod para validação da saída
   - `modelPolicy`: provider principal e fallbacks
   - `estimatedTokensPerCall`: estimativa de tokens por chamada

3. Crie `handler.ts` exportando uma função `run<Nome>Agent(args)` que:
   - Recebe `{ input, provider, model }`
   - Chama `provider.complete()` com o prompt adequado
   - Faz parse da resposta com `safeJsonParseWithRepair` (se JSON)
   - Retorna `{ data, rawContent, usage, latencyMs }`

Exemplo de estrutura:

```
api/_lib/agents/meu-agente/
├── manifest.ts
└── handler.ts
```

### 2. Registrar no Registry

Em [api/_lib/agents/registry.ts](api/_lib/agents/registry.ts):

1. Importe o manifest: `import { meuAgenteManifest } from './meu-agente/manifest';`
2. Adicione ao mapa: `manifestMap.set(\`${meuAgenteManifest.id}@${meuAgenteManifest.version}\`, meuAgenteManifest);`

### 3. Registrar o Handler no Dispatch

Em [api/agents-run.ts](api/agents-run.ts):

1. Importe o handler: `import { runMeuAgenteAgent } from './_lib/agents/meu-agente/handler';`
2. Adicione ao mapa `agentHandlers`:

```typescript
const agentHandlers: Record<string, AgentHandler> = {
  hello: (args) => runHelloAgent({ ...args, input: args.input as HelloInput }),
  feedback: (args) => runFeedbackAgent({ ...args, input: args.input as FeedbackInput }),
  'meu-agente': (args) => runMeuAgenteAgent({ ...args, input: args.input as MeuAgenteInput }),
};
```

### 4. Configurar Variáveis de Ambiente

No Vercel (produção) e em `.env.local` (desenvolvimento):

| Variável | Obrigatória? | Uso |
|----------|--------------|-----|
| `GEMINI_API_KEY` | Provider Gemini | Sempre recomendada (provider padrão) |
| `OPENAI_API_KEY` | Provider OpenAI | Necessária para fallback OpenAI |
| `ANTHROPIC_API_KEY` | Provider Anthropic | Necessária para fallback Anthropic |
| `SUPABASE_SERVICE_ROLE_KEY` | Rate limit, usage, auth | Obrigatória para `/api/agents-run` |

### 5. Registrar no Servidor de Desenvolvimento

Se o frontend chamar `/api/agents-run`, não é necessário registrar nada extra — a rota já existe.

Se criar um endpoint dedicado (ex: `/api/meu-agente-assist`), adicione em [server-dev.ts](server-dev.ts):

```typescript
app.post('/api/meu-agente-assist', (req, res) => {
  handleApiRoute('./api/meu-agente-assist.ts', req, res);
});
```

### 6. Integrar no Frontend

Para usar o pipeline unificado com auth e fallback:

1. Obtenha o token de sessão: `const { data } = await supabase.auth.getSession(); const token = data?.session?.access_token;`
2. Chame a API:

```typescript
const res = await fetch('/api/agents-run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    agentId: 'meu-agente',
    input: { /* dados validados pelo inputSchema */ },
  }),
});
```

3. Trate a resposta: `{ success: true, data: {...}, usage: {...}, agent: {...} }`

### 7. Verificar Infraestrutura Supabase

O pipeline usa tabelas em Supabase. Garanta que existam:

- `plan_limits`: limites de rate e tokens por plano
- `rate_limits`: contadores de requisições por org/user
- `token_budgets`: orçamento de tokens por org/período
- `token_ledger`: log de reservas e commits

Consulte a migration [supabase/migrations/20260218100000_ai_agent_infrastructure.sql](supabase/migrations/20260218100000_ai_agent_infrastructure.sql).

### 8. Testar

- [ ] Desenvolvimento local: `npm run dev:all` e testar o fluxo completo
- [ ] Validar que o fallback funciona (ex: desabilitar temporariamente `GEMINI_API_KEY` e verificar se OpenAI/Anthropic assumem)
- [ ] Verificar logs de erro e resposta do usuário em caso de falha
- [ ] Testar em staging antes de produção

## Resumo de Arquivos a Alterar

| Novo agente | Arquivos |
|-------------|----------|
| Manifest + Handler | `api/_lib/agents/<nome>/manifest.ts`, `handler.ts` |
| Registry | `api/_lib/agents/registry.ts` |
| Dispatch | `api/agents-run.ts` |
| Endpoint dedicado (opcional) | `api/<nome>-assist.ts`, `server-dev.ts` |
| Frontend | Componente que chama o agente |

## Problemas Comuns

- **401 AUTH_MISSING_TOKEN**: O frontend não está enviando o header `Authorization: Bearer <token>`. Use `supabase.auth.getSession()`.
- **429 RATE_LIMIT_EXCEEDED**: Limites do plano atingidos. Verifique `plan_limits` e `rate_limits`.
- **402 TOKEN_BUDGET_EXCEEDED**: Orçamento mensal de tokens esgotado. Verifique `token_budgets`.
- **Fallback não funciona**: Certifique-se de que `OPENAI_API_KEY` e/ou `ANTHROPIC_API_KEY` estão configuradas e que os providers estão implementados em `api/_lib/ai/providers/`.
