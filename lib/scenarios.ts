import { supabase } from './supabase';
import { CattleScenario, CattleCalculatorInputs, CalculationResults } from '../types';

const MAX_SCENARIOS = 10;

/**
 * Get all saved scenarios for the current user
 */
export const getSavedScenarios = async (userId: string): Promise<CattleScenario[]> => {
  try {
    const { data, error } = await supabase
      .from('cattle_scenarios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scenarios:', error);
      
      // Check if table doesn't exist
      if (error.message?.includes('schema cache') || error.code === '42P01') {
        console.warn('Table cattle_scenarios does not exist yet');
        // Return empty array if table doesn't exist - feature not yet available
        return [];
      }
      
      // For other errors, throw
      throw new Error(error.message || 'Erro ao carregar cenários salvos');
    }

    // Handle case where data is null or undefined
    if (!data) {
      return [];
    }

    // Map and validate the data
    return data.map((scenario) => {
      // Validate that required fields exist
      if (!scenario.id || !scenario.user_id || !scenario.name || !scenario.inputs) {
        console.warn('Invalid scenario data:', scenario);
        return null;
      }
      
      return {
        id: scenario.id,
        user_id: scenario.user_id,
        name: scenario.name,
        inputs: scenario.inputs as CattleCalculatorInputs,
        results: scenario.results ? (scenario.results as CalculationResults) : undefined,
        created_at: scenario.created_at,
        updated_at: scenario.updated_at || scenario.created_at
      };
    }).filter((scenario): scenario is CattleScenario => scenario !== null);
  } catch (err: any) {
    console.error('Error in getSavedScenarios:', err);
    // Re-throw with a user-friendly message
    throw new Error(err.message || 'Erro ao carregar cenários salvos');
  }
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
    
    // Check if table doesn't exist
    if (error.message?.includes('schema cache') || error.code === '42P01') {
      throw new Error('Funcionalidade de salvar cenários ainda não está disponível. A tabela precisa ser criada no banco de dados.');
    }
    
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

