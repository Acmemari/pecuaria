/**
 * Utilitários de validação para o Planejamento Ágil
 */

/**
 * Valida se um número está dentro de um range
 */
export function clampNumber(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Valida e sanitiza string para prevenir XSS
 */
export function sanitizeString(value: string, maxLength: number = 255): string {
  if (typeof value !== 'string') return '';

  // Remove caracteres perigosos
  const sanitized = value
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');

  return sanitized.slice(0, maxLength).trim();
}

/**
 * Valida se um valor é um número válido
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Valida e parseia número de string com vírgula
 */
export function parseValidNumber(value: string, defaultValue: number = 0): number {
  if (!value || typeof value !== 'string') return defaultValue;

  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);

  return isValidNumber(num) ? num : defaultValue;
}

/**
 * Valida schema de dados do localStorage
 */
export interface Farm {
  id: string;
  name: string;
  pastureArea?: number;
  [key: string]: unknown;
}

export function validateFarmsData(data: unknown): Farm[] {
  if (!Array.isArray(data)) return [];

  return data.filter((item): item is Farm => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      (item.pastureArea === undefined || typeof item.pastureArea === 'number')
    );
  });
}

/**
 * Valida percentual (0-100)
 */
export function validatePercentage(value: number): number {
  return clampNumber(value, 0, 100);
}

/**
 * Valida área (positiva, máx 1 milhão ha)
 */
export function validateArea(value: number | undefined): number {
  if (value === undefined || !isValidNumber(value)) return 0;
  return clampNumber(value, 0, 1_000_000);
}

/**
 * Valida valor monetário (positivo, máx 1 trilhão)
 */
export function validateCurrency(value: number | undefined): number {
  if (value === undefined || !isValidNumber(value)) return 0;
  return clampNumber(value, 0, 1_000_000_000_000);
}
