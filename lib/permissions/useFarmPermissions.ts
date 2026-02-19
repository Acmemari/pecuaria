import { useMemo, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { PermissionLevel } from './permissionKeys';
import { DEFAULT_PERMISSIONS } from './permissionKeys';

function buildPermissionsResult(
  analystFarm: { permissions: Record<string, string>; is_responsible: boolean } | null,
  isLoading: boolean
): FarmPermissionsResult {
  const merged: Record<string, PermissionLevel> = { ...DEFAULT_PERMISSIONS };
  if (analystFarm?.permissions) {
    for (const [k, v] of Object.entries(analystFarm.permissions)) {
      if (v === 'hidden' || v === 'view' || v === 'edit') {
        merged[k] = v as PermissionLevel;
      }
    }
  }
  const canView = (key: string): boolean =>
    merged[key] === 'view' || merged[key] === 'edit';
  const canEdit = (key: string): boolean => merged[key] === 'edit';
  const isHidden = (key: string): boolean =>
    merged[key] === 'hidden' || merged[key] === undefined;
  return {
    permissions: merged,
    canView,
    canEdit,
    isHidden,
    isLoading,
    isResponsible: analystFarm?.is_responsible ?? false,
    hasAccess: !!analystFarm,
  };
}

export interface FarmPermissionsResult {
  permissions: Record<string, PermissionLevel>;
  canView: (key: string) => boolean;
  canEdit: (key: string) => boolean;
  isHidden: (key: string) => boolean;
  isLoading: boolean;
  isResponsible: boolean;
  hasAccess: boolean;
}

/**
 * Hook para obter permissões do analista em relação a uma fazenda.
 * - Admin: acesso total (canView/canEdit true, isHidden false)
 * - Analista com registro em analyst_farms: usa permissions do registro
 * - Analista sem registro: sem acesso (isHidden true para tudo)
 */
export function useFarmPermissions(
  farmId: string | null | undefined,
  userId: string | null | undefined
): FarmPermissionsResult {
  const [analystFarm, setAnalystFarm] = useState<{
    permissions: Record<string, string>;
    is_responsible: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!farmId || !userId) {
      setAnalystFarm(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('analyst_farms')
        .select('permissions, is_responsible')
        .eq('farm_id', farmId)
        .eq('analyst_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[useFarmPermissions] Error loading analyst_farms:', error);
        setAnalystFarm(null);
      } else if (data) {
        const perms = (data.permissions as Record<string, string>) || {};
        setAnalystFarm({
          permissions: perms,
          is_responsible: data.is_responsible ?? false,
        });
      } else {
        setAnalystFarm(null);
      }
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [farmId, userId]);

  return useMemo(
    () => buildPermissionsResult(analystFarm, isLoading),
    [analystFarm, isLoading]
  );
}

/**
 * Hook para obter permissões de múltiplas fazendas em uma única query (evita N+1).
 * Retorna Record<farmId, FarmPermissionsResult>.
 */
export function useBatchFarmPermissions(
  farmIds: string[],
  userId: string | null | undefined
): Record<string, FarmPermissionsResult> {
  const [rows, setRows] = useState<
    { farm_id: string; is_responsible: boolean; permissions: Record<string, string> }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const stableIds = useMemo(
    () => (farmIds.length ? [...farmIds].sort() : []),
    [farmIds.join(',')]
  );

  useEffect(() => {
    if (!userId || stableIds.length === 0) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc('get_farm_permissions_batch', {
        p_farm_ids: stableIds,
        p_user_id: userId,
      });

      if (cancelled) return;
      if (error) {
        console.error('[useBatchFarmPermissions] Error:', error);
        setRows([]);
      } else {
        setRows(
          (data ?? []).map((r: { farm_id: string; is_responsible: boolean; permissions: unknown }) => ({
            farm_id: r.farm_id,
            is_responsible: r.is_responsible ?? false,
            permissions: (r.permissions as Record<string, string>) ?? {},
          }))
        );
      }
      setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId, stableIds.join(',')]);

  return useMemo(() => {
    const map: Record<string, FarmPermissionsResult> = {};
    for (const id of stableIds) {
      const row = rows.find((r) => r.farm_id === id);
      const analystFarm = row
        ? { permissions: row.permissions, is_responsible: row.is_responsible }
        : null;
      map[id] = buildPermissionsResult(analystFarm, isLoading);
    }
    return map;
  }, [rows, stableIds, isLoading]);
}
