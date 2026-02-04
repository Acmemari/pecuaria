/**
 * Tratamento centralizado de erros do módulo de questionários
 */

export class QuestionnaireError extends Error {
    constructor(
        message: string,
        public code: string,
        public userMessage: string
    ) {
        super(message);
        this.name = 'QuestionnaireError';
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
} as const;

export const handleQuestionnaireError = (
    error: unknown,
    context: string,
    onToast?: (message: string, type: 'error') => void
): void => {
    console.error(`[${context}]`, error);

    let userMessage = 'Ocorreu um erro inesperado.';

    if (error instanceof QuestionnaireError) {
        userMessage = error.userMessage;
    } else if (error instanceof Error) {
        userMessage = error.message;
    }

    onToast?.(userMessage, 'error');

    // Aqui você pode adicionar logging para serviço externo
    // Example: Sentry, LogRocket, etc.
    // logToExternalService(error, context);
};

export const createQuestionnaireError = (
    code: keyof typeof ERROR_CODES,
    technicalMessage: string,
    userMessage: string
): QuestionnaireError => {
    return new QuestionnaireError(technicalMessage, code, userMessage);
};
