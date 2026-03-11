# Troubleshooting - Agente "Pergunte para o Antonio" em Produção

## Problema Identificado

Na sua configuração do Vercel, há **duas variáveis** relacionadas à OpenAI:

1. ❌ `openai_api_key` (minúsculas) - **NÃO FUNCIONA**
2. ✅ `OPENAI_API_KEY` (maiúsculas) - **ESTA É A CORRETA**

O código está procurando por `OPENAI_API_KEY` (maiúsculas), então a variável `openai_api_key` (minúsculas) **não será encontrada**.

## Solução Passo a Passo

### 1. Remover a variável incorreta (opcional, mas recomendado)

1. No Vercel Dashboard, vá em **Settings** → **Environment Variables**
2. Encontre a variável `openai_api_key` (minúsculas)
3. Clique nos três pontos (⋯) ao lado dela
4. Selecione **Delete**
5. Confirme a exclusão

### 2. Verificar a variável correta

Certifique-se de que a variável `OPENAI_API_KEY` (maiúsculas) está:

- ✅ Nome exatamente como `OPENAI_API_KEY` (case-sensitive)
- ✅ Valor começa com `sk-` (chave válida da OpenAI)
- ✅ Marcada para **Production** (e Preview/Development se necessário)
- ✅ Status mostra que está ativa (ícone verde/azul)

### 3. Fazer um Redeploy

**IMPORTANTE:** Após adicionar ou modificar variáveis de ambiente, você **DEVE** fazer um novo deploy:

**Opção A: Redeploy via Dashboard**

1. Vá em **Deployments** no Vercel Dashboard
2. Clique nos três pontos (⋯) do último deployment
3. Selecione **Redeploy**
4. Aguarde o deploy completar

**Opção B: Redeploy via Git**

1. Faça um pequeno commit (pode ser apenas um espaço em branco)
2. Faça push para o repositório
3. O Vercel fará deploy automaticamente

### 4. Verificar os Logs

Para verificar se a variável está sendo carregada corretamente:

1. No Vercel Dashboard, vá em **Functions**
2. Clique em `api/ask-assistant`
3. Vá na aba **Logs**
4. Faça uma requisição de teste no chat
5. Procure por mensagens como:
   - `[API] OPENAI_API_KEY não configurada` - ❌ Problema
   - `[OpenAI Assistant] Iniciando chamada para assistente` - ✅ Funcionando

## Checklist de Verificação

Use este checklist para garantir que tudo está correto:

- [ ] Variável `OPENAI_API_KEY` existe (maiúsculas)
- [ ] Variável `openai_api_key` foi removida (minúsculas - se existir)
- [ ] Valor da chave começa com `sk-`
- [ ] Ambiente "Production" está marcado
- [ ] Um novo deploy foi feito após adicionar/modificar a variável
- [ ] Logs não mostram erro de "OPENAI_API_KEY não configurada"

## Teste Rápido

Para testar se está funcionando:

1. Acesse sua aplicação em produção
2. Vá para o agente "Pergunte para o Antonio"
3. Envie uma mensagem de teste (ex: "Olá")
4. Se funcionar: ✅ Tudo OK!
5. Se não funcionar: Verifique os logs do Vercel (passo 4 acima)

## Erros Comuns

### Erro: "OPENAI_API_KEY não está configurada"

**Causa:** Variável não existe ou nome está errado
**Solução:**

- Verifique se o nome é exatamente `OPENAI_API_KEY` (maiúsculas)
- Certifique-se de que fez um redeploy após adicionar

### Erro: "Erro de autenticação com OpenAI"

**Causa:** Chave inválida ou expirada
**Solução:**

- Verifique se a chave começa com `sk-`
- Gere uma nova chave no OpenAI Dashboard
- Atualize a variável no Vercel e faça redeploy

### Erro: "Timeout ao processar solicitação"

**Causa:** Problema com a API OpenAI ou rede
**Solução:**

- Verifique se há créditos na conta OpenAI
- Tente novamente após alguns segundos
- Verifique os logs para mais detalhes

## Verificação Final

Se após seguir todos os passos ainda não funcionar:

1. **Verifique os logs do Vercel** (Functions → api/ask-assistant → Logs)
2. **Teste a chave localmente** usando o script de teste:
   ```bash
   npm run test:assistant:manual
   ```
3. **Verifique se o assistente está ativo** no OpenAI Dashboard:
   - ID do assistente: `asst_pxFD2qiuUYJOt5abVw8IWwUf`
   - URL: https://platform.openai.com/assistants

## Contato

Se o problema persistir, compartilhe:

- Screenshot das variáveis de ambiente no Vercel
- Logs do Vercel (Functions → Logs)
- Mensagem de erro exata que aparece na aplicação
