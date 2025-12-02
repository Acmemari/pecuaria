import { describe, it, expect } from 'vitest';
import { CattleCalculatorInputs, CalculationResults } from '../../../types';

// Função de cálculo extraída para testes
function calculateCattleProfit(inputs: CattleCalculatorInputs): CalculationResults {
  const ARROBA_KG = 15;
  const YIELD_PURCHASE = 50;

  const pesoCompraArrobas = (inputs.pesoCompra * (YIELD_PURCHASE / 100)) / ARROBA_KG;
  const pesoFinalArrobas = (inputs.pesoAbate * (inputs.rendimentoCarcaca / 100)) / ARROBA_KG;
  const arrobasProduzidas = pesoFinalArrobas - pesoCompraArrobas;

  const weightGainNeeded = inputs.pesoAbate - inputs.pesoCompra;
  const diasPermanencia = weightGainNeeded > 0 ? weightGainNeeded / inputs.gmd : 0;
  const mesesPermanencia = diasPermanencia / 30;

  const valorBoi = pesoFinalArrobas * inputs.valorVenda;
  const custoCompra = inputs.pesoCompra * inputs.valorCompra;
  const custoOperacional = mesesPermanencia * inputs.custoMensal;
  const custoTotal = custoCompra + custoOperacional;
  const resultadoPorBoi = valorBoi - custoTotal;

  const margemVenda = valorBoi > 0 ? (resultadoPorBoi / valorBoi) * 100 : 0;
  
  const capitalInvestidoCompra = custoCompra;
  const resultadoMensal = mesesPermanencia > 0 && capitalInvestidoCompra > 0 
    ? ((resultadoPorBoi / capitalInvestidoCompra) / mesesPermanencia) * 100 
    : 0;
  
  const resultadoAnual = resultadoMensal * 12;

  const custoPorArrobaProduzida = arrobasProduzidas > 0 ? custoOperacional / arrobasProduzidas : 0;
  const custoPorArrobaFinal = pesoFinalArrobas > 0 ? custoTotal / pesoFinalArrobas : 0;

  return {
    pesoCompraArrobas,
    pesoFinalArrobas,
    arrobasProduzidas,
    diasPermanencia,
    mesesPermanencia,
    valorBoi,
    custoCompra,
    custoOperacional,
    custoTotal,
    resultadoPorBoi,
    margemVenda,
    resultadoMensal,
    resultadoAnual,
    custoPorArrobaProduzida,
    custoPorArrobaFinal
  };
}

describe('Cattle Profit Calculations', () => {
  const baseInputs: CattleCalculatorInputs = {
    pesoCompra: 300,
    valorCompra: 14.50,
    pesoAbate: 510,
    rendimentoCarcaca: 52,
    valorVenda: 280,
    gmd: 0.85,
    custoMensal: 135,
  };

  it('should calculate pesoCompraArrobas correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // pesoCompra * 0.5 / 15 = 300 * 0.5 / 15 = 10
    expect(result.pesoCompraArrobas).toBeCloseTo(10, 2);
  });

  it('should calculate pesoFinalArrobas correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // pesoAbate * rendimento / 15 = 510 * 0.52 / 15 = 17.68
    expect(result.pesoFinalArrobas).toBeCloseTo(17.68, 2);
  });

  it('should calculate arrobasProduzidas correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // pesoFinalArrobas - pesoCompraArrobas = 17.68 - 10 = 7.68
    expect(result.arrobasProduzidas).toBeCloseTo(7.68, 2);
  });

  it('should calculate diasPermanencia correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // (pesoAbate - pesoCompra) / gmd = (510 - 300) / 0.85 = 247.06
    expect(result.diasPermanencia).toBeCloseTo(247.06, 2);
  });

  it('should calculate mesesPermanencia correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // diasPermanencia / 30 = 247.06 / 30 = 8.24
    expect(result.mesesPermanencia).toBeCloseTo(8.24, 2);
  });

  it('should calculate valorBoi correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // pesoFinalArrobas * valorVenda = 17.68 * 280 = 4950.4
    expect(result.valorBoi).toBeCloseTo(4950.4, 2);
  });

  it('should calculate custoCompra correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // pesoCompra * valorCompra = 300 * 14.50 = 4350
    expect(result.custoCompra).toBe(4350);
  });

  it('should calculate custoOperacional correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // mesesPermanencia * custoMensal
    expect(result.custoOperacional).toBeGreaterThan(1100);
    expect(result.custoOperacional).toBeLessThan(1120);
  });

  it('should calculate custoTotal correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // custoCompra + custoOperacional
    expect(result.custoTotal).toBeGreaterThan(5450);
    expect(result.custoTotal).toBeLessThan(5470);
  });

  it('should calculate resultadoPorBoi correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // valorBoi - custoTotal (should be negative in this case)
    expect(result.resultadoPorBoi).toBeLessThan(0);
    expect(result.resultadoPorBoi).toBeGreaterThan(-520);
  });

  it('should calculate margemVenda correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // (resultadoPorBoi / valorBoi) * 100 (should be negative)
    expect(result.margemVenda).toBeLessThan(0);
    expect(result.margemVenda).toBeGreaterThan(-11);
  });

  it('should handle zero pesoAbate', () => {
    const inputs = { ...baseInputs, pesoAbate: 0 };
    const result = calculateCattleProfit(inputs);
    expect(result.diasPermanencia).toBe(0);
    expect(result.mesesPermanencia).toBe(0);
  });

  it('should handle zero gmd', () => {
    const inputs = { ...baseInputs, gmd: 0 };
    const result = calculateCattleProfit(inputs);
    expect(result.diasPermanencia).toBe(Infinity);
  });

  it('should calculate custoPorArrobaProduzida correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // custoOperacional / arrobasProduzidas
    expect(result.custoPorArrobaProduzida).toBeGreaterThan(140);
    expect(result.custoPorArrobaProduzida).toBeLessThan(150);
  });

  it('should calculate custoPorArrobaFinal correctly', () => {
    const result = calculateCattleProfit(baseInputs);
    // custoTotal / pesoFinalArrobas
    expect(result.custoPorArrobaFinal).toBeGreaterThan(300);
    expect(result.custoPorArrobaFinal).toBeLessThan(320);
  });
});

