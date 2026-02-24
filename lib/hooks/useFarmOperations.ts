import { useCallback } from 'react';
import { supabase } from '../supabase';
import { Farm } from '../../types';
import { mapFarmsFromDatabase } from '../utils/farmMapper';
import { logger } from '../logger';

const log = logger.withContext({ component: 'useFarmOperations' });

/**
 * Hook customizado para operações com fazendas
 * Centraliza lógica de CRUD e busca de fazendas
 */
export function useFarmOperations() {
  /**
   * Busca fazendas vinculadas a um cliente específico
   */
  const getClientFarms = useCallback(async (clientId: string): Promise<Farm[]> => {
    try {
      // Buscar IDs das fazendas vinculadas ao cliente através de ambas as tabelas
      const [clientFarmsResult, directFarmsResult] = await Promise.all([
        supabase.from('client_farms').select('farm_id').eq('client_id', clientId),
        supabase.from('farms').select('id').eq('client_id', clientId),
      ]);

      const farmIds = new Set<string>();

      // Adicionar IDs da tabela client_farms
      if (clientFarmsResult.data) {
        clientFarmsResult.data.forEach(cf => farmIds.add(cf.farm_id));
      }

      // Adicionar IDs da busca direta
      if (directFarmsResult.data) {
        directFarmsResult.data.forEach(f => farmIds.add(f.id));
      }

      if (farmIds.size === 0) {
        return [];
      }

      // Buscar detalhes das fazendas
      const { data, error } = await supabase.from('farms').select('*').in('id', Array.from(farmIds));

      if (error) {
        log.error('Error loading farms', new Error(error.message));
        return [];
      }

      return data ? mapFarmsFromDatabase(data) : [];
    } catch (err: unknown) {
      log.error('Exception loading client farms', err instanceof Error ? err : new Error(String(err)));
      return [];
    }
  }, []);

  /**
   * Deleta uma fazenda e todos os seus vínculos
   */
  const deleteFarm = useCallback(async (farmId: string): Promise<boolean> => {
    try {
      // Deletar vínculos primeiro
      await Promise.all([
        supabase.from('client_farms').delete().eq('farm_id', farmId),
        supabase.from('analyst_farms').delete().eq('farm_id', farmId),
      ]);

      // Deletar fazenda
      const { error } = await supabase.from('farms').delete().eq('id', farmId);

      if (error) {
        log.error('Error deleting farm', new Error(error.message));
        return false;
      }

      // Limpar localStorage
      const storedFarms = localStorage.getItem('agro-farms');
      if (storedFarms) {
        const allFarms = JSON.parse(storedFarms);
        const updatedFarms = allFarms.filter((f: Farm) => f.id !== farmId);
        localStorage.setItem('agro-farms', JSON.stringify(updatedFarms));
      }

      return true;
    } catch (err: unknown) {
      log.error('Exception deleting farm', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, []);

  /**
   * Conta fazendas vinculadas a um cliente
   */
  const countClientFarms = useCallback(async (clientId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('client_farms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (error) {
        log.error('Error counting farms', new Error(error.message));
        return 0;
      }

      return count || 0;
    } catch (err: unknown) {
      log.error('Exception counting farms', err instanceof Error ? err : new Error(String(err)));
      return 0;
    }
  }, []);

  return {
    getClientFarms,
    deleteFarm,
    countClientFarms,
  };
}
