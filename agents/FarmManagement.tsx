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
    propertyType: 'Própria' as Farm['propertyType'],
    weightMetric: 'Arroba (@)' as Farm['weightMetric'],
    commercializesGenetics: false,
    productionSystem: '' as Farm['productionSystem'] | ''
  });

  // Países disponíveis
  const COUNTRIES = ['Brasil', 'Paraguai', 'Uruguai', 'Bolívia', 'Colômbia', 'Argentina'];

  // Verificar se o estado deve ser obrigatório (apenas para Brasil)
  const isStateRequired = formData.country === 'Brasil';

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (editingFarm) {
      // Update existing farm
      updatedFarms = farms.map(farm =>
        farm.id === editingFarm.id
          ? {
              ...farm,
              ...formData,
              productionSystem: formData.productionSystem as Farm['productionSystem'],
              updatedAt: now
            }
          : farm
      );
    } else {
      // Create new farm
      const newFarm: Farm = {
        id: `farm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...formData,
        productionSystem: formData.productionSystem as Farm['productionSystem'],
        createdAt: now,
        updatedAt: now
      };
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

  const handleEdit = (farm: Farm) => {
    setEditingFarm(farm);
    setIsCreatingNew(false); // Não está criando, está editando
    setFormData({
      name: farm.name,
      country: farm.country,
      state: farm.state,
      city: farm.city,
      propertyType: farm.propertyType,
      weightMetric: farm.weightMetric,
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
      propertyType: 'Própria',
      weightMetric: 'Arroba (@)',
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
    <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
      <style>{`
        /* Estilos customizados para barras de rolagem dos selects */
        select::-webkit-scrollbar {
          width: 12px;
        }
        select::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        select::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        select::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
        /* Firefox */
        select {
          scrollbar-width: auto;
          scrollbar-color: #3b82f6 #f1f5f9;
        }
      `}</style>
      <div className="mb-3">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-ai-subtext hover:text-ai-text transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft size={18} />
          Voltar para lista
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-ai-text">
          {editingFarm ? 'Editar Fazenda' : 'Cadastrar Fazenda'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white rounded-lg border border-ai-border p-4 md:p-6">
        {/* Nome da Fazenda */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ai-text mb-1">
            Nome da fazenda <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da fazenda"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
              errors.name ? 'border-red-500' : 'border-ai-border'
            }`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Localização */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-ai-text mb-3">Localização</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">País</label>
              <select
                value={formData.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">
                Estado {isStateRequired && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={!isStateRequired}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
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
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">
                Cidade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                  errors.city ? 'border-red-500' : 'border-ai-border'
                }`}
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
          </div>
        </div>

        {/* Tipo de Propriedade e Métrica de Peso - Grid 2 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Tipo de propriedade</label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as Farm['propertyType'] })}
              className="w-full px-3 py-2 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent"
            >
              <option value="Própria">Própria</option>
              <option value="Arrendada">Arrendada</option>
              <option value="Parceria">Parceria</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Métrica de peso utilizada</label>
            <select
              value={formData.weightMetric}
              onChange={(e) => setFormData({ ...formData, weightMetric: e.target.value as Farm['weightMetric'] })}
              className="w-full px-3 py-2 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent"
            >
              <option value="Arroba (@)">Arroba (@)</option>
              <option value="Quilograma (Kg)">Quilograma (Kg)</option>
            </select>
          </div>
        </div>

        {/* Comercialização de Genética */}
        <div className="mb-4">
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

        {/* Sistema de Produção */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ai-text mb-1">
            Sistema de produção <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.productionSystem}
            onChange={(e) => setFormData({ ...formData, productionSystem: e.target.value as Farm['productionSystem'] | '' })}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent ${
              errors.productionSystem ? 'border-red-500' : 'border-ai-border'
            }`}
          >
            <option value="">Selecione um sistema</option>
            <option value="Cria">Cria</option>
            <option value="Recria-Engorda">Recria-Engorda</option>
            <option value="Ciclo Completo">Ciclo Completo</option>
          </select>
          {errors.productionSystem && (
            <p className="text-red-500 text-xs mt-1">{errors.productionSystem}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-ai-border">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            {editingFarm ? 'Atualizar Fazenda' : 'Cadastrar Fazenda'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmManagement;

