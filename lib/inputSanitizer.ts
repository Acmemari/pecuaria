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
 * NOTA: Use prepared statements sempre que possível. Supabase já faz isso.
 * Esta função é uma camada extra de defesa (defense-in-depth).
 */
export function sanitizeSql(input: string): string {
    if (!input) return '';

    return input
        .replace(/'/g, "''")
        .replace(/\\/g, '\\\\')  // Escapar backslashes
        .replace(/;/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .replace(/\x00/g, '');   // Remover null bytes
}

/**
 * Sanitiza URL para prevenir javascript: e data: URIs
 */
export function sanitizeUrl(url: string): string {
    if (!url) return '';

    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();

    // Bloquear protocolos perigosos
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('file:') ||
        lower.startsWith('blob:') ||
        lower.includes('\x00')  // Null byte injection
    ) {
        return '';
    }

    // Verificar URL é válida
    try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
            return trimmed;
        }
        // Se não tem protocolo, adicionar https://
        new URL(`https://${trimmed}`);
        return trimmed;
    } catch {
        return '';
    }
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
const MAX_SANITIZE_DEPTH = 10;

export function sanitizeObject<T extends Record<string, any>>(obj: T, depth = 0): T {
    if (depth > MAX_SANITIZE_DEPTH) {
        // Evitar recursão infinita em objetos circulares ou muito profundos
        return obj;
    }

    const sanitized = {} as T;

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key as keyof T] = sanitizeText(value) as any;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key as keyof T] = sanitizeObject(value, depth + 1);
        } else if (Array.isArray(value)) {
            sanitized[key as keyof T] = value.map(item =>
                typeof item === 'string'
                    ? sanitizeText(item)
                    : typeof item === 'object' && item !== null
                        ? sanitizeObject(item, depth + 1)
                        : item
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
// Padrões compilados uma única vez para evitar ReDoS e melhorar performance
const SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|TRUNCATE)\b)/i,
    /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
    /(';|\-\-\s|#|\/\*)/,
    /(\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
    /(\bOR\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i,
] as const;

export function detectSqlInjection(input: string): boolean {
    if (!input) return false;
    return SQL_PATTERNS.some(pattern => pattern.test(input));
}
