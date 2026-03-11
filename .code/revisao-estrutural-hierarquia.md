# Revisao Estrutural: Sistema de Hierarquia (Analista -> Organizacao -> Fazenda)

## Sumario Executivo

A hierarquia Analista -> Organizacao -> Fazenda e o nucleo da aplicacao. A analise profunda
revelou **6 problemas criticos** que explicam por que organizacoes nao carregam com frequencia
e o cache precisa ser limpo manualmente. O problema mais grave e que o `FarmManagement.tsx`
possui um sistema de carregamento de fazendas **completamente independente** do `HierarchyContext`,
criando conflitos de estado e dados desatualizados.

---

## Arquitetura Atual

```
AuthProvider
  -> LocationProvider
    -> HierarchyProvider  (estado central: analista/cliente/fazenda)
      -> ClientProvider    (wrapper fino -> useHierarchy())
      -> FarmProvider      (wrapper fino -> useHierarchy())
      -> AppContent
        -> FarmManagement  (tem seu PROPRIO loadFarms() independente!)
```

### Fluxo de Dados Correto (HierarchyContext)

```
effectiveAnalystId muda
  -> loadClients(analyst_id=X)       // useEffect [effectiveAnalystId]
    -> clientId muda (auto-select primeiro)
      -> loadFarms(client_id=Y)      // useEffect [state.clientId]
        -> farmId muda (auto-select primeiro)
```

### Fluxo de Dados Quebrado (FarmManagement)

```
Componente monta
  -> loadFarms()                     // useEffect([], []) - VAZIO, executa 1 vez
    -> supabase.from('farms').select('*')  // SEM filtro de client_id!
    -> setFarms(TODAS_AS_FAZENDAS)   // estado local, ignora HierarchyContext
    -> nunca re-executa quando selectedClient muda
```

---

## Problema 1 (CRITICO): FarmManagement tem sistema de carregamento duplicado e quebrado

### Arquivo: `agents/FarmManagement.tsx`

### O que acontece

O `FarmManagement` ignora completamente o `HierarchyContext` para carregar fazendas.
Ele tem seu proprio `loadFarms()` (linha 655) com `useEffect([], [])` (linha 590-592)
que so executa uma vez quando o componente monta.

```typescript
// Linha 590-592 - PROBLEMA: dependency array VAZIO
useEffect(() => {
  loadFarms();
}, []);   // <-- NUNCA re-executa quando selectedClient muda
```

### Impacto

1. Quando o usuario troca de organizacao no seletor, `FarmManagement` continua mostrando
   as fazendas da organizacao anterior (ou TODAS as fazendas)
2. Para analistas/admin, `loadFarms()` carrega TODAS as fazendas sem filtro:

```typescript
// Linhas 672-676 - PROBLEMA: Sem filtro por client_id
if (user && (user.qualification === 'analista' || user.role === 'admin')) {
  const { data: dbFarms, error: dbError } = await supabase
    .from('farms')
    .select('*')                    // <-- TODAS as fazendas do sistema!
    .order('created_at', { ascending: false });
}
```

3. O `HierarchyContext.loadFarms()` (linha 541-613) faz o correto:
   `.eq('client_id', selectedClientId)`, mas o `FarmManagement` nao usa esse dado

### Correcao

**Opcao A (Recomendada): Consumir fazendas do HierarchyContext**

Remover o `loadFarms()` interno do FarmManagement e usar as fazendas do HierarchyContext:

```typescript
// ANTES (FarmManagement.tsx):
const { selectedClient } = useClient();
const [farms, setFarms] = useState<Farm[]>([]);

useEffect(() => {
  loadFarms();
}, []);

// DEPOIS:
import { useHierarchy } from '../contexts/HierarchyContext';

const { selectedClient } = useClient();
const { farms: hierarchyFarms, loading: hierarchyLoading } = useHierarchy();
const [localFarms, setLocalFarms] = useState<Farm[]>([]);

// Sincronizar com HierarchyContext
useEffect(() => {
  setLocalFarms(hierarchyFarms);
}, [hierarchyFarms]);
```

Isso elimina a duplicacao e garante que FarmManagement sempre mostra as fazendas
da organizacao selecionada no HierarchyContext.

**Opcao B (Minima): Adicionar selectedClient como dependencia**

Se preferir manter o loadFarms() local, adicionar `selectedClient?.id` como dependencia
e filtrar por `client_id`:

```typescript
// useEffect com dependencia correta
useEffect(() => {
  loadFarms();
}, [selectedClient?.id]);  // <-- Re-executa quando muda organizacao

// loadFarms() para analista/admin COM filtro
if (user && (user.qualification === 'analista' || user.role === 'admin')) {
  let query = supabase
    .from('farms')
    .select('*')
    .order('created_at', { ascending: false });

  // Filtrar por organizacao selecionada
  if (selectedClient?.id) {
    query = query.eq('client_id', selectedClient.id);
  }

  const { data: dbFarms, error: dbError } = await query;
  // ...
}
```

---

## Problema 2 (ALTO): Redundancia no vinculo Fazenda-Organizacao (client_id + client_farms)

### Arquivos afetados

- Tabela `farms` com coluna `client_id` (FK direta)
- Tabela `client_farms` (junction table)
- `agents/FarmManagement.tsx` linhas 821-846 (`linkFarmToClient`)
- `lib/hooks/useFarmOperations.ts` linhas 20-23 (query dupla)

### O que acontece

Existem DOIS mecanismos para vincular fazenda a organizacao:

1. **`farms.client_id`** - Chave estrangeira direta na tabela `farms`
2. **`client_farms`** - Tabela de juncao (many-to-many)

O `buildFarmDatabasePayload()` ja seta `client_id` no insert. Mas `linkFarmToClient()`
tambem insere na `client_farms`. O `useFarmOperations.getClientFarms()` consulta AMBAS:

```typescript
// useFarmOperations.ts linhas 20-23 - Query DUPLA
const [clientFarmsResult, directFarmsResult] = await Promise.all([
  supabase.from('client_farms').select('farm_id').eq('client_id', clientId),
  supabase.from('farms').select('id').eq('client_id', clientId),
]);
```

### Riscos

- Dados podem ficar inconsistentes (farm.client_id aponta para A, client_farms aponta para B)
- Ao deletar, precisa limpar em dois lugares
- Complexidade desnecessaria no codigo
- Se uma das fontes falhar, resultados imprevisiveis

### Correcao Recomendada

**Manter APENAS `farms.client_id`** (FK direta) e depreciar `client_farms`:

1. Verificar se `client_farms` tem dados que nao existem em `farms.client_id`
2. Migrar dados faltantes para `farms.client_id`
3. Atualizar `useFarmOperations.getClientFarms()` para consultar apenas `farms.client_id`
4. Remover `linkFarmToClient()` do FarmManagement
5. Eventualmente dropar tabela `client_farms`

```typescript
// useFarmOperations.ts - SIMPLIFICADO
const getClientFarms = useCallback(async (clientId: string): Promise<Farm[]> => {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('client_id', clientId);

  if (error) {
    log.error('Error loading farms', new Error(error.message));
    return [];
  }
  return data ? mapFarmsFromDatabase(data) : [];
}, []);
```

**Nota:** A tabela `analyst_farms` (juncao) FAZ sentido pois tem campos extras
(`permissions` JSONB, `is_responsible`). Essa deve ser mantida.

---

## Problema 3 (ALTO): Session Bleed no localStorage

### Arquivo: `contexts/HierarchyContext.tsx`

### O que acontece

O localStorage usa a chave `hierarchySelection.v1` que e **global por dominio**.
Quando dois analistas usam o mesmo navegador:

```
1. Analista A faz login -> seleciona Organizacao "Fazenda Sol" -> salva em localStorage
2. Analista A faz logout
3. Analista B faz login -> HierarchyContext carrega localStorage
4. HierarchyContext tenta hidratar com analystId de A, clientId de "Fazenda Sol"
5. RLS no Supabase bloqueia (Analista B nao tem acesso)
6. Query falha silenciosamente -> organizacao nao carrega -> tela vazia
7. Usuario limpa cache -> funciona
```

### Codigo relevante (linhas 124-146)

```typescript
function loadInitialPersistedIds() {
  const modernRaw = localStorage.getItem(HIERARCHY_STORAGE_KEY);
  if (modernRaw) {
    const modern = JSON.parse(modernRaw);
    return {
      analystId: sanitizeUUID(modern?.analystId),
      clientId: sanitizeUUID(modern?.clientId),
      farmId: sanitizeId(modern?.farmId),
    };
  }
  // ... fallback para chaves legadas ...
}
```

### Correcao Recomendada

**Incluir o `user.id` na chave de persistencia:**

```typescript
// ANTES:
const HIERARCHY_STORAGE_KEY = 'hierarchySelection.v1';

// DEPOIS:
// A chave agora e por usuario, evitando session bleed
function getHierarchyStorageKey(userId: string): string {
  return `hierarchySelection.v2.${userId}`;
}
```

**Atualizar `loadInitialPersistedIds()` para receber `userId`:**

```typescript
function loadInitialPersistedIds(userId: string) {
  const key = getHierarchyStorageKey(userId);
  const fallback = { analystId: null, clientId: null, farmId: null };
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const modern = JSON.parse(raw);
      return {
        analystId: sanitizeUUID(modern?.analystId),
        clientId: sanitizeUUID(modern?.clientId),
        farmId: sanitizeId(modern?.farmId),
      };
    }
  } catch {
    // ignore
  }

  // Tentar migrar da chave v1 (uma vez)
  try {
    const legacyRaw = localStorage.getItem('hierarchySelection.v1');
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      // Salvar na nova chave e remover a antiga
      localStorage.setItem(key, legacyRaw);
      localStorage.removeItem('hierarchySelection.v1');
      return {
        analystId: sanitizeUUID(legacy?.analystId),
        clientId: sanitizeUUID(legacy?.clientId),
        farmId: sanitizeId(legacy?.farmId),
      };
    }
  } catch {
    // ignore
  }

  return fallback;
}
```

**Atualizar persistencia (linha 355-376) para usar a chave por usuario:**

```typescript
useEffect(() => {
  if (!user) return;
  const key = getHierarchyStorageKey(user.id);
  // ... salvar com localStorage.setItem(key, ...) ...
}, [state.analystId, state.clientId, state.farmId, user]);
```

**Limpar dados do usuario anterior no logout:**

No `AuthContext`, ao fazer logout, nao limpar o localStorage do proximo usuario:

```typescript
// Ao fazer logout, nao precisa limpar (cada usuario tem sua chave)
// Mas pode limpar a chave do usuario atual se desejado:
localStorage.removeItem(getHierarchyStorageKey(currentUserId));
```

---

## Problema 4 (MEDIO): Validacao de hierarquia falha silenciosamente

### Arquivo: `contexts/HierarchyContext.tsx` linhas 663-699

### O que acontece

O RPC `validate_hierarchy` e chamado apos a hidratacao para verificar se os IDs
persistidos ainda sao validos. Porem, se o RPC falhar, o erro e silenciosamente ignorado:

```typescript
// Linhas 678-681 - FALHA SILENCIOSA
if (error || !data || !Array.isArray(data) || data.length === 0) {
  // Se RPC ainda nao existir, mantem fallback sem quebrar.
  return;  // <-- Nenhum log, nenhum tratamento
}
```

### Impacto

- Se a validacao falhar (rede, RLS, RPC nao existe), IDs invalidos permanecem
- O usuario ve uma tela vazia sem saber o motivo
- Nao ha retry nem feedback visual

### Correcao Recomendada

```typescript
if (error) {
  console.warn('[HierarchyContext] validate_hierarchy failed:', error.message);
  // Em caso de erro de validacao, limpar IDs para forcar recarga limpa
  // ao inves de manter IDs potencialmente invalidos
  dispatch({
    type: 'HYDRATE_IDS',
    payload: { analystId: null, clientId: null, farmId: null },
  });
  return;
}

if (!data || !Array.isArray(data) || data.length === 0) {
  console.warn('[HierarchyContext] validate_hierarchy returned empty data');
  return; // RPC pode nao existir ainda - manter estado atual
}
```

---

## Problema 5 (MEDIO): Canal Realtime com nome dinamico causa sobreposicao

### Arquivo: `contexts/HierarchyContext.tsx` linhas 701-735

### O que acontece

O canal Realtime e nomeado com IDs dinamicos:

```typescript
const channelName = `hierarchy-sync-${user.id}-${effectiveAnalystId || 'none'}-${state.clientId || 'none'}`;
```

Quando `effectiveAnalystId` ou `state.clientId` mudam, o useEffect cria um NOVO canal
e desconecta o anterior. Porem, durante a transicao:

1. O canal antigo esta desconectando (async)
2. O canal novo esta conectando (async)
3. Ambos podem receber eventos simultaneamente
4. `loadClients()` e `loadFarms()` podem ser chamados com IDs misturados

Alem disso, o filtro do canal para `farms` usa `state.clientId` diretamente:

```typescript
filter: state.clientId ? `client_id=eq.${state.clientId}` : undefined,
```

Se `state.clientId` for `null`, o filtro e `undefined`, o que significa que o canal
recebe TODOS os eventos de farms de TODOS os clientes, causando recargas desnecessarias.

### Correcao Recomendada

1. **Debounce na criacao do canal** para evitar criacao/destruicao rapida:

```typescript
useEffect(() => {
  if (!user) return;

  // Debounce para evitar criacao rapida de canais durante transicao de estado
  const timer = setTimeout(() => {
    // Nao criar canal se nao houver filtro significativo
    if (!effectiveAnalystId && !state.clientId) return;

    const channelName = `hierarchy-sync-${user.id}-${effectiveAnalystId || 'none'}-${state.clientId || 'none'}`;
    const channel = supabase
      .channel(channelName)
      // ... subscriptions ...
      .subscribe();

    // Cleanup function agora e retornada pelo timer callback
    // Armazenar referencia para cleanup
    channelRef.current = channel;
  }, 300); // 300ms debounce

  return () => {
    clearTimeout(timer);
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [effectiveAnalystId, state.clientId, user]);
```

2. **Nao criar canal sem filtro** (quando clientId e null):

```typescript
// So subscrever farms se houver clientId
if (state.clientId) {
  channel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'farms',
    filter: `client_id=eq.${state.clientId}`,
  }, () => { ... });
}
```

---

## Problema 6 (BAIXO): Eventos de janela para coordenacao (window.dispatchEvent)

### Arquivo: `agents/FarmManagement.tsx`

### O que acontece

O FarmManagement usa `CustomEvent` para notificar outros componentes:

```typescript
window.dispatchEvent(new CustomEvent('farmAdded'));
window.dispatchEvent(new CustomEvent('farmUpdated'));
window.dispatchEvent(new CustomEvent('farmViewChange', { detail: view }));
window.dispatchEvent(new CustomEvent('farmCancelForm'));
```

E escuta eventos de clientes:

```typescript
window.addEventListener('clientAdded', handleClientsChanged);
window.addEventListener('clientUpdated', handleClientsChanged);
window.addEventListener('clientDeleted', handleClientsChanged);
```

### Problemas

- **Nao e tipado** - qualquer string e aceita, sem TypeScript ajudando
- **Nao garante ordem** - eventos podem chegar fora de ordem
- **Fragil** - se o listener nao estiver registrado no momento do dispatch, perde o evento
- **Nao escala** - dificil rastrear todos os listeners pelo codebase

### Correcao Recomendada (futuro)

Substituir por `refreshCurrentLevel()` do HierarchyContext:

```typescript
// ANTES (FarmManagement):
window.dispatchEvent(new CustomEvent('farmAdded'));

// DEPOIS:
const { refreshCurrentLevel } = useHierarchy();
// Apos criar fazenda:
await refreshCurrentLevel('farms');
```

Isso ja existe no HierarchyContext (linhas 805-818) e nao e utilizado pelo FarmManagement.

---

## Resumo das Prioridades

| # | Problema | Severidade | Esforco | Impacto |
|---|----------|------------|---------|---------|
| 1 | FarmManagement loadFarms() duplicado com [] deps | **CRITICO** | Medio | **Causa raiz** de "org nao carrega" |
| 2 | Redundancia client_id + client_farms | **ALTO** | Medio | Inconsistencia de dados |
| 3 | Session bleed no localStorage | **ALTO** | Baixo | "Precisa limpar cache" |
| 4 | Validacao de hierarquia silenciosa | **MEDIO** | Baixo | Tela vazia sem diagnostico |
| 5 | Canal Realtime com sobreposicao | **MEDIO** | Baixo | Recargas desnecessarias |
| 6 | Eventos de janela (CustomEvent) | **BAIXO** | Medio | Manutencao fragil |

---

## Ordem de Implementacao Recomendada

### Fase 1 - Correcoes Criticas (resolver "org nao carrega")

1. **Problema 1**: Fazer FarmManagement consumir farms do HierarchyContext
   OU adicionar `selectedClient?.id` como dependencia do useEffect
2. **Problema 3**: Incluir `user.id` na chave do localStorage

### Fase 2 - Estabilidade

3. **Problema 4**: Adicionar logging e cleanup na validacao de hierarquia
4. **Problema 5**: Debounce no canal Realtime + nao criar canal sem filtro

### Fase 3 - Simplificacao (pode ser feita incrementalmente)

5. **Problema 2**: Migrar para usar apenas `farms.client_id`, depreciar `client_farms`
6. **Problema 6**: Substituir CustomEvents por `refreshCurrentLevel()`

---

## Analise do Banco de Dados

### Tabelas Envolvidas

| Tabela | Proposito | Status |
|--------|-----------|--------|
| `profiles` | Usuarios (analistas, admins, clientes) | OK |
| `clients` | Organizacoes (aka "clientes") | OK |
| `farms` | Fazendas com `client_id` FK | OK |
| `client_farms` | Juncao fazenda-organizacao | **REDUNDANTE** com `farms.client_id` |
| `analyst_farms` | Juncao analista-fazenda com permissoes | OK (tem `permissions` JSONB) |

### RLS (Row Level Security)

- `farms`: Policies corretas com SECURITY DEFINER para evitar recursao
- `clients`: Filtro por `analyst_id` para analistas
- `analyst_farms`: Corrigido com `SECURITY DEFINER` function (migration 20260219200200)

### Indexes

- `idx_farms_client_id` em `farms(client_id)` - OK
- `idx_client_farms_client_id` em `client_farms(client_id)` - OK
- `idx_client_farms_farm_id` em `client_farms(farm_id)` - OK
- `idx_analyst_farms_analyst_id` em `analyst_farms(analyst_id)` - OK
- FKs com `ON DELETE CASCADE` - OK

### RPCs Relevantes

- `get_analysts_for_admin` - Paginado, usado pelo HierarchyContext - OK
- `validate_hierarchy` - Valida IDs persistidos - Necessita tratamento de erro
- `get_farm_permissions_batch` - Batch query para evitar N+1 - OK
- `get_analyst_farm_details` - Detalhes com join - OK

---

## Verificacao Pos-Implementacao

### Cenario 1: Troca de organizacao

1. Login como analista -> selecionar Org A -> ver fazendas de A
2. Trocar para Org B no seletor -> fazendas devem atualizar para B
3. **Antes do fix**: fazendas de A continuam aparecendo
4. **Depois do fix**: fazendas de B aparecem imediatamente

### Cenario 2: Multiplos usuarios no mesmo navegador

1. Login como Analista A -> selecionar Org -> logout
2. Login como Analista B -> organizacoes de B devem carregar
3. **Antes do fix**: tela vazia (IDs de A no localStorage)
4. **Depois do fix**: IDs de B no localStorage (chave separada)

### Cenario 3: Criar fazenda e ver na lista

1. Criar nova fazenda -> toast de sucesso
2. Voltar para lista -> fazenda deve aparecer
3. Trocar de org e voltar -> fazenda so aparece na org correta
4. HierarchyContext Realtime deve atualizar automaticamente

### Cenario 4: Falha de rede

1. Desconectar internet -> navegar
2. Validacao de hierarquia falha -> deve mostrar log de aviso
3. Estado deve degradar graciosamente (nao travar)
4. Reconectar -> Realtime deve reconectar e atualizar
