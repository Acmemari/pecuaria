# Integração n8n Webhook - Chat Antonio

## 📋 Visão Geral

O chat "Pergunte p/ Antonio" utiliza uma automação n8n através de um webhook para processar as mensagens dos usuários. Esta abordagem permite:

- **Flexibilidade:** Alterar lógica de processamento sem redeploy do frontend
- **Escalabilidade:** n8n gerencia filas e processamento assíncrono
- **Manutenibilidade:** Automações visuais mais fáceis de entender e modificar
- **Integrações:** Conectar facilmente com outros serviços (APIs, bancos de dados, etc.)

---

## 🔄 Fluxo de Processamento

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐       ┌──────────┐
│   Usuário   │──1──>│   ChatAgent.tsx  │──2──>│ /api/ask-   │──3──>│  Webhook │
│  (Frontend) │       │   (React)        │       │  assistant  │       │   n8n    │
└─────────────┘       └──────────────────┘       └─────────────┘       └──────────┘
                              ▲                         ▲                     │
                              │                         │                     │
                              └─────────5. Resposta─────┴─────────4──────────┘
```

### Detalhamento

1. **Usuário envia mensagem:** Input no frontend
2. **Frontend chama API:** `POST /api/ask-assistant` com `{ question, userId }`
3. **Serverless function:** Valida e encaminha para webhook n8n
4. **n8n processa:** IA, regras de negócio, integrações
5. **Resposta retorna:** Via cadeia de callbacks até o usuário

---

## 🛠️ Configuração

### Webhook URL

**Produção:** `https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio`

### Variável de Ambiente

Configure no Vercel:

```env
N8N_WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
```

**Passos no Vercel:**

1. Acesse o projeto no painel do Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione a variável `N8N_WEBHOOK_URL`
4. Faça um novo deploy para aplicar

---

## 📡 Contrato da API

### Request (Frontend → Backend)

**Endpoint:** `POST /api/ask-assistant`

**Headers:**

```json
{
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "question": "Como calcular o custo por arroba produzida?",
  "userId": "uuid-do-usuario"
}
```

### Request (Backend → n8n Webhook)

**Endpoint:** `POST https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio`

**Headers:**

```json
{
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "question": "Como calcular o custo por arroba produzida?",
  "userId": "uuid-do-usuario",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Response (n8n Webhook → Backend)

**Status:** `200 OK`

**Body (formato flexível):**

```json
{
  "answer": "O custo por arroba produzida é calculado..."
}
```

**Formatos suportados:**

- `{ "answer": "..." }`
- `{ "response": "..." }`
- `{ "message": "..." }`
- `{ "text": "..." }`
- String direta

### Response (Backend → Frontend)

**Status:** `200 OK`

**Body:**

```json
{
  "answer": "O custo por arroba produzida é calculado..."
}
```

---

## ⚠️ Tratamento de Erros

### Erros Possíveis

| Código | Erro                  | Descrição                                  |
| ------ | --------------------- | ------------------------------------------ |
| 400    | `BAD_REQUEST`         | Campo `question` inválido ou ausente       |
| 500    | `MISSING_WEBHOOK_URL` | Variável `N8N_WEBHOOK_URL` não configurada |
| 502    | `WEBHOOK_ERROR`       | Webhook retornou erro (status 4xx/5xx)     |
| 503    | `NETWORK_ERROR`       | Erro de conexão com o webhook              |
| 504    | `TIMEOUT`             | Webhook não respondeu em 60 segundos       |

### Exemplo de Erro

```json
{
  "error": "Timeout ao processar solicitação no webhook. Tente novamente.",
  "code": "TIMEOUT",
  "details": "stack trace (apenas em desenvolvimento)"
}
```

---

## 🧪 Testando Localmente

### 1. Testar o Webhook Diretamente

```bash
curl -X POST https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Como calcular GMD?",
    "userId": "test-user-123",
    "timestamp": "2025-01-27T10:30:00.000Z"
  }'
```

### 2. Testar a API Local

**Requisitos:**

- Node.js 20+
- Variáveis configuradas em `.env.local`

**Executar:**

```bash
npm run dev:api
```

**Testar endpoint:**

```bash
curl -X POST http://localhost:3001/api/ask-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Como calcular GMD?",
    "userId": "test-user-123"
  }'
```

### 3. Testar Frontend + Backend Integrados

```bash
# Terminal 1 - API
npm run dev:api

# Terminal 2 - Frontend
npm run dev

# Acesse http://localhost:3000 e teste o chat
```

---

## 🔍 Logs e Debug

### Frontend (Browser Console)

```javascript
// ChatAgent.tsx envia logs
[ChatAgent] Enviando pergunta: "Como calcular GMD?"
[ChatAgent] Resposta recebida: 200
```

### Backend (Vercel Logs)

```
[API] Requisição recebida: POST /api/ask-assistant
[API] Pergunta recebida: Como calcular GMD?
[API] User ID: uuid-do-usuario
[API] Chamando webhook n8n: https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
[API] Resposta recebida do webhook, tamanho: 1234
[API] Resposta processada com sucesso, tamanho: 567
```

### n8n Workflow

Configure logs no próprio fluxo n8n para debug.

---

## 📊 Monitoramento

### Métricas Importantes

- **Latência:** Tempo de resposta do webhook
- **Taxa de erro:** Webhooks que falharam
- **Timeout rate:** Requisições que excederam 60s
- **Uso:** Quantidade de mensagens processadas

### Alertas Sugeridos

- Webhook retornando erro > 5% das requisições
- Latência média > 30 segundos
- Taxa de timeout > 2%

---

## 🔐 Segurança

### Boas Práticas Implementadas

- ✅ Webhook URL armazenada em variável de ambiente
- ✅ Validação de input no backend
- ✅ Timeout configurado (60s)
- ✅ Logs estruturados para auditoria
- ✅ Erros não expõem dados sensíveis

### Melhorias Sugeridas

- 🔜 Autenticação do webhook (token, signature)
- 🔜 Rate limiting por usuário
- 🔜 Criptografia da pergunta (se contiver dados sensíveis)
- 🔜 Webhook retry logic com backoff exponencial

---

## 🚀 Escalabilidade

### Capacidade Atual

- **Timeout:** 60 segundos por requisição
- **Concorrência:** Limitada pelo Vercel (plano)
- **n8n:** Gerencia filas internamente

### Otimizações Possíveis

1. **Cache de respostas:** Perguntas frequentes
2. **Streaming:** Resposta progressiva (Server-Sent Events)
3. **Queue:** Processar mensagens assíncronas (Supabase + Edge Functions)
4. **CDN:** Cache de respostas comuns

---

## 📝 Manutenção

### Atualizando o Webhook

Se precisar trocar a URL do webhook:

1. Atualize a variável `N8N_WEBHOOK_URL` no Vercel
2. Faça um novo deploy
3. Teste com uma mensagem de exemplo

**Não requer alteração de código!**

### Troubleshooting

| Problema                   | Solução                              |
| -------------------------- | ------------------------------------ |
| Erro `MISSING_WEBHOOK_URL` | Configure variável no Vercel         |
| Timeout constante          | Otimize fluxo n8n ou aumente timeout |
| Resposta vazia             | Verifique formato de retorno do n8n  |
| Erro de rede               | Verifique se webhook está acessível  |

---

## 📞 Suporte

Para problemas com:

- **Frontend/Backend:** Verifique logs do Vercel
- **n8n:** Acesse painel do n8n e verifique execuções
- **Rede:** Teste webhook diretamente com `curl`

---

**Documentado por:** Auto (AI Assistant)  
**Última atualização:** 2025-01-27
