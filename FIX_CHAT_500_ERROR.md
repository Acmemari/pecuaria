# Como Resolver o Erro HTTP 500 no Chat

## Checklist de Verificação

### 1. ✅ Verificar se a chave está no Vercel (PRODUÇÃO)

**Passo a passo:**

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Verifique se existe `OPENAI_API_KEY` (maiúsculas, sem espaços)
5. Verifique se o valor começa com `sk-` ou `sk-proj-`
6. Verifique se está marcado para **Production**

**Se não existir ou estiver errado:**

- Adicione/edite a variável
- Cole sua chave real da OpenAI
- Marque **Production**
- Clique em **Save**

### 2. ✅ Fazer Redeploy

**IMPORTANTE:** Após adicionar/modificar variáveis, você DEVE fazer redeploy:

**Opção A - Via Dashboard:**

1. Vercel Dashboard → **Deployments**
2. Clique nos três pontos (⋯) do último deployment
3. Selecione **Redeploy**
4. Aguarde completar

**Opção B - Via Git:**

```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

### 3. ✅ Verificar os Logs do Vercel

Para ver o erro exato:

1. Vercel Dashboard → **Functions**
2. Clique em `api/ask-assistant`
3. Vá na aba **Logs**
4. Faça uma requisição de teste no chat
5. Procure por mensagens de erro

**Mensagens comuns:**

- `OPENAI_API_KEY não configurada` → Chave não está no Vercel
- `Erro ao criar run (401)` → Chave inválida ou expirada
- `Cannot find module` → Problema de deploy (já corrigido)

### 4. ✅ Verificar se a Chave está Correta

**Teste rápido:**

1. Acesse https://platform.openai.com/api-keys
2. Verifique se sua chave está ativa
3. Verifique se há créditos na conta
4. Se necessário, crie uma nova chave e atualize no Vercel

### 5. ✅ Para Desenvolvimento Local

Se estiver testando localmente:

1. Verifique o arquivo `.env`:

   ```
   OPENAI_API_KEY=sk-sua-chave-real-aqui
   ```

2. Execute o servidor de desenvolvimento:

   ```bash
   npm run dev:all
   ```

3. Ou separadamente:

   ```bash
   # Terminal 1
   npm run dev

   # Terminal 2
   npm run dev:api
   ```

## Solução Rápida (Passo a Passo)

### Se você está em PRODUÇÃO (Vercel):

1. **Obter a chave:**
   - Acesse https://platform.openai.com/api-keys
   - Crie uma nova chave se necessário
   - Copie a chave (começa com `sk-`)

2. **Configurar no Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Adicione `OPENAI_API_KEY` com sua chave
   - Marque **Production**
   - Salve

3. **Fazer Redeploy:**
   - Deployments → três pontos → Redeploy
   - Aguarde completar

4. **Testar:**
   - Acesse a aplicação
   - Teste o chat "Pergunte para o Antonio"

### Se você está em DESENVOLVIMENTO LOCAL:

1. **Adicionar no `.env`:**

   ```
   OPENAI_API_KEY=sk-sua-chave-real-aqui
   ```

2. **Executar:**

   ```bash
   npm run dev:all
   ```

3. **Testar:**
   - Acesse http://localhost:3000
   - Teste o chat

## Erros Comuns e Soluções

### Erro: "OPENAI_API_KEY não configurada"

**Solução:** Adicione a variável no Vercel e faça redeploy

### Erro: "Erro de autenticação com OpenAI (401)"

**Solução:**

- Verifique se a chave está correta
- Verifique se a chave não expirou
- Crie uma nova chave se necessário

### Erro: "Cannot find module"

**Solução:** Já foi corrigido! Faça um novo deploy

### Erro: "Timeout"

**Solução:**

- Verifique se há créditos na conta OpenAI
- Tente novamente após alguns segundos

## Verificação Final

Após seguir todos os passos, verifique:

- [ ] Chave `OPENAI_API_KEY` existe no Vercel (Production)
- [ ] Chave começa com `sk-` ou `sk-proj-`
- [ ] Um redeploy foi feito após adicionar a chave
- [ ] Logs do Vercel não mostram erro de "OPENAI_API_KEY não configurada"
- [ ] Chat funciona sem erro HTTP 500

## Ainda não funciona?

Se após seguir todos os passos ainda houver erro:

1. **Compartilhe os logs do Vercel:**
   - Functions → api/ask-assistant → Logs
   - Copie as mensagens de erro

2. **Verifique o console do navegador:**
   - Abra DevTools (F12)
   - Vá em Console
   - Procure por erros

3. **Teste a chave diretamente:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer sk-sua-chave-aqui"
   ```
