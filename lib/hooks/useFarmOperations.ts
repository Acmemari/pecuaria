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
      // Fonte canônica: farms.client_id
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('client_id', clientId)
        .order('name', { ascending: true });

      if (error) {
        log.error('Error loading farms by client_id', new Error(error.message));
        return [];
      }

      if (data && data.length > 0) {
        return mapFarmsFromDatabase(data);
      }

      // Compatibilidade temporária: alguns registros legados ainda podem existir só em client_farms.
      const { data: legacyLinks, error: legacyError } = await supabase
        .from('client_farms')
        .select('farm_id')
        .eq('client_id', clientId);

      if (legacyError || !legacyLinks || legacyLinks.length === 0) {
        return [];
      }

      const legacyFarmIds = legacyLinks
        .map(link => link.farm_id)
        .filter((farmId): farmId is string => typeof farmId === 'string' && farmId.length > 0);
      if (legacyFarmIds.length === 0) {
        return [];
      }

      const { data: legacyFarms, error: legacyFarmsError } = await supabase
        .from('farms')
        .select('*')
        .in('id', legacyFarmIds);
      if (legacyFarmsError) {
        log.error('Error loading legacy linked farms', new Error(legacyFarmsError.message));
        return [];
      }

      return legacyFarms ? mapFarmsFromDatabase(legacyFarms) : [];
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
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (error) {
        log.error('Error counting farms', new Error(error.message));
        // Compatibilidade temporária com dados legados.
        const { count: legacyCount, error: legacyError } = await supabase
          .from('client_farms')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);
        if (legacyError) {
          return 0;
        }
        return legacyCount || 0;
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
