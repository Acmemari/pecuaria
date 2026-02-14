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
        public response?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Timeout para requisições
 */
function createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
}

/**
 * Cliente HTTP com retry e tratamento de erros
 */
export async function apiClient<T = any>(
    url: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const {
        timeout = 30000,
        retries = 3,
        validateStatus = (status) => status >= 200 && status < 300,
        ...fetchOptions
    } = options;

    const operationName = `API ${fetchOptions.method || 'GET'} ${url}`;

    return withApiRetry(
        async () => {
            const startTime = performance.now();

            logger.debug(`${operationName}: Starting`, {
                component: 'ApiClient',
                url,
                method: fetchOptions.method || 'GET',
            });

            try {
                // Criar signal de timeout
                const timeoutSignal = createTimeoutSignal(timeout);
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
                    let errorData: any;
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
                const data = await response.json();

                logger.debug(`${operationName}: Success`, {
                    component: 'ApiClient',
                    statusCode: response.status,
                    duration: `${duration.toFixed(2)}ms`,
                });

                return data as T;
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
            }
        },
        operationName
    );
}

/**
 * Helpers para métodos HTTP comuns
 */
export const api = {
    get: <T = any>(url: string, options?: ApiRequestOptions) =>
        apiClient<T>(url, { ...options, method: 'GET' }),

    post: <T = any>(url: string, data?: any, options?: ApiRequestOptions) =>
        apiClient<T>(url, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T = any>(url: string, data?: any, options?: ApiRequestOptions) =>
        apiClient<T>(url, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T = any>(url: string, data?: any, options?: ApiRequestOptions) =>
        apiClient<T>(url, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T = any>(url: string, options?: ApiRequestOptions) =>
        apiClient<T>(url, { ...options, method: 'DELETE' }),
};
