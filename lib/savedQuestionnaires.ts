import { supabase } from './supabase';
import { SavedQuestionnaire, SavedQuestionnaireAnswer } from '../types';

export const getSavedQuestionnaires = async (userId: string): Promise<SavedQuestionnaire[]> => {
  const { data, error } = await supabase
    .from('saved_questionnaires')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message || 'Erro ao carregar questionários salvos');
  }

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
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
    farmId: string;
    farmName: string;
    productionSystem: string;
    questionnaireId: string;
    answers: SavedQuestionnaireAnswer[];
  }
): Promise<SavedQuestionnaire> => {
  const { data, error } = await supabase
    .from('saved_questionnaires')
    .insert({
      user_id: userId,
      name: name.trim(),
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
    answers: data.answers || [],
  };
};

export const updateSavedQuestionnaire = async (
  id: string,
  userId: string,
  answers: SavedQuestionnaireAnswer[]
): Promise<void> => {
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
  const { error } = await supabase
    .from('saved_questionnaires')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Erro ao atualizar nome');
};

export const deleteSavedQuestionnaire = async (id: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('saved_questionnaires')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Erro ao excluir questionário');
};
