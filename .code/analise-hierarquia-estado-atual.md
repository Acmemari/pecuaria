# Analise da Hierarquia: Estado Atual

**Data:** 2026-03-10
**Escopo:** Analista → Organizacao → Fazenda

---

## Resumo

A arquitetura geral esta bem estruturada com contexto centralizado, persistencia com escopo por usuario, paginacao, busca e sync em tempo real. Existem problemas concretos que precisam ser corrigidos.

---

## Arquitetura Atual

```
AuthProvider
  → HierarchyProvider
    → useHierarchy() (consumido por todos os componentes)
```

### Fluxo de Dados (Cascata)

```
effectiveAnalystId (computado)
  ↓ useEffect
loadClients()
  ↓ useEffect on clientId
loadFarms()
  ↓ useEffect on farmId
Componentes carregam dados
```

### Determinacao do Analista Efetivo

| Qualificacao | effectiveAnalystId |
|---|---|
| Visitante | `VISITOR_ANALYST_ID` (fixo) |
| Cliente | `null` (sem contexto de analista) |
| Admin | `state.analystId` (selecionado) |
| Analista | `user.id` (proprio) |

---

## Estado do HierarchyContext

```typescript
HierarchyState {
  // IDs selecionados
  analystId: string | null
  clientId: string | null
  farmId: string | null

  // Entidades completas
  selectedAnalyst: User | null
  selectedClient: Client | null
  selectedFarm: Farm | null

  // Listas carregadas
  analysts: User[]
  clients: Client[]
  farms: Farm[]

  // Controle de UI
  loading: { analysts, clients, farms }
  errors: { analysts, clients, farms }
  hasMore: { analysts, clients, farms }  // Paginacao
}
```

---

## O Que Esta Funcionando Bem

### Persistencia (localStorage v2)
- Chave com escopo por usuario: `hierarchySelection.v2.{userId}`
- Migracao automatica de v1 (global) para v2
- Visitantes NAO persistem (retorno antecipado)
- Clientes persistem apenas `farmId` (clientId vem do perfil)
- Analistas/admins persistem os tres IDs

### Integracao com Auth
- Espera `isProfileReady` e `sessionReady` antes de hidratar IDs
- Trata transicao de perfil de cliente (`qualification` vs `clientId`)

### Paginacao e Busca
- PAGE_SIZE = 50 com flags `hasMore` e funcoes `loadMore*`
- Busca em tempo real nos tres niveis com debounce

### Sync em Tempo Real
- Supabase RealtimeChannel em tabelas `clients` e `farms`
- Auto-refresh ao criar/atualizar/deletar registros

### Validacao
- `validate_hierarchy()` RPC chamado 150ms apos mudanca de estado
- Contador de falhas (`validationFailureCountRef`, threshold = 2)

### Sistema de Visitante (Demo)
```
VISITOR_ANALYST_ID = '0238f4f4-5967-429e-9dce-3f6cc03f5a80'
VISITOR_CLIENT_ID  = '00000000-0000-0000-0000-000000000002'
VISITOR_FARM_ID    = '00000000-0000-0000-0000-000000000003'
```

---

## Problemas Identificados

### CRITICO: FarmManagement com Loading Duplicado

**Arquivo:** `agents/FarmManagement.tsx`

O componente FarmManagement carrega fazendas de forma independente do HierarchyContext:
- Usa `useEffect([], [])` (deps vazio) — executa apenas no mount
- Carrega TODAS as fazendas sem filtrar por `client_id`
- Nunca re-executa quando `selectedClient` muda

**Impacto:** Trocar de organizacao na hierarquia NAO atualiza a lista de fazendas no FarmManagement.

**Correcao:** Consumir fazendas diretamente do `HierarchyContext` ou adicionar `selectedClient?.id` nas dependencias do `useEffect`.

---

### CRITICO: Dupla Vinculacao Fazenda-Cliente

Existem dois mecanismos para vincular fazenda a cliente:

1. `farms.client_id` — Foreign key direto na tabela farms
2. `client_farms` — Tabela de juncao (junction table)

**Impacto:** Ambiguidade sobre qual e a fonte da verdade. Risco de dados inconsistentes.

**Correcao:** Eliminar `client_farms` e usar exclusivamente `farms.client_id`.

---

### MEDIO: Validacao Silenciosa

O RPC `validate_hierarchy()` falha silenciosamente:
- Erro de rede: ignorado (sem retry)
- Erro de RLS: IDs invalidos permanecem no state
- Apenas incrementa um contador interno

**Correcao:** Adicionar `console.warn` nas falhas e implementar retry com backoff para erros de rede.

---

### MEDIO: Churn no Canal Realtime

Quando `effectiveAnalystId` ou `clientId` muda:
- Canal antigo faz unsubscribe (async)
- Canal novo faz subscribe (async)
- Janela breve onde ambos podem estar ativos → eventos duplicados

**Correcao:** Adicionar debounce na criacao/destruicao de canais Realtime.

---

### MEDIO: CustomEvents para Sync

Alguns componentes usam `CustomEvent` para sincronizar dados ao inves de consumir diretamente do HierarchyContext.

**Correcao:** Migrar para consumo direto via `useHierarchy()`.

---

### BAIXO: Migracao de Visitante Incompleta

A migration 025 (criacao da fazenda demo para visitante) ainda nao foi finalizada.

**Correcao:** Completar migration 025 com INSERT da fazenda demo usando `VISITOR_FARM_ID`.

---

## Timeline de Carga da Hierarquia

```
1. Usuario faz login
   ↓ (evento SIGNED_IN)

2. loadUserProfile() → define qualification
   ↓ (isProfileReady = true)

3. HierarchyContext.HYDRATE_IDS effect dispara
   ↓ (le localStorage v2)

4. loadClients() (useEffect em effectiveAnalystId)
   ↓ (150ms delay)

5. validate_hierarchy() RPC verifica validade
   ↓

6. loadFarms() (useEffect em state.clientId)
   ↓

7. Componentes recebem dados via useHierarchy()
```

---

## Tipos Relevantes

### User
```typescript
{
  id: string
  email: string
  name: string
  qualification?: 'visitante' | 'cliente' | 'analista'
  role: 'admin' | 'client'
  organizationId?: string   // Para analistas
  clientId?: string          // Para clientes
  status: 'active' | 'inactive'
}
```

### Client (Organizacao)
```typescript
{
  id: string
  name: string
  phone: string
  email: string
  analystId: string          // FK para analista
  createdAt: string
  updatedAt: string
}
```

### Farm (Fazenda)
```typescript
{
  id: string
  name: string
  country: string
  state: string
  city: string
  clientId?: string          // FK para organizacao
  // + campos de metadados (area, rebanho, sistema de producao, etc.)
}
```

---

## Plano de Correcoes (Priorizado)

| # | Prioridade | Tarefa | Arquivos |
|---|---|---|---|
| 1 | Alta | FarmManagement consumir do HierarchyContext | `agents/FarmManagement.tsx` |
| 2 | Alta | Eliminar `client_farms`, usar so `farms.client_id` | Schema SQL, queries |
| 3 | Media | Logs/retry na validacao de hierarquia | `contexts/HierarchyContext.tsx` |
| 4 | Media | Debounce nos canais Realtime | `contexts/HierarchyContext.tsx` |
| 5 | Media | Migrar CustomEvents para useHierarchy() | Componentes diversos |
| 6 | Baixa | Completar migration 025 (farm demo) | `supabase/migrations/` |

---

## Arquivos Principais

| Arquivo | Papel |
|---|---|
| `types.ts` | Definicoes de tipo (User, Client, Farm) |
| `contexts/HierarchyContext.tsx` | Estado centralizado da hierarquia |
| `contexts/AuthContext.tsx` | Autenticacao e perfil do usuario |
| `hooks/useSession.ts` | Wrapper sobre AuthContext |
| `components/LoginPage.tsx` | UI de login (nao interage com hierarquia) |
| `agents/AdminDashboard.tsx` | Gerenciamento de qualificacao/vinculacao |
| `agents/FarmManagement.tsx` | Gestao de fazendas (loading duplicado) |
| `components/ClientSelector.tsx` | Seletor de organizacao |
| `components/FarmSelector.tsx` | Seletor de fazenda |
