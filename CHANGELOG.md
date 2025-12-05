# Changelog

## [Unreleased]

### Adicionado
- Arquivo `index.css` para corrigir erro 404 de carregamento
- Testes unitários para verificação de carregamento de recursos:
  - `src/test/loading.test.tsx` - Testes de carregamento HTML, CSS e JS
  - `src/test/index.test.tsx` - Testes de inicialização do React
  - `src/test/resources.test.ts` - Testes de validação de recursos estáticos
- **Migração do Tailwind CSS para build local:**
  - Instalado `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/postcss`
  - Criado `tailwind.config.js` com configuração completa (cores, fontes customizadas)
  - Criado `postcss.config.js` para integração com Vite
  - Migrado estilos customizados do `index.html` para `index.css`
- **Testes E2E com Playwright:**
  - Instalado `@playwright/test`
  - Criado `playwright.config.ts` com configuração para Chromium
  - Criado `src/test/e2e/loading.spec.ts` - Testes E2E de carregamento
  - Criado `src/test/e2e/app.spec.ts` - Testes E2E de funcionalidade básica
  - Adicionados scripts `test:e2e`, `test:e2e:ui`, `test:e2e:headed` no `package.json`
- **Service Worker para cache:**
  - Criado `public/sw.js` com estratégia cache-first para recursos estáticos
  - Criado `src/lib/sw-register.ts` - Utilitário de registro do SW
  - Integrado registro automático do SW em produção no `index.tsx`

### Corrigido
- Erro 404 ao carregar `/index.css` - arquivo criado na raiz do projeto
- Validação de estrutura HTML e recursos críticos através de testes
- **Aviso do console sobre Tailwind CDN** - Migrado para build local
- **Performance:** CSS agora é gerado e otimizado durante o build

### Modificado
- `index.html` - Removido CDN do Tailwind e scripts inline de configuração
- `index.tsx` - Adicionado import do CSS e registro do Service Worker
- `index.css` - Atualizado com diretivas Tailwind e estilos customizados migrados

### Documentação
- Atualizado README.md com:
  - Instruções de build e preview
  - Informações sobre testes E2E
  - Configuração do Tailwind CSS
  - Informações sobre Service Worker
  - Scripts disponíveis

## Notas Técnicas

### Migração Tailwind CSS
- Tailwind CSS agora é processado via PostCSS durante o build
- CSS gerado é otimizado e minificado automaticamente
- Configuração mantém todas as cores e fontes customizadas (ai.*)
- Build de produção gera CSS de ~11KB (gzip: ~2.5KB)

### Testes E2E
- Playwright configurado para rodar servidor de dev automaticamente
- Testes verificam carregamento completo, ausência de erros 404, e renderização do React
- Suporte para execução em modo UI e headed para debugging

### Service Worker
- Estratégia cache-first para recursos estáticos
- Versionamento de cache para atualizações
- Registro automático apenas em produção
- Melhora performance e permite funcionamento offline básico

### Próximos Passos Sugeridos
- Expandir testes E2E para cobrir mais funcionalidades
- Adicionar suporte para mais navegadores nos testes E2E (Firefox, WebKit)
- Implementar estratégias de cache mais sofisticadas no Service Worker
- Adicionar notificações push (se necessário)

