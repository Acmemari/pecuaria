import { supabase } from './supabase';
import { SavedQuestionnaire, SavedQuestionnaireAnswer } from '../types';
import { sanitizeText } from './inputSanitizer';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(id: string, fieldName: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error(`${fieldName} inválido.`);
  }
}

export interface QuestionnaireFilters {
  clientId?: string | null;
  farmId?: string | null;
}

export const getSavedQuestionnaires = async (
  userId: string,
  filters?: QuestionnaireFilters
): Promise<SavedQuestionnaire[]> => {
  let query = supabase
    .from('saved_questionnaires')
    .select('*')
    .order('created_at', { ascending: false });

  // Se tiver filtro por cliente, buscar por client_id OU user_id (para itens legados sem client_id)
  if (filters?.clientId) {
    query = query.or(`client_id.eq.${filters.clientId},and(client_id.is.null,user_id.eq.${userId})`);
  }

  if (filters?.farmId) {
    query = query.eq('farm_id', filters.farmId);
  }

  // Se não tiver filtros de cliente/fazenda, filtrar por user_id
  if (!filters?.clientId && !filters?.farmId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message || 'Erro ao carregar questionários salvos');
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    client_id: row.client_id,
    name: row.name,
    farm_id: row.farm_id,
    farm_name: row.farm_name,
    production_system: row.production_system,
    questionnaire_id: row.questionnaire_id,
    answers: row.answers || [],
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  }));
};

export const saveQuestionnaire = async (
  userId: string,
  name: string,
  payload: {
    clientId?: string;
    farmId: string;
    farmName: string;
    productionSystem: string;
    questionnaireId: string;
    answers: SavedQuestionnaireAnswer[];
  }
): Promise<SavedQuestionnaire> => {
  const sanitizedName = sanitizeText(name);
  if (!sanitizedName || sanitizedName.length > 300) {
    throw new Error('Nome do questionário inválido (1-300 caracteres).');
  }

  const { data, error } = await supabase
    .from('saved_questionnaires')
    .insert({
      user_id: userId,
      client_id: payload.clientId || null,
      name: sanitizedName,
      farm_id: payload.farmId,
      farm_name: payload.farmName,
      production_system: payload.productionSystem,
      questionnaire_id: payload.questionnaireId,
      answers: payload.answers,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01') throw new Error('Tabela de questionários salvos não existe. Execute a migration 018 no Supabase.');
    throw new Error(error.message || 'Erro ao salvar questionário');
  }

  return {
    ...data,
    client_id: data.client_id,
    answers: data.answers || [],
  };
};

export const updateSavedQuestionnaire = async (
  id: string,
  userId: string,
  answers: SavedQuestionnaireAnswer[]
): Promise<void> => {
  validateId(id, 'ID do questionário');
  validateId(userId, 'ID do usuário');

  const { error } = await supabase
    .from('saved_questionnaires')
    .update({
      answers: answers,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Erro ao atualizar questionário');
};

export const getSavedQuestionnaire = async (id: string, userId: string): Promise<SavedQuestionnaire | null> => {
  const { data, error } = await supabase
    .from('saved_questionnaires')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return { ...data, answers: data.answers || [] };
};

export const updateSavedQuestionnaireName = async (id: string, userId: string, name: string): Promise<void> => {
  validateId(id, 'ID do questionário');
  validateId(userId, 'ID do usuário');

  const sanitizedName = sanitizeText(name);
  if (!sanitizedName || sanitizedName.length > 300) {
    throw new Error('Nome inválido (1-300 caracteres).');
  }

  const { error } = await supabase
    .from('saved_questionnaires')
    .update({ name: sanitizedName, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Erro ao atualizar nome');
};

export const deleteSavedQuestionnaire = async (id: string, userId: string): Promise<void> => {
  validateId(id, 'ID do questionário');
  validateId(userId, 'ID do usuário');

  const { error } = await supabase
    .from('saved_questionnaires')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Erro ao excluir questionário');
};
