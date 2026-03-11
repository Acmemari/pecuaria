# PLAN: Ambiente de Agentes para Consultoria

Este plano descreve a implementação de um ambiente centralizado no PecuarIA onde consultores podem interagir com agentes especializados para tarefas de campo e gestão.

## 📋 Visão Geral

Transformar o PecuarIA em uma plataforma "AI-First" para o consultor, oferecendo ferramentas autônomas para interpretação de dados e geração de planos operacionais.

**Tipo de Projeto:** WEB (React + Tailwind + Gemini API)

---

## 🎯 Critérios de Sucesso

1.  **Assistentes Integrados**: Acesso aos agentes diretamente na área de Assistentes da aplicação.
2.  **Agente de Solo**: Capacidade de interpretar dados de análise de solo e sugerir correções de forma lógica.
3.  **Calendário Sanitário**: Geração automática de um calendário de vacinação/manejo baseado no perfil da fazenda.
4.  **Análise de Endividamento**: Painel financeiro que calcula indicadores de risco e sustentabilidade.
5.  **Persistência**: Todas as análises geradas devem ser salváveis no perfil do cliente/fazenda (Supabase).

---

## 🛠️ Tech Stack

- **Frontend**: React (Context API), Tailwind CSS (Design System AI).
- **Inteligência**: Google Gemini API (via `geminiClient.ts`).
- **Banco de Dados**: Supabase (Armazenamento de resultados e logs de agentes).
- **Componentes**: Lucide React (Ícones), Recharts (Gráficos financeiros), FullCalendar (Manejo).

---

## 📂 Estrutura de Arquivos Proposta

```plaintext
src/
├── agents/
│   ├── SoilAnalysisAgent.tsx        # Agente de Solo
│   ├── SanitaryCalendarAgent.tsx    # Agente de Calendário (Evolução do atual)
│   └── DebtAnalysisAgent.tsx        # Agente Financeiro
├── components/
│   └── agents/
│       ├── AgentLayout.tsx          # Wrapper com sidebar/chat comum
│       ├── SoilDataForm.tsx         # Formulário de entrada de análise
│       └── DebtChart.tsx            # Visualização de endividamento
├── hooks/
│   └── useAgentAI.ts                # Hook para chamadas padronizadas ao Gemini
└── lib/
    └── agentPrompts.ts              # Central de System Prompts dos agentes
```

---

## 📝 Task Breakdown

### Fase 1: Análise e Infraestrutura (P0)

- [ ] **Task 1.1**: Mapear campos necessários para Análise de Solo (pH, P, K, Ca, Mg, etc.) e Endividamento.
  - _Agente_: `database-architect` | _Skill_: `database-design`
- [ ] **Task 1.2**: Desenvolver os "System Prompts" especialistas no `agentPrompts.ts`.
  - _Agente_: `backend-specialist` | _Skill_: `api-patterns`
- [ ] **Task 1.3**: Criar cards de agentes na área de Assistentes para seleção dos especialistas.
  - _Agente_: `frontend-specialist` | _Skill_: `frontend-design`

### Fase 2: Agente de Solo (P1)

- [ ] **Task 2.1**: Implementar UI de entrada de dados de solo (Formulário Simples).
  - _Agente_: `frontend-specialist` | _Skill_: `react-best-practices`
- [ ] **Task 2.2**: Integrar com Gemini para gerar a interpretação técnica e sugestão de calagem/adubação.
  - _Agente_: `backend-specialist` | _Skill_: `api-patterns`
- [ ] **Task 2.3**: Criar visualização de resultados com recomendações destacadas.
  - _Agente_: `frontend-specialist` | _Skill_: `frontend-design`

### Fase 3: Calendário Sanitário Inteligente (P1)

- [ ] **Task 3.1**: Evoluir o `CalendarAgent.tsx` para aceitar geração via IA baseada em parâmetros (Cria, Recria, Engorda).
  - _Agente_: `frontend-specialist` | _Skill_: `react-best-practices`
- [ ] **Task 3.2**: Implementar lógica de persistência das atividades no banco de dados.
  - _Agente_: `backend-specialist` | _Skill_: `database-design`

### Fase 4: Análise de Endividamento (P2)

- [ ] **Task 4.1**: Criar painel de indicadores (MLT, Giro de Capital, Comprometimento de Receita).
  - _Agente_: `frontend-specialist` | _Skill_: `frontend-design`
- [ ] **Task 4.2**: Implementar diagnóstico de IA sobre a saúde financeira.
  - _Agente_: `backend-specialist` | _Skill_: `api-patterns`

---

## 🏁 Phase X: Verificação Final

- [ ] Testar prompts de IA com dados reais de fazendas.
- [ ] Verificar responsividade mobile de todos os dashboards de agentes.
- [ ] Executar `python .agent/scripts/verify_all.py .` para garantir integridade.
- [ ] Garantir conformidade com o Purple Ban (Cores: Slate, Emerald, Blue).

---

## ✅ PRÓXIMOS PASSOS

1. Revisar o plano acima.
2. Executar `/create` para iniciar a Fase 1.
