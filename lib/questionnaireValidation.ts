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

    // Prevenir emails muito longos
    if (trimmed.length > 254) {
        return { valid: false, error: 'Email muito longo' };
    }

    return { valid: true };
};

/**
 * Valida telefone brasileiro
 */
export const validatePhone = (phone: string): ValidationResult => {
    if (!phone) {
        return { valid: false, error: 'Telefone é obrigatório' };
    }

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length < 10 || cleaned.length > 11) {
        return { valid: false, error: 'Telefone deve ter 10 ou 11 dígitos' };
    }

    // Validar DDD (11-99)
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
        return { valid: false, error: 'DDD inválido' };
    }

    return { valid: true };
};

/**
 * Valida senha forte
 */
export const validatePassword = (password: string): ValidationResult => {
    if (!password) {
        return { valid: false, error: 'Senha é obrigatória' };
    }

    if (password.length < 8) {
        return { valid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
    }

    if (password.length > 128) {
        return { valid: false, error: 'Senha muito longa (máximo 128 caracteres)' };
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
export const validatePositiveNumber = (
    value: number | string,
    fieldName: string = 'Valor'
): ValidationResult => {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} deve ser um número` };
    }

    if (num < 0) {
        return { valid: false, error: `${fieldName} deve ser positivo` };
    }

    if (!isFinite(num)) {
        return { valid: false, error: `${fieldName} inválido` };
    }

    return { valid: true };
};

/**
 * Valida número dentro de um intervalo
 */
export const validateNumberRange = (
    value: number | string,
    min: number,
    max: number,
    fieldName: string = 'Valor'
): ValidationResult => {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} deve ser um número` };
    }

    if (num < min || num > max) {
        return {
            valid: false,
            error: `${fieldName} deve estar entre ${min} e ${max}`,
        };
    }

    return { valid: true };
};

/**
 * Valida CPF/CNPJ
 */
export const validateDocument = (document: string): ValidationResult => {
    if (!document) {
        return { valid: false, error: 'Documento é obrigatório' };
    }

    const cleaned = document.replace(/\D/g, '');

    // CPF (11 dígitos) ou CNPJ (14 dígitos)
    if (cleaned.length !== 11 && cleaned.length !== 14) {
        return { valid: false, error: 'CPF/CNPJ inválido' };
    }

    // Verificar se não são todos dígitos iguais
    if (/^(\d)\1+$/.test(cleaned)) {
        return { valid: false, error: 'CPF/CNPJ inválido' };
    }

    return { valid: true };
};

/**
 * Valida URL
 */
export const validateUrl = (url: string): ValidationResult => {
    if (!url) {
        return { valid: false, error: 'URL é obrigatória' };
    }

    try {
        new URL(url);
        return { valid: true };
    } catch {
        return { valid: false, error: 'URL inválida' };
    }
};

/**
 * Valida data no formato brasileiro (DD/MM/YYYY)
 */
export const validateDate = (date: string): ValidationResult => {
    if (!date) {
        return { valid: false, error: 'Data é obrigatória' };
    }

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = date.match(dateRegex);

    if (!match) {
        return { valid: false, error: 'Data deve estar no formato DD/MM/YYYY' };
    }

    const [, day, month, year] = match;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
        return { valid: false, error: 'Mês inválido' };
    }

    if (dayNum < 1 || dayNum > 31) {
        return { valid: false, error: 'Dia inválido' };
    }

    // Validar data real
    const dateObj = new Date(yearNum, monthNum - 1, dayNum);
    if (
        dateObj.getDate() !== dayNum ||
        dateObj.getMonth() !== monthNum - 1 ||
        dateObj.getFullYear() !== yearNum
    ) {
        return { valid: false, error: 'Data inválida' };
    }

    return { valid: true };
};
