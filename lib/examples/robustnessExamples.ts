/**
 * Exemplos de uso das novas funcionalidades de robustez
 * Este arquivo demonstra como usar os novos módulos implementados
 */

import { withSupabaseRetry, withApiRetry } from '../retryHandler';
import { api } from '../apiClient';
import { sanitizeText, sanitizeEmail, detectXss } from '../inputSanitizer';
import { handleQuestionnaireError, createQuestionnaireError, ERROR_CODES } from '../errorHandler';
import { logger } from '../logger';
import { supabase } from '../supabase';

// ============================================
// EXEMPLO 1: Operações Supabase com Retry
// ============================================

export async function fetchFarmsWithRetry(userId: string) {
  try {
    // Operação Supabase com retry automático
    const farms = await withSupabaseRetry(async () => {
      const { data, error } = await supabase.from('farms').select('*').eq('user_id', userId);

      if (error) throw error;
      return data;
    }, 'Fetch Farms');

    logger.info('Farms fetched successfully', {
      component: 'FarmService',
      count: farms?.length || 0,
    });

    return farms;
  } catch (error) {
    handleQuestionnaireError(error, 'fetchFarmsWithRetry', (message, type) => console.error(message));
    throw error;
  }
}

// ============================================
// EXEMPLO 2: Chamadas de API com Cliente HTTP
// ============================================

export async function generateInsights(summary: string, farmName?: string) {
  try {
    // Sanitizar entrada antes de enviar
    const sanitizedSummary = sanitizeText(summary);
    const sanitizedFarmName = farmName ? sanitizeText(farmName) : undefined;

    // Detectar tentativas de XSS
    if (detectXss(sanitizedSummary)) {
      throw createQuestionnaireError(
        ERROR_CODES.VALIDATION_ERROR,
        'XSS detected in summary',
        'Entrada inválida detectada. Por favor, revise os dados.',
      );
    }

    // Chamada de API com retry automático e timeout
    const response = await api.post<{ answer: string }>(
      '/api/questionnaire-insights',
      {
        summary: sanitizedSummary,
        farmName: sanitizedFarmName,
      },
      {
        timeout: 30000, // 30 segundos
        retries: 3,
      },
    );

    logger.info('Insights generated successfully', {
      component: 'InsightsService',
      summaryLength: sanitizedSummary.length,
    });

    return response.answer;
  } catch (error) {
    handleQuestionnaireError(error, 'generateInsights', (message, type) => console.error(message));
    throw error;
  }
}

// ============================================
// EXEMPLO 3: Validação e Sanitização de Formulário
// ============================================

export interface UserFormData {
  name: string;
  email: string;
  phone: string;
  website?: string;
}

export function validateAndSanitizeUserForm(data: UserFormData): UserFormData {
  // Sanitizar todos os campos
  const sanitized: UserFormData = {
    name: sanitizeText(data.name),
    email: sanitizeEmail(data.email),
    phone: sanitizeText(data.phone),
    website: data.website ? sanitizeText(data.website) : undefined,
  };

  // Validações adicionais
  if (!sanitized.name || sanitized.name.length < 2) {
    throw createQuestionnaireError(
      ERROR_CODES.VALIDATION_ERROR,
      'Invalid name',
      'Nome deve ter pelo menos 2 caracteres',
    );
  }

  if (!sanitized.email.includes('@')) {
    throw createQuestionnaireError(ERROR_CODES.VALIDATION_ERROR, 'Invalid email', 'Email inválido');
  }

  logger.debug('Form validated and sanitized', {
    component: 'FormValidation',
    fields: Object.keys(sanitized),
  });

  return sanitized;
}

// ============================================
// EXEMPLO 4: Operação com Medição de Performance
// ============================================

export async function processQuestionnaireWithMetrics(questionnaireId: string, answers: Record<string, 'Sim' | 'Não'>) {
  // Medir performance da operação
  return await logger.measureAsync(
    async () => {
      // 1. Validar respostas
      const sanitizedAnswers = Object.entries(answers).reduce(
        (acc, [key, value]) => {
          acc[sanitizeText(key)] = value;
          return acc;
        },
        {} as Record<string, 'Sim' | 'Não'>,
      );

      // 2. Salvar no banco com retry
      const result = await withSupabaseRetry(async () => {
        const { data, error } = await supabase
          .from('questionnaire_responses')
          .insert({
            questionnaire_id: questionnaireId,
            answers: sanitizedAnswers,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }, 'Save Questionnaire Response');

      return result;
    },
    'Process Questionnaire',
    { component: 'QuestionnaireService', questionnaireId },
  );
}

// ============================================
// EXEMPLO 5: Tratamento de Erros Específicos
// ============================================

export async function deleteQuestionnaireWithErrorHandling(id: string) {
  try {
    const { error } = await supabase.from('questionnaires').delete().eq('id', id);

    if (error) {
      // Criar erro específico baseado no tipo
      if (error.message.includes('foreign key')) {
        throw createQuestionnaireError(
          ERROR_CODES.DELETE_ERROR,
          'Foreign key constraint violation',
          'Não é possível excluir este questionário pois existem respostas associadas.',
        );
      }

      if (error.message.includes('not found')) {
        throw createQuestionnaireError(
          ERROR_CODES.NOT_FOUND,
          'Questionnaire not found',
          'Questionário não encontrado.',
        );
      }

      throw error;
    }

    logger.info('Questionnaire deleted successfully', {
      component: 'QuestionnaireService',
      questionnaireId: id,
    });
  } catch (error) {
    handleQuestionnaireError(error, 'deleteQuestionnaireWithErrorHandling', (message, type) => {
      // Aqui você pode usar seu sistema de toast
      console.error(message);
    });
    throw error;
  }
}

// ============================================
// EXEMPLO 6: Operação Complexa com Múltiplos Retries
// ============================================

export async function syncDataWithRetry() {
  const operations = [
    { name: 'Sync Farms', fn: () => supabase.from('farms').select() },
    { name: 'Sync Clients', fn: () => supabase.from('clients').select() },
    { name: 'Sync Questionnaires', fn: () => supabase.from('questionnaires').select() },
  ];

  const results = [];

  for (const operation of operations) {
    try {
      const result = await withSupabaseRetry(async () => {
        const { data, error } = await operation.fn();
        if (error) throw error;
        return data;
      }, operation.name);

      results.push({ operation: operation.name, success: true, data: result });
    } catch (error) {
      logger.error(
        `${operation.name} failed after retries`,
        error instanceof Error ? error : new Error(String(error)),
        { component: 'SyncService' },
      );

      results.push({ operation: operation.name, success: false, error });
    }
  }

  return results;
}

// ============================================
// EXEMPLO 7: Uso do Logger com Contexto
// ============================================

export class QuestionnaireService {
  private logger = logger.withContext({ component: 'QuestionnaireService' });

  async createQuestionnaire(name: string, questions: any[]) {
    this.logger.info('Creating questionnaire', { name, questionCount: questions.length });

    try {
      const sanitizedName = sanitizeText(name);

      const result = await withSupabaseRetry(async () => {
        const { data, error } = await supabase
          .from('questionnaires')
          .insert({ name: sanitizedName, questions })
          .select()
          .single();

        if (error) throw error;
        return data;
      }, 'Create Questionnaire');

      this.logger.info('Questionnaire created successfully', { id: result.id });
      return result;
    } catch (error) {
      this.logger.error('Failed to create questionnaire', error instanceof Error ? error : new Error(String(error)), {
        name,
      });
      throw error;
    }
  }
}

// ============================================
// EXEMPLO 8: Integração Completa em um Hook
// ============================================

import { useState, useCallback } from 'react';

export function useQuestionnaireWithRetry() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveQuestionnaire = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      // Sanitizar dados
      const sanitizedData = {
        name: sanitizeText(data.name),
        description: data.description ? sanitizeText(data.description) : undefined,
      };

      // Salvar com retry
      const result = await withSupabaseRetry(async () => {
        const { data: saved, error } = await supabase.from('questionnaires').insert(sanitizedData).select().single();

        if (error) throw error;
        return saved;
      }, 'Save Questionnaire');

      logger.info('Questionnaire saved via hook', {
        component: 'useQuestionnaireWithRetry',
        id: result.id,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);

      handleQuestionnaireError(err, 'useQuestionnaireWithRetry', message => setError(message));

      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { saveQuestionnaire, loading, error };
}
