# Gerar Insights com IA no Questionário

O botão **"Gerar Insights com IA"** no relatório do questionário (Diagnóstico de Performance) usa a **API Google Gemini** para gerar uma análise executiva e recomendações a partir dos resultados (Gente, Gestão, Produção).

> **Segurança:** Nunca cole sua chave da API no chat nem em arquivos versionados. Use apenas o arquivo **`.env`** na raiz do projeto (ele não é commitado).

## O que é necessário

- **Variável de ambiente no servidor:** `GEMINI_API_KEY`  
  A API `/api/questionnaire-insights` roda no servidor (Vercel ou servidor de desenvolvimento) e precisa dessa chave para chamar o Gemini.

## Como ativar

### 1. Obter uma chave do Gemini

1. Acesse **[Google AI Studio](https://aistudio.google.com/apikey)**.
2. Faça login com sua conta Google.
3. Clique em **"Create API Key"** (ou "Get API key").
4. Copie a chave gerada.

### 2. Desenvolvimento local

1. Na raiz do projeto (`c:\pecuaria`), crie o arquivo **`.env`** se ainda não existir (você pode copiar de `.env.example`).
2. Abra o arquivo **`.env`** e adicione esta linha (cole **sua chave** depois do `=`):
   ```env
   GEMINI_API_KEY=sua-chave-gemini-aqui
   ```
   O local correto é esse: **uma única linha no `.env`**, na raiz do projeto.
3. Suba o **front e a API** juntos:
   ```bash
   npm run dev:all
   ```
   Isso sobe o Vite (porta 3000) e o servidor da API (porta 3001). O Vite faz proxy de `/api/*` para a API.
4. Abra o questionário → **Ver resultados** → clique em **"Gerar Insights com IA"**.  
   Se aparecer erro de rede ou 500, confira o terminal do servidor (porta 3001) para ver a mensagem (ex.: `GEMINI_API_KEY não definida`).

### 3. Produção (Vercel)

1. No **Vercel**: projeto → **Settings** → **Environment Variables**.
2. Adicione:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** a chave copiada do Google AI Studio
   - **Environment:** Production (e Preview/Development se quiser).
3. Salve e faça um **novo deploy** para a variável passar a valer.

## Fluxo técnico

1. O usuário clica em **"Gerar Insights com IA"** no relatório do questionário.
2. O front envia `POST /api/questionnaire-insights` com:
   - `summary`: JSON com nota final, totais e scores por grupo (Gente, Gestão, Produção).
   - `farmName`: nome da fazenda (opcional).
3. A API (`api/questionnaire-insights.ts`) monta um prompt e chama `callAssistant` do **Gemini** (`api/geminiClient.ts`).
4. O Gemini devolve:
   - análise executiva (2–3 parágrafos),
   - 3–5 recomendações priorizadas,
   - conclusão em uma frase.
5. O texto é exibido no relatório e pode ser incluído no PDF ao clicar em **"Gerar PDF"**.

## Erros comuns

| Mensagem                              | Causa                                                   | O que fazer                                                                                        |
| ------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY não definida`         | Chave ausente no ambiente do servidor                   | Adicionar `GEMINI_API_KEY` no `.env` (local) ou no Vercel (produção).                              |
| `Erro ao gerar insights com IA` / 500 | Erro na chamada ao Gemini (rede, quota, chave inválida) | Ver logs do servidor (terminal local ou Vercel Logs). Confirmar chave e quota no Google AI Studio. |
| Requisição não chega na API           | Em local, só o Vite está rodando                        | Rodar `npm run dev:all` para subir também o servidor da API na porta 3001.                         |

## Resumo

- **Local:** `.env` com `GEMINI_API_KEY` + `npm run dev:all`.
- **Vercel:** variável `GEMINI_API_KEY` nas Environment Variables + redeploy.

Com isso, a função **Gerar Insights com IA** no questionário passa a funcionar.
