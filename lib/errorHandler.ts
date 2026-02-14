/**
 * Tratamento centralizado de erros do módulo de questionários
 */

import { logger } from './logger';

export class QuestionnaireError extends Error {
    constructor(
        message: string,
        public code: string,
        public userMessage: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'QuestionnaireError';

        // Capturar stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, QuestionnaireError);
        }
    }
}

export const ERROR_CODES = {
    FETCH_QUESTIONS_ERROR: 'FETCH_QUESTIONS_ERROR',
    SAVE_ERROR: 'SAVE_ERROR',
    UPDATE_ERROR: 'UPDATE_ERROR',
    DELETE_ERROR: 'DELETE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NOT_FOUND: 'NOT_FOUND',
} as const;

export const handleQuestionnaireError = (
    error: unknown,
    context: string,
    onToast?: (message: string, type: 'error') => void
): void => {
    // Log estruturado do erro
    logger.error(
        `Error in ${context}`,
        error instanceof Error ? error : new Error(String(error)),
        {
            component: 'QuestionnaireErrorHandler',
            context,
        }
    );

    let userMessage = 'Ocorreu um erro inesperado.';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof QuestionnaireError) {
        userMessage = error.userMessage;
        errorCode = error.code;
    } else if (error instanceof Error) {
        // Categorizar erros comuns
        if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
            errorCode = ERROR_CODES.NETWORK_ERROR;
        } else if (error.message.includes('timeout')) {
            userMessage = 'Tempo limite excedido. Tente novamente.';
            errorCode = ERROR_CODES.TIMEOUT_ERROR;
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
            userMessage = 'Sessão expirada. Faça login novamente.';
            errorCode = ERROR_CODES.UNAUTHORIZED;
        } else {
            userMessage = error.message;
        }
    }

    // Mostrar toast para o usuário
    onToast?.(userMessage, 'error');

    // Em produção, enviar para serviço de monitoramento
    if (import.meta.env?.PROD) {
        // TODO: Integrar com Sentry, LogRocket, etc.
        // Sentry.captureException(error, { tags: { context, errorCode } });
    }
};

export const createQuestionnaireError = (
    code: keyof typeof ERROR_CODES,
    technicalMessage: string,
    userMessage: string
): QuestionnaireError => {
    return new QuestionnaireError(technicalMessage, code, userMessage);
};
