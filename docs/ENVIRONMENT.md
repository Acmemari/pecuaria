# Variáveis de ambiente necessárias

Crie um arquivo `.env.local` (ou `.env`) na raiz do projeto com os valores abaixo:

```
# Frontend (Vite) - Obrigatórias
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (Vercel Serverless Functions) - Obrigatórias
N8N_WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio

# IA (Gemini) - Para "Gerar Insights com IA" no questionário e chat com Antonio
# Obtenha em: https://aistudio.google.com/apikey
GEMINI_API_KEY=sua-chave-gemini-aqui

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

### IA (Gemini)
- `GEMINI_API_KEY` - Chave da API Google Gemini (necessária para **Gerar Insights com IA** no relatório do questionário e para o assistente que usa Gemini). Obtenha em [Google AI Studio](https://aistudio.google.com/apikey). No desenvolvimento local, use `npm run dev:all` para subir a API que consome essa variável. Ver também: [docs/QUESTIONNAIRE_INSIGHTS_IA.md](QUESTIONNAIRE_INSIGHTS_IA.md).

### Opcional
- `WEBHOOK_URL` - Alternativa para `N8N_WEBHOOK_URL` (desenvolvimento local)

## Configuração no Vercel

Para configurar as variáveis no Vercel:

1. Acesse o painel do projeto no Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:
   - `N8N_WEBHOOK_URL` = `https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio`
4. Faça um novo deploy para aplicar as mudanças

