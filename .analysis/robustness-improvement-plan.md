# Plano de Melhoria de Robustez da Aplicação

**Data:** 2026-02-13  
**Objetivo:** Tornar a aplicação mais robusta, segura e resiliente

---

## 🎯 RESUMO EXECUTIVO

Este plano aborda melhorias críticas de robustez identificadas através de análises de código anteriores. As melhorias estão organizadas por prioridade e impacto.

### Status Atual
✅ **Já Implementado:**
- Hook `useQuestions` com cache global
- Hook `useRateLimiter` para controle de taxa
- Validação de questionários (`questionnaireValidation.ts`)
- Tratamento de erros centralizado (`errorHandler.ts`)
- Constantes centralizadas (`questionnaireConstants.ts`)
- Validação de variáveis de ambiente (`env.ts`)

🔄 **Áreas para Melhoria:**
1. Logging estruturado e monitoramento
2. Tratamento de erros mais robusto em componentes
3. Validação de entrada do usuário em mais pontos
4. Retry logic para operações de rede
5. Testes automatizados
6. Segurança aprimorada

---

## 📊 PRIORIDADE 1: CRÍTICO (Implementar Imediatamente)

### 1.1 Sistema de Logging Estruturado

**Problema:** Console.log espalhado pelo código, difícil rastreamento em produção

**Solução:** Criar sistema de logging centralizado

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };
    
    // Em desenvolvimento, log colorido no console
    if (this.isDevelopment) {
      const colors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
      };
      console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m`, message, context || '');
    }
    
    // Em produção, apenas errors
    if (!this.isDevelopment && level === 'error') {
      console.error(JSON.stringify(logEntry));
      // Aqui você pode enviar para serviço externo (Sentry, LogRocket, etc.)
    }
  }
  
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: error?.message,
      stack: this.isDevelopment ? error?.stack : undefined,
    });
  }
}

export const logger = new Logger();
```

**Impacto:** Alto - Facilita debugging e monitoramento

---

### 1.2 Wrapper de Supabase com Retry Logic

**Problema:** Falhas de rede podem causar erros intermitentes

**Solução:** Criar wrapper com retry automático

```typescript
// lib/supabaseClient.ts
import { supabase } from './supabase';
import { logger } from './logger';

interface RetryConfig {
  maxRetries?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
  } = config;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      // Não retry em erros de autenticação ou validação
      if (error.status === 401 || error.status === 403 || error.status === 400) {
        throw error;
      }
      
      if (isLastAttempt) {
        logger.error('Operation failed after retries', error, {
          component: 'supabaseClient',
          attempts: maxRetries,
        });
        throw error;
      }
      
      const delay = exponentialBackoff 
        ? delayMs * Math.pow(2, attempt)
        : delayMs;
      
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
        component: 'supabaseClient',
        delay,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export const supabaseClient = {
  async query<T>(
    table: string,
    operation: (builder: any) => Promise<{ data: T | null; error: any }>
  ): Promise<T> {
    const result = await withRetry(
      () => operation(supabase.from(table)),
      { maxRetries: 3 }
    );
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data as T;
  },
};
```

**Impacto:** Alto - Reduz falhas por problemas temporários de rede

---

### 1.3 Validação de Input em Todos os Formulários

**Problema:** Validação inconsistente em diferentes componentes

**Solução:** Expandir `questionnaireValidation.ts`

```typescript
// lib/validation.ts (expandir)

/**
 * Valida email
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Email é obrigatório' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Email inválido' };
  }
  
  return { valid: true };
};

/**
 * Valida telefone brasileiro
 */
export const validatePhone = (phone: string): ValidationResult => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { valid: false, error: 'Telefone inválido' };
  }
  
  return { valid: true };
};

/**
 * Valida senha
 */
export const validatePassword = (password: string): ValidationResult => {
  if (password.length < 8) {
    return { valid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Senha deve conter pelo menos uma letra maiúscula' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Senha deve conter pelo menos uma letra minúscula' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Senha deve conter pelo menos um número' };
  }
  
  return { valid: true };
};

/**
 * Valida número positivo
 */
export const validatePositiveNumber = (value: number | string): ValidationResult => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: 'Valor deve ser um número' };
  }
  
  if (num < 0) {
    return { valid: false, error: 'Valor deve ser positivo' };
  }
  
  return { valid: true };
};
```

**Impacto:** Alto - Previne dados inválidos no sistema

---

## 📊 PRIORIDADE 2: IMPORTANTE (Implementar em Breve)

### 2.1 Error Boundary Aprimorado

**Problema:** Error boundary básico sem recuperação

**Solução:** Melhorar ErrorBoundary.tsx

```typescript
// components/ErrorBoundary.tsx (melhorado)
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught error', error, {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
    
    this.setState(prev => ({
      errorCount: prev.errorCount + 1,
    }));
    
    this.props.onError?.(error, errorInfo);
    
    // Auto-reset após muitos erros (possível loop)
    if (this.state.errorCount > 5) {
      logger.error('Too many errors, clearing state', undefined, {
        component: 'ErrorBoundary',
      });
      localStorage.clear();
      window.location.href = '/';
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h1 className="text-xl font-bold text-gray-900">
                Algo deu errado
              </h1>
            </div>
            
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Ir para Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Impacto:** Médio - Melhora experiência do usuário em caso de erros

---

### 2.2 Hook de Operações Assíncronas

**Problema:** Lógica de loading/error repetida em componentes

**Solução:** Criar hook genérico

```typescript
// hooks/useAsync.ts
import { useState, useCallback, useEffect } from 'react';
import { logger } from '../lib/logger';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  immediate?: boolean;
}

export function useAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const execute = useCallback(
    async (...args: Args) => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await asyncFunction(...args);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        logger.error('Async operation failed', error, {
          component: 'useAsync',
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, options]
  );
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);
  
  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
}
```

**Impacto:** Médio - Simplifica código e padroniza tratamento de erros

---

## 📊 PRIORIDADE 3: DESEJÁVEL (Implementar Quando Possível)

### 3.1 Testes Automatizados

**Problema:** Sem cobertura de testes

**Solução:** Adicionar testes unitários e de integração

```typescript
// lib/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateQuestionnaireName, validateEmail, validatePhone } from '../validation';

describe('validateQuestionnaireName', () => {
  it('should reject empty names', () => {
    const result = validateQuestionnaireName('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vazio');
  });
  
  it('should reject names too short', () => {
    const result = validateQuestionnaireName('AB');
    expect(result.valid).toBe(false);
  });
  
  it('should reject XSS attempts', () => {
    const result = validateQuestionnaireName('<script>alert("xss")</script>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('inválidos');
  });
  
  it('should accept valid names', () => {
    const result = validateQuestionnaireName('Questionário Fazenda ABC');
    expect(result.valid).toBe(true);
  });
});
```

**Impacto:** Médio - Previne regressões

---

### 3.2 Monitoramento de Performance

**Problema:** Sem métricas de performance

**Solução:** Adicionar métricas

```typescript
// lib/performance.ts
export class PerformanceMonitor {
  private static marks = new Map<string, number>();
  
  static mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  static measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (!start) {
      logger.warn('Performance mark not found', { mark: startMark });
      return;
    }
    
    const duration = performance.now() - start;
    
    logger.info('Performance measurement', {
      component: 'PerformanceMonitor',
      name,
      duration: `${duration.toFixed(2)}ms`,
    });
    
    // Alertar se operação demorou muito
    if (duration > 3000) {
      logger.warn('Slow operation detected', {
        component: 'PerformanceMonitor',
        name,
        duration: `${duration.toFixed(2)}ms`,
      });
    }
    
    this.marks.delete(startMark);
  }
}

// Uso:
// PerformanceMonitor.mark('loadQuestions');
// await loadQuestions();
// PerformanceMonitor.measure('Load Questions', 'loadQuestions');
```

**Impacto:** Baixo - Útil para otimizações futuras

---

## 🔒 SEGURANÇA

### 4.1 Content Security Policy

**Problema:** Sem CSP configurado

**Solução:** Adicionar headers de segurança

```typescript
// vercel.json (adicionar)
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
        }
      ]
    }
  ]
}
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1 (Crítico - Esta Semana)
- [ ] Implementar sistema de logging estruturado
- [ ] Adicionar retry logic ao Supabase
- [ ] Expandir validações de input
- [ ] Melhorar ErrorBoundary

### Fase 2 (Importante - Próximas 2 Semanas)
- [ ] Criar hook useAsync
- [ ] Adicionar testes unitários básicos
- [ ] Implementar monitoramento de performance
- [ ] Revisar e consolidar tratamento de erros

### Fase 3 (Desejável - Próximo Mês)
- [ ] Adicionar CSP headers
- [ ] Expandir cobertura de testes
- [ ] Implementar integração com serviço de monitoramento (Sentry)
- [ ] Documentar padrões de código

---

## 🎯 MÉTRICAS DE SUCESSO

1. **Redução de Erros:** Diminuir erros em produção em 80%
2. **Tempo de Resposta:** Manter 95% das operações abaixo de 2s
3. **Cobertura de Testes:** Atingir 60% de cobertura de código crítico
4. **Experiência do Usuário:** Zero crashes não recuperáveis

---

## 📚 RECURSOS ADICIONAIS

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Supabase Best Practices](https://supabase.com/docs/guides/api/securing-your-api)
- [Vitest Testing Guide](https://vitest.dev/guide/)
- [Web Security Headers](https://owasp.org/www-project-secure-headers/)
