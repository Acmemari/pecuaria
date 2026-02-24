/**
 * Cliente Supabase com retry logic e tratamento de erros robusto
 * Wrapper sobre o cliente Supabase padrão com funcionalidades adicionais
 */

import { supabase } from './supabase';
import { logger } from './logger';

export interface RetryConfig {
  maxRetries?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  delayMs: 1000,
  exponentialBackoff: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Executa uma operação com retry automático
 */
async function withRetry<T>(operation: () => Promise<T>, operationName: string, config: RetryConfig = {}): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries, delayMs, exponentialBackoff, retryableStatuses } = finalConfig;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const isLastAttempt = attempt === maxRetries - 1;

      const errObj = error as { status?: number; code?: number };
      const status = errObj.status || errObj.code;
      const shouldRetry = !status || retryableStatuses.includes(status);

      if (!shouldRetry || isLastAttempt) {
        logger.error(
          `${operationName} failed${isLastAttempt ? ' after retries' : ''}`,
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'supabaseClient',
            attempts: attempt + 1,
            maxRetries,
          },
        );
        throw error;
      }

      const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt) : delayMs;

      logger.warn(`Retrying ${operationName}`, {
        component: 'supabaseClient',
        attempt: attempt + 1,
        maxRetries,
        delay: `${delay}ms`,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Cliente Supabase aprimorado com retry logic
 */
export const supabaseClient = {
  /**
   * Executa uma query com retry automático
   */
  async query<T>(
    table: string,
    operation: (
      builder: ReturnType<typeof supabase.from>,
    ) => Promise<{ data: T | null; error: { message?: string } | null }>,
    config?: RetryConfig,
  ): Promise<T> {
    const result = await withRetry(() => operation(supabase.from(table)), `Query ${table}`, config);

    if (result.error) {
      throw new Error(result.error.message || 'Database query failed');
    }

    if (result.data === null) {
      throw new Error('No data returned from query');
    }

    return result.data;
  },

  /**
   * Select com retry
   */
  async select<T = unknown>(table: string, query: string = '*', config?: RetryConfig): Promise<T[]> {
    return this.query(table, builder => builder.select(query), config) as Promise<T[]>;
  },

  /**
   * Insert com retry
   */
  async insert<T = unknown>(table: string, data: Record<string, unknown>, config?: RetryConfig): Promise<T> {
    return this.query(table, builder => builder.insert(data).select().single(), config) as Promise<T>;
  },

  /**
   * Update com retry
   */
  async update<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    match: Record<string, unknown>,
    config?: RetryConfig,
  ): Promise<T> {
    return this.query(table, builder => builder.update(data).match(match).select().single(), config) as Promise<T>;
  },

  /**
   * Delete com retry
   */
  async delete(table: string, match: Record<string, unknown>, config?: RetryConfig): Promise<void> {
    await this.query(table, builder => builder.delete().match(match), config);
  },

  /**
   * RPC (Remote Procedure Call) com retry
   */
  async rpc<T = any>(functionName: string, params?: Record<string, any>, config?: RetryConfig): Promise<T> {
    const result: any = await withRetry(
      async () => {
        const rpcResult = await supabase.rpc(functionName, params);
        return rpcResult;
      },
      `RPC ${functionName}`,
      config,
    );

    if (result.error) {
      throw new Error(result.error.message || 'RPC call failed');
    }

    return result.data as T;
  },

  /**
   * Acesso direto ao cliente Supabase original (quando necessário)
   */
  get raw() {
    return supabase;
  },
};

/**
 * Helper para executar múltiplas queries em paralelo com retry
 */
export async function parallelQueries<T extends unknown[]>(
  queries: (() => Promise<unknown>)[],
  config?: RetryConfig,
): Promise<T> {
  const results = await Promise.all(queries.map((query, index) => withRetry(query, `Parallel query ${index}`, config)));

  return results as T;
}

export async function sequentialQueries<T extends unknown[]>(
  queries: (() => Promise<unknown>)[],
  config?: RetryConfig,
): Promise<T> {
  const results: unknown[] = [];

  for (let i = 0; i < queries.length; i++) {
    const result = await withRetry(queries[i], `Sequential query ${i}`, config);
    results.push(result);
  }

  return results as T;
}
