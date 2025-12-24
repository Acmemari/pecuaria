# Análise Completa do Projeto Pecuária

**Data da Análise:** 2025-01-27  
**Versão do Projeto:** 1.3 SaaS

---

## 📋 Visão Geral

O **Pecuária** é uma aplicação SaaS (Software as a Service) voltada para o setor pecuário, oferecendo ferramentas de análise econômica, consultoria virtual e gestão de rebanho. A aplicação utiliza React, TypeScript, Supabase para backend e OpenAI Assistant para o chat.

### Propósito Principal
- **Calculadora de Lucro do Boi:** Análise econômica completa de investimentos em gado
- **Chat Consultivo:** Assistente virtual "Antonio" para consultoria especializada
- **Tendências de Mercado:** Análise de ciclo pecuário e reposição
- **Gestão de Cenários:** Salvamento e recuperação de simulações

---

## 🏗️ Arquitetura

### Stack Tecnológico

#### Frontend
- **React 19.2.0** - Framework principal
- **TypeScript 5.8.2** - Tipagem estática
- **Vite 6.2.0** - Build tool e dev server
- **Tailwind CSS 4.1.17** - Estilização (build local via PostCSS)
- **Lucide React** - Ícones
- **Recharts 3.5.1** - Gráficos e visualizações

#### Backend & Infraestrutura
- **Supabase** - BaaS (Backend as a Service)
  - Autenticação (email/password, OAuth Google)
  - Banco de dados PostgreSQL
  - Row Level Security (RLS)
  - Storage (se necessário)
- **Vercel Serverless Functions** - API endpoints
- **OpenAI Assistant API** - Chat inteligente
- **Google Gemini API** - Mantida para compatibilidade (opcional)

#### Testes
- **Vitest 4.0.15** - Testes unitários
- **Playwright 1.57.0** - Testes E2E
- **Testing Library** - Testes de componentes React

#### DevOps
- **Vercel** - Deploy e hosting
- **Service Worker** - Cache de recursos estáticos
- **Concurrently** - Execução paralela de scripts

---

## 📁 Estrutura de Diretórios

```
pecuaria/
├── agents/              # Agentes/Features principais
│   ├── CattleProfitCalculator.tsx
│   ├── ChatAgent.tsx
│   ├── MarketTrends.tsx
│   ├── SavedScenarios.tsx
│   ├── AdminDashboard.tsx
│   └── AgentTrainingAdmin.tsx
├── api/                 # Serverless functions (Vercel)
│   ├── ask-assistant.ts
│   └── geminiClient.ts
├── components/          # Componentes reutilizáveis
│   ├── Sidebar.tsx
│   ├── LoginPage.tsx
│   ├── SubscriptionPage.tsx
│   ├── SettingsPage.tsx
│   └── ...
├── contexts/            # Context API (React)
│   └── AuthContext.tsx
├── lib/                 # Utilitários e lógica de negócio
│   ├── auth/            # Autenticação e permissões
│   ├── supabase/        # Migrations e configuração
│   ├── server/          # Clientes de API server-side
│   └── utils/           # Funções auxiliares
├── src/                 # Código fonte adicional
│   ├── lib/             # Service Worker registration
│   └── test/            # Testes unitários e E2E
├── public/              # Assets estáticos
│   ├── sw.js            # Service Worker
│   └── _redirects       # Configuração Vercel
└── docs/                # Documentação
```

---

## 🔐 Sistema de Autenticação e Autorização

### Autenticação (Supabase Auth)
- **Email/Password:** Login tradicional
- **OAuth Google:** Login social (implementado, não totalmente ativo)
- **Recuperação de Senha:** Fluxo completo com email
- **Sessão Persistente:** Auto-refresh de tokens

### Autorização (Sistema de Planos)

#### Planos Disponíveis

1. **Básico (Gratuito)**
   - Calculadora de Lucro
   - Chat limitado (10 mensagens/dia)
   - Histórico de 7 dias
   - 1 agente

2. **Profissional (R$ 97/mês)**
   - Todos os agentes
   - Chat ilimitado
   - Histórico de 1 ano
   - Análise de Tendências
   - 5 agentes, 3 usuários

3. **Enterprise (R$ 299/mês)**
   - Múltiplos usuários
   - API dedicada
   - Suporte prioritário
   - Gestão completa
   - 99 agentes, 10 usuários

### Permissões
- **Admins:** Acesso total, sem limites
- **Clientes:** Baseado no plano contratado
- **Features bloqueadas:** Mostradas como "locked" na UI

### Implementação
- `lib/auth/permissions.ts` - Lógica de verificação
- `lib/auth/loadUserProfile.ts` - Carregamento de perfil
- `contexts/AuthContext.tsx` - Contexto React global

---

## 💬 Sistema de Chat

### Arquitetura
1. **Frontend:** `agents/ChatAgent.tsx`
   - Interface de chat
   - Histórico de mensagens
   - Verificação de limites por plano
   - Salvamento no Supabase

2. **Backend:** `api/ask-assistant.ts` (Vercel Serverless)
   - Processa perguntas
   - **Integra com webhook n8n**
   - Tratamento de erros robusto
   - Timeout de 60 segundos

3. **n8n Webhook**
   - URL: `https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio`
   - Processa mensagens com IA
   - Gerencia regras de negócio
   - Retorna resposta formatada

### Limites de Mensagens
- **Básico:** 10 mensagens/dia (contagem diária)
- **Pro/Enterprise:** Ilimitado
- **Admin:** Ilimitado
- **Fallback:** Em caso de erro de conexão, permite envio (permissivo)

### Persistência
- Mensagens salvas em `chat_messages` (Supabase)
- RLS garante privacidade (usuários só veem próprias mensagens)
- Histórico recuperado ao abrir o chat

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas Principais

#### `user_profiles`
- Perfil estendido do usuário
- Campos: `id`, `name`, `email`, `role`, `plan`, `phone`, `organization_id`
- Criado via trigger após signup

#### `chat_messages`
- Histórico de mensagens do chat
- Campos: `id`, `user_id`, `role`, `text`, `attachment_name`, `created_at`
- RLS: Usuários só veem próprias mensagens

#### `cattle_scenarios`
- Cenários salvos da calculadora
- Campos: `id`, `user_id`, `name`, `inputs`, `results`, `created_at`
- Permite salvar e recuperar simulações

### Migrations
- `001_chat_messages.sql` - Tabela de mensagens
- `002_cattle_scenarios.sql` - Tabela de cenários
- `003_add_phone_to_user_profiles.sql` - Campo telefone

### Segurança
- **Row Level Security (RLS):** Ativado em todas as tabelas
- **Policies:** Usuários só acessam próprios dados
- **Admins:** Podem ver todos os dados (políticas especiais)

---

## 🎨 Interface e UX

### Design System
- **Tema:** Escuro (dark mode)
- **Cores customizadas:** Prefixo `ai-*` (ai-bg, ai-text, ai-subtext, etc.)
- **Tipografia:** Font sans-serif
- **Responsivo:** Mobile-first, sidebar adaptável

### Componentes Principais
- **Sidebar:** Navegação entre agentes, responsiva
- **Toast:** Notificações de feedback
- **ErrorBoundary:** Tratamento de erros React
- **Loading States:** Spinners e skeletons

### Code Splitting
- **Lazy Loading:** Todos os agents carregados sob demanda
- **Suspense:** Fallbacks de loading
- **Otimização:** Reduz bundle inicial

---

## 🧪 Testes

### Cobertura Atual
- **Unitários:** Componentes, contextos, utilitários
- **E2E:** Carregamento, inicialização, funcionalidades básicas
- **Cobertura:** Relatórios em `coverage/`

### Estrutura de Testes
```
src/test/
├── agents/          # Testes dos agentes
├── components/       # Testes de componentes
├── contexts/         # Testes de contextos
├── lib/              # Testes de utilitários
└── e2e/              # Testes end-to-end
```

### Scripts Disponíveis
- `npm test` - Executar todos os testes
- `npm run test:watch` - Modo watch
- `npm run test:coverage` - Com cobertura
- `npm run test:e2e` - Testes E2E
- `npm run test:e2e:ui` - E2E com interface gráfica

---

## 🚀 Deploy e Configuração

### Ambiente de Desenvolvimento
- **Node.js:** >=20 <25 (testado com Node 24)
- **Porta Dev:** 3000 (frontend), 3001 (API)
- **Proxy:** Vite proxy para API local

### Variáveis de Ambiente

#### Frontend (`.env.local`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=optional-key
```

#### Backend (Vercel)
```env
N8N_WEBHOOK_URL=https://pecuaria-n8n.tcvxzi.easypanel.host/webhook/fala-antonio
SUPABASE_SERVICE_ROLE_KEY=service-role-key (opcional)
```

### Build de Produção
- **Comando:** `npm run build`
- **Output:** `dist/` com assets otimizados
- **Service Worker:** Registrado automaticamente
- **Code Splitting:** Automático via Vite

### Vercel
- **Configuração:** `vercel.json` com rewrites
- **Serverless Functions:** `/api/*` roteado para functions
- **SPA Routing:** Todas as rotas redirecionam para `index.html`

---

## ⚡ Performance

### Otimizações Implementadas
1. **Code Splitting:** Lazy loading de agents
2. **Service Worker:** Cache de recursos estáticos
3. **Tailwind Build Local:** CSS otimizado (~11KB gzip)
4. **Bundle Optimization:** Vite com tree-shaking
5. **Image Optimization:** (se aplicável)

### Métricas
- **CSS:** ~11KB (gzip: ~2.5KB)
- **JS:** Code-splitted por rota
- **Cache:** Service Worker com estratégia cache-first

---

## 🔧 Funcionalidades Principais

### 1. Calculadora de Lucro do Boi
- **Inputs:** Peso compra/venda, valor, GMD, custos
- **Outputs:** Lucro, margem, ROI, custos por arroba
- **Salvamento:** Cenários podem ser salvos
- **Navegação:** Integrada com "Meus Salvos"

### 2. Chat "Pergunte p/ Antonio"
- **IA:** OpenAI Assistant especializado
- **Histórico:** Persistente no Supabase
- **Limites:** Baseado no plano
- **Anexos:** Preparado para upload (em desenvolvimento)

### 3. Tendências de Mercado
- **Feature:** Bloqueada para plano Básico
- **Funcionalidade:** Análise de ciclo pecuário

### 4. Meus Salvos
- **Cenários:** Lista de simulações salvas
- **Ações:** Editar nome, deletar, carregar no calculador

### 5. Admin Dashboard
- **Acesso:** Apenas role 'admin'
- **Funcionalidades:** Gestão de usuários, uso de tokens

### 6. Treinar Antonio
- **Acesso:** Apenas role 'admin'
- **Funcionalidade:** Configuração do assistente

---

## 🐛 Problemas Conhecidos e Soluções

### Resolvidos
1. ✅ **Erro 404 index.css** - Arquivo criado
2. ✅ **Tailwind CDN** - Migrado para build local
3. ✅ **Loading infinito** - Timeouts de segurança adicionados
4. ✅ **Chat HTTP 500** - Tratamento robusto de erros
5. ✅ **Limite de mensagens bloqueando incorretamente** - Fallback permissivo

### Em Monitoramento
- **Profile creation delay:** Retry logic implementado
- **Network errors:** Tratamento com retry e cache

---

## 📊 Métricas e Monitoramento

### Logs
- **Frontend:** Console logs para debug
- **Backend:** Logs estruturados em serverless functions
- **Erros:** Tratamento centralizado com códigos de erro

### Rastreamento
- **Uso de tokens:** Preparado para salvar em `ai_token_usage` (opcional)
- **Mensagens:** Contagem diária para plano Básico

---

## 🔒 Segurança

### Implementações
1. **RLS:** Row Level Security no Supabase
2. **Validação de Input:** Sanitização de dados
3. **API Keys:** Nunca expostas no frontend
4. **HTTPS:** Obrigatório em produção
5. **CORS:** Configurado corretamente

### Melhorias Sugeridas
- Rate limiting mais agressivo
- Validação de senha mais forte
- 2FA (autenticação de dois fatores)
- Auditoria de ações administrativas

---

## 📈 Escalabilidade

### Pontos Fortes
- **Serverless:** Escala automaticamente (Vercel)
- **Supabase:** Banco gerenciado, escala horizontal
- **Code Splitting:** Reduz bundle inicial
- **Cache:** Service Worker reduz requisições

### Pontos de Atenção
- **OpenAI API:** Limites de quota e rate limit
- **Supabase:** Limites de conexões simultâneas
- **Custo:** Monitorar uso de tokens OpenAI

---

## 🎯 Próximos Passos Sugeridos

### Curto Prazo
1. **Testes:** Expandir cobertura E2E
2. **Documentação:** API pública (se necessário)
3. **Performance:** Otimizar queries N+1
4. **UX:** Melhorar feedback de loading

### Médio Prazo
1. **Features:** Implementar upload de anexos no chat
2. **Analytics:** Dashboard de uso e métricas
3. **Notificações:** Sistema de notificações push
4. **Multi-tenant:** Melhorar suporte a organizações

### Longo Prazo
1. **Mobile App:** Versão nativa (React Native)
2. **API Pública:** Para integrações externas
3. **Marketplace:** Extensões e plugins
4. **IA Avançada:** Fine-tuning do modelo

---

## 📝 Conclusão

O projeto **Pecuária** está bem estruturado, com arquitetura moderna e escalável. A base técnica é sólida, utilizando tecnologias atuais e boas práticas. O sistema de planos está implementado e funcional, com autenticação robusta e segurança adequada.

### Pontos Fortes
- ✅ Arquitetura limpa e organizada
- ✅ TypeScript para type safety
- ✅ Testes implementados
- ✅ Documentação presente
- ✅ Deploy automatizado
- ✅ Performance otimizada

### Áreas de Melhoria
- ⚠️ Expandir testes E2E
- ⚠️ Melhorar tratamento de erros de rede
- ⚠️ Implementar analytics
- ⚠️ Adicionar mais validações de segurança

### Recomendação Geral
O projeto está em **bom estado** para continuar o desenvolvimento. A base está sólida e permite evolução incremental sem grandes refatorações.

---

**Documentado por:** Auto (AI Assistant)  
**Última atualização:** 2025-01-27

