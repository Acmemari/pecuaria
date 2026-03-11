# Migração de OpenAI para Google Gemini

## ✅ Alterações Realizadas

### 1. Novo Cliente Gemini

- **Criado:** `api/geminiClient.ts` - Cliente para Google Gemini API
- **Removido:** `api/assistantClient.ts` - Cliente antigo do OpenAI

### 2. Atualização da API

- **Atualizado:** `api/ask-assistant.ts` - Agora usa Gemini em vez de OpenAI
- Variável de ambiente alterada: `OPENAI_API_KEY` → `GEMINI_API_KEY`

### 3. Arquivo .env

- Removido: `OPENAI_API_KEY`
- Adicionado: `GEMINI_API_KEY` (você precisa adicionar sua chave)

## 📝 Próximos Passos

### Para Desenvolvimento Local:

1. **Adicione sua chave Gemini no `.env`:**

   ```
   GEMINI_API_KEY=sua-chave-gemini-aqui
   ```

2. **Como obter a chave Gemini:**
   - Acesse https://aistudio.google.com/apikey
   - Faça login com sua conta Google
   - Clique em "Create API Key"
   - Copie a chave
   - Cole no arquivo `.env`

3. **Teste localmente:**
   ```bash
   npm run dev:all
   ```

### Para Produção (Vercel):

1. **Remover variável antiga:**
   - Vercel Dashboard → Settings → Environment Variables
   - Remova `OPENAI_API_KEY` (se existir)

2. **Adicionar nova variável:**
   - Adicione `GEMINI_API_KEY`
   - Cole sua chave Gemini
   - Marque **Production** (e Preview/Development se quiser)
   - Salve

3. **Fazer Redeploy:**
   - Deployments → três pontos (⋯) → Redeploy
   - Aguarde completar

## 🔄 Diferenças entre OpenAI e Gemini

### OpenAI (antigo):

- Usava Assistants API com threads e runs
- Mais complexo, mas mais poderoso
- Custo por token

### Gemini (novo):

- API mais simples e direta
- Respostas mais rápidas
- Modelo: `gemini-2.0-flash-exp`
- Mesma personalidade do Antonio mantida

## ⚠️ Importante

- A chave Gemini é diferente da chave OpenAI
- Você precisa criar uma nova chave no Google AI Studio
- A chave Gemini não começa com `sk-` (formato diferente)
- Remova todas as referências ao `OPENAI_API_KEY` no Vercel

## 🧪 Teste

Após configurar, teste o chat "Pergunte para o Antonio":

1. Acesse a aplicação
2. Vá para o agente "Pergunte para o Antonio"
3. Envie uma mensagem de teste
4. Deve funcionar sem erros!
