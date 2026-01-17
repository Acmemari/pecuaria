import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useClient } from '../contexts/ClientContext';
import { useAuth } from '../contexts/AuthContext';
import { Farm, Client } from '../types';
import { supabase } from '../lib/supabase';
import { Building2, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Edit3, X } from 'lucide-react';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/** Interface para fazenda estendida com campos adicionais do Planejamento Ágil */
interface ExtendedFarm extends Farm {
  operationPecuary?: number;
}

/** Categoria de animal para cálculo de valor médio de venda */
interface AnimalCategory {
  id: string;
  name: string;
  percentage: number;
  weight: number;
  valuePerKg: number;
  quantity?: number;
}

/** Configuração de margem por sistema de produção */
interface MarginConfig {
  min: number;
  max: number;
  default: number;
}

/** IDs das categorias padrão (para lógica de unidades kg/@) */
const CATEGORY_IDS = {
  BEZERRO: '1',
  BEZERRA: '2',
  GARROTE: '3',
  NOVILHA: '4',
  BOI_GORDO: '5',
  VACA_DESCARTE: '6',
  TOURO_DESCARTE: '7',
} as const;

// ============================================================================
// FUNÇÕES AUXILIARES PURAS
// ============================================================================

/** Formata valor monetário em R$ */
const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || !isFinite(value) || value === 0) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/** Formata área em hectares */
const formatArea = (value: number | undefined | null): string => {
  if (value === undefined || value === null || !isFinite(value) || value === 0) {
    return '0 ha';
  }
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
};

/** Formata número com vírgula como separador decimal */
const formatNumberWithComma = (value: number | undefined | null): string => {
  if (value === undefined || value === null || !isFinite(value)) return '';
  return value.toFixed(1).replace('.', ',');
};

/** Parseia string com vírgula para número */
const parseNumberFromComma = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isFinite(num) ? num : 0;
};

/** Divisão segura - retorna 0 se divisor for 0 ou resultado inválido */
const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0 || !isFinite(numerator) || !isFinite(denominator)) {
    return 0;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : 0;
};

/** Retorna configuração de margem baseada no sistema de produção */
const getMarginConfig = (system: Farm['productionSystem'] | ''): MarginConfig => {
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
};

/** Retorna percentuais iniciais das categorias baseado no sistema de produção */
const getInitialPercentages = (system: Farm['productionSystem'] | ''): Record<string, number> => {
  const defaults = {
    [CATEGORY_IDS.BEZERRO]: 50,
    [CATEGORY_IDS.BEZERRA]: 0,
    [CATEGORY_IDS.GARROTE]: 0,
    [CATEGORY_IDS.NOVILHA]: 17,
    [CATEGORY_IDS.BOI_GORDO]: 0,
    [CATEGORY_IDS.VACA_DESCARTE]: 33,
    [CATEGORY_IDS.TOURO_DESCARTE]: 0,
  };

  switch (system) {
    case 'Cria':
      return defaults;
    case 'Ciclo Completo':
      return {
        ...defaults,
        [CATEGORY_IDS.BEZERRO]: 5,
        [CATEGORY_IDS.BEZERRA]: 5,
        [CATEGORY_IDS.NOVILHA]: 12,
        [CATEGORY_IDS.BOI_GORDO]: 45,
        [CATEGORY_IDS.VACA_DESCARTE]: 33,
      };
    case 'Recria-Engorda':
      return {
        ...defaults,
        [CATEGORY_IDS.BEZERRO]: 0,
        [CATEGORY_IDS.NOVILHA]: 0,
        [CATEGORY_IDS.BOI_GORDO]: 100,
        [CATEGORY_IDS.VACA_DESCARTE]: 0,
      };
    default:
      return defaults;
  }
};

/** Categorias padrão de animais */
const getDefaultCategories = (): AnimalCategory[] => [
  { id: CATEGORY_IDS.BEZERRO, name: 'Bezerro Desm.', percentage: 50, weight: 200, valuePerKg: 14 },
  { id: CATEGORY_IDS.BEZERRA, name: 'Bezerra Desm.', percentage: 0, weight: 200, valuePerKg: 12 },
  { id: CATEGORY_IDS.GARROTE, name: 'Garrote', percentage: 0, weight: 20, valuePerKg: 300 },
  { id: CATEGORY_IDS.NOVILHA, name: 'Novilha', percentage: 17, weight: 13, valuePerKg: 290 },
  { id: CATEGORY_IDS.BOI_GORDO, name: 'Boi Gordo', percentage: 0, weight: 24, valuePerKg: 270 },
  { id: CATEGORY_IDS.VACA_DESCARTE, name: 'Vaca Descarte', percentage: 33, weight: 13, valuePerKg: 320 },
  { id: CATEGORY_IDS.TOURO_DESCARTE, name: 'Touro Descarte', percentage: 0, weight: 15, valuePerKg: 280 },
];

/** Verifica se a categoria usa kg (bezerros) ou @ (demais) */
const isKgCategory = (categoryId: string): boolean => {
  return categoryId === CATEGORY_IDS.BEZERRO || categoryId === CATEGORY_IDS.BEZERRA;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface AgilePlanningProps {
  selectedFarm: Farm | null;
  onSelectFarm: (farm: Farm | null) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const AgilePlanning: React.FC<AgilePlanningProps> = ({ selectedFarm, onSelectFarm, onToast }) => {
  const { user } = useAuth();
  const { selectedClient, setSelectedClient } = useClient();
  
  // Cast para ExtendedFarm para acesso seguro ao operationPecuary
  const farm = selectedFarm as ExtendedFarm | null;
  
  // ============================================================================
  // ESTADOS
  // ============================================================================
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof AnimalCategory } | null>(null);
  const [tempValue, setTempValue] = useState('');
  
  // Estados de seleção
  const [clients, setClients] = useState<Client[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [tempSelectedClient, setTempSelectedClient] = useState<Client | null>(null);
  const [tempSelectedFarm, setTempSelectedFarm] = useState<Farm | null>(null);

  // Estados de parâmetros
  const [percentage, setPercentage] = useState(4);
  const [productionSystem, setProductionSystem] = useState<Farm['productionSystem'] | ''>('');
  const [expectedMargin, setExpectedMargin] = useState(40);
  
  // Estados de índices reprodutivos
  const [fertility, setFertility] = useState(85);
  const [prePartumLoss, setPrePartumLoss] = useState(6);
  const [calfMortality, setCalfMortality] = useState(3.5);
  const [maleWeaningWeight, setMaleWeaningWeight] = useState(220);
  const [femaleWeaningWeight, setFemaleWeaningWeight] = useState(200);
  
  // Estado de categorias
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>(getDefaultCategories);
  
  // ============================================================================
  // VALORES DERIVADOS
  // ============================================================================
  
  const showReproductiveIndices = productionSystem === 'Cria' || productionSystem === 'Ciclo Completo';
  const operationPecuaryValue = farm?.operationPecuary ?? 0;

  // ============================================================================
  // HANDLERS DE CATEGORIAS
  // ============================================================================

  const handleAddCategory = useCallback(() => {
    const maxId = Math.max(...animalCategories.map(c => parseInt(c.id, 10)));
    const newId = (isFinite(maxId) ? maxId + 1 : 8).toString();
    const newCategory: AnimalCategory = {
      id: newId,
      name: 'Nova Categoria',
      percentage: 0,
      weight: 0,
      valuePerKg: 0
    };
    setAnimalCategories(prev => [...prev, newCategory]);
  }, [animalCategories]);

  const handleDeleteCategory = useCallback((id: string) => {
    setAnimalCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCategory = useCallback((id: string, field: keyof AnimalCategory, value: number | string | undefined) => {
    setAnimalCategories(prev =>
      prev.map(cat => cat.id === id ? { ...cat, [field]: value } : cat)
    );
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Fechar modal com ESC e bloquear scroll do body
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
        setEditingCell(null);
        setTempValue('');
      }
    };
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // ============================================================================
  // HANDLERS DE INPUT
  // ============================================================================

  const handleInputFocus = useCallback((
    _e: React.FocusEvent<HTMLInputElement>,
    id: string,
    field: keyof AnimalCategory
  ) => {
    setEditingCell({ id, field });
    setTempValue('');
  }, []);

  const handleInputBlur = useCallback(() => {
    setEditingCell(null);
    setTempValue('');
  }, []);

  const handleNumericChange = useCallback((id: string, field: keyof AnimalCategory, rawValue: string) => {
    // Permite ponto como vírgula
    const treatedValue = rawValue.replace(/\./g, ',');
    setTempValue(treatedValue);

    // Remove caracteres inválidos
    let cleaned = treatedValue.replace(/[^\d,]/g, '');

    // Permite apenas uma vírgula
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }

    if (cleaned === '') {
      updateCategory(id, field, 0);
      return;
    }

    const parsed = parseNumberFromComma(cleaned);
    if (isFinite(parsed)) {
      // Validação de limites por campo
      let validValue = parsed;
      if (field === 'percentage') {
        validValue = Math.max(0, Math.min(100, parsed));
      } else if (field === 'weight') {
        validValue = Math.max(0, Math.min(9999, parsed));
      } else if (field === 'valuePerKg') {
        validValue = Math.max(0, Math.min(9999, parsed));
      }
      updateCategory(id, field, validValue);
    }
  }, [updateCategory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  }, []);

  // ============================================================================
  // CÁLCULOS MEMOIZADOS
  // ============================================================================

  /** Soma total dos percentuais das categorias */
  const percentageSum = useMemo(() => {
    return animalCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0);
  }, [animalCategories]);

  /** Verifica se a soma dos percentuais é 100% */
  const isPercentageSumValid = useMemo(() => {
    return Math.abs(percentageSum - 100) < 0.01;
  }, [percentageSum]);

  /** Calcula valor por cabeça de uma categoria */
  const calculateValuePerHead = useCallback((category: AnimalCategory): number => {
    const weight = category.weight ?? 0;
    const valuePerKg = category.valuePerKg ?? 0;
    return weight * valuePerKg;
  }, []);

  /** Valor médio de venda (soma ponderada) */
  const averageValue = useMemo(() => {
    return animalCategories.reduce((sum, category) => {
      const valuePerHead = calculateValuePerHead(category);
      return sum + safeDivide(category.percentage * valuePerHead, 100);
    }, 0);
  }, [animalCategories, calculateValuePerHead]);

  /** Valor calculado (percentual × operação pecuária) */
  const calculatedValue = useMemo(() => {
    return safeDivide(percentage * operationPecuaryValue, 100);
  }, [percentage, operationPecuaryValue]);

  /** Faturamento necessário (valor calculado ÷ margem esperada) */
  const requiredRevenue = useMemo(() => {
    if (!productionSystem || expectedMargin <= 0) return 0;
    return safeDivide(calculatedValue * 100, expectedMargin);
  }, [calculatedValue, expectedMargin, productionSystem]);

  /** Vendas necessárias (faturamento necessário ÷ valor médio) */
  const requiredSales = useMemo(() => {
    if (!isPercentageSumValid || averageValue <= 0 || requiredRevenue <= 0) return 0;
    return Math.round(safeDivide(requiredRevenue, averageValue));
  }, [isPercentageSumValid, averageValue, requiredRevenue]);

  /** Taxa de desmame: Fertilidade × (1 - Perda pré parto) × (1 - Mortalidade) */
  const weaningRate = useMemo(() => {
    const fertilityDecimal = safeDivide(fertility, 100);
    const prePartumLossDecimal = safeDivide(prePartumLoss, 100);
    const calfMortalityDecimal = safeDivide(calfMortality, 100);
    return fertilityDecimal * (1 - prePartumLossDecimal) * (1 - calfMortalityDecimal);
  }, [fertility, prePartumLoss, calfMortality]);

  /** Kg desmamados por matriz */
  const kgPerMatrix = useMemo(() => {
    const avgWeaningWeight = (maleWeaningWeight + femaleWeaningWeight) / 2;
    return weaningRate * avgWeaningWeight;
  }, [weaningRate, maleWeaningWeight, femaleWeaningWeight]);

  /** Matrizes necessárias */
  const requiredMatrixes = useMemo(() => {
    if (weaningRate <= 0 || requiredSales <= 0) return 0;
    return Math.ceil(safeDivide(requiredSales, weaningRate));
  }, [weaningRate, requiredSales]);

  /** Calcula quantidade para uma categoria */
  const calculateQuantity = useCallback((categoryPercentage: number): number => {
    if (!isPercentageSumValid || requiredSales === 0) return 0;
    return Math.round(safeDivide(requiredSales * categoryPercentage, 100));
  }, [isPercentageSumValid, requiredSales]);

  /** Configuração de margem para o sistema atual */
  const marginConfig = useMemo(() => getMarginConfig(productionSystem), [productionSystem]);

  // ============================================================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================================================

  const loadFarmsForClient = useCallback(async (clientId: string) => {
    if (!clientId) {
      setFarms([]);
      return;
    }
    
    try {
      // Carregar fazendas do localStorage
      let allFarms: Farm[] = [];
      
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const storedFarms = localStorage.getItem('agro-farms');
      if (storedFarms) {
          allFarms = JSON.parse(storedFarms) || [];
          }
        } catch (parseError) {
          console.error('[AgilePlanning] Error parsing farms from localStorage:', parseError);
          onToast?.('Erro ao carregar dados locais de fazendas.', 'warning');
        }
      }

      // Buscar fazendas vinculadas ao cliente
      const { data: clientFarmsData, error } = await supabase
        .from('client_farms')
        .select('farm_id')
        .eq('client_id', clientId);

      if (error) {
        console.error('[AgilePlanning] Error loading client farms:', error);
        onToast?.('Erro ao carregar fazendas do cliente.', 'error');
        setFarms([]);
        return;
      }

      if (clientFarmsData && allFarms.length > 0) {
        const farmIds = new Set(clientFarmsData.map(cf => cf.farm_id));
        const farmsForClient = allFarms.filter(f => farmIds.has(f.id));
        setFarms(farmsForClient);
        
        if (farmsForClient.length > 0) {
          setTempSelectedFarm(prev => prev || farmsForClient[0]);
        }
      } else {
        setFarms([]);
      }
    } catch (err) {
      console.error('[AgilePlanning] Unexpected error:', err);
      onToast?.('Erro inesperado ao carregar fazendas.', 'error');
      setFarms([]);
    }
  }, [onToast]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Inicializar quando cliente/fazenda selecionados
  useEffect(() => {
    if (selectedClient && farm) {
      setIsLoading(false);
      setShowSelectionModal(false);
      setProductionSystem(farm.productionSystem || '');
    } else {
      setIsLoading(false);
      setShowSelectionModal(true);
      // Só carrega clientes se user estiver disponível
      if (user) {
        // Carregar clientes diretamente aqui para evitar dependência circular
        const fetchClients = async () => {
          try {
            let query = supabase.from('clients').select('*');
            
            // Analista vê apenas seus clientes; admin vê todos
            if (user.qualification === 'analista' && user.role !== 'admin') {
              query = query.eq('analyst_id', user.id);
            }
            
            query = query.order('name', { ascending: true });
            const { data, error } = await query;

            if (error) {
              console.error('[AgilePlanning] Error loading clients:', error);
              onToast?.('Erro ao carregar clientes. Tente novamente.', 'error');
              return;
            }

            if (data) {
              const mappedClients: Client[] = data.map(client => ({
                id: client.id,
                name: client.name,
                phone: client.phone || '',
                email: client.email,
                analystId: client.analyst_id,
                createdAt: client.created_at,
                updatedAt: client.updated_at
              }));
              
              setClients(mappedClients);
              if (mappedClients.length > 0) {
                setTempSelectedClient(prev => prev || mappedClients[0]);
              }
            }
          } catch (err) {
            console.error('[AgilePlanning] Unexpected error:', err);
            onToast?.('Erro inesperado ao carregar clientes.', 'error');
          }
        };
        fetchClients();
      }
    }
  }, [selectedClient, farm, user, onToast]);

  useEffect(() => {
    if (tempSelectedClient) {
      loadFarmsForClient(tempSelectedClient.id);
    }
  }, [tempSelectedClient, loadFarmsForClient]);

  // Atualizar percentuais quando sistema de produção mudar
  useEffect(() => {
    if (productionSystem) {
      const initialPercentages = getInitialPercentages(productionSystem);
      setAnimalCategories(prev =>
        prev.map(cat => ({
          ...cat,
          percentage: initialPercentages[cat.id] ?? cat.percentage
        }))
      );
    }
  }, [productionSystem]);

  // Atualizar margem esperada quando sistema de produção mudar
  useEffect(() => {
    setExpectedMargin(marginConfig.default);
  }, [marginConfig.default]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleConfirmSelection = useCallback(() => {
    if (tempSelectedClient && tempSelectedFarm) {
      setSelectedClient(tempSelectedClient);
      onSelectFarm(tempSelectedFarm);
      setShowSelectionModal(false);
      onToast?.('Cliente e fazenda selecionados com sucesso!', 'success');
    } else {
      onToast?.('Por favor, selecione um cliente e uma fazenda', 'warning');
    }
  }, [tempSelectedClient, tempSelectedFarm, setSelectedClient, onSelectFarm, onToast]);

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
                    {formatCurrency(calculatedValue)}
                  </div>
                  <div className="text-[8px] text-blue-600 bg-blue-50 rounded px-1 py-0.5 border border-blue-200">
                    {percentage.toFixed(1)}% × {formatCurrency(operationPecuaryValue)}
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
                      const { min, max } = marginConfig;
                      const step = 0.5;
                      const range = max - min;
                      const marks: number[] = [];
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
                              style={{ left: `${safeDivide((expectedMargin - min) * 100, range)}%`, transform: 'translate(-50%, -50%)' }}
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
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 border border-purple-200 min-w-[140px]">
                    <div className="text-[9px] text-purple-700 mb-0.5 font-medium">Faturamento Necessário</div>
                    <div className="text-base font-bold text-purple-900 mb-0.5">
                      {formatCurrency(requiredRevenue)}
                    </div>
                    <div className="text-[8px] text-purple-600 bg-purple-50 rounded px-1 py-0.5 border border-purple-200">
                      {formatCurrency(calculatedValue)} ÷ {expectedMargin.toFixed(1)}%
                    </div>
                  </div>
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
                {isPercentageSumValid ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xl font-bold text-orange-900">
                        {formatCurrency(averageValue)}
                      </div>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-1 rounded hover:bg-orange-200/60 transition-colors"
                        title="Editar categorias"
                        aria-label="Editar categorias"
                      >
                        <Edit3 size={16} className="text-ai-accent" />
                      </button>
                    </div>
                    <div className="text-[10px] text-orange-700 mb-1 font-medium">Vendas Necessárias</div>
                    <div className="text-xl font-bold text-orange-900 mb-2">
                      {requiredSales > 0 ? `${requiredSales} Cabeças` : '-'}
                    </div>
                    {showReproductiveIndices && (
                      <>
                        <div className="text-[10px] text-orange-700 mb-1 font-medium">Matrizes Necessárias</div>
                        <div className="text-xl font-bold text-orange-900">
                          {requiredMatrixes > 0 ? `${requiredMatrixes} Matrizes` : '-'}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <AlertCircle size={16} />
                    Soma deve ser 100%
                  </div>
                )}
              </div>

              {showReproductiveIndices && (
                <div className="flex gap-3 flex-1">
                  <div className="flex-1 bg-ai-surface2/40 border border-ai-border rounded-lg p-2">
                    <h3 className="text-xs font-semibold text-ai-text mb-1.5">Índices Reprodutivos</h3>
                    <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <label className="text-ai-subtext">Fertilidade</label>
                        <span className="font-semibold text-ai-text">{fertility.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-ai-subtext w-8 flex-shrink-0">70%</span>
                        <input
                          type="range"
                          min={70}
                          max={90}
                          step={0.5}
                          value={fertility}
                          onChange={(e) => setFertility(parseFloat(e.target.value))}
                          className="flex-1 accent-ai-accent h-1"
                        />
                        <span className="text-[8px] text-ai-subtext w-8 flex-shrink-0 text-right">90%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <label className="text-ai-subtext">Perda Pré Parto</label>
                        <span className="font-semibold text-ai-text">{prePartumLoss.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-ai-subtext w-8 flex-shrink-0">3%</span>
                        <input
                          type="range"
                          min={3}
                          max={15}
                          step={0.5}
                          value={prePartumLoss}
                          onChange={(e) => setPrePartumLoss(parseFloat(e.target.value))}
                          className="flex-1 accent-ai-accent h-1"
                        />
                        <span className="text-[8px] text-ai-subtext w-8 flex-shrink-0 text-right">15%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <label className="text-ai-subtext">Mortalidade de Bezerros</label>
                        <span className="font-semibold text-ai-text">{calfMortality.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-ai-subtext w-8 flex-shrink-0">1,5%</span>
                        <input
                          type="range"
                          min={1.5}
                          max={7}
                          step={0.1}
                          value={calfMortality}
                          onChange={(e) => setCalfMortality(parseFloat(e.target.value))}
                          className="flex-1 accent-ai-accent h-1"
                        />
                        <span className="text-[8px] text-ai-subtext w-8 flex-shrink-0 text-right">7%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <label className="text-ai-subtext">Peso ao desmame de machos</label>
                        <span className="font-semibold text-ai-text">{maleWeaningWeight} kg</span>
                      </div>
          <div className="flex items-center gap-2">
                        <span className="text-[8px] text-ai-subtext w-10 flex-shrink-0">160 kg</span>
                        <input
                          type="range"
                          min={160}
                          max={270}
                          step={1}
                          value={maleWeaningWeight}
                          onChange={(e) => setMaleWeaningWeight(parseInt(e.target.value, 10))}
                          className="flex-1 accent-ai-accent h-1"
                        />
                        <span className="text-[8px] text-ai-subtext w-10 flex-shrink-0 text-right">270 kg</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <label className="text-ai-subtext">Peso ao desmame de fêmeas</label>
                        <span className="font-semibold text-ai-text">{femaleWeaningWeight} kg</span>
          </div>
          <div className="flex items-center gap-2">
                        <span className="text-[8px] text-ai-subtext w-10 flex-shrink-0">140 kg</span>
                        <input
                          type="range"
                          min={140}
                          max={250}
                          step={1}
                          value={femaleWeaningWeight}
                          onChange={(e) => setFemaleWeaningWeight(parseInt(e.target.value, 10))}
                          className="flex-1 accent-ai-accent h-1"
                        />
                        <span className="text-[8px] text-ai-subtext w-10 flex-shrink-0 text-right">250 kg</span>
                      </div>
          </div>
        </div>
      </div>

                {/* Card de Outputs Calculados */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200 min-w-[180px]">
                  <h3 className="text-xs font-semibold text-blue-700 mb-2">Resultados</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[9px] text-blue-600 mb-0.5 font-medium">Taxa de Desmame</div>
                      <div className="text-base font-bold text-blue-900">
                        {(weaningRate * 100).toFixed(2)}%
                      </div>
                      <div className="text-[8px] text-blue-600/80 mt-0.5">
                        {fertility.toFixed(1)}% × (1 - {prePartumLoss.toFixed(1)}%) × (1 - {calfMortality.toFixed(1)}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-blue-600 mb-0.5 font-medium">Kg desm./Matriz</div>
                      <div className="text-base font-bold text-blue-900">
                        {kgPerMatrix.toFixed(1)} kg
                      </div>
                      <div className="text-[8px] text-blue-600/80 mt-0.5">
                        {(weaningRate * 100).toFixed(2)}% × {((maleWeaningWeight + femaleWeaningWeight) / 2).toFixed(1)} kg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

            </div>
          </div>

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
                  {!isPercentageSumValid && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span className="text-sm text-red-700 font-medium">
                        A soma dos percentuais deve ser exatamente 100%. Atualmente: {percentageSum.toFixed(1)}%
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
                                onFocus={(e) => handleInputFocus(e, category.id, 'percentage')}
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
                                onFocus={(e) => handleInputFocus(e, category.id, 'weight')}
                                onBlur={handleInputBlur}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-1 py-2 text-center text-[10px] border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-ai-accent outline-none"
                              />
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-ai-subtext font-medium pointer-events-none">
                                {isKgCategory(category.id) ? 'kg' : '@'}
                              </span>
                            </td>
                            <td className="p-0 relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingCell?.id === category.id && editingCell?.field === 'valuePerKg' ? tempValue : formatNumberWithComma(category.valuePerKg)}
                                onChange={(e) => handleNumericChange(category.id, 'valuePerKg', e.target.value)}
                                onFocus={(e) => handleInputFocus(e, category.id, 'valuePerKg')}
                                onBlur={handleInputBlur}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full px-1 py-2 text-center text-[10px] border-0 bg-transparent focus:ring-2 focus:ring-inset focus:ring-ai-accent outline-none"
                              />
                            </td>
                            <td className="px-2 py-1 text-center text-ai-text font-semibold text-xs">
                              {formatCurrency(valuePerHead)}
                            </td>
                            <td className="px-2 py-1 text-center text-ai-text font-semibold text-[10px]">
                              {isPercentageSumValid ? calculateQuantity(category.percentage) : '-'}
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
                          isPercentageSumValid ? 'text-ai-text' : 'text-red-600'
                        }`}>
                          {percentageSum.toFixed(1)}%
                          {!isPercentageSumValid && (
                            <span className="ml-1 text-[9px]">⚠️</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center text-ai-subtext text-xs">-</td>
                        <td className="px-2 py-1 text-center text-ai-subtext text-xs">-</td>
                        <td className="px-2 py-1 text-center text-ai-text font-bold text-xs">
                          {isPercentageSumValid ? formatCurrency(averageValue) : '-'}
                        </td>
                        <td className="px-2 py-1 text-center text-ai-text font-bold text-xs">
                          {isPercentageSumValid ? requiredSales : '-'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </div>

                {/* Footer do Modal */}
                <div className="px-6 py-4 border-t border-ai-border bg-ai-surface flex items-center justify-between">
                  <div className="text-sm text-ai-subtext">
                    {isPercentageSumValid ? (
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
    </div>
  );
};

export default AgilePlanning;
