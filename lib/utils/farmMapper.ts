import { Farm } from '../../types';

interface DatabaseFarm {
  id: string;
  name: string;
  country: string;
  state?: string;
  city: string;
  client_id?: string;
  total_area?: number;
  pasture_area?: number;
  forage_production_area?: number;
  agriculture_area_owned?: number;
  agriculture_area_leased?: number;
  agriculture_area?: number;
  other_crops?: number;
  infrastructure?: number;
  reserve_and_app?: number;
  other_area?: number;
  property_value?: number;
  operation_pecuary?: number;
  operation_agricultural?: number;
  other_operations?: number;
  agriculture_variation?: number;
  property_type?: string;
  weight_metric?: string;
  average_herd?: number;
  herd_value?: number;
  commercializes_genetics?: boolean;
  production_system?: string;
  created_at?: string;
  updated_at?: string;
}

export function mapFarmFromDatabase(dbFarm: DatabaseFarm): Farm {
  return {
    id: dbFarm.id,
    name: dbFarm.name,
    country: dbFarm.country,
    state: dbFarm.state || '',
    city: dbFarm.city,
    clientId: dbFarm.client_id,
    totalArea: dbFarm.total_area,
    pastureArea: dbFarm.pasture_area,
    forageProductionArea: dbFarm.forage_production_area,
    agricultureAreaOwned: dbFarm.agriculture_area_owned ?? dbFarm.agriculture_area,
    agricultureAreaLeased: dbFarm.agriculture_area_leased,
    otherCrops: dbFarm.other_crops,
    infrastructure: dbFarm.infrastructure,
    reserveAndAPP: dbFarm.reserve_and_app,
    otherArea: dbFarm.other_area,
    propertyValue: dbFarm.property_value,
    operationPecuary: dbFarm.operation_pecuary,
    operationAgricultural: dbFarm.operation_agricultural,
    otherOperations: dbFarm.other_operations,
    agricultureVariation: dbFarm.agriculture_variation,
    propertyType: dbFarm.property_type as Farm['propertyType'],
    weightMetric: dbFarm.weight_metric as Farm['weightMetric'],
    averageHerd: dbFarm.average_herd,
    herdValue: dbFarm.herd_value,
    commercializesGenetics: dbFarm.commercializes_genetics || false,
    productionSystem: dbFarm.production_system as Farm['productionSystem'],
    createdAt: dbFarm.created_at || new Date().toISOString(),
    updatedAt: dbFarm.updated_at || new Date().toISOString()
  };
}

export function mapFarmsFromDatabase(dbFarms: DatabaseFarm[]): Farm[] {
  return dbFarms.map(mapFarmFromDatabase);
}

/**
 * Monta o payload para insert/upsert no banco.
 * Retorna { base, extended } onde:
 *   - base: campos que existem na tabela original (compatibilidade)
 *   - extended: base + colunas novas (dimensões v2)
 */
export function buildFarmDatabasePayload(
  farm: Partial<Farm>,
  clientId?: string | null
) {
  const agricultureTotal =
    ((farm.agricultureAreaOwned || 0) + (farm.agricultureAreaLeased || 0)) || null;

  const base: Record<string, unknown> = {
    id: farm.id,
    name: farm.name,
    country: farm.country,
    state: farm.state || null,
    city: farm.city,
    client_id: clientId ?? farm.clientId ?? null,
    total_area: farm.totalArea ?? null,
    pasture_area: farm.pastureArea ?? null,
    agriculture_area: agricultureTotal,
    other_crops: farm.otherCrops ?? null,
    infrastructure: farm.infrastructure ?? null,
    reserve_and_app: farm.reserveAndAPP ?? null,
    property_value: farm.propertyValue ?? null,
    operation_pecuary: farm.operationPecuary ?? null,
    operation_agricultural: farm.operationAgricultural ?? null,
    other_operations: farm.otherOperations ?? null,
    agriculture_variation: farm.agricultureVariation ?? 0,
    property_type: farm.propertyType,
    weight_metric: farm.weightMetric,
    average_herd: farm.averageHerd ?? null,
    herd_value: farm.herdValue ?? null,
    commercializes_genetics: farm.commercializesGenetics ?? false,
    production_system: farm.productionSystem || null
  };

  const extended: Record<string, unknown> = {
    ...base,
    forage_production_area: farm.forageProductionArea ?? null,
    agriculture_area_owned: farm.agricultureAreaOwned ?? null,
    agriculture_area_leased: farm.agricultureAreaLeased ?? null,
    other_area: farm.otherArea ?? null
  };

  return { base, extended };
}

export function isMissingColumnError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    msg.includes("in the schema cache") ||
    (msg.includes("could not find the '") && msg.includes("' column"))
  );
}
