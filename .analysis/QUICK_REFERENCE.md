# 🚀 Guia Rápido - Novas Ferramentas de Robustez

**Referência rápida para as novas ferramentas implementadas**

---

## 📝 Logger

### Import
```typescript
import { logger } from '../lib/logger';
```

### Uso Básico
```typescript
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Com Contexto
```typescript
logger.info('User logged in', {
  component: 'LoginPage',
  userId: user.id,
  action: 'login'
});
```

### Logger com Contexto Fixo
```typescript
const log = logger.withContext({ component: 'MyComponent' });
log.info('Started');
log.error('Failed', error);
```

### Medir Performance
```typescript
const result = await logger.measureAsync(
  async () => await fetchData(),
  'Fetch Data',
  { component: 'MyComponent' }
);
```

---

## 🔄 Supabase Client

### Import
```typescript
import { supabaseClient } from '../lib/supabaseClient';
```

### Select
```typescript
const users = await supabaseClient.select('users');
const user = await supabaseClient.select('users', 'id, name, email');
```

### Insert
```typescript
const newUser = await supabaseClient.insert('users', {
  name: 'João',
  email: 'joao@example.com'
});
```

### Update
```typescript
const updated = await supabaseClient.update(
  'users',
  { name: 'João Silva' },
  { id: '123' }
);
```

### Delete
```typescript
await supabaseClient.delete('users', { id: '123' });
```

### RPC
```typescript
const result = await supabaseClient.rpc('my_function', {
  param1: 'value1'
});
```

### Com Retry Customizado
```typescript
const data = await supabaseClient.select('users', '*', {
  maxRetries: 5,
  delayMs: 2000,
  exponentialBackoff: true
});
```

---

## ✅ Validações

### Import
```typescript
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validatePositiveNumber,
  validateNumberRange,
  validateDocument,
  validateUrl,
  validateDate,
  sanitizeInput
} from '../lib/questionnaireValidation';
```

### Email
```typescript
const result = validateEmail(email);
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### Telefone
```typescript
const result = validatePhone(phone);
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### Senha
```typescript
const result = validatePassword(password);
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### Número Positivo
```typescript
const result = validatePositiveNumber(value, 'Preço');
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### Intervalo Numérico
```typescript
const result = validateNumberRange(age, 0, 120, 'Idade');
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### CPF/CNPJ
```typescript
const result = validateDocument(document);
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### URL
```typescript
const result = validateUrl(url);
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### Data
```typescript
const result = validateDate(date); // DD/MM/YYYY
if (!result.valid) {
  toast.error(result.error);
  return;
}
```

### Sanitizar Input
```typescript
const safeName = sanitizeInput(userInput);
```

---

## ⚡ useAsync Hook

### Import
```typescript
import { useAsync } from '../hooks/useAsync';
```

### Uso Básico
```typescript
const { loading, error, data, execute } = useAsync(
  async (userId: string) => {
    return await fetchUser(userId);
  }
);

// Executar
await execute('user-123');
```

### Com Callbacks
```typescript
const { loading, error, data, execute } = useAsync(
  async (userId: string) => await fetchUser(userId),
  {
    onSuccess: (user) => {
      toast.success(`Bem-vindo, ${user.name}!`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  }
);
```

### Com Dados Iniciais
```typescript
const { loading, error, data, execute } = useAsync(
  fetchUsers,
  {
    initialData: []
  }
);
```

### Reset
```typescript
const { reset } = useAsync(fetchData);

// Limpar estado
reset();
```

### Execução Imediata
```typescript
import { useAsyncImmediate } from '../hooks/useAsync';

const { loading, error, data, reload } = useAsyncImmediate(
  async () => await fetchUsers()
);

// Recarregar
await reload();
```

---

## 🛡️ ErrorBoundary

### Import
```typescript
import ErrorBoundary from '../components/ErrorBoundary';
```

### Uso Básico
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Com Callback
```typescript
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Enviar para serviço de monitoramento
    console.error('Error:', error);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Com Fallback Customizado
```typescript
<ErrorBoundary
  fallback={
    <div>
      <h1>Erro personalizado</h1>
      <button onClick={() => window.location.reload()}>
        Recarregar
      </button>
    </div>
  }
>
  <MyComponent />
</ErrorBoundary>
```

---

## 📋 Padrões Comuns

### Formulário com Validação
```typescript
const handleSubmit = async () => {
  // Validar email
  const emailResult = validateEmail(email);
  if (!emailResult.valid) {
    toast.error(emailResult.error);
    return;
  }

  // Validar senha
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) {
    toast.error(passwordResult.error);
    return;
  }

  // Sanitizar nome
  const safeName = sanitizeInput(name);

  // Salvar com retry automático
  try {
    const user = await supabaseClient.insert('users', {
      name: safeName,
      email,
      password
    });

    logger.info('User created', {
      component: 'RegisterForm',
      userId: user.id
    });

    toast.success('Cadastro realizado!');
  } catch (error) {
    logger.error('Failed to create user', error, {
      component: 'RegisterForm'
    });
    toast.error('Erro ao cadastrar');
  }
};
```

### Componente com useAsync
```typescript
function UserProfile({ userId }: { userId: string }) {
  const log = logger.withContext({ component: 'UserProfile' });

  const { loading, error, data: user, execute } = useAsync(
    async (id: string) => {
      log.info('Loading user', { userId: id });
      return await supabaseClient.select('users', '*', {
        maxRetries: 3
      }).then(users => users.find(u => u.id === id));
    },
    {
      onSuccess: (user) => {
        log.info('User loaded', { userId: user.id });
      },
      onError: (error) => {
        log.error('Failed to load user', error);
        toast.error('Erro ao carregar usuário');
      }
    }
  );

  useEffect(() => {
    execute(userId);
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <NotFound />;

  return <div>{user.name}</div>;
}
```

### Operação com Medição de Performance
```typescript
const handleSave = async () => {
  const result = await logger.measureAsync(
    async () => {
      // Validar
      const validation = validateQuestionnaireName(name);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Salvar com retry
      return await supabaseClient.insert('questionnaires', {
        name: sanitizeInput(name),
        user_id: user.id
      });
    },
    'Save Questionnaire',
    {
      component: 'QuestionnaireFiller',
      userId: user.id
    }
  );

  toast.success('Salvo com sucesso!');
  return result;
};
```

---

## 🎯 Checklist de Migração

### Para Cada Componente

- [ ] Substituir `console.log` por `logger.info`
- [ ] Substituir `console.error` por `logger.error`
- [ ] Adicionar validações em inputs
- [ ] Usar `supabaseClient` em vez de `supabase` direto
- [ ] Considerar usar `useAsync` se houver lógica async
- [ ] Adicionar `ErrorBoundary` em rotas críticas

---

## 📚 Documentação Completa

Para mais detalhes, veja:
- `.analysis/ROBUSTNESS_COMPLETE.md` - Resumo completo
- `.analysis/implementation-summary.md` - Guias detalhados
- `.analysis/next-actions.md` - Próximos passos
- `.analysis/robustness-improvement-plan.md` - Plano completo

---

**Última atualização:** 2026-02-13
