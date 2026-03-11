# Fix: Loop Infinito de Autenticacao em Producao

## Diagnostico

O sistema entra em loop infinito em producao mas funciona em localhost.
Investigacao profunda revelou **3 problemas** que interagem entre si.

---

## Problema 1 (PRINCIPAL): Service Worker causa reloads infinitos

### Arquivos afetados
- `public/sw.js` (linha 5)
- `src/lib/sw-register.ts` (linhas 34-37)

### O bug

Em `sw.js`:
```javascript
const CACHE_VERSION = 'v3-' + Date.now(); // Date.now() muda A CADA fetch do SW!
```

Em `sw-register.ts`:
```javascript
navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload(); // Reload incondicional!
});
```

### Como o loop acontece

1. Pagina carrega -> SW e registrado
2. Browser busca `/sw.js` -> `Date.now()` gera valor diferente -> browser entende que o SW "mudou"
3. Novo SW chama `self.skipWaiting()` + `self.clients.claim()` -> assume controle imediatamente
4. Evento `controllerchange` dispara -> `window.location.reload()` executa
5. Pagina recarrega -> volta ao passo 1 -> **LOOP INFINITO DE RELOADS**

### Por que funciona em localhost

- Vite dev server nao serve `sw.js` da mesma forma que producao
- Browsers tratam Service Workers em localhost de forma mais leniente (cache menos agressivo)
- Em dev, o SW pode nem ser registrado dependendo da configuracao

### Correcao

**`public/sw.js`** - Trocar versao dinamica por estatica:
```javascript
// ANTES (BUGADO):
const CACHE_VERSION = 'v3-' + Date.now();

// DEPOIS (CORRETO):
const CACHE_VERSION = 'v4';
```

**`src/lib/sw-register.ts`** - Adicionar guard contra reload infinito:
```typescript
// ANTES (BUGADO):
navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Service Worker controller changed - reloading page');
    window.location.reload();
});

// DEPOIS (CORRETO):
navigator.serviceWorker.addEventListener('controllerchange', () => {
    const key = 'sw-reload-guard';
    const lastReload = sessionStorage.getItem(key);
    const now = Date.now();
    // So recarrega se nao recarregou nos ultimos 10 segundos
    if (!lastReload || now - Number(lastReload) > 10000) {
        console.log('[SW] Service Worker controller changed - reloading page');
        sessionStorage.setItem(key, String(now));
        window.location.reload();
    } else {
        console.log('[SW] Service Worker controller changed - reload skipped (guard active)');
    }
});
```

---

## Problema 2: index.html confunde login normal com password recovery

### Arquivo afetado
- `index.html` (linha 47)

### O bug

No script pre-React do `index.html`:
```javascript
var isPkceRecovery = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker || isRootPath);
//                                                                          ^^^^^^^^^^^
// ERRADO: qualquer ?code= na raiz "/" e tratado como recovery!
```

Enquanto no `AuthContext.tsx` (linha 70), a mesma verificacao **NAO** inclui `isRootPath`:
```typescript
const isPkceRecovery = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker);
// CORRETO: exige flag explicita de recovery
```

### O que acontece

1. Se qualquer fluxo Supabase (confirmacao de email, magic link, etc.) redireciona para `/?code=xxx`
2. O script do `index.html` ve `hasPkceCode=true` + `isRootPath=true`
3. Redireciona incorretamente para `/reset-password?code=xxx`
4. O React nao reconhece como recovery (sem flags no localStorage, sem `recovery=1` na URL)
5. Usuario fica em estado quebrado - pode ver login ou tela de reset sem funcionar

### Correcao

**`index.html`** - Remover `isRootPath` e alinhar com AuthContext:
```javascript
// ANTES (BUGADO):
var isPkceRecovery = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker || isRootPath);

// DEPOIS (CORRETO):
var isPkceRecovery = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker);
```

---

## Problema 3: Processamento duplicado de perfil no login

### Arquivo afetado
- `contexts/AuthContext.tsx` (linhas 191-196, 334)

### O bug

O `loginInProgressRef` e resetado no bloco `finally` da funcao `login()`, que pode
executar ANTES do evento `SIGNED_IN` do Supabase disparar:

```typescript
// login()
try {
    loginInProgressRef.current = true;
    // ... signInWithPassword ...
    setUser(basicUser);      // <-- user setado
    setIsLoading(false);
    return { success: true };
} finally {
    loginInProgressRef.current = false;  // <-- ref resetada AQUI
}

// Enquanto isso, onAuthStateChange pode disparar SIGNED_IN
// Se loginInProgressRef ja for false, o handler processa DUPLICADO
```

Resultado: dois processos paralelos de carregamento de perfil, gerando:
- Chamadas API duplicadas
- `setUser()` chamado multiplas vezes com objetos diferentes (novos references)
- Re-renders desnecessarios

### Correcao

**`contexts/AuthContext.tsx`** - Resetar ref com delay para garantir que o evento seja processado:

```typescript
// ANTES:
} finally {
    loginInProgressRef.current = false;
}

// DEPOIS:
} finally {
    // Dar tempo para o onAuthStateChange processar o SIGNED_IN
    // antes de liberar a ref
    setTimeout(() => {
        loginInProgressRef.current = false;
    }, 3000);
}
```

Tambem no handler `TOKEN_REFRESHED`, comparar user.id antes de setUser:
```typescript
} else if (event === 'TOKEN_REFRESHED' && session?.user) {
    const userProfile = await loadUserProfile(session.user.id);
    if (userProfile) {
        // Evitar re-render se o perfil nao mudou
        setUser(prev => {
            if (prev && prev.id === userProfile.id && prev.email === userProfile.email) {
                // Verificar se algo realmente mudou
                const changed = Object.keys(userProfile).some(
                    key => (userProfile as any)[key] !== (prev as any)[key]
                );
                return changed ? userProfile : prev;
            }
            return userProfile;
        });
    }
}
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao | Prioridade |
|---------|-----------|------------|
| `public/sw.js` | `Date.now()` -> versao estatica `'v4'` | CRITICA |
| `src/lib/sw-register.ts` | Guard com `sessionStorage` contra reload infinito | CRITICA |
| `index.html` | Remover `isRootPath` da deteccao de recovery | ALTA |
| `contexts/AuthContext.tsx` | Delay no reset de `loginInProgressRef` | MEDIA |
| `contexts/AuthContext.tsx` | Comparacao de user antes de `setUser` em `TOKEN_REFRESHED` | MEDIA |

---

## Como Verificar

### Testes locais (simulando producao)
1. `npm run build`
2. `npx serve dist` (serve a build de producao localmente)
3. Abrir `http://localhost:3000` no browser
4. Verificar no console que NAO ha reloads repetidos (procurar por logs `[SW]`)
5. Fazer login com email/senha - deve entrar direto, sem loop

### Testes de regressao
1. Navegar para `/?code=fake` - NAO deve redirecionar para `/reset-password`
2. Testar password recovery completo: solicitar reset -> clicar no link do email -> redefinir senha
3. Testar login OAuth (Google) se habilitado
4. Verificar que o app carrega normalmente apos refresh da pagina

### Em producao
1. Fazer deploy com as correcoes
2. Abrir o site em aba anonima
3. Confirmar que a pagina NAO fica recarregando
4. Fazer login e verificar que funciona normalmente
5. Monitorar console do browser por 30 segundos - nao deve haver reloads automaticos

---

## Notas Importantes

- O **Problema 1 (Service Worker)** e quase certamente a causa principal do loop infinito.
  Os outros problemas sao bugs reais mas provavelmente causam comportamento incorreto
  pontual, nao loop infinito.
- Apos o fix, considerar se o Service Worker e realmente necessario. Se o app nao precisa
  funcionar offline, pode ser mais seguro remover o SW completamente.
- Se remover o SW, adicionar codigo de cleanup para desregistrar SWs existentes nos browsers
  dos usuarios.
