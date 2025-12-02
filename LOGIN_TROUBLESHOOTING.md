# Troubleshooting - Login e Redirecionamento

## Problema: Login funciona mas não redireciona

### Correções Implementadas

1. **Retry Logic no Carregamento de Perfil**
   - Adicionado sistema de retry (até 5 tentativas) para carregar o perfil do usuário
   - Delay entre tentativas para aguardar o trigger criar o perfil
   - Logs para debug

2. **Melhor Tratamento de Estado**
   - O `onAuthStateChange` agora aguarda a criação do perfil
   - Múltiplas tentativas de carregamento do perfil após login

3. **Atualização de Estado no LoginPage**
   - Reset correto do `isSubmitting` após sucesso
   - O App component detecta automaticamente a mudança de estado do usuário

### Verificações no Supabase Dashboard

1. **Authentication > URL Configuration**
   - Site URL: `http://localhost:3000` (ou sua URL de produção)
   - Redirect URLs devem incluir:
     - `http://localhost:3000/**`
     - `http://localhost:3000`
     - Sua URL de produção (se aplicável)

2. **Authentication > Providers**
   - Verifique se Email está habilitado
   - Confirme as configurações de email

3. **Database > Triggers**
   - Verifique se o trigger `on_auth_user_created` está ativo
   - Confirme que a função `handle_new_user()` existe e está funcionando

### Como Testar

1. **Login com Email/Senha:**
   ```javascript
   // O login deve:
   // 1. Autenticar no Supabase
   // 2. Aguardar criação do perfil (trigger)
   // 3. Carregar o perfil com retry
   // 4. Atualizar o estado do usuário
   // 5. App component detecta e mostra dashboard
   ```

2. **Verificar Logs:**
   - Abra o Console do navegador (F12)
   - Procure por mensagens como:
     - "Auth state changed: SIGNED_IN"
     - "Profile not found, retrying..."
     - "Error loading user profile"

3. **Verificar no Supabase:**
   - Vá em Authentication > Users
   - Confirme que o usuário foi criado
   - Vá em Table Editor > user_profiles
   - Confirme que o perfil foi criado automaticamente

### Problemas Comuns

#### 1. Perfil não é criado automaticamente
**Solução:** Verifique se o trigger está ativo:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

#### 2. Erro "Profile not found"
**Solução:** O código agora tenta múltiplas vezes. Se persistir:
- Verifique se a função `handle_new_user()` tem permissões corretas
- Confirme que o schema `public` está acessível
- Verifique os logs do Supabase em Database > Logs

#### 3. Redirecionamento não acontece
**Solução:** 
- O App component verifica `if (!user)` e mostra LoginPage
- Quando `user` é definido, automaticamente mostra o dashboard
- Não há redirecionamento explícito - é baseado em estado React

### Debug

Adicione estes logs temporários para debug:

```typescript
// No AuthContext.tsx, adicione:
console.log('User state changed:', user);
console.log('Is loading:', isLoading);

// No App.tsx, adicione:
console.log('App render - user:', user);
console.log('App render - isLoading:', isLoading);
```

### Próximos Passos

Se o problema persistir:

1. Verifique os logs do navegador
2. Verifique os logs do Supabase (Database > Logs)
3. Teste criar um usuário manualmente no Supabase Dashboard
4. Verifique se o perfil é criado quando você faz login manualmente

