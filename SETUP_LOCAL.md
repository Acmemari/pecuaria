# Configuração para Funcionar Localmente

## Passo 1: Adicionar sua Chave da API OpenAI

No arquivo `.env`, substitua o placeholder pela sua chave real:

```
OPENAI_API_KEY=sk-sua-chave-real-aqui
```

**Como obter a chave:**
1. Acesse https://platform.openai.com/api-keys
2. Faça login
3. Clique em "Create new secret key"
4. Copie a chave (começa com `sk-`)
5. Cole no arquivo `.env`

## Passo 2: Instalar Dependências (se necessário)

```bash
npm install
```

## Passo 3: Iniciar os Servidores

**Opção A - Tudo junto (recomendado):**
```bash
npm run dev:all
```

**Opção B - Separado (2 terminais):**

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run dev:api
```

## Passo 4: Acessar a Aplicação

1. Abra o navegador em: http://localhost:3000
2. Faça login
3. Vá para o agente "Pergunte para o Antonio"
4. Teste enviando uma mensagem

## Verificação

Você deve ver nos terminais:

**Terminal do Vite:**
```
VITE v6.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

**Terminal da API:**
```
🚀 Servidor de desenvolvimento da API rodando em http://localhost:3001
📝 O Vite está configurado para fazer proxy de /api/* para este servidor
```

## Troubleshooting

### Erro: "OPENAI_API_KEY não configurada"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se a chave está correta (sem espaços após o `=`)
- Reinicie os servidores após modificar o `.env`

### Erro: "Cannot find module"
- Execute `npm install` novamente
- Verifique se todas as dependências estão instaladas

### Erro: "Port already in use"
- Feche outros processos usando as portas 3000 ou 3001
- Ou altere as portas no `vite.config.ts` e `server-dev.mjs`

### Chat não responde
- Verifique o console do navegador (F12)
- Verifique os logs do terminal da API
- Verifique se a chave da OpenAI está correta e ativa

