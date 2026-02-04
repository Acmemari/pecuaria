/**
 * Constantes do módulo de questionários
 * Centraliza todos os valores mágicos e configurações
 */

export const QUESTIONNAIRE_CONSTANTS = {
    STORAGE_KEY: 'agro-farms',
    DEFAULT_QUESTIONNAIRE_ID: 'gente-gestao-producao',
    AUTO_ADVANCE_DELAY: 300,
    SUCCESS_DISPLAY_DURATION: 1000,
    PDF_GENERATION_DELAY: 500,
    INSIGHTS_SCROLL_DELAY: 100,
    CHART_RENDER_DELAY: 1000,
    AUTO_CLOSE_DELAY: 2000,
    SUBMIT_SIMULATION_DELAY: 800,
} as const;

export const VALIDATION_RULES = {
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 100,
    RATE_LIMIT_MS: 60000, // 1 minuto
} as const;

export const STATUS_THRESHOLDS = {
    EXCELENTE: 90,
    BOM: 70,
    REGULAR: 60,
    RUIM: 40,
    CRITICO: 0,
} as const;

export const GROUP_COLORS = {
    Gente: {
        bar: '#3B82F6',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200'
    },
    Gestão: {
        bar: '#8B5CF6',
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-200'
    },
    Produção: {
        bar: '#22C55E',
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200'
    },
} as const;

export const STATUS_STYLES = {
    Excelente: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        bar: 'bg-green-500',
        dot: 'bg-green-500'
    },
    Bom: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        bar: 'bg-amber-500',
        dot: 'bg-amber-500'
    },
    Regular: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        bar: 'bg-yellow-500',
        dot: 'bg-yellow-500'
    },
    Ruim: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        bar: 'bg-orange-500',
        dot: 'bg-orange-500'
    },
    Crítico: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        bar: 'bg-red-500',
        dot: 'bg-red-500'
    },
} as const;
