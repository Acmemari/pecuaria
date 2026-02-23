import { supabase } from './supabase';
import { CattleScenario, CattleCalculatorInputs, CalculationResults } from '../types';
import { sanitizeText } from './inputSanitizer';
import { logger } from './logger';

const log = logger.withContext({ component: 'scenarios' });

const MAX_SCENARIOS = 10;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string, fieldName: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error(`${fieldName} inválido.`);
  }
}

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
      log.error('Error fetching scenarios', new Error(error.message));

      if (error.message?.includes('schema cache') || error.code === '42P01') {
        log.warn('Table cattle_scenarios does not exist yet');
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
        log.warn('Invalid scenario data found, skipping');
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
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error('Error in getSavedScenarios', error);
    throw new Error(error.message || 'Erro ao carregar cenários salvos');
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
    log.error('Error checking scenario limit', new Error(error.message));
    return false;
  }

  return (count || 0) >= MAX_SCENARIOS;
};

// Validation helper
const validateScenarioData = (name?: string, inputs?: CattleCalculatorInputs) => {
  if (name !== undefined) {
    if (!name || name.trim() === '') {
      throw new Error('O nome do cenário é obrigatório');
    }
    if (name.trim().length > 200) {
      throw new Error('O nome do cenário é muito longo (máx 200 caracteres)');
    }
  }

  if (inputs !== undefined) {
    if (!inputs || typeof inputs !== 'object') {
      throw new Error('Dados de entrada inválidos');
    }

    const requiredFields: (keyof CattleCalculatorInputs)[] = [
      'pesoCompra', 'valorCompra', 'pesoAbate', 'rendimentoCarcaca',
      'valorVenda', 'gmd', 'custoMensal', 'lotacao'
    ];

    for (const field of requiredFields) {
      const value = inputs[field];
      if (value === undefined || value === null || isNaN(Number(value))) {
        throw new Error(`Campo obrigatório inválido: ${field}`);
      }
      // Validar limites razoáveis (evitar valores absurdos)
      if (Number(value) < 0) {
        throw new Error(`O campo ${field} não pode ser negativo`);
      }
      if (Number(value) > 1_000_000) {
        throw new Error(`O valor de ${field} parece excessivo (máx 1.000.000)`);
      }
    }
  }
};

export interface SaveScenarioOptions {
  clientId?: string | null;
  farmId?: string | null;
  farmName?: string | null;
}

export const saveReportPdf = async (
  userId: string,
  name: string,
  pdfBase64: string,
  reportType: string,
  options?: SaveScenarioOptions
): Promise<CattleScenario> => {
  validateUUID(userId, 'ID do usuário');

  const sanitizedName = sanitizeText(name);
  if (!sanitizedName) {
    throw new Error('O nome do relatório é obrigatório');
  }

  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    throw new Error('PDF inválido para salvamento');
  }

  if (!reportType || typeof reportType !== 'string') {
    throw new Error('Tipo de relatório inválido');
  }

  const { data, error } = await supabase
    .from('cattle_scenarios')
    .insert({
      user_id: userId,
      client_id: options?.clientId || null,
      farm_id: options?.farmId || null,
      farm_name: options?.farmName || null,
      name: sanitizedName,
      inputs: {},
      results: {
        type: reportType,
        pdf_base64: pdfBase64,
      },
    })
    .select()
    .single();

  if (error) {
    log.error('Error saving report PDF', new Error(error.message));
    throw new Error(error.message || 'Erro ao salvar relatório.');
  }

  return {
    ...data,
    inputs: data.inputs as CattleCalculatorInputs,
    results: data.results as CalculationResults | undefined
  };
};

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
  // Validar IDs
  validateUUID(userId, 'ID do usuário');

  // Sanitizar e validar dados
  const sanitizedName = sanitizeText(name);
  validateScenarioData(sanitizedName, inputs);

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
      name: sanitizedName,
      inputs,
      results
    })
    .select()
    .single();

  if (error) {
    log.error('Error saving scenario', new Error(error.message));

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
  // Validar IDs
  validateUUID(scenarioId, 'ID do cenário');
  validateUUID(userId, 'ID do usuário');

  // Validate updates
  if (updates.name) updates.name = sanitizeText(updates.name);
  validateScenarioData(updates.name, updates.inputs);

  const { data, error } = await supabase
    .from('cattle_scenarios')
    .update(updates)
    .eq('id', scenarioId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    log.error('Error updating scenario', new Error(error.message));
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
  validateUUID(scenarioId, 'ID do cenário');
  validateUUID(userId, 'ID do usuário');

  const { error } = await supabase
    .from('cattle_scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', userId);

  if (error) {
    log.error('Error deleting scenario', new Error(error.message));
    throw new Error('Erro ao excluir cenário');
  }
};

/**
 * Get a single scenario by ID
 */
export const getScenario = async (scenarioId: string, userId: string): Promise<CattleScenario | null> => {
  validateUUID(scenarioId, 'ID do cenário');
  validateUUID(userId, 'ID do usuário');

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
    log.error('Error fetching scenario', new Error(error.message));
    throw new Error('Erro ao carregar cenário');
  }

  return {
    ...data,
    inputs: data.inputs as CattleCalculatorInputs,
    results: data.results as CalculationResults | undefined
  };
};

