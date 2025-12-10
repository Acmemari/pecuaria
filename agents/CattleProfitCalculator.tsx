import React, { useState, useEffect, useMemo } from 'react';
import Slider from '../components/Slider';
import ResultCard from '../components/ResultCard';
import { CattleCalculatorInputs, CalculationResults } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { SlidersHorizontal, PieChart as PieIcon, BarChart3, Save } from 'lucide-react';
import SaveScenarioModal from '../components/SaveScenarioModal';
import { saveScenario } from '../lib/scenarios';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/Toast';

interface CattleProfitCalculatorProps {
  initialInputs?: CattleCalculatorInputs;
  onToast?: (toast: Toast) => void;
  onNavigateToSaved?: () => void;
}

/**
 * Calcula a TIR Mensal (Taxa Interna de Retorno) usando Newton-Raphson
 * para suportar períodos fracionados e fluxos mensais constantes.
 */
function calculateLivestockIRR(
  purchaseWeight: number,
  purchasePrice: number,
  monthlyCost: number,
  salesValue: number,
  permanenceMonths: number
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
        derivative -= (-(permanenceMonths) * (monthlyCost * fraction)) / Math.pow(1 + rate, permanenceMonths + 1);
    }

    derivative += (-(permanenceMonths) * totalRevenue) / Math.pow(1 + rate, permanenceMonths + 1);
    
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

const CattleProfitCalculator: React.FC<CattleProfitCalculatorProps> = ({ initialInputs, onToast, onNavigateToSaved }) => {
  const { user } = useAuth();
  // Initial state based on the PDF Page 8 Ranges
  const [inputs, setInputs] = useState<CattleCalculatorInputs>(
    initialInputs || {
      pesoCompra: 200,        // 1. Peso de compra (kg)
      valorCompra: 14.50,     // 2. Valor de compra (R$/kg)
      pesoAbate: 360,         // 3. Peso vivo ao abate (kg)
      rendimentoCarcaca: 54.5,  // 4. Rendimento de carcaça (%)
      valorVenda: 300,        // 5. Valor de venda (R$ por arroba)
      gmd: 0.65,              // 6. Ganho médio diário – GMD (kg/dia)
      custoMensal: 135        // 7. Desembolso por cabeça ao mês (R$/cab/mês)
    }
  );

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Rastrear se algum dos indicadores interdependentes foi alterado
  const [isInterdependentChanged, setIsInterdependentChanged] = useState(false);
  
  // Rastrear se GMD foi alterado (para destacar Desembolso)
  const [isGmdChanged, setIsGmdChanged] = useState(false);

  // Update inputs when initialInputs changes
  useEffect(() => {
    if (initialInputs) {
      setInputs(initialInputs);
    }
  }, [initialInputs]);

  // Constants
  const ARROBA_KG = 15;
  const YIELD_PURCHASE = 50;

  const handleInputChange = (key: keyof CattleCalculatorInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    
    // Se alterar pesoCompra, valorCompra ou gmd, marcar como interdependente alterado
    // Se alterar qualquer outro indicador, voltar ao estado original (borda azul)
    if (key === 'pesoCompra' || key === 'valorCompra' || key === 'gmd') {
      setIsInterdependentChanged(true);
    } else {
      setIsInterdependentChanged(false);
    }
    
    // Se alterar GMD, destacar também o Desembolso com cor diferente
    if (key === 'gmd') {
      setIsGmdChanged(true);
    } else {
      setIsGmdChanged(false);
    }
  };

  useEffect(() => {
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

    // Cálculo da TIR Mensal usando Newton-Raphson
    const resultadoMensal = calculateLivestockIRR(
      inputs.pesoCompra,
      inputs.valorCompra,
      inputs.custoMensal,
      valorBoi,
      mesesPermanencia
    );

    // TIR Anualizada: (1 + TIR_mensal)^12 - 1
    const resultadoAnual = mesesPermanencia > 0 
      ? (Math.pow(1 + resultadoMensal / 100, 12) - 1) * 100 
      : 0;

    const custoPorArrobaProduzida = arrobasProduzidas > 0 ? custoOperacional / arrobasProduzidas : 0;
    const custoPorArrobaFinal = pesoFinalArrobas > 0 ? custoTotal / pesoFinalArrobas : 0;

    setResults({
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
    });
  }, [inputs]);

  const costBreakdownData = useMemo(() => {
    if (!results) return [];
    return [
      { name: 'Compra', value: results.custoCompra, color: '#9CA3AF' },
      { name: 'Operacional', value: results.custoOperacional, color: '#4B5563' },
      { name: 'Lucro', value: Math.max(0, results.resultadoPorBoi), color: '#1A73E8' }
    ];
  }, [results]);

  const sensitivityData = useMemo(() => {
    if (!results) return [];
    const variations = [-0.2, -0.1, 0, 0.1, 0.2];
    return variations.map(v => {
      const gmdSim = inputs.gmd + v;
      if (gmdSim <= 0) return { gmd: 'N/A', lucro: 0 };
      const wGain = inputs.pesoAbate - inputs.pesoCompra;
      const days = wGain / gmdSim;
      const months = days / 30;
      const opCost = months * inputs.custoMensal;
      const totalC = results.custoCompra + opCost;
      const profit = results.valorBoi - totalC;
      return { name: gmdSim.toFixed(2), lucro: Math.round(profit) };
    });
  }, [inputs, results]);

  const handleSave = async (name: string) => {
    if (!user || !results) return;

    setIsSaving(true);
    try {
      await saveScenario(user.id, name, inputs, results);
      setIsSaveModalOpen(false);
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          message: 'Cenário salvo com sucesso!',
          type: 'success'
        });
      }
      // Navigate to saved scenarios page after successful save
      if (onNavigateToSaved) {
        onNavigateToSaved();
      }
    } catch (error: any) {
      if (onToast) {
        onToast({
          id: Date.now().toString(),
          message: error.message || 'Erro ao salvar cenário',
          type: 'error'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!results) return <div className="p-4 md:p-10 text-center">Calculando...</div>;

  return (
    <>
      <div className="h-full flex flex-col md:flex-row gap-2 md:gap-4">

        {/* Left Column: Inputs - Full width on mobile, fixed width on desktop */}
        <div className="w-full md:w-[300px] flex flex-col shrink-0 md:h-full overflow-hidden">
          <div className="mb-2 md:mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-ai-subtext" />
              <h2 className="text-sm font-semibold text-ai-text">Premissas</h2>
            </div>
            {user && (
              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="p-1.5 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface rounded transition-colors"
                title="Salvar cenário"
              >
                <Save size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-1 overflow-y-auto md:overflow-visible md:pr-1 pb-1 gap-1.5">
            <Slider 
              index={1} 
              label="Peso de Compra" 
              value={inputs.pesoCompra} 
              min={150} 
              max={420} 
              step={1} 
              unit="kg" 
              onChange={(v) => handleInputChange('pesoCompra', v)} 
              highlightBorder={isInterdependentChanged}
              description="O que é: É o peso de entrada do animal no sistema (Bezerro(a), garrote, novilha, boi magro). Refere-se ao peso vivo do animal no momento da aquisição ou início do ciclo produtivo."
            />
            <Slider 
              index={2} 
              label="Valor de Compra" 
              value={inputs.valorCompra} 
              min={11} 
              max={18} 
              step={0.05} 
              unit="R$/kg" 
              onChange={(v) => handleInputChange('valorCompra', v)} 
              highlightBorder={isInterdependentChanged}
              description="O que é: O custo de aquisição por quilograma de peso vivo. Define o investimento inicial necessário para comprar o gado já incluindo frete e comissão."
            />
            <Slider 
              index={3} 
              label="Peso Vivo Abate" 
              value={inputs.pesoAbate} 
              min={Math.max(350, inputs.pesoCompra + 10)} 
              max={630} 
              step={1} 
              unit="kg" 
              onChange={(v) => handleInputChange('pesoAbate', v)}
              description="O que é: A meta de peso final do animal vivo no momento da saída da fazenda para o frigorífico."
            />
            <Slider 
              index={4} 
              label="Rend. Carcaça" 
              value={inputs.rendimentoCarcaca} 
              min={46} 
              max={58} 
              step={0.5} 
              unit="%" 
              onChange={(v) => handleInputChange('rendimentoCarcaca', v)}
              description="O que é: O Rendimento de Carcaça é a eficiência industrial. Representa a porcentagem do peso vivo que efetivamente se converte em carne (carcaça) após o abate e limpeza do animal."
            />
            <Slider 
              index={5} 
              label="Valor Venda" 
              value={inputs.valorVenda} 
              min={250} 
              max={350} 
              step={1} 
              unit="R$/@" 
              onChange={(v) => handleInputChange('valorVenda', v)}
              description="O que é: O preço de venda por Arroba (@ = 15kg de carcaça)."
            />
            <Slider 
              index={6} 
              label="GMD (Ganho Médio Diário)" 
              value={inputs.gmd} 
              min={0.38} 
              max={1.1} 
              step={0.01} 
              unit="kg/dia" 
              onChange={(v) => handleInputChange('gmd', v)} 
              highlightBorder={isInterdependentChanged}
              description="O que é: Ganho Médio Diário. É a velocidade de ganho de peso. Indica quantos quilos o animal engorda por dia na média de todo o período."
            />
            <Slider 
              index={7} 
              label="Desembolso/Cab/Mês" 
              value={inputs.custoMensal} 
              min={50} 
              max={220} 
              step={1} 
              unit="R$/mês" 
              onChange={(v) => handleInputChange('custoMensal', v)}
              highlightBorder={isGmdChanged}
              highlightColor="#DAA520"
              description="O que é: É o desembolso total (custeios + investimentos) por cabeça/mês. Inclui nutrição (pasto/suplemento/ração), sanidade, mão de obra e custos fixos rateados. Apenas valor de aquisição do animal e pagamento de financiamentos não entram na conta. É utilizado o desembolso para que o foco seja na capacidade de geração de caixa e não no lucro contábil."
            />
          </div>
        </div>

        {/* Right Column: Dashboard Grid */}
        <div className="flex-1 flex flex-col md:h-full overflow-hidden min-h-0">

          {/* Results Grid - Responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 auto-rows-fr md:h-[60%] mb-2 md:mb-3">

            {/* Row 1 - Profit Metrics */}
            <ResultCard label="1. Resultado por Boi" value={`R$ ${results.resultadoPorBoi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight color={results.resultadoPorBoi >= 0 ? 'positive' : 'negative'} description="Lucro ou prejuízo líquido por animal. É a diferença entre o valor de venda e todos os custos (compra + operacional)." />
            <ResultCard label="2. TIR Mensal" value={`${results.resultadoMensal.toFixed(2)}% a.m.`} description="Taxa Interna de Retorno mensal. Indica o rendimento percentual do capital investido por mês de operação." />
            <ResultCard label="3. Result./Ano" value={`${results.resultadoAnual.toFixed(2)}% a.a.`} description="Resultado anualizado. É a TIR mensal multiplicada por 12, permitindo comparar com outras aplicações financeiras." />
            <ResultCard label="4. Margem %" value={`${results.margemVenda.toFixed(2)}%`} color={results.margemVenda >= 0 ? 'positive' : 'negative'} description="Margem sobre o preço de venda. Indica quanto do valor de venda representa lucro após deduzir todos os custos." />

            {/* Row 2 - Value and Costs */}
            <ResultCard label="5. Valor de Venda" value={`R$ ${results.valorBoi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight color="neutral" description="Receita bruta por animal. É o peso final em arrobas multiplicado pelo preço de venda por arroba." />
            <ResultCard label="6. Desemb. Total" value={`R$ ${results.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} description="Desembolso total por animal. Soma do custo de aquisição mais todos os custos operacionais do período." />
            <ResultCard label="7. Desemb./@ Produzida" value={`R$ ${results.custoPorArrobaProduzida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} description="Custo operacional dividido pelas arrobas produzidas. Indica a eficiência na produção de carne." />
            <ResultCard label="8. Desemb./@ Final" value={`R$ ${results.custoPorArrobaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} description="Desembolso total dividido pelo peso final em arrobas. É o custo médio por arroba do animal pronto." />

            {/* Row 3 - Physical Metrics */}
            <ResultCard label="9. Peso Final" subLabel="arrobas" value={`${results.pesoFinalArrobas.toFixed(2)} @`} description="Peso do animal ao abate convertido em arrobas, considerando o rendimento de carcaça." />
            <ResultCard label="10. Arrobas Produzidas" value={`${results.arrobasProduzidas.toFixed(2)} @`} description="Diferença entre o peso final e o peso de entrada, ambos em arrobas. Representa a produção de carne." />
            <ResultCard label="11. Permanência" subLabel="dias" value={`${results.diasPermanencia.toFixed(0)} dias`} description="Tempo necessário para o animal ganhar o peso desejado, calculado com base no GMD." />
            <ResultCard label="12. Permanência" subLabel="meses" value={`${results.mesesPermanencia.toFixed(1)} meses`} description="Tempo de permanência convertido em meses para facilitar o planejamento do ciclo produtivo." />
          </div>

          {/* Charts Row - Stack vertical on mobile, horizontal on desktop */}
          <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-3 min-h-[400px] md:min-h-0">
            {/* Chart 1: Breakdown */}
            <div className="bg-white rounded-lg border border-ai-border/60 p-3 flex flex-col sm:flex-row items-center relative min-h-[200px] md:min-h-0">
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <PieIcon size={14} className="text-ai-subtext" />
                <span className="text-[10px] font-bold uppercase text-ai-subtext">Composição</span>
              </div>
              <div className="w-full sm:w-1/2 h-full mt-6 sm:mt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                      {costBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} contentStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 flex flex-row sm:flex-col justify-center gap-2 sm:gap-2 text-[10px] text-ai-subtext mt-2 sm:mt-0">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div>Compra</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-600"></div>Operacional</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600"></div>Lucro</div>
              </div>
            </div>

            {/* Chart 2: Sensitivity */}
            <div className="bg-white rounded-lg border border-ai-border/60 p-3 flex flex-col relative min-h-[200px] md:min-h-0">
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <BarChart3 size={14} className="text-ai-subtext" />
                <span className="text-[10px] font-bold uppercase text-ai-subtext">Sensibilidade (GMD)</span>
              </div>
              <div className="flex-1 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sensitivityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} stroke="#9CA3AF" tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="lucro" fill="#1A73E8" radius={[2, 2, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Save Modal */}
      {user && (
        <SaveScenarioModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSave}
          inputs={inputs}
          isLoading={isSaving}
        />
      )}
    </>
  );
};

export default CattleProfitCalculator;