# Fix: Login com Google OAuth falha em producao (timeout no /auth/callback)

## Diagnostico

O login com email/senha funciona. Porem o **login com Google OAuth falha** em producao:
o usuario e redirecionado para `gesttor.app/auth/callback?code=xxx`, fica 15 segundos
esperando, e ve "Erro no login - O processo de autenticacao demorou demais."

---

## Causa Raiz

### Bug principal: `AuthContext.tsx` linha 144 - PKCE exchange descartado para OAuth

Quando o callback OAuth chega em `/auth/callback?code=xxx`:

```
1. getSession() retorna null (o codigo ainda nao foi trocado)
2. hasPkceCode = true (tem ?code= na URL)
3. hasRecoveryFlag = false (nao e recovery)
4. hasRecoveryMarker = false (nao e recovery)
5. waitingForPkceExchange = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker)
6. waitingForPkceExchange = true && (false || false) = FALSE  <-- O BUG
7. Codigo executa imediatamente: setUser(null) + setIsLoading(false)
8. Supabase detectSessionInUrl pode tentar trocar em background, mas...
9. Se falhar silenciosamente, onAuthStateChange nunca dispara SIGNED_IN
10. AuthCallback espera 15s -> mostra erro de timeout
```

O comentario no codigo confirma a intencao errada:
```typescript
// So esperar PKCE exchange quando ha flag explicita de recovery
const waitingForPkceExchange = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker);
```

O codigo foi projetado para esperar PKCE exchange APENAS no recovery, ignorando OAuth.

### Bug secundario: `AuthCallback.tsx` - zero fallback

O componente `AuthCallback` e totalmente passivo:
- Nao tenta `exchangeCodeForSession()` explicitamente
- Apenas espera `user` aparecer do AuthContext
- Timeout de 15 segundos sem retry nem tentativa manual

---

## Arquivos a Modificar

| # | Arquivo | O que fazer |
|---|---------|-------------|
| 1 | `contexts/AuthContext.tsx` | Reconhecer `/auth/callback` como PKCE exchange valido |
| 2 | `components/AuthCallback.tsx` | Adicionar troca PKCE explicita como fallback |
| 3 | `contexts/AuthContext.tsx` | Delay no reset de `loginInProgressRef` |

---

## Correcao 1: `contexts/AuthContext.tsx` - Esperar PKCE exchange no OAuth callback

### Localizacao: linhas 138-150 (dentro do `initAuth()`, bloco `else` quando nao ha sessao)

```typescript
// ANTES (BUGADO):
} else {
  // Sem sessao: verificar se ha code PKCE na URL (SDK ainda pode trocar)
  const searchParams = new URLSearchParams(window.location.search);
  const hasPkceCode = searchParams.has('code');
  const hasRecoveryFlag = !!localStorage.getItem(PASSWORD_RECOVERY_KEY);
  const hasRecoveryMarker = searchParams.get(PASSWORD_RECOVERY_MARKER) === PASSWORD_RECOVERY_MARKER_VALUE;
  // So esperar PKCE exchange quando ha flag explicita de recovery
  const waitingForPkceExchange = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker);

  if (!waitingForPkceExchange) {
    setUser(null);
    clearTimeout(safetyTimeout);
    setIsLoading(false);
  }
  // Se waitingForPkceExchange: nao setar isLoading=false aqui;
  // PASSWORD_RECOVERY ou SIGNED_IN vai chamar setIsLoading(false)
}


// DEPOIS (CORRETO):
} else {
  // Sem sessao: verificar se ha code PKCE na URL (SDK ainda pode trocar)
  const searchParams = new URLSearchParams(window.location.search);
  const hasPkceCode = searchParams.has('code');
  const hasRecoveryFlag = !!localStorage.getItem(PASSWORD_RECOVERY_KEY);
  const hasRecoveryMarker = searchParams.get(PASSWORD_RECOVERY_MARKER) === PASSWORD_RECOVERY_MARKER_VALUE;

  // NOVO: Detectar se estamos no callback OAuth
  const isAuthCallback = window.location.pathname === '/auth/callback';

  // Esperar PKCE exchange em recovery OU OAuth callback
  const waitingForPkceExchange = hasPkceCode && (hasRecoveryFlag || hasRecoveryMarker || isAuthCallback);

  if (!waitingForPkceExchange) {
    setUser(null);
    clearTimeout(safetyTimeout);
    setIsLoading(false);
  }
  // Se waitingForPkceExchange: o safetyTimeout de 10s garante que isLoading eventualmente sera false
  // O onAuthStateChange com SIGNED_IN vai setar o user e isLoading
}
```

### Explicacao

Adicionamos `isAuthCallback` a condicao. Quando o usuario chega em `/auth/callback?code=xxx`,
o codigo agora espera o Supabase processar a troca PKCE em vez de descartar o codigo.
O `safetyTimeout` de 10 segundos (linha 99-102) garante que `isLoading` sera `false`
eventualmente mesmo se a troca falhar.

---

## Correcao 2: `components/AuthCallback.tsx` - Fallback com troca PKCE explicita

### Substituir o componente inteiro por:

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { logger } from '../lib/logger';

const log = logger.withContext({ component: 'AuthCallback' });

const AuthCallback: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  // 1. Checar erros OAuth na URL (ex: usuario cancelou no Google)
  useEffect(() => {
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (errorParam) {
      log.error('OAuth callback error', new Error(errorDescription || errorParam));
      setError(errorDescription || errorParam || 'Erro durante autenticacao.');
    }
  }, []);

  // 2. Redirect quando user autenticado
  useEffect(() => {
    if (user && !isLoading) {
      log.info('User authenticated on callback, redirecting to app');
      window.location.replace('/');
    }
  }, [user, isLoading]);

  // 3. FALLBACK: Tentar troca PKCE explicita se detectSessionInUrl nao funcionar
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    // Sem codigo ou ja tentou, nao fazer nada
    if (!code || exchangeAttempted.current) return;

    // Dar 4 segundos para detectSessionInUrl funcionar automaticamente
    const fallbackTimer = setTimeout(async () => {
      // Se ja autenticou, nao precisa de fallback
      if (user) return;

      exchangeAttempted.current = true;
      log.info('detectSessionInUrl did not fire in time, attempting manual PKCE exchange');

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          log.error('Manual PKCE exchange failed', new Error(exchangeError.message));

          // Mensagens amigaveis para erros comuns
          const msg = exchangeError.message.toLowerCase();
          if (msg.includes('invalid') || msg.includes('expired') || msg.includes('code verifier')) {
            setError('O link de autenticacao expirou ou e invalido. Tente fazer login novamente.');
          } else if (msg.includes('already used') || msg.includes('consumed')) {
            setError('Este link de autenticacao ja foi utilizado. Tente fazer login novamente.');
          } else {
            setError('Falha na autenticacao com Google. Tente novamente.');
          }
          return;
        }

        if (data?.session) {
          log.info('Manual PKCE exchange succeeded, waiting for onAuthStateChange');
          // onAuthStateChange vai cuidar de setar o user
          // O useEffect de redirect (item 2) vai ativar automaticamente
        }
      } catch (err) {
        log.error('PKCE exchange exception', err instanceof Error ? err : new Error(String(err)));
        setError('Erro inesperado na autenticacao. Tente novamente.');
      }
    }, 4000);

    return () => clearTimeout(fallbackTimer);
  }, [user]);

  // 4. Timeout final de seguranca (20s total para cobrir: 4s auto + exchange + profile load)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!user && !error) {
        log.warn('Auth callback final timeout reached (20s)');
        setError('O processo de autenticacao demorou demais. Tente fazer login novamente.');
      }
    }, 20000);

    return () => clearTimeout(timeout);
  }, [user, error]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
        <div className="text-center max-w-md px-6">
          <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold mb-2">Erro no login</h2>
          <p className="text-sm text-ai-subtext mb-6">{error}</p>
          <button
            onClick={() => window.location.replace('/')}
            className="px-6 py-2.5 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 transition-colors text-sm font-medium"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-ai-bg text-ai-text">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" />
        <p className="text-sm text-ai-subtext">Finalizando autenticacao...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
```

### Explicacao do fluxo com fallback

```
TEMPO    | O QUE ACONTECE
---------|--------------------------------------------------
0s       | Pagina /auth/callback?code=xxx carrega
0-4s     | Supabase detectSessionInUrl tenta trocar automaticamente
         | Se funcionar: onAuthStateChange -> SIGNED_IN -> user setado -> redirect para /
4s       | Se user ainda nao existe: fallback manual com exchangeCodeForSession(code)
4-8s     | Troca manual + profile loading
         | Se funcionar: onAuthStateChange -> SIGNED_IN -> user setado -> redirect para /
20s      | Timeout final de seguranca -> mostra erro amigavel
```

---

## Correcao 3: `contexts/AuthContext.tsx` - loginInProgressRef com delay

### Localizacao: linha 334 (bloco `finally` da funcao `login()`)

```typescript
// ANTES:
} finally {
    loginInProgressRef.current = false;
}

// DEPOIS:
} finally {
    // Dar tempo para o onAuthStateChange processar o SIGNED_IN
    // antes de liberar a ref (evita processamento duplicado de perfil)
    setTimeout(() => {
        loginInProgressRef.current = false;
    }, 3000);
}
```

### Por que

O `finally` pode executar ANTES do `onAuthStateChange` disparar o evento `SIGNED_IN`.
Se `loginInProgressRef` ja e `false` quando o evento chega, o handler processa normalmente
e carrega o perfil DUPLICADO (em paralelo com o background profile load do `login()`).

Com o delay de 3s, garantimos que o evento SIGNED_IN encontra `loginInProgressRef = true`
e pula o processamento duplicado.

---

## Resumo das Alteracoes

| Arquivo | Alteracao | Impacto |
|---------|-----------|---------|
| `contexts/AuthContext.tsx` L144 | Adicionar `isAuthCallback` ao `waitingForPkceExchange` | **Corrige a causa raiz** - AuthContext agora espera a troca PKCE no OAuth callback |
| `components/AuthCallback.tsx` | Reescrever com fallback `exchangeCodeForSession()` | **Adiciona resiliencia** - se detectSessionInUrl falhar, tenta manualmente apos 4s |
| `contexts/AuthContext.tsx` L334 | Delay de 3s no reset de `loginInProgressRef` | **Evita duplicacao** - previne carregamento de perfil duplicado |

---

## Verificacao

### Testar login com Google
1. Abrir `gesttor.app` (ou localhost apos `npm run build && npx serve dist`)
2. Clicar em "Login com Google"
3. Autenticar no Google
4. **Esperado**: Redireciona para o app em menos de 8 segundos
5. **Verificar console**: Deve mostrar logs `[AuthCallback]` indicando sucesso

### Testar login com email/senha
1. Fazer login com email/senha
2. **Esperado**: Funciona normalmente sem regressao

### Testar password recovery
1. Clicar em "Esqueceu a senha"
2. Enviar email de recuperacao
3. Clicar no link do email
4. **Esperado**: Pagina de reset de senha aparece corretamente
5. Redefinir senha com sucesso

### Testar cenarios de erro
1. Navegar diretamente para `/auth/callback` (sem code) -> deve mostrar erro
2. Navegar para `/auth/callback?code=invalido` -> deve mostrar erro apos fallback
3. Cancelar login no Google -> deve mostrar erro com mensagem do Google
