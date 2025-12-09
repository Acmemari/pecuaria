# Configuração para Produção - Agente "Pergunte para o Antonio"

## Variáveis de Ambiente Necessárias

Para o agente "Pergunte para o Antonio" funcionar em produção, você precisa configurar as seguintes variáveis de ambiente no **Vercel Dashboard**:

### 1. OPENAI_API_KEY (OBRIGATÓRIA)

Esta é a chave principal necessária para o chat funcionar.

**Como obter:**
1. Acesse https://platform.openai.com/api-keys
2. Faça login na sua conta OpenAI
3. Clique em "Create new secret key"
4. Copie a chave (ela começa com `sk-`)

**Como configurar no Vercel:**
1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Configure:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Cole sua chave da API OpenAI
   - **Environments:** Marque Production, Preview e Development (ou apenas Production)
6. Clique em **Save**

### 2. SUPABASE_SERVICE_ROLE_KEY (OPCIONAL)

Necessária apenas se você quiser salvar o uso de tokens no banco de dados.

**Como obter:**
1. Acesse seu projeto no Supabase Dashboard
2. Vá em **Settings** → **API**
3. Copie a **service_role key** (não a anon key!)

**Como configurar no Vercel:**
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Cole a service role key do Supabase
- **Environments:** Production, Preview, Development

### 3. SUPABASE_URL (OPCIONAL)

Necessária apenas se você quiser salvar o uso de tokens.

**Como obter:**
- Está no mesmo lugar do Supabase Dashboard (Settings → API)
- Ou use `NEXT_PUBLIC_SUPABASE_URL` se preferir

**Como configurar no Vercel:**
- **Name:** `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** URL do seu projeto Supabase (ex: `https://xxxxx.supabase.co`)
- **Environments:** Production, Preview, Development

## Após Configurar

1. **Faça um novo deploy** ou aguarde o próximo push para o repositório
2. As variáveis de ambiente são aplicadas automaticamente em novos deploys
3. Teste o agente "Pergunte para o Antonio" na aplicação em produção

## Verificação

Se a chave não estiver configurada, você verá um erro como:
```
Configuração de servidor incompleta: OPENAI_API_KEY não está configurada
```

## Segurança

⚠️ **IMPORTANTE:**
- **NUNCA** commite a chave da API no código
- **NUNCA** coloque a chave em arquivos `.env` que sejam commitados
- Use apenas as variáveis de ambiente do Vercel para produção
- A chave deve começar com `sk-` (OpenAI) ou `sk-proj-` (OpenAI organizações)

## Troubleshooting

### Erro: "OPENAI_API_KEY não está configurada"
- Verifique se a variável foi adicionada no Vercel Dashboard
- Certifique-se de que fez um novo deploy após adicionar a variável
- Verifique se o nome da variável está exatamente como `OPENAI_API_KEY` (case-sensitive)

### Erro: "Erro de autenticação com OpenAI"
- Verifique se a chave está correta e ativa
- Confirme que a chave não expirou
- Verifique se há créditos disponíveis na conta OpenAI

### Chat não responde
- Verifique os logs do Vercel (Functions → Logs)
- Confirme que o assistente ID está correto: `asst_pxFD2qiuUYJOt5abVw8IWwUf`
- Verifique se o assistente está ativo no OpenAI Dashboard

