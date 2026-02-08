---
description: Reiniciar servidores de desenvolvimento
---

# Reiniciar Servidores de Desenvolvimento

Este workflow reinicia os servidores de desenvolvimento do projeto (Vite + API).

## Passos

1. **Parar todos os processos em execução**
   - Pressione `Ctrl+C` em todos os terminais que estão rodando `npm run dev` ou `npm run dev:all`

// turbo
2. **Limpar a porta 3000 (se necessário)**
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

// turbo
3. **Limpar a porta 3001 (se necessário)**
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
   ```

// turbo
4. **Iniciar os servidores novamente**
   ```powershell
   npm run dev:all
   ```

5. **Aguardar os servidores iniciarem**
   - Aguarde até ver as mensagens:
     - `VITE v... ready in ...ms`
     - `🚀 Servidor de desenvolvimento da API rodando em http://localhost:3001`

6. **Acessar a aplicação**
   - Abra seu navegador em: `http://localhost:3000`
   - **NÃO** acesse `http://localhost:3001` (essa porta é só para a API interna)

## Verificação

Se tudo estiver funcionando:
- ✅ `http://localhost:3000` deve mostrar a aplicação
- ✅ As chamadas `/api/*` serão automaticamente redirecionadas para `localhost:3001`
- ❌ `http://localhost:3001` mostrará "Cannot GET /" (isso é esperado!)

## Troubleshooting

Se ainda tiver problemas:

1. Verifique se as variáveis de ambiente estão configuradas:
   ```powershell
   Get-Content .env.local
   ```

2. Verifique se as portas estão livres:
   ```powershell
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   ```

3. Verifique os logs do terminal para erros específicos
