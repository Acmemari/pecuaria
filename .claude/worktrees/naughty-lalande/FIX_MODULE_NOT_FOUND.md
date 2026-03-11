# Solução: ERR_MODULE_NOT_FOUND

## Problema

O erro `Cannot find module '/var/task/lib/server/openai/assistantClient'` ocorria porque o Vercel não estava incluindo a pasta `lib/` no bundle da função serverless.

## Solução Aplicada

Movemos o arquivo `assistantClient.ts` para dentro da pasta `api/` para garantir que o Vercel o inclua no bundle.

### Antes:

```
lib/
  └── server/
      └── openai/
          └── assistantClient.ts  ❌ Não incluído no bundle
api/
  └── ask-assistant.ts
```

### Depois:

```
api/
  ├── ask-assistant.ts
  └── assistantClient.ts  ✅ Incluído no bundle
```

## Mudanças Realizadas

1. **Criado:** `api/assistantClient.ts` (cópia do código original)
2. **Atualizado:** `api/ask-assistant.ts` para importar de `./assistantClient` em vez de `../lib/server/openai/assistantClient`

## Próximos Passos

1. **Commit e Push:**

   ```bash
   git add .
   git commit -m "Fix: Move assistantClient to api folder for Vercel bundle"
   git push
   ```

2. **Aguardar Deploy:**
   - O Vercel fará deploy automaticamente
   - Aguarde o deploy completar

3. **Testar:**
   - Acesse a aplicação em produção
   - Teste o agente "Pergunte para o Antonio"
   - Verifique os logs no Vercel (Functions → api/ask-assistant → Logs)

## Por Que Funciona?

O Vercel inclui automaticamente todos os arquivos dentro da pasta `api/` no bundle da função serverless. Arquivos fora dessa pasta (como `lib/`) não são incluídos automaticamente, a menos que sejam explicitamente configurados.

## Nota

O arquivo original `lib/server/openai/assistantClient.ts` ainda existe e pode ser usado em desenvolvimento local. Em produção, o Vercel usará o arquivo em `api/assistantClient.ts`.
