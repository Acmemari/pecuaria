import { Farm } from '../../types';

/**
 * Converte dados da fazenda do formato do banco (snake_case) para o formato da aplicação (camelCase)
 * @param dbFarm Dados da fazenda do banco de dados
 * @returns Farm object no formato da aplicação
 */
export function mapFarmFromDatabase(dbFarm: any): Farm {
  return {
    id: dbFarm.id,
    name: dbFarm.name,
    country: dbFarm.country,
    state: dbFarm.state || '',
    city: dbFarm.city,
    clientId: dbFarm.client_id,
    totalArea: dbFarm.total_area,
    pastureArea: dbFarm.pasture_area,
    agricultureArea: dbFarm.agriculture_area,
    otherCrops: dbFarm.other_crops,
    infrastructure: dbFarm.infrastructure,
    reserveAndAPP: dbFarm.reserve_and_app,
    propertyValue: dbFarm.property_value,
    operationPecuary: dbFarm.operation_pecuary,
    operationAgricultural: dbFarm.operation_agricultural,
    otherOperations: dbFarm.other_operations,
    agricultureVariation: dbFarm.agriculture_variation,
    propertyType: dbFarm.property_type as 'Própria' | 'Arrendada',
    weightMetric: dbFarm.weight_metric as 'Arroba (@)' | 'Quilograma (Kg)',
    averageHerd: dbFarm.average_herd,
    herdValue: dbFarm.herd_value,
    commercializesGenetics: dbFarm.commercializes_genetics || false,
    productionSystem: dbFarm.production_system as 'Cria' | 'Recria-Engorda' | 'Ciclo Completo',
    createdAt: dbFarm.created_at || new Date().toISOString(),
    updatedAt: dbFarm.updated_at || new Date().toISOString()
  };
}

/**
 * Converte dados da fazenda do formato da aplicação para o formato do banco
 * @param farm Farm object no formato da aplicação
 * @returns Objeto no formato do banco de dados
 */
export function mapFarmToDatabase(farm: Partial<Farm>) {
  return {
    id: farm.id,
    name: farm.name,
    country: farm.country,
    state: farm.state || null,
    city: farm.city,
    client_id: farm.clientId || null,
    total_area: farm.totalArea || null,
    pasture_area: farm.pastureArea || null,
    agriculture_area: farm.agricultureArea || null,
    other_crops: farm.otherCrops || null,
    infrastructure: farm.infrastructure || null,
    reserve_and_app: farm.reserveAndAPP || null,
    property_value: farm.propertyValue || null,
    operation_pecuary: (farm as any).operationPecuary || null,
    operation_agricultural: (farm as any).operationAgricultural || null,
    other_operations: (farm as any).otherOperations || null,
    agriculture_variation: (farm as any).agricultureVariation || 0,
    property_type: farm.propertyType,
    weight_metric: farm.weightMetric,
    average_herd: farm.averageHerd || null,
    herd_value: farm.herdValue || null,
    commercializes_genetics: farm.commercializesGenetics,
    production_system: farm.productionSystem || null
  };
}

/**
 * Converte array de fazendas do banco para o formato da aplicação
 * @param dbFarms Array de fazendas do banco
 * @returns Array de Farm objects
 */
export function mapFarmsFromDatabase(dbFarms: any[]): Farm[] {
  return dbFarms.map(mapFarmFromDatabase);
}
