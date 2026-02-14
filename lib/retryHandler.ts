/**
 * Sistema de retry para operações assíncronas
 * Implementa retry exponencial com jitter para operações críticas
 */

import { logger } from './logger';

export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: () => true,
    onRetry: () => { },
};

/**
 * Calcula delay com exponential backoff e jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

    // Adicionar jitter (±25%) para evitar thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, cappedDelay + jitter);
}

/**
 * Verifica se o erro é retryable (erros de rede, timeouts, etc.)
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Erros de rede
        if (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('fetch') ||
            message.includes('econnrefused') ||
            message.includes('enotfound')
        ) {
            return true;
        }

        // Erros HTTP retryable (5xx, 429)
        if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('429')) {
            return true;
        }
    }

    return false;
}

/**
 * Executa uma operação com retry automático
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    operationName: string = 'Operation'
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            logger.debug(`${operationName}: Attempt ${attempt}/${opts.maxAttempts}`, {
                component: 'RetryHandler',
                attempt,
            });

            const result = await operation();

            if (attempt > 1) {
                logger.info(`${operationName}: Succeeded after ${attempt} attempts`, {
                    component: 'RetryHandler',
                    attempts: attempt,
                });
            }

            return result;
        } catch (error) {
            lastError = error;

            logger.warn(`${operationName}: Attempt ${attempt} failed`, {
                component: 'RetryHandler',
                attempt,
                error: error instanceof Error ? error.message : String(error),
            });

            // Se não deve fazer retry ou é a última tentativa, lançar erro
            if (!opts.shouldRetry(error) || attempt === opts.maxAttempts) {
                logger.error(`${operationName}: Failed after ${attempt} attempts`,
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        component: 'RetryHandler',
                        totalAttempts: attempt,
                    }
                );
                throw error;
            }

            // Callback de retry
            opts.onRetry(attempt, error);

            // Aguardar antes da próxima tentativa
            const delay = calculateDelay(attempt, opts);
            logger.debug(`${operationName}: Retrying in ${delay.toFixed(0)}ms`, {
                component: 'RetryHandler',
                delay,
            });

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // Nunca deve chegar aqui, mas TypeScript precisa
    throw lastError;
}

/**
 * Wrapper para operações do Supabase com retry automático
 */
export async function withSupabaseRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'Supabase Operation'
): Promise<T> {
    return withRetry(
        operation,
        {
            maxAttempts: 3,
            initialDelay: 500,
            maxDelay: 5000,
            shouldRetry: isRetryableError,
        },
        operationName
    );
}

/**
 * Wrapper para chamadas de API com retry automático
 */
export async function withApiRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'API Call'
): Promise<T> {
    return withRetry(
        operation,
        {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            shouldRetry: isRetryableError,
        },
        operationName
    );
}
