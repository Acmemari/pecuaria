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

// Debounce de toasts para evitar spam de notificações repetidas
const recentToasts = new Map<string, number>();
const TOAST_DEBOUNCE_MS = 3000;

function shouldShowToast(message: string): boolean {
    const now = Date.now();
    const lastShown = recentToasts.get(message);
    if (lastShown && now - lastShown < TOAST_DEBOUNCE_MS) return false;
    recentToasts.set(message, now);
    // Limpar toasts antigos para evitar memory leak
    if (recentToasts.size > 20) {
        const cutoff = now - TOAST_DEBOUNCE_MS * 2;
        for (const [key, time] of recentToasts) {
            if (time < cutoff) recentToasts.delete(key);
        }
    }
    return true;
}

// Mensagens genéricas para produção (não vazar detalhes internos)
const SAFE_USER_MESSAGES: Record<string, string> = {
    [ERROR_CODES.NETWORK_ERROR]: 'Erro de conexão. Verifique sua internet e tente novamente.',
    [ERROR_CODES.TIMEOUT_ERROR]: 'Tempo limite excedido. Tente novamente.',
    [ERROR_CODES.UNAUTHORIZED]: 'Sessão expirada. Faça login novamente.',
    [ERROR_CODES.RATE_LIMIT_ERROR]: 'Muitas requisições. Aguarde um momento.',
    [ERROR_CODES.SERVER_ERROR]: 'Erro no servidor. Tente novamente em alguns instantes.',
    [ERROR_CODES.NOT_FOUND]: 'Recurso não encontrado.',
};

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
        const msg = error.message.toLowerCase();
        // Categorizar erros comuns
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
            errorCode = ERROR_CODES.NETWORK_ERROR;
        } else if (msg.includes('timeout') || msg.includes('etimedout')) {
            errorCode = ERROR_CODES.TIMEOUT_ERROR;
        } else if (msg.includes('unauthorized') || msg.includes('401')) {
            errorCode = ERROR_CODES.UNAUTHORIZED;
        } else if (msg.includes('429') || msg.includes('rate limit')) {
            errorCode = ERROR_CODES.RATE_LIMIT_ERROR;
        } else if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
            errorCode = ERROR_CODES.SERVER_ERROR;
        }

        // Em produção, nunca vazar mensagem interna do erro
        userMessage = SAFE_USER_MESSAGES[errorCode]
            || (import.meta.env?.PROD ? 'Ocorreu um erro inesperado.' : error.message);
    }

    // Mostrar toast com debounce (evita spam)
    if (onToast && shouldShowToast(userMessage)) {
        onToast(userMessage, 'error');
    }
};

export const createQuestionnaireError = (
    code: keyof typeof ERROR_CODES,
    technicalMessage: string,
    userMessage: string
): QuestionnaireError => {
    return new QuestionnaireError(technicalMessage, code, userMessage);
};
