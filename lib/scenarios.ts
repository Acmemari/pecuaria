import { supabase } from './supabase';
import { CattleScenario, CattleCalculatorInputs, CalculationResults } from '../types';

const MAX_SCENARIOS = 10;

/**
 * Get all saved scenarios for the current user
 */
export const getSavedScenarios = async (userId: string): Promise<CattleScenario[]> => {
  const { data, error } = await supabase
    .from('cattle_scenarios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scenarios:', error);
    throw new Error('Erro ao carregar cenários salvos');
  }

  return (data || []).map((scenario) => ({
    ...scenario,
    inputs: scenario.inputs as CattleCalculatorInputs,
    results: scenario.results as CalculationResults | undefined
  }));
};

/**
 * Check if user has reached the limit of saved scenarios
 */
export const checkScenarioLimit = async (userId: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from('cattle_scenarios')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error checking scenario limit:', error);
    return false;
  }

  return (count || 0) >= MAX_SCENARIOS;
};

/**
 * Save a new scenario
 */
export const saveScenario = async (
  userId: string,
  name: string,
  inputs: CattleCalculatorInputs,
  results?: CalculationResults
): Promise<CattleScenario> => {
  // Check limit
  const atLimit = await checkScenarioLimit(userId);
  if (atLimit) {
    throw new Error(`Você já possui ${MAX_SCENARIOS} cenários salvos. Exclua um para salvar outro.`);
  }

  const { data, error } = await supabase
    .from('cattle_scenarios')
    .insert({
      user_id: userId,
      name,
      inputs,
      results
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving scenario:', error);
    throw new Error('Erro ao salvar cenário');
  }

  return {
    ...data,
    inputs: data.inputs as CattleCalculatorInputs,
    results: data.results as CalculationResults | undefined
  };
};

/**
 * Update an existing scenario
 */
export const updateScenario = async (
  scenarioId: string,
  userId: string,
  updates: {
    name?: string;
    inputs?: CattleCalculatorInputs;
    results?: CalculationResults;
  }
): Promise<CattleScenario> => {
  const { data, error } = await supabase
    .from('cattle_scenarios')
    .update(updates)
    .eq('id', scenarioId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating scenario:', error);
    throw new Error('Erro ao atualizar cenário');
  }

  return {
    ...data,
    inputs: data.inputs as CattleCalculatorInputs,
    results: data.results as CalculationResults | undefined
  };
};

/**
 * Delete a scenario
 */
export const deleteScenario = async (scenarioId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('cattle_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting scenario:', error);
    throw new Error('Erro ao excluir cenário');
  }
};

/**
 * Get a single scenario by ID
 */
export const getScenario = async (scenarioId: string, userId: string): Promise<CattleScenario | null> => {
  const { data, error } = await supabase
    .from('cattle_scenarios')
    .select('*')
    .eq('id', scenarioId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching scenario:', error);
    throw new Error('Erro ao carregar cenário');
  }

  return {
    ...data,
    inputs: data.inputs as CattleCalculatorInputs,
    results: data.results as CalculationResults | undefined
  };
};

