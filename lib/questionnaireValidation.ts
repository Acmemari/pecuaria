/**
 * Validação de dados do questionário
 * Funções de validação centralizadas com mensagens de erro consistentes
 */

import { VALIDATION_RULES } from '../constants/questionnaireConstants';

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Valida o nome de um questionário
 */
export const validateQuestionnaireName = (name: string): ValidationResult => {
    const trimmed = name.trim();

    if (!trimmed) {
        return { valid: false, error: 'Nome não pode estar vazio' };
    }

    if (trimmed.length < VALIDATION_RULES.MIN_NAME_LENGTH) {
        return {
            valid: false,
            error: `Nome deve ter pelo menos ${VALIDATION_RULES.MIN_NAME_LENGTH} caracteres`
        };
    }

    if (trimmed.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
        return {
            valid: false,
            error: `Nome não pode exceder ${VALIDATION_RULES.MAX_NAME_LENGTH} caracteres`
        };
    }

    // Prevenir XSS básico
    if (/<script|javascript:|onerror=|onclick=/i.test(trimmed)) {
        return { valid: false, error: 'Nome contém caracteres inválidos' };
    }

    return { valid: true };
};

/**
 * Valida se todas as perguntas foram respondidas
 */
export const validateAnswers = (
    answers: Record<string, 'Sim' | 'Não' | null>,
    questionIds: string[]
): ValidationResult => {
    const unanswered = questionIds.filter(id =>
        answers[id] === null || answers[id] === undefined
    );

    if (unanswered.length > 0) {
        return {
            valid: false,
            error: `Responda todas as perguntas para enviar (${unanswered.length} sem resposta).`
        };
    }

    return { valid: true };
};

/**
 * Valida ID do usuário
 */
export const validateUserId = (userId: string | undefined): ValidationResult => {
    if (!userId || userId.trim().length === 0) {
        return { valid: false, error: 'Usuário não autenticado' };
    }

    return { valid: true };
};

/**
 * Sanitiza entrada de texto para prevenir XSS
 */
export const sanitizeInput = (input: string): string => {
    return input
        .trim()
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
};
