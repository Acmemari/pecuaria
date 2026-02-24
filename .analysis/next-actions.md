# Próximas Ações Recomendadas - Robustez da Aplicação

**Data:** 2026-02-13  
**Prioridade:** Ações ordenadas por impacto e urgência

---

## 🎯 AÇÕES IMEDIATAS (Fazer Agora)

### 1. Testar as Novas Ferramentas

**Tempo estimado:** 15-30 minutos

Verificar se tudo está funcionando corretamente:

```bash
# Verificar se não há erros de compilação
npm run build

# Executar a aplicação
npm run dev
```

**Checklist:**

- [ ] Aplicação compila sem erros
- [ ] Aplicação inicia normalmente
- [ ] Não há erros no console do navegador

---

### 2. Migrar 1-2 Componentes Críticos para Logger

**Tempo estimado:** 30-60 minutos  
**Impacto:** Alto - Melhora imediata no debugging

**Componentes sugeridos:**

1. `SettingsPage.tsx` (muitos console.error)
2. `FarmSelector.tsx` (muitos console.log)

**Exemplo de migração:**

```typescript
// No topo do arquivo
import { logger } from '../lib/logger';

// Criar logger com contexto fixo
const componentLogger = logger.withContext({ component: 'SettingsPage' });

// Substituir console.error
// ANTES:
console.error('Erro ao carregar perguntas:', err);

// DEPOIS:
componentLogger.error('Erro ao carregar perguntas', err);

// Substituir console.log
// ANTES:
console.log('[SettingsPage] Loaded companies:', uniqueCompanies.length);

// DEPOIS:
componentLogger.info('Loaded companies', { count: uniqueCompanies.length });
```

---

## 📋 AÇÕES IMPORTANTES (Esta Semana)

### 3. Adicionar Validações em Formulários Críticos

**Tempo estimado:** 1-2 horas  
**Impacto:** Alto - Previne dados inválidos

**Formulários para validar:**

1. Login/Registro (email, senha)
2. Configurações de Perfil (telefone, email)
3. Cadastro de Fazendas (nome, dados)

**Exemplo:**

```typescript
import { validateEmail, validatePassword, validatePhone } from '../lib/questionnaireValidation';

const handleSubmit = async () => {
  // Validar email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    onToast?.(emailValidation.error!, 'error');
    return;
  }

  // Validar senha
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    onToast?.(passwordValidation.error!, 'error');
    return;
  }

  // Continuar com o submit...
};
```

---

### 4. Adicionar ErrorBoundary em Pontos Estratégicos

**Tempo estimado:** 30 minutos  
**Impacto:** Médio - Previne crashes completos

**Locais sugeridos:**

```typescript
// Em App.tsx ou index.tsx
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>

// Em rotas críticas
<ErrorBoundary fallback={<ErrorFallback />}>
  <QuestionnaireModule />
</ErrorBoundary>
```

---

## 🔄 AÇÕES GRADUAIS (Próximas 2 Semanas)

### 5. Migrar Queries Supabase para supabaseClient

**Tempo estimado:** 2-4 horas (gradual)  
**Impacto:** Médio - Adiciona retry automático

**Estratégia:**

- Migrar 1-2 componentes por dia
- Começar pelos mais críticos (autenticação, salvamento de dados)

**Exemplo:**

```typescript
// ANTES
const { data, error } = await supabase.from('saved_questionnaires').select('*').eq('user_id', userId);

if (error) throw error;

// DEPOIS
import { supabaseClient } from '../lib/supabaseClient';

const data = await supabaseClient.query('saved_questionnaires', builder => builder.select('*').eq('user_id', userId));
```

---

### 6. Adicionar Testes Unitários

**Tempo estimado:** 3-5 horas  
**Impacto:** Alto - Previne regressões

**Começar com:**

1. Testes de validação (mais fácil)
2. Testes de hooks (useAsync, useQuestions)
3. Testes de componentes críticos

**Exemplo:**

```typescript
// lib/__tests__/questionnaireValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone } from '../questionnaireValidation';

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid').valid).toBe(false);
  });

  it('should reject empty emails', () => {
    expect(validateEmail('').valid).toBe(false);
  });
});
```

**Executar testes:**

```bash
npm run test
```

---

## 🚀 AÇÕES FUTURAS (Próximo Mês)

### 7. Integrar com Serviço de Monitoramento

**Tempo estimado:** 2-3 horas  
**Impacto:** Alto - Visibilidade de erros em produção

**Opções:**

- [Sentry](https://sentry.io) (recomendado)
- [LogRocket](https://logrocket.com)
- [Datadog](https://www.datadoghq.com)

**Setup Sentry (exemplo):**

```bash
npm install @sentry/react
```

```typescript
// index.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});

// Em logger.ts
private sendToExternalService(logEntry: LogEntry) {
  if (logEntry.level === 'error' && logEntry.error) {
    Sentry.captureException(new Error(logEntry.error.message), {
      contexts: {
        custom: logEntry.context,
      },
    });
  }
}
```

---

### 8. Adicionar Headers de Segurança

**Tempo estimado:** 30 minutos  
**Impacto:** Médio - Melhora segurança

**Atualizar vercel.json:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

---

### 9. Documentar Padrões de Código

**Tempo estimado:** 2-3 horas  
**Impacto:** Médio - Facilita manutenção

**Criar:**

- `docs/CODING_STANDARDS.md`
- `docs/ERROR_HANDLING.md`
- `docs/TESTING_GUIDE.md`

---

## 📊 CHECKLIST DE PROGRESSO

### Semana 1 (Atual)

- [x] Criar sistema de logging
- [x] Criar wrapper Supabase com retry
- [x] Expandir validações
- [x] Melhorar ErrorBoundary
- [x] Criar hook useAsync
- [ ] Testar novas ferramentas
- [ ] Migrar 2 componentes para logger
- [ ] Adicionar validações em formulários

### Semana 2

- [ ] Adicionar ErrorBoundary em rotas
- [ ] Migrar 5 componentes para supabaseClient
- [ ] Criar testes para validações
- [ ] Criar testes para hooks

### Semana 3-4

- [ ] Migrar mais componentes para logger
- [ ] Expandir cobertura de testes
- [ ] Adicionar headers de segurança
- [ ] Documentar padrões

### Mês 2

- [ ] Integrar com Sentry
- [ ] Monitoramento de performance
- [ ] Code review completo
- [ ] Auditoria de segurança

---

## 🎓 RECURSOS DE APRENDIZADO

### Logging

- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)
- [Why Structured Logging Matters](https://www.honeycomb.io/blog/structured-logging-and-your-team)

### Error Handling

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling Best Practices](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)

### Testing

- [Vitest Guide](https://vitest.dev/guide/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Security

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Headers](https://owasp.org/www-project-secure-headers/)

---

## 💡 DICAS IMPORTANTES

### 1. Migração Gradual

Não precisa migrar tudo de uma vez. Faça gradualmente:

- Novos componentes: Use as novas ferramentas desde o início
- Componentes existentes: Migre quando for fazer manutenção

### 2. Priorize por Impacto

Foque primeiro em:

1. Componentes críticos (autenticação, salvamento de dados)
2. Componentes com mais erros reportados
3. Componentes mais usados

### 3. Teste Antes de Deploy

Sempre teste localmente antes de fazer deploy:

```bash
npm run build
npm run preview
```

### 4. Monitore Logs

Em produção, monitore os logs regularmente para identificar problemas cedo.

---

## ❓ PERGUNTAS FREQUENTES

**Q: Preciso migrar todo o código de uma vez?**  
A: Não! Migre gradualmente. O código antigo continua funcionando.

**Q: O que fazer se encontrar um erro?**  
A: Use o logger para registrar o erro com contexto completo. Isso facilita o debugging.

**Q: Como sei se uma operação precisa de retry?**  
A: Operações de rede (API, banco de dados) se beneficiam de retry. Operações locais não precisam.

**Q: Devo usar useAsync em todos os componentes?**  
A: Use onde fizer sentido. Se você já tem lógica de loading/error funcionando bem, não precisa migrar imediatamente.

---

## 📞 SUPORTE

Se encontrar problemas ou tiver dúvidas:

1. Verifique a documentação nos arquivos `.analysis/`
2. Revise os exemplos de uso neste documento
3. Consulte os recursos de aprendizado listados acima

---

**Última atualização:** 2026-02-13  
**Próxima revisão:** 2026-02-20
