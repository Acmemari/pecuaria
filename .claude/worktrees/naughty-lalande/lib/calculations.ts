/**
 * Calcula a TIR Mensal (Taxa Interna de Retorno) usando Newton-Raphson
 * para suportar períodos fracionados e fluxos mensais constantes.
 */
export function calculateLivestockIRR(
  purchaseWeight: number,
  purchasePrice: number,
  monthlyCost: number,
  salesValue: number,
  permanenceMonths: number,
): number {
  const investment = purchaseWeight * purchasePrice; // Saída no t=0
  const totalRevenue = salesValue; // Entrada no final

  // Se não há período de permanência, retorna 0
  if (permanenceMonths <= 0) return 0;

  // Função de VPL (NPV) para uma dada taxa r
  const npv = (rate: number) => {
    let value = -investment;

    // Deduzir custos mensais trazidos a valor presente
    // Assumindo custos pagos ao final de cada mês completo e fração no final
    for (let t = 1; t <= Math.floor(permanenceMonths); t++) {
      value -= monthlyCost / Math.pow(1 + rate, t);
    }

    // Custo do período fracionado final (se houver)
    const fraction = permanenceMonths - Math.floor(permanenceMonths);
    if (fraction > 0) {
      // Custo proporcional ao tempo restante, descontado no tempo final
      value -= (monthlyCost * fraction) / Math.pow(1 + rate, permanenceMonths);
    }

    // Adicionar Receita Final trazida a valor presente
    value += totalRevenue / Math.pow(1 + rate, permanenceMonths);

    return value;
  };

  // Derivada do VPL para Newton-Raphson (dVPL/dr)
  const dNpv = (rate: number) => {
    let derivative = 0;

    // Derivada do termo constante (investimento) é 0, calculamos os fluxos:
    // d/dr [C * (1+r)^-t] = C * -t * (1+r)^(-t-1)

    for (let t = 1; t <= Math.floor(permanenceMonths); t++) {
      derivative -= (-t * monthlyCost) / Math.pow(1 + rate, t + 1);
    }

    const fraction = permanenceMonths - Math.floor(permanenceMonths);
    if (fraction > 0) {
      derivative -= (-permanenceMonths * (monthlyCost * fraction)) / Math.pow(1 + rate, permanenceMonths + 1);
    }

    derivative += (-permanenceMonths * totalRevenue) / Math.pow(1 + rate, permanenceMonths + 1);

    return derivative;
  };

  // Execução do Método de Newton-Raphson
  let rate = 0.01; // Chute inicial (1% a.m)
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    const y = npv(rate);
    const yPrime = dNpv(rate);

    if (Math.abs(yPrime) < tolerance) break; // Evitar divisão por zero

    const newRate = rate - y / yPrime;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Retorna em porcentagem (ex: 1.5 para 1.5%)
    }
    rate = newRate;
  }

  return rate * 100;
}

/**
 * Converte uma taxa mensal percentual para uma taxa anual percentual.
 * Utiliza regime de juros compostos (taxa efetiva).
 * @param monthlyRatePercent - A taxa mensal em formato percentual (ex: 0.74 para 0.74%)
 * @returns A taxa anual em formato percentual (ex: 9.26 para 9.26%)
 */
export function convertMonthlyToAnnualRate(monthlyRatePercent: number): number {
  if (monthlyRatePercent === 0) return 0;

  // 1. Converte de porcentagem para decimal (ex: 0.74 -> 0.0074)
  const decimalRate = monthlyRatePercent / 100;

  // 2. Aplica a fórmula de juros compostos: (1 + i)^12 - 1
  const annualDecimal = Math.pow(1 + decimalRate, 12) - 1;

  // 3. Converte de volta para porcentagem
  return annualDecimal * 100;
}
