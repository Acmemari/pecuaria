import React, { useState, useEffect } from 'react';
import { Farm } from '../types';
import { 
  Plus, 
  ArrowLeft, 
  MapPin, 
  Building2, 
  Scale, 
  Dna, 
  Factory,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface FarmManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const STORAGE_KEY = 'agro-farms';

// Estados brasileiros
const BRAZILIAN_STATES = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará',
  'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão',
  'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará',
  'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro',
  'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima',
  'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
];

const FarmManagement: React.FC<FarmManagementProps> = ({ onToast }) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [view, setView] = useState<'list' | 'form'>('form'); // Inicia direto no formulário
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(true); // Flag para indicar criação de nova fazenda

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    country: 'Brasil',
    state: '',
    city: '',
    // Dimensões
    totalArea: '',
    pastureArea: '',
    agricultureArea: '',
    otherCrops: '',
    infrastructure: '',
    reserveAndAPP: '',
    propertyValue: '',
    // Dados da propriedade
    propertyType: 'Própria' as Farm['propertyType'],
    weightMetric: 'Arroba (@)' as Farm['weightMetric'],
    // Dados do rebanho
    averageHerd: '',
    herdValue: '',
    commercializesGenetics: false,
    productionSystem: '' as Farm['productionSystem'] | ''
  });

  // Países disponíveis
  const COUNTRIES = ['Brasil', 'Paraguai', 'Uruguai', 'Bolívia', 'Colômbia', 'Argentina'];

  // Verificar se o estado deve ser obrigatório (apenas para Brasil)
  const isStateRequired = formData.country === 'Brasil';

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to format number with thousands separator (.) and 2 decimals (,)
  const formatNumberWithDecimals = (value: string): string => {
    if (!value) return '';
    
    // Remove all non-numeric characters except comma and dot
    let cleaned = value.replace(/[^\d,.]/g, '');
    
    // Check if value originally had a comma (user is typing decimal separator)
    const hasComma = cleaned.includes(',');
    
    // If there's both comma and dot, determine which is decimal separator
    if (cleaned.includes(',') && cleaned.includes('.')) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) {
        // Comma is decimal separator, remove all dots (they are thousands separators being typed)
        cleaned = cleaned.replace(/\./g, '');
      } else {
        // Dot is decimal separator, convert to comma
        cleaned = cleaned.replace(/,/g, '');
        cleaned = cleaned.replace('.', ',');
      }
    } else if (cleaned.includes('.')) {
      // Only dot - could be decimal separator or thousands separator
      // If it's near the end (last 3 chars), assume decimal separator
      if (cleaned.length - cleaned.indexOf('.') <= 3) {
        cleaned = cleaned.replace('.', ',');
      } else {
        // Otherwise assume it's thousands separator and remove it
        cleaned = cleaned.replace(/\./g, '');
      }
    }
    
    // Split by comma to separate integer and decimal parts
    const parts = cleaned.split(',');
    let integerPart = parts[0] || '';
    let decimalPart = parts[1] || '';
    
    // Limit decimal part to 2 digits
    decimalPart = decimalPart.slice(0, 2);
    
    // Add thousands separator (.) to integer part (from right to left, every 3 digits)
    if (integerPart) {
      // Remove existing dots first
      integerPart = integerPart.replace(/\./g, '');
      // Add thousands separator
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    
    // Combine parts - preserve comma if user typed it (hasComma) or if decimal part exists
    if (hasComma || decimalPart) {
      return `${integerPart},${decimalPart}`;
    }
    return integerPart;
  };

  // Helper function to parse number from formatted string
  const parseNumber = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    // Remove thousands separators (.) and replace comma with dot for decimal
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  };

  // Handle numeric input change (for hectare fields)
  const handleNumericChange = (field: string, value: string) => {
    const formatted = formatNumberWithDecimals(value);
    setFormData({ ...formData, [field]: formatted });
  };

  // Handle blur event to ensure 2 decimals are always shown
  const handleNumericBlur = (field: string) => {
    const currentValue = formData[field as keyof typeof formData] as string;
    if (!currentValue) return;
    
    const numValue = parseNumber(currentValue);
    if (numValue !== undefined) {
      const formatted = formatNumberForDisplay(numValue);
      setFormData({ ...formData, [field]: formatted });
    }
  };

  // Calculate sum of all partial areas
  const calculateTotalAreaSum = (): number => {
    const pasture = parseNumber(formData.pastureArea) || 0;
    const agriculture = parseNumber(formData.agricultureArea) || 0;
    const otherCrops = parseNumber(formData.otherCrops) || 0;
    const infrastructure = parseNumber(formData.infrastructure) || 0;
    const reserve = parseNumber(formData.reserveAndAPP) || 0;
    return pasture + agriculture + otherCrops + infrastructure + reserve;
  };

  // Check if total area matches the sum of partial areas
  const isTotalAreaValid = (): boolean => {
    const totalAreaValue = parseNumber(formData.totalArea);
    const calculatedSum = calculateTotalAreaSum();
    
    if (totalAreaValue === undefined) return false;
    
    // Compare with tolerance for rounding (0.01 ha)
    const difference = Math.abs(totalAreaValue - calculatedSum);
    return difference < 0.01;
  };

  // Handle currency input change (without decimals, only thousands separator)
  const handleCurrencyChange = (field: string, value: string) => {
    // Remove all non-numeric characters and remove "R$"
    const cleaned = value.replace(/[^\d]/g, '').replace('R$', '').trim();
    
    // Format with thousands separator (.) only, no decimals
    if (cleaned) {
      const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      setFormData({ ...formData, [field]: formatted });
    } else {
      setFormData({ ...formData, [field]: '' });
    }
  };

  // Format integer number for display (with thousands separator, no decimals)
  const formatIntegerForDisplay = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    // Convert to integer and format with thousands separator
    const integerValue = Math.floor(value);
    return integerValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse integer from formatted string (removes thousands separator)
  const parseInteger = (value: string): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    // Remove thousands separators (.)
    const cleaned = value.replace(/\./g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
  };

  // Load farms from localStorage
  useEffect(() => {
    loadFarms();
  }, []);

  // Se houver fazendas e estiver no formulário vazio (sem estar criando nova), mudar para lista
  useEffect(() => {
    if (!isLoading && farms.length > 0 && view === 'form' && !editingFarm && !isCreatingNew) {
      setView('list');
    }
  }, [farms.length, isLoading, view, editingFarm, isCreatingNew]);

  const loadFarms = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('[FarmManagement] Loading farms from localStorage:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        const farmsArray = Array.isArray(parsed) ? parsed : [];
        console.log('[FarmManagement] Parsed farms:', farmsArray.length, 'farms');
        setFarms(farmsArray);
        return farmsArray;
      } else {
        console.log('[FarmManagement] No farms found in localStorage');
        setFarms([]);
        return [];
      }
    } catch (error) {
      console.error('[FarmManagement] Erro ao carregar fazendas:', error);
      setFarms([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const saveFarms = (farmsToSave: Farm[]) => {
    try {
      console.log('[FarmManagement] Saving farms to localStorage:', farmsToSave);
      const jsonString = JSON.stringify(farmsToSave);
      localStorage.setItem(STORAGE_KEY, jsonString);
      
      // Verify the save
      const verification = localStorage.getItem(STORAGE_KEY);
      if (verification) {
        console.log('[FarmManagement] Farms saved successfully. Verification:', JSON.parse(verification));
        setFarms(farmsToSave);
      } else {
        console.error('[FarmManagement] Failed to verify save - localStorage returned null');
        onToast?.('Erro ao salvar fazenda: falha na verificação', 'error');
      }
    } catch (error) {
      console.error('[FarmManagement] Erro ao salvar fazendas:', error);
      onToast?.('Erro ao salvar fazenda: ' + (error instanceof Error ? error.message : 'Erro desconhecido'), 'error');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da fazenda é obrigatório';
    }

    // Estado só é obrigatório para Brasil
    if (formData.country === 'Brasil' && !formData.state) {
      newErrors.state = 'Estado é obrigatório';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Cidade é obrigatória';
    }

    if (!formData.productionSystem) {
      newErrors.productionSystem = 'Sistema de produção é obrigatório';
    }

    // Validar se a área total bate com a soma das áreas parciais
    const totalAreaValue = parseNumber(formData.totalArea);
    const calculatedSum = calculateTotalAreaSum();
    
    // Se a área total foi preenchida, deve bater com a soma das áreas parciais
    if (totalAreaValue !== undefined && totalAreaValue > 0) {
      const difference = Math.abs(totalAreaValue - calculatedSum);
      if (difference >= 0.01) {
        // Tolerância de 0.01 ha para arredondamentos
        const formattedTotal = formatNumberForDisplay(totalAreaValue);
        const formattedSum = formatNumberForDisplay(calculatedSum);
        newErrors.totalArea = `A área total (${formattedTotal} ha) não corresponde à soma das áreas parciais (${formattedSum} ha). Por favor, verifique os valores.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Limpar estado quando mudar de país
  const handleCountryChange = (country: string) => {
    setFormData({
      ...formData,
      country,
      state: country !== 'Brasil' ? '' : formData.state // Limpa estado se não for Brasil
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const now = new Date().toISOString();
    let updatedFarms: Farm[];

    // Prepare farm data with parsed numeric values
    const farmData: Partial<Farm> = {
      name: formData.name,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      totalArea: parseNumber(formData.totalArea),
      pastureArea: parseNumber(formData.pastureArea),
      agricultureArea: parseNumber(formData.agricultureArea),
      otherCrops: parseNumber(formData.otherCrops),
      infrastructure: parseNumber(formData.infrastructure),
      reserveAndAPP: parseNumber(formData.reserveAndAPP),
      propertyValue: parseInteger(formData.propertyValue),
      propertyType: formData.propertyType,
      weightMetric: formData.weightMetric,
      averageHerd: formData.averageHerd ? parseInt(formData.averageHerd.replace(/\./g, ''), 10) : undefined,
      herdValue: parseInteger(formData.herdValue),
      commercializesGenetics: formData.commercializesGenetics,
      productionSystem: formData.productionSystem as Farm['productionSystem']
    };

    if (editingFarm) {
      // Update existing farm
      updatedFarms = farms.map(farm =>
        farm.id === editingFarm.id
          ? {
              ...farm,
              ...farmData,
              updatedAt: now
            } as Farm
          : farm
      );
    } else {
      // Create new farm
      const newFarm: Farm = {
        id: `farm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...farmData,
        createdAt: now,
        updatedAt: now
      } as Farm;
      updatedFarms = [...farms, newFarm];
    }

    console.log('[FarmManagement] Submitting form. Current farms:', farms.length, 'Updated farms:', updatedFarms.length);
    console.log('[FarmManagement] New farm data:', editingFarm ? 'Updating' : 'Creating', updatedFarms);
    
    saveFarms(updatedFarms);
    
    // Show success toast with animation
    onToast?.(
      editingFarm ? 'Fazenda atualizada com sucesso!' : 'Fazenda cadastrada com sucesso!',
      'success'
    );

    // Reset form
    resetForm();
    setIsCreatingNew(false); // Marcar que não está mais criando
    
    // Switch to list view if there are farms (saveFarms already updates the state)
    if (updatedFarms.length > 0) {
      setView('list');
    }
  };

  const handleDelete = (farmId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta fazenda?')) {
      const updatedFarms = farms.filter(farm => farm.id !== farmId);
      saveFarms(updatedFarms);
      onToast?.('Fazenda excluída com sucesso!', 'success');
    }
  };

  // Format number for display (with thousands separator (.) and 2 decimals (,))
  const formatNumberForDisplay = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    // Format with 2 decimals, then replace dot with comma for decimal separator
    const formatted = value.toFixed(2);
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '00';
    
    // Add thousands separator to integer part
    const integerWithSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${integerWithSeparator},${decimalPart}`;
  };

  const handleEdit = (farm: Farm) => {
    setEditingFarm(farm);
    setIsCreatingNew(false); // Não está criando, está editando
    setFormData({
      name: farm.name,
      country: farm.country,
      state: farm.state,
      city: farm.city,
      totalArea: formatNumberForDisplay(farm.totalArea),
      pastureArea: formatNumberForDisplay(farm.pastureArea),
      agricultureArea: formatNumberForDisplay(farm.agricultureArea),
      otherCrops: formatNumberForDisplay(farm.otherCrops),
      infrastructure: formatNumberForDisplay(farm.infrastructure),
      reserveAndAPP: formatNumberForDisplay(farm.reserveAndAPP),
      propertyValue: formatIntegerForDisplay(farm.propertyValue),
      propertyType: farm.propertyType,
      weightMetric: farm.weightMetric,
      averageHerd: farm.averageHerd ? farm.averageHerd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '',
      herdValue: formatIntegerForDisplay(farm.herdValue),
      commercializesGenetics: farm.commercializesGenetics,
      productionSystem: farm.productionSystem
    });
    setView('form');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      country: 'Brasil',
      state: '',
      city: '',
      totalArea: '',
      pastureArea: '',
      agricultureArea: '',
      otherCrops: '',
      infrastructure: '',
      reserveAndAPP: '',
      propertyValue: '',
      propertyType: 'Própria',
      weightMetric: 'Arroba (@)',
      averageHerd: '',
      herdValue: '',
      commercializesGenetics: false,
      productionSystem: '' as Farm['productionSystem'] | ''
    });
    setEditingFarm(null);
    setErrors({});
  };

  const handleCancel = () => {
    resetForm();
    setIsCreatingNew(false);
    setView('list');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-ai-subtext">Carregando...</div>
      </div>
    );
  }

  // List View
  if (view === 'list') {
    return (
      <div className="h-full flex flex-col p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ai-text">Cadastro de Fazendas</h1>
          <button
            onClick={() => {
              resetForm();
              setIsCreatingNew(true);
              setView('form');
            }}
            className="px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Nova Fazenda
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-1 overflow-y-auto">
          {farms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white rounded-lg border border-ai-border p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-ai-text mb-2 truncate">{farm.name}</h3>
                  <div className="space-y-1 text-xs text-ai-subtext">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">{farm.city}, {farm.state}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="flex-shrink-0" />
                      <span className="truncate">{farm.propertyType}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Factory size={12} className="flex-shrink-0" />
                      <span className="truncate">{farm.productionSystem}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Scale size={12} className="flex-shrink-0" />
                      <span className="truncate">{farm.weightMetric}</span>
                    </div>
                    {farm.commercializesGenetics && (
                      <div className="flex items-center gap-1.5 text-ai-accent">
                        <Dna size={12} className="flex-shrink-0" />
                        <span className="truncate">Comercializa genética</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-ai-border">
                <button
                  onClick={() => handleEdit(farm)}
                  className="flex-1 px-2 py-1.5 text-xs border border-ai-border text-ai-text rounded-lg hover:bg-ai-surface2 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(farm.id)}
                  className="px-2 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Form View
  return (
    <div className="h-full flex flex-col p-2 md:p-3 overflow-hidden">
      <style>{`
        /* Estilos customizados para barras de rolagem dos selects */
        select::-webkit-scrollbar {
          width: 27px;
        }
        select::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
        }
        select::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 8px;
          border: 3px solid #f1f5f9;
        }
        select::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        /* Firefox */
        select {
          scrollbar-width: thick;
          scrollbar-color: #9ca3af #f1f5f9;
        }
      `}</style>
      <div className="mb-1 flex-shrink-0">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 text-ai-subtext hover:text-ai-text transition-colors mb-0.5 cursor-pointer text-xs"
        >
          <ArrowLeft size={14} />
          Voltar para lista
        </button>
        <h1 className="text-base md:text-lg font-bold text-ai-text">
          {editingFarm ? 'Editar Fazenda' : 'Cadastrar Fazenda'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl bg-white rounded-lg border border-ai-border p-1.5 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col">
        {/* Nome da Fazenda */}
        <div className="mb-1">
          <label className="block text-xs font-medium text-ai-text mb-0.5">
            Nome da fazenda <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da fazenda"
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                  errors.name ? 'border-red-500' : 'border-ai-border'
                }`}
          />
              {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
        </div>

        {/* Localização - Seção com fundo cinza claro */}
        <div className="mb-1 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xs font-semibold text-ai-text mb-0.5">Localização</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">País</label>
              <select
                value={formData.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">
                Estado {isStateRequired && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={!isStateRequired}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                  errors.state ? 'border-red-500' : 'border-ai-border'
                } ${!isStateRequired ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
              >
                <option value="">{isStateRequired ? 'Selecione o estado' : 'N/A'}</option>
                {isStateRequired && BRAZILIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && <p className="text-red-500 text-xs mt-0.5">{errors.state}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">
                Cidade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                  errors.city ? 'border-red-500' : 'border-ai-border'
                }`}
              />
              {errors.city && <p className="text-red-500 text-xs mt-0.5">{errors.city}</p>}
            </div>
          </div>
        </div>

        {/* Dimensões da Fazenda - Seção com fundo cinza claro */}
        <div className="mb-1 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xs font-semibold text-ai-text mb-0.5">Dimensões da Fazenda (Hectares)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Área Total</label>
              <input
                type="text"
                value={formData.totalArea}
                onChange={(e) => handleNumericChange('totalArea', e.target.value)}
                onBlur={() => handleNumericBlur('totalArea')}
                placeholder="0,00"
                inputMode="decimal"
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white ${
                  errors.totalArea ? 'border-red-500' : 
                  isTotalAreaValid() && formData.totalArea ? 'border-green-500' : 'border-ai-border'
                }`}
              />
              {errors.totalArea && <p className="text-red-500 text-xs mt-0.5">{errors.totalArea}</p>}
              <p className={`text-xs mt-0.5 ${
                isTotalAreaValid() && formData.totalArea ? 'text-green-600' : 'text-ai-subtext'
              }`}>
                Soma das áreas: {formatNumberForDisplay(calculateTotalAreaSum())} ha
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Área de Pastagem</label>
              <input
                type="text"
                value={formData.pastureArea}
                onChange={(e) => handleNumericChange('pastureArea', e.target.value)}
                onBlur={() => handleNumericBlur('pastureArea')}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Área Agricultura</label>
              <input
                type="text"
                value={formData.agricultureArea}
                onChange={(e) => handleNumericChange('agricultureArea', e.target.value)}
                onBlur={() => handleNumericBlur('agricultureArea')}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Outras Culturas</label>
              <input
                type="text"
                value={formData.otherCrops}
                onChange={(e) => handleNumericChange('otherCrops', e.target.value)}
                onBlur={() => handleNumericBlur('otherCrops')}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Infraestrutura</label>
              <input
                type="text"
                value={formData.infrastructure}
                onChange={(e) => handleNumericChange('infrastructure', e.target.value)}
                onBlur={() => handleNumericBlur('infrastructure')}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Reserva e APP</label>
              <input
                type="text"
                value={formData.reserveAndAPP}
                onChange={(e) => handleNumericChange('reserveAndAPP', e.target.value)}
                onBlur={() => handleNumericBlur('reserveAndAPP')}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              />
            </div>
          </div>
        </div>

        {/* Dados da Propriedade e Rebanho - Seção com fundo cinza claro */}
        <div className="mb-1 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xs font-semibold text-ai-text mb-0.5">Dados da Propriedade e Rebanho</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Tipo de propriedade</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as Farm['propertyType'] })}
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              >
                <option value="Própria">Própria</option>
                <option value="Arrendada">Arrendada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Valor da propriedade</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-ai-subtext">R$</span>
                <input
                  type="text"
                  value={formData.propertyValue}
                  onChange={(e) => handleCurrencyChange('propertyValue', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full pl-8 pr-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Métrica de peso utilizada</label>
              <select
                value={formData.weightMetric}
                onChange={(e) => setFormData({ ...formData, weightMetric: e.target.value as Farm['weightMetric'] })}
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              >
                <option value="Arroba (@)">Arroba (@)</option>
                <option value="Quilograma (Kg)">Quilograma (Kg)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Rebanho médio últimos 12 meses</label>
              <input
                type="text"
                value={formData.averageHerd}
                onChange={(e) => {
                  // Remove all non-numeric characters
                  const cleaned = e.target.value.replace(/[^\d]/g, '');
                  // Format with thousands separator
                  const formatted = cleaned ? cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
                  setFormData({ ...formData, averageHerd: formatted });
                }}
                onBlur={() => {
                  // Ensure it's formatted on blur
                  if (formData.averageHerd) {
                    const cleaned = formData.averageHerd.replace(/\./g, '');
                    const formatted = cleaned ? cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
                    setFormData({ ...formData, averageHerd: formatted });
                  }
                }}
                placeholder="0"
                inputMode="numeric"
                className="w-full px-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">Valor do Rebanho</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-ai-subtext">R$</span>
                <input
                  type="text"
                  value={formData.herdValue}
                  onChange={(e) => handleCurrencyChange('herdValue', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full pl-8 pr-2 py-1 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ai-text mb-0.5">
                Sistema de produção <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.productionSystem}
                onChange={(e) => setFormData({ ...formData, productionSystem: e.target.value as Farm['productionSystem'] | '' })}
                className={`w-full px-2 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                  errors.productionSystem ? 'border-red-500' : 'border-ai-border'
                } bg-white`}
              >
                <option value="">Selecione um sistema</option>
                <option value="Cria">Cria</option>
                <option value="Recria-Engorda">Recria-Engorda</option>
                <option value="Ciclo Completo">Ciclo Completo</option>
              </select>
          {errors.productionSystem && (
            <p className="text-red-500 text-xs mt-0.5">{errors.productionSystem}</p>
          )}
            </div>
          </div>
          
          {/* Comercialização de Genética */}
          <div className="mt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.commercializesGenetics}
                onChange={(e) => setFormData({ ...formData, commercializesGenetics: e.target.checked })}
                className="mt-1 w-4 h-4 text-ai-accent border-ai-border rounded focus:ring-ai-accent"
              />
              <div>
                <span className="block text-sm font-medium text-ai-text">
                  Comercializa genética animal
                </span>
                <span className="block text-xs text-ai-subtext mt-1">
                  Selecione se a fazenda vende touros, matrizes ou sêmen
                </span>
              </div>
            </label>
          </div>
        </div>

        </div>
        {/* Action Buttons */}
        <div className="flex gap-1.5 pt-1 border-t border-ai-border flex-shrink-0 mt-0.5">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-2 py-1 text-xs border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-2 py-1 text-xs bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle2 size={14} />
            {editingFarm ? 'Atualizar Fazenda' : 'Cadastrar Fazenda'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmManagement;

