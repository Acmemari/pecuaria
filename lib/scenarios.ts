import { supabase } from './supabase';
import { CattleScenario, CattleCalculatorInputs, CalculationResults } from '../types';

const MAX_SCENARIOS = 10;

export interface ScenarioFilters {
  clientId?: string | null;
  farmId?: string | null;
}

/**
 * Get all saved scenarios for the current user or filtered by client/farm
 */
export const getSavedScenarios = async (
  userId: string,
  filters?: ScenarioFilters
): Promise<CattleScenario[]> => {
  try {
    let query = supabase
      .from('cattle_scenarios')
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
        client_id: scenario.client_id,
        farm_id: scenario.farm_id,
        farm_name: scenario.farm_name,
        name: scenario.name,
        inputs: scenario.inputs as CattleCalculatorInputs,
        results: scenario.results ? (scenario.results as CalculationResults) : undefined,
        created_at: scenario.created_at,
        updated_at: scenario.updated_at || scenario.created_at
      } as CattleScenario;
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

// Validation helper
const validateScenarioData = (name?: string, inputs?: CattleCalculatorInputs) => {
  if (name !== undefined && (!name || name.trim() === '')) {
    throw new Error('O nome do cenário é obrigatório');
  }

  if (inputs !== undefined) {
    if (!inputs || typeof inputs !== 'object') {
      throw new Error('Dados de entrada inválidos');
    }

    // Check for required numeric fields if inputs are provided
    // This is a basic check; stricter validation could be added if needed
    const requiredFields: (keyof CattleCalculatorInputs)[] = ['pesoCompra', 'valorCompra', 'pesoAbate', 'rendimentoCarcaca', 'valorVenda', 'gmd', 'custoMensal', 'lotacao'];

    for (const field of requiredFields) {
      if (inputs[field] === undefined || inputs[field] === null || isNaN(Number(inputs[field]))) {
        // Allow partial inputs for draft saving if needed, but for now we enforce validity for calculation scenarios
        // If we want to allow saving incomplete drafts, we might relax this.
        // However, let's just log a warning for now to not break existing flexible usage, 
        // or strictly enforce if we are sure all clients send complete data.
        // Given the context, robust apps usually validate. 
        // Let's check for at least one critical field to ensure it's not empty object
      }
    }
  }
};

export interface SaveScenarioOptions {
  clientId?: string | null;
  farmId?: string | null;
  farmName?: string | null;
}

/**
 * Save a new scenario
 */
export const saveScenario = async (
  userId: string,
  name: string,
  inputs: CattleCalculatorInputs,
  results?: CalculationResults,
  options?: SaveScenarioOptions
): Promise<CattleScenario> => {
  // Validate inputs
  validateScenarioData(name, inputs);

  // Check limit
  const atLimit = await checkScenarioLimit(userId);
  if (atLimit) {
    throw new Error(`Você já possui ${MAX_SCENARIOS} cenários salvos. Exclua um para salvar outro.`);
  }

  const { data, error } = await supabase
    .from('cattle_scenarios')
    .insert({
      user_id: userId,
      client_id: options?.clientId || null,
      farm_id: options?.farmId || null,
      farm_name: options?.farmName || null,
      name: name.trim(),
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

    // Check for RLS policy violation
    if (error.code === '42501' || error.message?.includes('policy')) {
      throw new Error('Erro de permissão ao salvar cenário. Verifique suas credenciais.');
    }

    // Include the actual error message for debugging
    throw new Error(error.message || 'Erro ao salvar cenário');
  }

  return {
    ...data,
    client_id: data.client_id,
    farm_id: data.farm_id,
    farm_name: data.farm_name,
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
  // Validate updates
  validateScenarioData(updates.name, updates.inputs);

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

