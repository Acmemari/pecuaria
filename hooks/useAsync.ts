/**
 * Hook genérico para operações assíncronas
 * Simplifica o gerenciamento de loading, error e data em componentes
 */

import { useState, useCallback } from 'react';
import { logger } from '../lib/logger';

export interface UseAsyncOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    initialData?: T | null;
}

export interface UseAsyncReturn<T, Args extends any[] = []> {
    loading: boolean;
    error: Error | null;
    data: T | null;
    execute: (...args: Args) => Promise<T>;
    reset: () => void;
    setData: (data: T | null) => void;
}

/**
 * Hook para gerenciar operações assíncronas
 * 
 * @example
 * ```typescript
 * const { loading, error, data, execute } = useAsync(
 *   async (userId: string) => {
 *     return await fetchUser(userId);
 *   },
 *   {
 *     onSuccess: (user) => console.log('User loaded:', user),
 *     onError: (error) => console.error('Failed:', error),
 *   }
 * );
 * 
 * // Executar a operação
 * await execute('user-123');
 * ```
 */
export function useAsync<T, Args extends any[] = []>(
    asyncFunction: (...args: Args) => Promise<T>,
    options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(options.initialData ?? null);

    const execute = useCallback(
        async (...args: Args): Promise<T> => {
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
        setData(options.initialData ?? null);
    }, [options.initialData]);

    return {
        loading,
        error,
        data,
        execute,
        reset,
        setData,
    };
}

/**
 * Hook para operações assíncronas com execução imediata
 * 
 * @example
 * ```typescript
 * const { loading, error, data, reload } = useAsyncImmediate(
 *   async () => await fetchUsers()
 * );
 * ```
 */
export function useAsyncImmediate<T>(
    asyncFunction: () => Promise<T>,
    options: UseAsyncOptions<T> = {}
): Omit<UseAsyncReturn<T, []>, 'execute'> & { reload: () => Promise<T> } {
    const { execute, ...rest } = useAsync(asyncFunction, options);

    // Executar imediatamente na montagem
    const [hasExecuted, setHasExecuted] = useState(false);

    if (!hasExecuted && !rest.loading) {
        setHasExecuted(true);
        execute().catch(() => {
            // Erro já tratado pelo useAsync
        });
    }

    return {
        ...rest,
        reload: execute,
    };
}
