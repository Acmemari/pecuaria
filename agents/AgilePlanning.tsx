import React, { useState, useEffect, useCallback } from 'react';
import { useClient } from '../contexts/ClientContext';
import { useAuth } from '../contexts/AuthContext';
import { Farm } from '../types';
import { supabase } from '../lib/supabase';
import { Building2, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Edit3, X } from 'lucide-react';
import ClientSelector from '../components/ClientSelector';
import FarmSelector from '../components/FarmSelector';

// Função auxiliar para formatar valores monetários
const formatCurrency = (value: number | undefined): string => {
  if (!value || value === 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Função auxiliar para formatar áreas
const formatArea = (value: number | undefined): string => {
  if (!value || value === 0) return '0 ha';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
};

interface AgilePlanningProps {
  selectedFarm: Farm | null;
  onSelectFarm: (farm: Farm | null) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const AgilePlanning: React.FC<AgilePlanningProps> = ({ selectedFarm, onSelectFarm, onToast }) => {
  const { user } = useAuth();
  const { selectedClient, setSelectedClient } = useClient();
  const [isLoading, setIsLoading] = useState(true);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [tempSelectedClient, setTempSelectedClient] = useState<any>(null);
  const [tempSelectedFarm, setTempSelectedFarm] = useState<Farm | null>(null);
  const [percentage, setPercentage] = useState(4); // Valor padrão em 4%
  const [productionSystem, setProductionSystem] = useState<Farm['productionSystem'] | ''>(''); // Sistema de produção
  const [expectedMargin, setExpectedMargin] = useState(40); // Margem esperada (será ajustada conforme sistema)

  // Interface para categorias de animais
  interface AnimalCategory {
    id: string;
    name: string;
    percentage: number;
    weight: number | undefined;
    valuePerKg: number | undefined;
    quantity?: number;
  }

  // Função para obter percentuais iniciais baseados no sistema de produção
  const getInitialPercentages = (system: Farm['productionSystem'] | ''): Record<string, number> => {
    switch (system) {
      case 'Cria':
        return {
          '1': 50,  // Bezerro Macho
          '2': 0,   // Bezerra Desm.
          '3': 0,   // Garrote
          '4': 17,  // Novilha
          '5': 0,   // Boi Gordo
          '6': 33,  // Vaca Descarte
          '7': 0,   // Touro Descarte
        };
      case 'Ciclo Completo':
        return {
          '1': 5,   // Bezerro
          '2': 5,   // Bezerra
          '3': 0,   // Garrote
          '4': 12,  // Novilha
          '5': 45,  // Boi
          '6': 33,  // Vaca Descarte
          '7': 0,   // Touro Descarte
        };
      case 'Recria-Engorda':
        return {
          '1': 0,   // Bezerro Desm.
          '2': 0,   // Bezerra Desm.
          '3': 0,   // Garrote
          '4': 0,   // Novilha
          '5': 100, // Boi
          '6': 0,   // Vaca Descarte
          '7': 0,   // Touro Descarte
        };
      default:
        return {
          '1': 50,  // Bezerro Desm.
          '2': 0,   // Bezerra Desm.
          '3': 0,   // Garrote
          '4': 17,  // Novilha
          '5': 0,   // Boi Gordo
          '6': 33,  // Vaca Descarte
          '7': 0,   // Touro Descarte
        };
    }
  };

  // Estado para categorias de animais - lista fixa
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>([
    { id: '1', name: 'Bezerro Desm.', percentage: 50, weight: 200, valuePerKg: 14 },
    { id: '2', name: 'Bezerra Desm.', percentage: 0, weight: 200, valuePerKg: 12 },
    { id: '3', name: 'Garrote', percentage: 0, weight: 20, valuePerKg: 300 },
    { id: '4', name: 'Novilha', percentage: 17, weight: 13, valuePerKg: 290 },
    { id: '5', name: 'Boi Gordo', percentage: 0, weight: 24, valuePerKg: 270 },
    { id: '6', name: 'Vaca Descarte', percentage: 33, weight: 13, valuePerKg: 320 },
    { id: '7', name: 'Touro Descarte', percentage: 0, weight: 15, valuePerKg: 280 },
  ]);

  // Handle adding a new category
  const handleAddCategory = () => {
    const newId = (Math.max(...animalCategories.map(c => parseInt(c.id))) + 1).toString();
    const newCategory: AnimalCategory = {
      id: newId,
      name: 'Nova Categoria',
      percentage: 0,
      weight: 0,
      valuePerKg: 0
    };
    setAnimalCategories([...animalCategories, newCategory]);
  };

  // Handle deleting a category
  const handleDeleteCategory = (id: string) => {
    const updatedCategories = animalCategories.filter(c => c.id !== id);
    setAnimalCategories(updatedCategories);
  };

  // State for tracking focused input to manage "dirty" typing state vs "clean" formatted state
  const [editingCell, setEditingCell] = useState<{ id: string, field: keyof AnimalCategory } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  
  // State for modal visibility
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fechar modal com ESC e bloquear scroll do body
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    
    if (isModalOpen) {
      // Bloqueia scroll do body quando modal aberto
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      // Restaura scroll quando modal fechado
      document.body.style.overflow = '';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Handle input focus (start with empty temp value for fluid typing - "overwrite" feel)
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>, id: string, field: keyof AnimalCategory, value: number | undefined) => {
    setEditingCell({ id, field });
    setTempValue(''); // Start empty to fulfill "apague o numero anterior"
    // e.target.select(); // Optional, but empty string selection is no-op
  };

  // Handle input blur (commit changes and clear edit state is automatic via normal flow, just clear edit tracker)
  const handleInputBlur = () => {
    setEditingCell(null);
    setTempValue('');
  };

  // Handle numeric input change (update temp value AND parent state)
  const handleNumericChange = (id: string, field: keyof AnimalCategory, rawValue: string) => {
    // Allows dot to act as comma for decimal separator
    const treatedValue = rawValue.replace(/\./g, ',');
    setTempValue(treatedValue); // Always update temp display to match user typing

    // Remove everything except digits and comma
    let cleaned = treatedValue.replace(/[^\d,]/g, '');

    // Allow only one comma
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }

    // If empty, set to undefined (or 0 for required fields) 
    if (cleaned === '') {
      if (field === 'percentage') {
        updateCategory(id, field as any, 0);
      } else {
        updateCategory(id, field as any, undefined);
      }
      return;
    }

    // Parse for state
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);

    if (!isNaN(parsed)) {
      updateCategory(id, field as any, parsed);
    }
  };

  // Handle ESC key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  // Funções auxiliares para formatar e parsear números com vírgula
  const formatNumberWithComma = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    // Sempre mostra uma casa decimal
    return value.toFixed(1).replace('.', ',');
  };

  const parseNumberFromComma = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Remove pontos (separador de milhares) e substitui vírgula por ponto
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Validar e formatar entrada numérica (até 3 dígitos antes da vírgula, 1 após)
  const handleNumericInput = (value: string, currentValue: number, callback: (value: number) => void) => {
    // Remove tudo exceto números, vírgula e ponto
    let cleaned = value.replace(/[^\d,.]/g, '');

    // Substitui ponto por vírgula (padrão brasileiro)
    cleaned = cleaned.replace(/\./g, ',');

    // Permite apenas uma vírgula
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      const beforeComma = cleaned.substring(0, commaIndex);
      const afterComma = cleaned.substring(commaIndex + 1).replace(/,/g, '');

      // Limita a 3 dígitos antes da vírgula
      const limitedBefore = beforeComma.slice(0, 3);
      // Limita a 1 dígito após a vírgula
      const limitedAfter = afterComma.slice(0, 1);

      // Monta o valor formatado
      cleaned = limitedBefore + ',' + limitedAfter;
    } else {
      // Sem vírgula, limita a 3 dígitos
      cleaned = cleaned.slice(0, 3);
    }

    // Atualiza o valor
    const parsed = parseNumberFromComma(cleaned);
    callback(parsed);
  };

  // Calcular valor por cabeça: peso × valor/kg
  const calculateValuePerHead = (category: AnimalCategory): number => {
    return (category.weight || 0) * (category.valuePerKg || 0);
  };

  // Calcular valor médio: soma de (% × Valor/cab) para todas as categorias
  const calculateAverageValue = (): number => {
    return animalCategories.reduce((sum, category) => {
      const valuePerHead = calculateValuePerHead(category);
      return sum + (category.percentage / 100) * valuePerHead;
    }, 0);
  };

  // Calcular vendas necessárias
  const calculateRequiredSales = (): number => {
    if (!isPercentageSumValid()) return 0;
    
    const averageValue = calculateAverageValue();
    const calculatedValue = selectedFarm && (selectedFarm as any).operationPecuary
      ? (percentage / 100) * (selectedFarm as any).operationPecuary
      : 0;
    const requiredRevenue = expectedMargin > 0 && productionSystem
      ? calculatedValue / (expectedMargin / 100)
      : 0;

    if (averageValue > 0 && requiredRevenue > 0) {
      return Math.round(requiredRevenue / averageValue);
    }
    return 0;
  };

  // Calcular quantidade para uma categoria: Vendas necessárias × %
  const calculateQuantity = (categoryPercentage: number): number => {
    const requiredSales = calculateRequiredSales();
    if (requiredSales === 0 || !isPercentageSumValid()) return 0;
    return Math.round((requiredSales * categoryPercentage) / 100);
  };

  // Atualizar categoria
  const updateCategory = (id: string, field: keyof AnimalCategory, value: number | string | undefined) => {
    setAnimalCategories(prev => {
      const updated = prev.map(cat =>
        cat.id === id ? { ...cat, [field]: value } : cat
      );

      return updated;
    });
  };

  // Calcular se a soma dos percentuais é 100%
  const isPercentageSumValid = (): boolean => {
    const total = animalCategories.reduce((sum, cat) => sum + cat.percentage, 0);
    return Math.abs(total - 100) < 0.01;
  };

  // Função para obter os valores de margem esperada baseado no sistema de produção
  const getMarginConfig = useCallback((system: Farm['productionSystem'] | '') => {
    switch (system) {
      case 'Cria':
        return { min: 30, max: 50, default: 40 };
      case 'Ciclo Completo':
        return { min: 22, max: 37, default: 30 };
      case 'Recria-Engorda':
        return { min: 10, max: 30, default: 20 };
      default:
        return { min: 10, max: 50, default: 30 };
    }
  }, []);

  useEffect(() => {
    // Verificar se há cliente e fazenda selecionados
    if (selectedClient && selectedFarm) {
      setIsLoading(false);
      setShowSelectionModal(false);
      // Inicializar sistema de produção com o valor da fazenda
      if (selectedFarm.productionSystem) {
        setProductionSystem(selectedFarm.productionSystem);
      } else {
        setProductionSystem('');
      }
    } else {
      // Se não houver, mostrar modal de seleção
      setIsLoading(false);
      setShowSelectionModal(true);
      loadClients();
    }
  }, [selectedClient, selectedFarm]);

  // Atualizar apenas os percentuais quando o sistema de produção mudar
  useEffect(() => {
    if (productionSystem) {
      const initialPercentages = getInitialPercentages(productionSystem);
      setAnimalCategories(prev => {
        return prev.map(cat => ({
          ...cat,
          percentage: initialPercentages[cat.id] !== undefined ? initialPercentages[cat.id] : cat.percentage
        }));
      });
    }
  }, [productionSystem]);

  // Atualizar margem esperada quando o sistema de produção mudar
  useEffect(() => {
    const config = getMarginConfig(productionSystem);
    setExpectedMargin(config.default);
  }, [productionSystem, getMarginConfig]);

  const loadClients = async () => {
    try {
      let query = supabase
        .from('clients')
        .select('*');
      
      // Filtrar por analista: se for analista, mostrar apenas seus clientes; se for admin, mostrar todos
      if (user?.qualification === 'analista' && user?.role !== 'admin') {
        // Analista vê apenas seus próprios clientes
        query = query.eq('analyst_id', user.id);
      }
      // Admin vê todos os clientes (sem filtro)
      
      query = query.order('name', { ascending: true });
      
      const { data, error } = await query;

      if (error) {
        console.error('[AgilePlanning] Error loading clients:', error);
        return;
      }

      if (data) {
        const mappedClients = data.map((client: any) => ({
          id: client.id,
          name: client.name,
          phone: client.phone || '',
          email: client.email,
          analystId: client.analyst_id,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));
        
        setClients(mappedClients);
        if (mappedClients.length > 0 && !tempSelectedClient) {
          setTempSelectedClient(mappedClients[0]);
        }
      }
    } catch (err: any) {
      console.error('[AgilePlanning] Unexpected error:', err);
    }
  };

  const loadFarmsForClient = async (clientId: string) => {
    try {
      // Carregar fazendas do localStorage
      const storedFarms = localStorage.getItem('agro-farms');
      let allFarms: Farm[] = [];
      
      if (storedFarms) {
        try {
          allFarms = JSON.parse(storedFarms) || [];
        } catch (e) {
          console.error('[AgilePlanning] Error parsing farms from localStorage:', e);
        }
      }

      // Buscar fazendas vinculadas ao cliente
      const { data: clientFarmsData, error } = await supabase
        .from('client_farms')
        .select('farm_id')
        .eq('client_id', clientId);

      if (error) {
        console.error('[AgilePlanning] Error loading client farms:', error);
        setFarms([]);
        return;
      }

      if (clientFarmsData && allFarms.length > 0) {
        const farmIds = clientFarmsData.map(cf => cf.farm_id);
        const farmsForClient = allFarms.filter(farm => farmIds.includes(farm.id));
        setFarms(farmsForClient);
        
        if (farmsForClient.length > 0 && !tempSelectedFarm) {
          setTempSelectedFarm(farmsForClient[0]);
        }
      } else {
        setFarms([]);
      }
    } catch (err: any) {
      console.error('[AgilePlanning] Unexpected error:', err);
      setFarms([]);
    }
  };

  useEffect(() => {
    if (tempSelectedClient) {
      loadFarmsForClient(tempSelectedClient.id);
    }
  }, [tempSelectedClient]);

  const handleConfirmSelection = () => {
    if (tempSelectedClient && tempSelectedFarm) {
      setSelectedClient(tempSelectedClient);
      onSelectFarm(tempSelectedFarm);
      setShowSelectionModal(false);
      onToast?.('Cliente e fazenda selecionados com sucesso!', 'success');
    } else {
      onToast?.('Por favor, selecione um cliente e uma fazenda', 'warning');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ai-accent" />
      </div>
    );
  }

  // Modal de seleção de cliente e fazenda
  if (showSelectionModal) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-ai-bg">
        <div className="bg-white rounded-lg border border-ai-border shadow-lg p-6 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-ai-accent/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-ai-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ai-text">Seleção Necessária</h2>
              <p className="text-sm text-ai-subtext">
                Para acessar o Planejamento Ágil, é necessário selecionar um cliente e uma fazenda.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Seletor de Cliente */}
            <div>
              <label className="block text-sm font-medium text-ai-text mb-2">
                Cliente <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={tempSelectedClient?.id || ''}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value);
                    setTempSelectedClient(client || null);
                    setTempSelectedFarm(null);
                  }}
                  className="w-full px-4 py-2 bg-ai-surface2 border border-ai-border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seletor de Fazenda */}
            {tempSelectedClient && (
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Fazenda <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {farms.length === 0 ? (
                    <div className="px-4 py-2 bg-ai-surface2 border border-ai-border rounded-md text-ai-subtext">
                      Nenhuma fazenda vinculada a este cliente
                    </div>
                  ) : (
                    <select
                      value={tempSelectedFarm?.id || ''}
                      onChange={(e) => {
                        const farm = farms.find(f => f.id === e.target.value);
                        setTempSelectedFarm(farm || null);
                      }}
                      className="w-full px-4 py-2 bg-ai-surface2 border border-ai-border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                    >
                      <option value="">Selecione uma fazenda</option>
                      {farms.map((farm) => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name} - {farm.city}, {farm.state}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4 border-t border-ai-border">
              <button
                onClick={handleConfirmSelection}
                disabled={!tempSelectedClient || !tempSelectedFarm}
                className="flex-1 px-4 py-2 bg-ai-accent text-white rounded-md font-medium hover:bg-ai-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela principal do Planejamento Ágil
  return (
    <div className="h-full flex flex-col p-6 bg-ai-bg">
      {/* Header - Sistema de Produção e Informações da Fazenda */}
      <div className="mb-6">
        <div className="flex items-center gap-4 text-sm text-ai-subtext overflow-x-auto overflow-y-visible">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Building2 size={16} />
            <span className="whitespace-nowrap">Fazenda: <strong className="text-ai-text">{selectedFarm?.name}</strong></span>
          </div>

          {/* Sistema de Produção */}
          {selectedFarm && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-ai-subtext text-sm whitespace-nowrap">Sistema de Produção:</label>
              <select
                value={productionSystem}
                onChange={(e) => setProductionSystem(e.target.value as Farm['productionSystem'] | '')}
                className="px-3 py-1.5 bg-ai-surface2 border border-ai-border rounded-md text-ai-text text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent min-w-[180px] flex-shrink-0"
              >
                <option value="">Selecione...</option>
                <option value="Cria">Cria</option>
                <option value="Ciclo Completo">Ciclo Completo</option>
                <option value="Recria-Engorda">Recria-Engorda</option>
              </select>
            </div>
          )}

          {/* Informações da Fazenda */}
          {selectedFarm && (
            <div className="flex items-start gap-3 pl-3 border-l border-ai-border flex-shrink-0 min-w-0">
              {/* Valor Total da Fazenda */}
              {(selectedFarm as any).propertyValue && (
                <div className="flex flex-col gap-0.5 whitespace-nowrap">
                  <span className="text-ai-subtext text-xs">Valor Total</span>
                  <span className="font-semibold text-ai-text text-sm">
                    {formatCurrency((selectedFarm as any).propertyValue)}
                  </span>
                </div>
              )}

              {/* Valor Operação Pecuária */}
              {(selectedFarm as any).operationPecuary && (
                <>
                  <div className="h-8 w-px bg-ai-border flex-shrink-0 self-stretch" />
                  <div className="flex flex-col gap-0.5 whitespace-nowrap">
                    <span className="text-ai-subtext text-xs">Op. Pecuária</span>
                    <span className="font-semibold text-ai-text text-sm">
                      {formatCurrency((selectedFarm as any).operationPecuary)}
                    </span>
                  </div>
                </>
              )}

              {/* Área Produtiva Pecuária */}
              {selectedFarm.pastureArea && (
                <>
                  <div className="h-8 w-px bg-ai-border flex-shrink-0 self-stretch" />
                  <div className="flex flex-col gap-0.5 whitespace-nowrap flex-shrink-0 min-w-fit">
                    <span className="text-ai-subtext text-xs">Área Pecuária</span>
                    <span className="font-semibold text-ai-text text-sm">
                      {formatArea(selectedFarm.pastureArea)}
                    </span>
          </div>
                </>
              )}
          </div>
          )}
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 bg-white rounded-lg border border-ai-border p-4">
        <div className="max-w-6xl mx-auto">
          {/* Barras de Deslizamento com Valores ao Lado */}
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Barra de Percentual de Investimento com Valor Calculado */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-ai-text mb-1.5">
                    Percentual de Investimento
                  </label>
                  <div className="relative pt-4 pb-1.5">
                    {/* Track */}
                    <div className="relative h-1.5 bg-gray-200 rounded-full overflow-visible">
                      {/* Área destacada (4% a 9%) */}
                      <div
                        className="absolute top-0 bottom-0 bg-blue-300/40 rounded-full border-l border-r border-blue-500"
                        style={{
                          left: `${((4 - 2) / (11 - 2)) * 100}%`,
                          width: `${((9 - 4) / (11 - 2)) * 100}%`
                        }}
                      />

                      {/* Marcadores reduzidos */}
                      <div className="absolute -top-3 left-0 right-0 flex justify-between px-0.5">
                        {[2, 4, 6, 8, 10, 11].map((val) => (
                          <div key={val} className="flex flex-col items-center">
                            <div className={`w-0.5 h-0.5 ${val >= 4 && val <= 9 ? 'bg-blue-500' : 'bg-gray-400'}`} />
                            <span className={`text-[8px] mt-0.5 ${val >= 4 && val <= 9 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                              {val}%
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Input Range */}
                      <input
                        type="range"
                        min={2}
                        max={11}
                        step={0.1}
                        value={percentage}
                        onChange={(e) => setPercentage(parseFloat(e.target.value))}
                        onInput={(e) => setPercentage(parseFloat((e.target as HTMLInputElement).value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
                        style={{ WebkitAppearance: 'none', appearance: 'none' }}
                      />

                      {/* Thumb menor */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full border border-white shadow z-20 pointer-events-none transition-all duration-75"
                        style={{ left: `${((percentage - 2) / (11 - 2)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      >
                        {/* Tooltip menor */}
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap shadow">
                          {percentage.toFixed(1)}%
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-blue-600"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valor Calculado - Compacto */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200 min-w-[140px]">
                  <div className="text-[9px] text-blue-700 mb-0.5 font-medium">Valor Calculado</div>
                  <div className="text-base font-bold text-blue-900 mb-0.5">
                    {selectedFarm && (selectedFarm as any).operationPecuary
                      ? formatCurrency(((percentage / 100) * (selectedFarm as any).operationPecuary))
                      : 'R$ 0,00'}
                  </div>
                  <div className="text-[8px] text-blue-600 bg-blue-50 rounded px-1 py-0.5 border border-blue-200">
                    {percentage.toFixed(1)}% × {selectedFarm && (selectedFarm as any).operationPecuary
                      ? formatCurrency((selectedFarm as any).operationPecuary)
                      : 'R$ 0,00'}
                  </div>
                </div>
              </div>

              {/* Barra de Margem Esperada com Faturamento Necessário */}
              {productionSystem && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-ai-text mb-1.5">
                      Margem Esperada
                    </label>
                    {(() => {
                      const marginConfig = getMarginConfig(productionSystem);
                      const { min, max, default: defaultVal } = marginConfig;
                      const step = 0.5;
                      const range = max - min;
                      const marks = [];
                      for (let i = min; i <= max; i += 5) {
                        marks.push(i);
                      }

                      return (
                        <div className="relative pt-4 pb-1.5">
                          {/* Track */}
                          <div className="relative h-1.5 bg-gray-200 rounded-full overflow-visible">
                            {/* Área destacada */}
                            <div
                              className="absolute top-0 bottom-0 bg-green-300/40 rounded-full"
                              style={{ left: '0%', width: '100%' }}
                            />

                            {/* Marcadores reduzidos */}
                            <div className="absolute -top-3 left-0 right-0 flex justify-between px-0.5">
                              {marks.map((val) => (
                                <div key={val} className="flex flex-col items-center">
                                  <div className="w-0.5 h-0.5 bg-green-500" />
                                  <span className="text-[8px] mt-0.5 text-green-600 font-semibold">
                                    {val}%
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Input Range */}
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={expectedMargin}
                              onChange={(e) => setExpectedMargin(parseFloat(e.target.value))}
                              onInput={(e) => setExpectedMargin(parseFloat((e.target as HTMLInputElement).value))}
                              className="absolute right-0 bottom-0 w-full h-full opacity-0 cursor-pointer z-40"
                              style={{ WebkitAppearance: 'none', appearance: 'none' }}
                            />

                            {/* Thumb menor */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-green-600 rounded-full border border-white shadow z-20 pointer-events-none transition-all duration-75"
                              style={{ left: `${((expectedMargin - min) / range) * 100}%`, transform: 'translate(-50%, -50%)' }}
                            >
                              {/* Tooltip menor */}
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap shadow">
                                {expectedMargin.toFixed(1)}%
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-green-600"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Faturamento Necessário - Compacto */}
                  {(() => {
                    const calculatedValue = selectedFarm && (selectedFarm as any).operationPecuary
                      ? (percentage / 100) * (selectedFarm as any).operationPecuary
                      : 0;
                    const requiredRevenue = expectedMargin > 0
                      ? calculatedValue / (expectedMargin / 100)
                      : 0;

                    return (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 border border-purple-200 min-w-[140px]">
                        <div className="text-[9px] text-purple-700 mb-0.5 font-medium">Faturamento Necessário</div>
                        <div className="text-base font-bold text-purple-900 mb-0.5">
                          {formatCurrency(requiredRevenue)}
                        </div>
                        <div className="text-[8px] text-purple-600 bg-purple-50 rounded px-1 py-0.5 border border-purple-200">
                          {formatCurrency(calculatedValue)} ÷ {expectedMargin.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Valor Médio de Venda */}
          <div className="mb-4">
            <div className="flex items-start gap-4">
              {/* Caixa de Valor Médio */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200 min-w-[180px]">
                <div className="text-[10px] text-orange-700 mb-1 font-medium">Valor Médio de Venda</div>
                {isPercentageSumValid() ? (
                  <>
                    <div className="text-xl font-bold text-orange-900 mb-2">
                      {formatCurrency(calculateAverageValue())}
                    </div>
                    <div className="text-[10px] text-orange-700 mb-1 font-medium">Vendas Necessárias</div>
                    <div className="text-xl font-bold text-orange-900">
                      {(() => {
                        const averageValue = calculateAverageValue();
                        const calculatedValue = selectedFarm && (selectedFarm as any).operationPecuary
                          ? (percentage / 100) * (selectedFarm as any).operationPecuary
                          : 0;
                        const requiredRevenue = expectedMargin > 0 && productionSystem
                          ? calculatedValue / (expectedMargin / 100)
                          : 0;

                        if (averageValue > 0 && requiredRevenue > 0) {
                          const result = Math.round(requiredRevenue / averageValue);
                          return `${result} Cabeças`;
                        }
                        return '-';
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <AlertCircle size={16} />
                    Soma deve ser 100%
                  </div>
                )}
              </div>

              {/* Card Resumo - Abre Modal */}
              <div className="flex-1">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full bg-white rounded-lg border border-ai-border p-4 hover:border-ai-accent hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-ai-text flex items-center gap-2">
                      <Edit3 size={16} className="text-ai-accent" />
                      Categorias de Animais
                    </h3>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      isPercentageSumValid() 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {animalCategories.reduce((sum, cat) => sum + cat.percentage, 0).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50 rounded px-2 py-1.5">
                      <div className="text-blue-600 text-[10px] font-medium mb-0.5">Categorias</div>
                      <div className="text-blue-900 font-bold">{animalCategories.length}</div>
                    </div>
                    <div className="bg-orange-50 rounded px-2 py-1.5">
                      <div className="text-orange-600 text-[10px] font-medium mb-0.5">Vendas Necessárias</div>
                      <div className="text-orange-900 font-bold">
                        {isPercentageSumValid() ? `${calculateRequiredSales()} cab` : '-'}
                      </div>
                    </div>
                  </div>
                  
                  {!isPercentageSumValid() && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} />
                      <span>Clique para ajustar percentuais</span>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-ai-accent group-hover:text-ai-accentHover font-medium">
                    Clique para editar →
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Modal - Tabela de Categorias */}
          {isModalOpen && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => {
                // Fecha o modal ao clicar no overlay (fundo escuro)
                if (e.target === e.currentTarget) {
                  setIsModalOpen(false);
                }
              }}
            >
              <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header do Modal */}
                <div className="px-6 py-4 border-b border-ai-border flex items-center justify-between bg-gradient-to-r from-ai-accent/10 to-transparent">
                  <h2 className="text-lg font-bold text-ai-text">Editar Categorias de Animais</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-ai-surface2 rounded-lg transition-colors"
                    title="Fechar"
                  >
                    <X size={20} className="text-ai-subtext" />
                  </button>
                </div>

                {/* Conteúdo do Modal - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                  {!isPercentageSumValid() && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="text-sm text-red-700 font-medium">
                        A soma dos percentuais deve ser exatamente 100%. Atualmente: {animalCategories.reduce((sum, cat) => sum + cat.percentage, 0).toFixed(1)}%
                      </span>
                    </div>
                  )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-ai-surface2 border-b border-ai-border">
                      <tr>
                        <th className="px-2 py-1 text-left text-[10px] font-semibold text-ai-text">
                          <div className="flex items-center gap-1">
                            Categoria
                            <button onClick={handleAddCategory} className="text-ai-accent hover:text-ai-accentHover" title="Adicionar Categoria">
                              <Plus size={14} />
                            </button>
                          </div>
                        </th>
                        <th className="px-2 py-1 text-center text-[10px] font-semibold text-green-600 w-20">%</th>
                        <th className="px-2 py-1 text-center text-[10px] font-semibold text-ai-text w-24">Peso (kg/@)</th>
                        <th className="px-2 py-1 text-center text-[10px] font-semibold text-ai-text w-24">Valor (kg/@)</th>
                        <th className="px-2 py-1 text-center text-[10px] font-semibold text-ai-text w-28">Valor/cab</th>
                        <th className="px-2 py-1 text-center text-[10px] font-semibold text-ai-text w-24">Quantidade</th>
                        <th className="px-2 py-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ai-border">
                      {animalCategories.map((category) => {
                        const valuePerHead = calculateValuePerHead(category);
                        return (
                          <tr key={category.id} className="hover:bg-ai-surface2/50 group">
                            <td className="p-0">
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(category.id, 'name', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-2 py-2 text-xs border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-ai-accent outline-none"
                              />
                            </td>
                            <td className="p-0">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingCell?.id === category.id && editingCell?.field === 'percentage' ? tempValue : category.percentage}
                                onChange={(e) => handleNumericChange(category.id, 'percentage', e.target.value)}
                                onFocus={(e) => handleInputFocus(e, category.id, 'percentage', category.percentage)}
                                onBlur={handleInputBlur}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-1 py-2 text-center text-[10px] border-0 bg-transparent text-green-600 font-bold focus:ring-2 focus:ring-inset focus:ring-ai-accent outline-none"
                              />
                            </td>
                            <td className="p-0 relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingCell?.id === category.id && editingCell?.field === 'weight' ? tempValue : formatNumberWithComma(category.weight)}
                                onChange={(e) => handleNumericChange(category.id, 'weight', e.target.value)}
                                onFocus={(e) => handleInputFocus(e, category.id, 'weight', category.weight)}
                                onBlur={handleInputBlur}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-1 py-2 text-center text-[10px] border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-ai-accent outline-none"
                              />
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-ai-subtext font-medium pointer-events-none">
                                {category.id === '1' || category.id === '2' ? 'kg' : '@'}
                              </span>
                            </td>
                            <td className="p-0 relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingCell?.id === category.id && editingCell?.field === 'valuePerKg' ? tempValue : formatNumberWithComma(category.valuePerKg)}
                                onChange={(e) => handleNumericChange(category.id, 'valuePerKg', e.target.value)}
                                onFocus={(e) => handleInputFocus(e, category.id, 'valuePerKg', category.valuePerKg)}
                                onBlur={handleInputBlur}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-1 py-2 text-center text-[10px] border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-ai-accent outline-none"
                              />
                            </td>
                            <td className="px-2 py-1 text-center text-ai-text font-semibold text-xs">
                              {formatCurrency(valuePerHead)}
                            </td>
                            <td className="px-2 py-1 text-center text-ai-text font-semibold text-[10px]">
                              {isPercentageSumValid() ? calculateQuantity(category.percentage) : '-'}
                            </td>
                            <td className="px-1 py-1 text-center">
                              {animalCategories.length > 1 && (
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-1 text-ai-subtext hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  title="Excluir categoria"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-ai-surface2 border-t-2 border-ai-border">
                      <tr>
                        <td className="px-2 py-1 text-ai-text font-bold text-xs">Total</td>
                        <td className={`px-2 py-1 text-center font-bold text-xs ${
                          isPercentageSumValid() ? 'text-ai-text' : 'text-red-600'
                        }`}>
                          {animalCategories.reduce((sum, cat) => sum + cat.percentage, 0).toFixed(1)}%
                          {!isPercentageSumValid() && (
                            <span className="ml-1 text-[9px]">⚠️</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center text-ai-subtext text-xs">-</td>
                        <td className="px-2 py-1 text-center text-ai-subtext text-xs">-</td>
                        <td className="px-2 py-1 text-center text-ai-text font-bold text-xs">
                          {isPercentageSumValid() ? formatCurrency(calculateAverageValue()) : '-'}
                        </td>
                        <td className="px-2 py-1 text-center text-ai-text font-bold text-xs">
                          {isPercentageSumValid() ? calculateRequiredSales() : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer do Modal */}
                <div className="px-6 py-4 border-t border-ai-border bg-ai-surface flex items-center justify-between">
                  <div className="text-sm text-ai-subtext">
                    {isPercentageSumValid() ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={16} />
                        Percentuais corretos (100%)
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle size={16} />
                        Ajuste para 100%
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-ai-accent text-white rounded-lg hover:bg-ai-accentHover transition-colors font-medium"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo adicional */}
          <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-ai-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-ai-accent" />
          </div>
          <h2 className="text-xl font-semibold text-ai-text mb-2">
            Planejamento Ágil
          </h2>
          <p className="text-ai-subtext">
            Funcionalidade em desenvolvimento. Aqui será implementado o sistema de planejamento ágil
            vinculado ao cliente <strong>{selectedClient?.name}</strong> e à fazenda <strong>{selectedFarm?.name}</strong>.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgilePlanning;
