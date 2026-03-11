# FIX: Organização Não Carrega Após Login (Race Condition no HierarchyContext)

## Contexto do Bug

Ao fazer login na aplicação, o seletor de organização no header permanece em **"Selecione organização"** com spinner girando indefinidamente. O usuário tem organizações associadas (ex: "Pessoal", "Reunidas Floresta") mas nenhuma é selecionada automaticamente.

O problema acontece **no primeiro login** ou quando o `localStorage` é limpo (não existe `hierarchySelection` salvo).

---

## Causa Raiz: Race Condition

Existe uma **race condition** no `HierarchyContext` entre dois `useEffect`:

1. O **useEffect do `validate_hierarchy`** (com debounce de 150ms)
2. O **useEffect do `fetchClients`** (que faz auto-select do primeiro client)

### Sequência do Bug

```
T0:     Login → HYDRATE_IDS(clientId=null)  (estado inicial correto)
T0:     useEffect(validate_hierarchy) → setTimeout(150ms)
T0:     useEffect(fetchClients) → inicia HTTP request ao Supabase
T150ms: setTimeout dispara → lê stateRef.current.clientId = null
T150ms: RPC validate_hierarchy(analyst_id, null, null) → HTTP request disparada
T~200ms: fetchClients retorna → auto-select → dispatch SELECT_CLIENT_ID(primeiro_client)
T~300ms: RPC validate_hierarchy retorna → client_valid=false (porque foi chamada com null)
T~300ms: dispatch HYDRATE_IDS(clientId=null) → SOBRESCREVE o auto-select ← BUG
T~300ms: localStorage salva clientId=null → problema persiste em reloads
```

### Por que acontece

O cleanup do `useEffect` do `validate_hierarchy` **apenas cancela o `setTimeout`**, mas **NÃO cancela a RPC** já disparada. Quando a RPC retorna com `client_valid=false` (porque foi chamada com `clientId=null`), ela despacha `HYDRATE_IDS` com `clientId=null`, sobrescrevendo o auto-select que o `fetchClients` já fez.

### Evidência da API

```json
// validate_hierarchy(analyst_id, null, null) retorna:
{ "analyst_valid": true, "client_valid": false, "farm_valid": false }

// validate_hierarchy(analyst_id, "uuid-valido", null) retorna:
{ "analyst_valid": true, "client_valid": true, "farm_valid": false }
```

---

## O Que Corrigir

### Arquivo: `HierarchyContext` (o provider que gerencia a hierarquia analista → cliente → fazenda)

---

### Correção 1 (OBRIGATÓRIA): Adicionar AbortController ao useEffect do validate_hierarchy

Localizar o `useEffect` que chama a RPC `validate_hierarchy`. Ele tem esta estrutura:

```javascript
useEffect(() => {
  if (!sessionReady || !user || !isProfileReady || user.qualification === "visitante") return;

  const timeout = window.setTimeout(() => {
    (async () => {
      const currentState = stateRef.current;
      const analystId = sanitizeUUID(effectiveAnalystId);
      const clientId = sanitizeUUID(currentState.clientId);
      const farmId = sanitizeFarmId(currentState.farmId);

      if (!analystId && !clientId && !farmId) return;

      // ... loop de retries chamando supabase.rpc("validate_hierarchy", {...}) ...
      // ... ao final despacha HYDRATE_IDS com os resultados ...
    })();
  }, 150);

  return () => {
    window.clearTimeout(timeout);
  };
}, [user?.id, user?.role, user?.qualification, user?.clientId, isProfileReady, effectiveAnalystId, state.analystId, state.clientId, state.farmId]);
```

**Alterar para:**

```javascript
useEffect(() => {
  if (!sessionReady || !user || !isProfileReady || user.qualification === "visitante") return;

  const abortController = new AbortController(); // ← NOVO

  const timeout = window.setTimeout(() => {
    (async () => {
      const currentState = stateRef.current;
      const analystId = sanitizeUUID(effectiveAnalystId);
      const clientId = sanitizeUUID(currentState.clientId);
      const farmId = sanitizeFarmId(currentState.farmId);

      if (!analystId && !clientId && !farmId) return;

      // Capturar o snapshot do clientId ANTES da RPC
      const snapshotClientId = currentState.clientId; // ← NOVO

      let data = null;
      let error = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Verificar se foi abortado antes de cada tentativa
        if (abortController.signal.aborted) return; // ← NOVO

        const result = await supabase
          .rpc("validate_hierarchy", {
            p_analyst_id: analystId,
            p_client_id: clientId,
            p_farm_id: farmId,
          })
          .abortSignal(abortController.signal); // ← NOVO: passar o signal

        data = result.data;
        error = result.error;

        if (!error) break;

        // ... tratamento de erro existente (retries, backoff, etc.) ...
        // Adicionar check de abort nos retries:
        if (abortController.signal.aborted) return; // ← NOVO

        // ... resto do retry logic ...
      }

      // Verificar abort antes de aplicar resultado
      if (abortController.signal.aborted) return; // ← NOVO

      if (error) {
        console.warn("[HierarchyContext] validate_hierarchy failed after retries:", error.message);
        return;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn("[HierarchyContext] validate_hierarchy returned empty data");
        return;
      }

      // NOVO: Verificar se o estado mudou durante a RPC
      // Se o clientId atual é diferente do que foi usado na RPC, ignorar o resultado
      if (stateRef.current.clientId !== snapshotClientId) {
        console.debug("[HierarchyContext] State changed during validate_hierarchy, discarding stale result");
        return;
      }

      const row = data[0];
      const validAnalystId = row.analyst_valid ? analystId : null;
      const validClientId = row.client_valid ? clientId : null;
      const validFarmId = row.farm_valid ? farmId : null;

      dispatch({
        type: "HYDRATE_IDS",
        payload: {
          analystId: validAnalystId,
          clientId: validClientId,
          farmId: validFarmId,
        },
      });
    })();
  }, 150);

  return () => {
    window.clearTimeout(timeout);
    abortController.abort(); // ← NOVO: cancelar RPC pendente no cleanup
  };
}, [user?.id, user?.role, user?.qualification, user?.clientId, isProfileReady, effectiveAnalystId, state.analystId, state.clientId, state.farmId]);
```

**Resumo das mudanças:**

- Criar um `AbortController` no início do `useEffect`
- Passar `abortController.signal` para o `.abortSignal()` da RPC do Supabase
- Verificar `abortController.signal.aborted` antes de cada retry e antes de despachar `HYDRATE_IDS`
- Capturar um snapshot do `clientId` antes da RPC e comparar com o estado atual antes de aplicar o resultado
- Chamar `abortController.abort()` no cleanup do `useEffect`

---

### Correção 2 (RECOMENDADA): Guard adicional para não validar com clientId=null quando há analystId

No mesmo `useEffect` do `validate_hierarchy`, logo após calcular os IDs sanitizados, adicionar um guard que **pula a validação quando só tem `analystId` mas não tem `clientId` nem `farmId`**:

```javascript
const analystId = sanitizeUUID(effectiveAnalystId);
const clientId = sanitizeUUID(currentState.clientId);
const farmId = sanitizeFarmId(currentState.farmId);

if (!analystId && !clientId && !farmId) return;

// NOVO: Se só temos analystId mas não temos clientId nem farmId,
// não há nada útil para validar. O fetchClients vai auto-selecionar
// o primeiro client, e o validate_hierarchy será chamado novamente
// com o clientId correto.
if (analystId && !clientId && !farmId) return;
```

**Justificativa:** Chamar `validate_hierarchy(analyst_id, null, null)` sempre retorna `client_valid=false`, o que é esperado mas inútil. Essa chamada só causa a race condition. Quando o `fetchClients` terminar e auto-selecionar um client, o `useEffect` será re-disparado com o `clientId` correto.

---

### Correção 3 (RECOMENDADA): Validar farmId com UUID antes de persistir

Localizar o `useEffect` ou função que **salva o `hierarchySelection` no `localStorage`**. Ele provavelmente usa uma função que aceita qualquer string como `farmId`.

**Problema encontrado:** O `localStorage` está salvando `farmId: "farm-1773057646466-ra3vjhyy8"` que **não é um UUID válido**. A função de sanitização de farmId (`sanitizeFarmId` / `E0`) aceita qualquer string não-vazia, diferente da de UUID.

**Alterar a função de sanitização de farmId** para também validar se é um UUID válido, ou adicionar validação antes de salvar:

```javascript
// Onde o hierarchySelection é salvo no localStorage:
const dataToSave = {
  analystId: state.analystId,
  clientId: state.clientId,
  farmId: isValidUUID(state.farmId) ? state.farmId : null, // ← NOVO: validar UUID
};
localStorage.setItem(storageKey, JSON.stringify(dataToSave));
```

Alternativamente, alterar a função `sanitizeFarmId` (no código original chamada `E0`) para validar UUID:

```javascript
// ANTES (aceita qualquer string):
function sanitizeFarmId(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// DEPOIS (valida UUID):
function sanitizeFarmId(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  return isValidUUID(trimmed) ? trimmed : null;
}
```

---

## Checklist de Verificação

Após aplicar as correções, verificar os seguintes cenários:

- [ ] **Primeiro login (localStorage limpo):** Limpar o `localStorage`, fazer login. A organização deve ser auto-selecionada automaticamente.
- [ ] **Login normal (com localStorage):** Fazer login normalmente. A organização salva deve ser restaurada.
- [ ] **Troca de organização:** Selecionar outra organização. A seleção deve persistir após reload.
- [ ] **Usuário visitante:** Verificar que visitantes não são afetados (têm IDs fixos).
- [ ] **Usuário cliente:** Verificar que clientes com `clientId` fixo no perfil não são afetados.
- [ ] **Rede lenta:** Simular rede lenta (DevTools → Network → Slow 3G) e verificar que o primeiro login ainda funciona.
- [ ] **Console limpo:** Verificar que não há warnings ou erros novos no console.
- [ ] **farmId inválido:** Verificar que IDs como `"farm-1773057646466-ra3vjhyy8"` não são mais salvos no localStorage.

---

## Arquivos a Modificar

| Arquivo | O Que Alterar |
|---|---|
| `HierarchyContext` (provider) | useEffect do `validate_hierarchy`: adicionar AbortController + snapshot check + guard para clientId=null |
| `HierarchyContext` (provider) | Função/useEffect que salva `hierarchySelection` no localStorage: validar farmId como UUID |
| Função `sanitizeFarmId` (se existir separada) | Alterar para validar UUID em vez de aceitar qualquer string |

---

## Contexto Técnico Adicional

- O Supabase client usa `navigator.locks` para serializar operações de auth. Isso pode causar delays no `fetchClients` (que precisa de `getSession()` → `_acquireLock`) especialmente logo após o login.
- O `fetchClients` já usa `AbortController` corretamente. O `validate_hierarchy` é o único que não cancela RPCs obsoletas.
- O reducer `HYDRATE_IDS` sobrescreve incondicionalmente `clientId`, `farmId` e `analystId`. Isso é correto desde que os dados sejam atuais (não stale).
- O `stateRef` (`c.current`) é atualizado sincronamente quando o state muda, então pode ser usado para verificar se o estado mudou durante uma operação assíncrona.
