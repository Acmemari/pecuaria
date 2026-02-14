/**
 * Sanitização e validação de entrada de usuário
 * Previne XSS, SQL Injection e outros ataques
 */

/**
 * Remove tags HTML e scripts de uma string
 */
export function sanitizeHtml(input: string): string {
    if (!input) return '';

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*>/gi, '')
        .replace(/<link\b[^<]*>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitiza entrada de texto simples (remove apenas tags perigosas)
 */
export function sanitizeText(input: string): string {
    if (!input) return '';

    return input
        .trim()
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
}

/**
 * Sanitiza entrada para uso em SQL (previne SQL injection básico)
 * NOTA: Use prepared statements sempre que possível
 */
export function sanitizeSql(input: string): string {
    if (!input) return '';

    return input
        .replace(/'/g, "''")
        .replace(/;/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '');
}

/**
 * Sanitiza URL para prevenir javascript: e data: URIs
 */
export function sanitizeUrl(url: string): string {
    if (!url) return '';

    const trimmed = url.trim().toLowerCase();

    // Bloquear protocolos perigosos
    if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:') ||
        trimmed.startsWith('file:')
    ) {
        return '';
    }

    return url.trim();
}

/**
 * Sanitiza nome de arquivo para prevenir path traversal
 */
export function sanitizeFilename(filename: string): string {
    if (!filename) return '';

    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '')
        .substring(0, 255);
}

/**
 * Valida e sanitiza email
 */
export function sanitizeEmail(email: string): string {
    if (!email) return '';

    const trimmed = email.trim().toLowerCase();

    // Remover caracteres perigosos
    return trimmed.replace(/[<>]/g, '');
}

/**
 * Sanitiza número de telefone (mantém apenas dígitos)
 */
export function sanitizePhone(phone: string): string {
    if (!phone) return '';

    return phone.replace(/\D/g, '');
}

/**
 * Sanitiza entrada numérica
 */
export function sanitizeNumber(input: string | number): number | null {
    if (typeof input === 'number') {
        return isFinite(input) ? input : null;
    }

    if (!input) return null;

    const cleaned = String(input).replace(/[^\d.,-]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));

    return isFinite(parsed) ? parsed : null;
}

/**
 * Sanitiza objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = {} as T;

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key as keyof T] = sanitizeText(value) as any;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key as keyof T] = sanitizeObject(value);
        } else if (Array.isArray(value)) {
            sanitized[key as keyof T] = value.map(item =>
                typeof item === 'string' ? sanitizeText(item) : item
            ) as any;
        } else {
            sanitized[key as keyof T] = value;
        }
    }

    return sanitized;
}

/**
 * Valida tamanho de entrada
 */
export function validateInputSize(
    input: string,
    maxLength: number,
    fieldName: string = 'Campo'
): { valid: boolean; error?: string } {
    if (!input) {
        return { valid: false, error: `${fieldName} é obrigatório` };
    }

    if (input.length > maxLength) {
        return {
            valid: false,
            error: `${fieldName} excede o tamanho máximo de ${maxLength} caracteres`,
        };
    }

    return { valid: true };
}

/**
 * Detecta tentativas de XSS
 */
export function detectXss(input: string): boolean {
    if (!input) return false;

    const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /eval\(/i,
        /expression\(/i,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Detecta tentativas de SQL Injection
 */
export function detectSqlInjection(input: string): boolean {
    if (!input) return false;

    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(\bUNION\b.*\bSELECT\b)/i,
        /(;|\-\-|\/\*|\*\/)/,
        /(\bOR\b.*=.*)/i,
        /(\bAND\b.*=.*)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}
