# Variáveis de ambiente necessárias

Crie um arquivo `.env.local` na raiz do projeto com os valores abaixo:

```
# Frontend (Vite) - Obrigatórias
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (Vercel Serverless Functions) - Obrigatórias
N8N_WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio

# Opcional - Para desenvolvimento local do servidor de API
WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
```

## Descrição das Variáveis

### Frontend (prefixo `VITE_`)
- `VITE_SUPABASE_URL` - URL do projeto Supabase (obrigatória)
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase (obrigatória)

### Backend (Vercel)
- `N8N_WEBHOOK_URL` - URL do webhook n8n para processamento do chat (obrigatória)
  - **Produção:** https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
  - Esta URL aponta para a automação n8n que processa as mensagens do chat

### Opcional
- `WEBHOOK_URL` - Alternativa para `N8N_WEBHOOK_URL` (desenvolvimento local)

## Configuração no Vercel

Para configurar as variáveis no Vercel:

1. Acesse o painel do projeto no Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:
   - `N8N_WEBHOOK_URL` = `https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio`
4. Faça um novo deploy para aplicar as mudanças

