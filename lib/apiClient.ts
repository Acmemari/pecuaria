/**
 * Cliente HTTP centralizado com retry automático e tratamento de erros
 * Wrapper sobre fetch com funcionalidades adicionais
 */

import { withApiRetry } from './retryHandler';
import { logger } from './logger';

export interface ApiRequestOptions extends RequestInit {
    timeout?: number;
    retries?: number;
    validateStatus?: (status: number) => boolean;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public code?: string,
        public response?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Timeout para requisições com cleanup automático
 */
function createTimeoutController(timeout: number): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timer),
    };
}

/**
 * Sanitiza URL para logs (remove tokens/keys)
 */
function sanitizeUrlForLog(url: string): string {
    try {
        const u = new URL(url, 'https://placeholder.com');
        // Remover parâmetros sensíveis
        for (const key of ['key', 'token', 'apikey', 'api_key', 'secret', 'password', 'access_token']) {
            if (u.searchParams.has(key)) {
                u.searchParams.set(key, '***');
            }
        }
        return u.pathname + u.search;
    } catch {
        return url.split('?')[0]; // fallback: só o path
    }
}

/**
 * Cliente HTTP com retry e tratamento de erros
 */
export async function apiClient<T = unknown>(
    url: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const {
        timeout = 30000,
        retries = 3,
        validateStatus = (status) => status >= 200 && status < 300,
        ...fetchOptions
    } = options;

    const operationName = `API ${fetchOptions.method || 'GET'} ${sanitizeUrlForLog(url)}`;

    return withApiRetry(
        async () => {
            const startTime = performance.now();
            const { signal: timeoutSignal, cleanup: cleanupTimeout } = createTimeoutController(timeout);

            logger.debug(`${operationName}: Starting`, {
                component: 'ApiClient',
                url: sanitizeUrlForLog(url),
                method: fetchOptions.method || 'GET',
            });

            try {
                const combinedSignal = fetchOptions.signal
                    ? AbortSignal.any([fetchOptions.signal, timeoutSignal])
                    : timeoutSignal;

                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: combinedSignal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...fetchOptions.headers,
                    },
                });

                const duration = performance.now() - startTime;

                // Validar status
                if (!validateStatus(response.status)) {
                    let errorData: { error?: string; message?: string; code?: string };
                    try {
                        errorData = await response.json();
                    } catch {
                        errorData = { message: response.statusText };
                    }

                    logger.error(
                        `${operationName}: Failed with status ${response.status}`,
                        new Error(errorData.error || errorData.message || response.statusText),
                        {
                            component: 'ApiClient',
                            statusCode: response.status,
                            duration: `${duration.toFixed(2)}ms`,
                        }
                    );

                    throw new ApiError(
                        errorData.error || errorData.message || response.statusText,
                        response.status,
                        errorData.code,
                        errorData
                    );
                }

                // Parse resposta
                let data: T;
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    data = await response.json();
                } else {
                    // Fallback para text quando resposta não é JSON
                    const text = await response.text();
                    try {
                        data = JSON.parse(text);
                    } catch {
                        data = text as unknown as T;
                    }
                }

                logger.debug(`${operationName}: Success`, {
                    component: 'ApiClient',
                    statusCode: response.status,
                    duration: `${duration.toFixed(2)}ms`,
                });

                return data;
            } catch (error) {
                const duration = performance.now() - startTime;

                if (error instanceof ApiError) {
                    throw error;
                }

                // Tratar erros de timeout
                if (error instanceof Error && error.name === 'AbortError') {
                    logger.error(
                        `${operationName}: Timeout after ${timeout}ms`,
                        error,
                        {
                            component: 'ApiClient',
                            timeout,
                            duration: `${duration.toFixed(2)}ms`,
                        }
                    );
                    throw new ApiError('Tempo limite excedido', 504, 'TIMEOUT');
                }

                // Outros erros
                logger.error(
                    `${operationName}: Network error`,
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        component: 'ApiClient',
                        duration: `${duration.toFixed(2)}ms`,
                    }
                );

                throw new ApiError(
                    error instanceof Error ? error.message : 'Erro de rede',
                    0,
                    'NETWORK_ERROR'
                );
            } finally {
                // Limpar timer do timeout (evita memory leak)
                cleanupTimeout();
            }
        },
        operationName
    );
}

/**
 * Helpers para métodos HTTP comuns
 */
export const api = {
    get: <T = unknown>(url: string, options?: ApiRequestOptions) =>
        apiClient<T>(url, { ...options, method: 'GET' }),

    post: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) =>
        apiClient<T>(url, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) =>
        apiClient<T>(url, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) =>
        apiClient<T>(url, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T = unknown>(url: string, options?: ApiRequestOptions) =>
        apiClient<T>(url, { ...options, method: 'DELETE' }),
};
