# 🚀 Setup Rápido - Integração n8n Webhook

## ✅ Mudanças Implementadas

O chat "Pergunte p/ Antonio" agora utiliza o webhook n8n para processar mensagens.

### Webhook URL

```
https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
```

---

## 📝 Checklist de Configuração

### 1. Variável de Ambiente (Vercel)

Configure a variável de ambiente no Vercel:

```env
N8N_WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
```

**Como fazer:**

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Name: `N8N_WEBHOOK_URL`
6. Value: `https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio`
7. Selecione todos os ambientes (Production, Preview, Development)
8. Clique em **Save**

### 2. Deploy

Após configurar a variável, faça um novo deploy:

```bash
git add .
git commit -m "feat: integração webhook n8n no chat"
git push
```

Ou force um redeploy no painel do Vercel.

### 3. Desenvolvimento Local

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key

# Backend (Webhook n8n)
N8N_WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
```

---

## 🧪 Testando

### 1. Teste o Webhook Diretamente

```bash
curl -X POST https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Como calcular GMD?",
    "userId": "test-123",
    "timestamp": "2025-01-27T10:00:00Z"
  }'
```

**Resposta esperada:**

```json
{
  "answer": "GMD (Ganho Médio Diário)..."
}
```

### 2. Teste a Aplicação

1. Acesse a aplicação: https://seu-dominio.vercel.app
2. Faça login
3. Vá em "Pergunte p/ Antonio"
4. Digite uma pergunta: "Como calcular GMD?"
5. Aguarde a resposta

### 3. Verifique os Logs

**Vercel:**

- Acesse **Deployments** → selecione o deploy → **Functions**
- Clique na função `/api/ask-assistant`
- Veja os logs de execução

**n8n:**

- Acesse o painel do n8n
- Veja as execuções do workflow "fala-antonio"

---

## 📊 Formato de Request/Response

### Request (App → Webhook)

```json
{
  "question": "Como calcular o GMD?",
  "userId": "uuid-do-usuario",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### Response (Webhook → App)

```json
{
  "answer": "O GMD (Ganho Médio Diário) é calculado..."
}
```

**Formatos alternativos suportados:**

- `{ "response": "..." }`
- `{ "message": "..." }`
- `{ "text": "..." }`

---

## ⚠️ Troubleshooting

### Erro: "MISSING_WEBHOOK_URL"

**Causa:** Variável `N8N_WEBHOOK_URL` não configurada

**Solução:**

1. Configure a variável no Vercel (veja passo 1)
2. Faça um redeploy

### Erro: "TIMEOUT"

**Causa:** Webhook não respondeu em 60 segundos

**Solução:**

1. Verifique se o n8n está online
2. Otimize o workflow no n8n
3. Considere aumentar o timeout (edite `api/ask-assistant.ts`)

### Erro: "WEBHOOK_ERROR"

**Causa:** Webhook retornou erro (4xx/5xx)

**Solução:**

1. Verifique logs do n8n
2. Teste o webhook diretamente (curl)
3. Verifique formato da resposta

### Erro: "NETWORK_ERROR"

**Causa:** Erro de conexão com o webhook

**Solução:**

1. Verifique se o webhook está acessível
2. Teste com `curl` ou Postman
3. Verifique firewall/DNS

---

## 📁 Arquivos Modificados

| Arquivo                           | Mudança                              |
| --------------------------------- | ------------------------------------ |
| `api/ask-assistant.ts`            | Refatorado para chamar webhook n8n   |
| `docs/ENVIRONMENT.md`             | Atualizada documentação de variáveis |
| `README.md`                       | Atualizada seção de integração       |
| `CHANGELOG.md`                    | Adicionadas mudanças da versão       |
| `ANALISE_PROJETO.md`              | Atualizada arquitetura do chat       |
| `docs/N8N_WEBHOOK_INTEGRATION.md` | **NOVO** - Documentação completa     |
| `WEBHOOK_N8N_SETUP.md`            | **NOVO** - Guia rápido de setup      |

---

## 🎯 Próximos Passos

1. ✅ Configure variável `N8N_WEBHOOK_URL` no Vercel
2. ✅ Faça deploy
3. ✅ Teste o chat
4. 📊 Configure monitoramento (opcional)
5. 🔐 Adicione autenticação no webhook (recomendado)

---

## 📞 Suporte

**Problemas com:**

- Frontend/Backend: Verifique logs do Vercel
- n8n: Acesse painel do n8n
- Configuração: Revise `docs/ENVIRONMENT.md`
- Detalhes técnicos: Veja `docs/N8N_WEBHOOK_INTEGRATION.md`

---

**Criado em:** 2025-01-27  
**Status:** ✅ Pronto para produção
