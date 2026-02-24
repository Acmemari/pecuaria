import { useMemo } from 'react';
import { Farm } from '../../types';
import { validateArea, validateCurrency, isValidNumber } from '../utils/validation';

/**
 * Interface para categoria de animal
 */
export interface AnimalCategory {
  id: string;
  name: string;
  percentage: number;
  weight: number;
  valuePerKg: number;
}

/**
 * Parâmetros de entrada para os cálculos
 */
export interface AgilePlanningParams {
  // Parâmetros básicos
  percentage: number;
  expectedMargin: number;
  operationPecuaryValue: number;

  // Índices reprodutivos
  fertility: number;
  prePartumLoss: number;
  calfMortality: number;
  maleWeaningWeight: number;
  femaleWeaningWeight: number;
  firstMatingAge: number;

  // Categorias e validações
  animalCategories: AnimalCategory[];
  isPercentageSumValid: boolean;

  // Fazenda
  farm: Farm | null;
  showReproductiveIndices: boolean;
}

/**
 * Resultados dos cálculos
 */
export interface AgilePlanningResults {
  // Valores básicos
  calculatedValue: number;
  requiredRevenue: number;
  averageValue: number;
  requiredSales: number;

  // Índices reprodutivos
  weaningRate: number;
  kgPerMatrix: number;
  requiredMatrixes: number;
  averageHerd: number;
  matricesOverAverageHerd: number;

  // Performance
  salesPerHectare: number;
  gmdGlobal: number;
  lotacaoCabHa: number;

  // Financeiro
  revenue: number;
  totalDisbursement: number;
  result: number;
  resultPerHectare: number;
  marginOverSale: number;
  disbursementPerHeadMonth: number;

  // Funções auxiliares
  calculateQuantity: (categoryPercentage: number) => number;
  calculateValuePerHead: (category: AnimalCategory) => number;
}

/**
 * Divisão segura - retorna 0 se divisor for 0
 */
const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0 || !isValidNumber(numerator) || !isValidNumber(denominator)) {
    return 0;
  }
  const result = numerator / denominator;
  return isValidNumber(result) ? result : 0;
};

/**
 * IDs das categorias padrão
 */
const CATEGORY_IDS = {
  BEZERRO: '1',
  BEZERRA: '2',
} as const;

/**
 * Verifica se categoria usa kg
 */
const isKgCategory = (categoryId: string): boolean => {
  return categoryId === CATEGORY_IDS.BEZERRO || categoryId === CATEGORY_IDS.BEZERRA;
};

/**
 * Hook para cálculos do Planejamento Ágil
 * Centraliza toda a lógica de cálculo em um único lugar
 */
export function useAgilePlanningCalculations(params: AgilePlanningParams): AgilePlanningResults {
  const {
    percentage,
    expectedMargin,
    operationPecuaryValue,
    fertility,
    prePartumLoss,
    calfMortality,
    maleWeaningWeight,
    femaleWeaningWeight,
    firstMatingAge,
    animalCategories,
    isPercentageSumValid,
    farm,
    showReproductiveIndices,
  } = params;

  // Validar inputs
  const validatedPastureArea = useMemo(() => validateArea(farm?.pastureArea), [farm?.pastureArea]);
  const validatedOperationValue = useMemo(() => validateCurrency(operationPecuaryValue), [operationPecuaryValue]);

  // Função auxiliar: calcular valor por cabeça
  const calculateValuePerHead = useMemo(
    () =>
      (category: AnimalCategory): number => {
        const weight = category.weight ?? 0;
        const valuePerKg = category.valuePerKg ?? 0;
        return weight * valuePerKg;
      },
    [],
  );

  // 1. Valor calculado
  const calculatedValue = useMemo(() => {
    return safeDivide(percentage * validatedOperationValue, 100);
  }, [percentage, validatedOperationValue]);

  // 2. Faturamento necessário
  const requiredRevenue = useMemo(() => {
    if (expectedMargin <= 0) return 0;
    return safeDivide(calculatedValue * 100, expectedMargin);
  }, [calculatedValue, expectedMargin]);

  // 3. Valor médio de venda
  const averageValue = useMemo(() => {
    if (!isPercentageSumValid) return 0;
    return animalCategories.reduce((sum, category) => {
      const valuePerHead = calculateValuePerHead(category);
      return sum + safeDivide(category.percentage * valuePerHead, 100);
    }, 0);
  }, [animalCategories, calculateValuePerHead, isPercentageSumValid]);

  // 4. Vendas necessárias
  const requiredSales = useMemo(() => {
    if (!isPercentageSumValid || averageValue <= 0 || requiredRevenue <= 0) return 0;
    return Math.round(safeDivide(requiredRevenue, averageValue));
  }, [isPercentageSumValid, averageValue, requiredRevenue]);

  // 5. Taxa de desmame
  const weaningRate = useMemo(() => {
    if (!showReproductiveIndices) return 0;
    const fertilityDecimal = safeDivide(fertility, 100);
    const prePartumLossDecimal = safeDivide(prePartumLoss, 100);
    const calfMortalityDecimal = safeDivide(calfMortality, 100);
    return fertilityDecimal * (1 - prePartumLossDecimal) * (1 - calfMortalityDecimal);
  }, [showReproductiveIndices, fertility, prePartumLoss, calfMortality]);

  // 6. Kg por matriz
  const kgPerMatrix = useMemo(() => {
    if (!showReproductiveIndices) return 0;
    const avgWeaningWeight = (maleWeaningWeight + femaleWeaningWeight) / 2;
    return weaningRate * avgWeaningWeight;
  }, [showReproductiveIndices, weaningRate, maleWeaningWeight, femaleWeaningWeight]);

  // 7. Matrizes necessárias
  const requiredMatrixes = useMemo(() => {
    if (!showReproductiveIndices || weaningRate <= 0 || requiredSales <= 0) return 0;
    return Math.ceil(safeDivide(requiredSales, weaningRate));
  }, [showReproductiveIndices, weaningRate, requiredSales]);

  // 8. Índices de rebanho médio
  const { matricesOverAverageHerd, averageHerd } = useMemo(() => {
    if (!showReproductiveIndices || requiredMatrixes <= 0) {
      return { matricesOverAverageHerd: 0, averageHerd: 0 };
    }

    const indiceTempo = Math.max(0, firstMatingAge - 12);
    const indiceNovilhas = safeDivide(indiceTempo * 37.5, 12);
    const indexValorRebanho = indiceNovilhas + 163.375;
    const matrices = indexValorRebanho > 0 ? safeDivide(100, indexValorRebanho) : 0;
    const herd = matrices > 0 ? safeDivide(requiredMatrixes, matrices) : 0;

    return {
      matricesOverAverageHerd: matrices,
      averageHerd: herd,
    };
  }, [showReproductiveIndices, requiredMatrixes, firstMatingAge]);

  // 9. Função: calcular quantidade
  const calculateQuantity = useMemo(
    () =>
      (categoryPercentage: number): number => {
        if (!isPercentageSumValid || requiredSales === 0) return 0;
        return Math.round(safeDivide(requiredSales * categoryPercentage, 100));
      },
    [isPercentageSumValid, requiredSales],
  );

  // 10. GMD global
  const gmdGlobal = useMemo(() => {
    if (!showReproductiveIndices || averageHerd <= 0) return 0;

    const totalPesoKg = animalCategories.reduce((sum, category) => {
      const quantity = calculateQuantity(category.percentage);
      if (quantity <= 0) return sum;
      const weightKg = isKgCategory(category.id) ? category.weight : category.weight * 30;
      return sum + quantity * weightKg;
    }, 0);

    return safeDivide(safeDivide(totalPesoKg, averageHerd), 365);
  }, [showReproductiveIndices, averageHerd, animalCategories, calculateQuantity]);

  // 11. Lotação cab/ha
  const lotacaoCabHa = useMemo(() => {
    if (!showReproductiveIndices || averageHerd <= 0 || validatedPastureArea <= 0) return 0;
    return safeDivide(averageHerd, validatedPastureArea);
  }, [showReproductiveIndices, averageHerd, validatedPastureArea]);

  // 12. Vendas por hectare
  const salesPerHectare = useMemo(() => {
    if (validatedPastureArea <= 0 || requiredSales <= 0) return 0;
    return safeDivide(requiredSales, validatedPastureArea);
  }, [validatedPastureArea, requiredSales]);

  // 13. Receita
  const revenue = useMemo(() => {
    if (!isPercentageSumValid || averageValue <= 0 || requiredSales <= 0) return 0;
    return averageValue * requiredSales;
  }, [isPercentageSumValid, averageValue, requiredSales]);

  // 14. Desembolso total
  const totalDisbursement = useMemo(() => {
    if (revenue <= 0) return 0;
    return revenue - calculatedValue;
  }, [revenue, calculatedValue]);

  // 15. Resultado
  const result = useMemo(() => {
    return revenue - totalDisbursement;
  }, [revenue, totalDisbursement]);

  // 16. Resultado/ha
  const resultPerHectare = useMemo(() => {
    if (validatedPastureArea <= 0 || result <= 0) return 0;
    return safeDivide(result, validatedPastureArea);
  }, [validatedPastureArea, result]);

  // 17. Margem sobre venda
  const marginOverSale = useMemo(() => {
    if (revenue <= 0 || result <= 0) return 0;
    return safeDivide(result, revenue) * 100;
  }, [revenue, result]);

  // 18. Desembolso por cabeça/mês
  const disbursementPerHeadMonth = useMemo(() => {
    if (!showReproductiveIndices || averageHerd <= 0 || totalDisbursement <= 0) return 0;
    return safeDivide(safeDivide(totalDisbursement, averageHerd), 12);
  }, [showReproductiveIndices, averageHerd, totalDisbursement]);

  return {
    calculatedValue,
    requiredRevenue,
    averageValue,
    requiredSales,
    weaningRate,
    kgPerMatrix,
    requiredMatrixes,
    averageHerd,
    matricesOverAverageHerd,
    salesPerHectare,
    gmdGlobal,
    lotacaoCabHa,
    revenue,
    totalDisbursement,
    result,
    resultPerHectare,
    marginOverSale,
    disbursementPerHeadMonth,
    calculateQuantity,
    calculateValuePerHead,
  };
}
