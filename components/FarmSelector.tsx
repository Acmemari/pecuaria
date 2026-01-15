import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Loader2, Check } from 'lucide-react';
import { Farm } from '../types';
import { supabase } from '../lib/supabase';
import { useClient } from '../contexts/ClientContext';
import { useAuth } from '../contexts/AuthContext';

interface FarmSelectorProps {
  selectedFarm: Farm | null;
  onSelectFarm: (farm: Farm | null) => void;
}

const FarmSelector: React.FC<FarmSelectorProps> = ({ selectedFarm, onSelectFarm }) => {
  const { selectedClient } = useClient();
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [clientFarms, setClientFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedClient) {
      loadClientFarms();
    } else {
      setClientFarms([]);
      setFarms([]);
      onSelectFarm(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, user]);

  // Recarregar fazendas quando uma nova fazenda for cadastrada (evento customizado)
  useEffect(() => {
    if (selectedClient) {
      const handleFarmAdded = () => {
        loadClientFarms();
      };

      window.addEventListener('farmAdded', handleFarmAdded);
      window.addEventListener('farmUpdated', handleFarmAdded);

      return () => {
        window.removeEventListener('farmAdded', handleFarmAdded);
        window.removeEventListener('farmUpdated', handleFarmAdded);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadClientFarms = async () => {
    try {
      setIsLoading(true);

      let farmsForClient: Farm[] = [];
      const allFarmIds = new Set<string>();

      // Buscar fazendas vinculadas ao cliente selecionado diretamente do banco
      if (selectedClient) {
        console.log('[FarmSelector] Searching for farms linked to client:', selectedClient.id);
        
        // 1. Buscar fazendas através da tabela client_farms
        const { data: clientFarmsData, error } = await supabase
          .from('client_farms')
          .select('farm_id')
          .eq('client_id', selectedClient.id);

        if (error) {
          console.error('[FarmSelector] Error loading client_farms:', error);
        } else if (clientFarmsData && clientFarmsData.length > 0) {
          clientFarmsData.forEach(cf => allFarmIds.add(cf.farm_id));
          console.log('[FarmSelector] Found', clientFarmsData.length, 'farms in client_farms table');
        }

        // 2. Buscar fazendas diretamente vinculadas pelo campo client_id na tabela farms
        const { data: directFarmsData, error: directError } = await supabase
          .from('farms')
          .select('id')
          .eq('client_id', selectedClient.id);

        if (directError) {
          console.error('[FarmSelector] Error loading farms by client_id:', directError);
        } else if (directFarmsData && directFarmsData.length > 0) {
          directFarmsData.forEach(f => allFarmIds.add(f.id));
          console.log('[FarmSelector] Found', directFarmsData.length, 'farms directly linked by client_id');
        }

        // 3. Buscar detalhes de todas as fazendas encontradas
        if (allFarmIds.size > 0) {
          const farmIdsArray = Array.from(allFarmIds);
          const { data: dbFarms, error: dbError } = await supabase
            .from('farms')
            .select('*')
            .in('id', farmIdsArray);

          if (!dbError && dbFarms && dbFarms.length > 0) {
            // Converter do formato do banco para o formato Farm
            farmsForClient = dbFarms.map(farm => ({
              id: farm.id,
              name: farm.name,
              country: farm.country,
              state: farm.state || '',
              city: farm.city,
              clientId: farm.client_id,
              totalArea: farm.total_area,
              pastureArea: farm.pasture_area,
              agricultureArea: farm.agriculture_area,
              otherCrops: farm.other_crops,
              infrastructure: farm.infrastructure,
              reserveAndAPP: farm.reserve_and_app,
              propertyValue: farm.property_value,
              operationPecuary: farm.operation_pecuary,
              operationAgricultural: farm.operation_agricultural,
              otherOperations: farm.other_operations,
              agricultureVariation: farm.agriculture_variation,
              propertyType: farm.property_type as 'Própria' | 'Arrendada',
              weightMetric: farm.weight_metric as 'Arroba (@)' | 'Quilograma (Kg)',
              averageHerd: farm.average_herd,
              herdValue: farm.herd_value,
              commercializesGenetics: farm.commercializes_genetics || false,
              productionSystem: farm.production_system as 'Cria' | 'Recria-Engorda' | 'Ciclo Completo',
              createdAt: farm.created_at || new Date().toISOString(),
              updatedAt: farm.updated_at || new Date().toISOString()
            } as Farm));
            console.log('[FarmSelector] Found', farmsForClient.length, 'farms linked to client from database');
          } else {
            // Fallback: tentar carregar do localStorage
            const storedFarms = localStorage.getItem('agro-farms');
            if (storedFarms) {
              try {
                const allFarms: Farm[] = JSON.parse(storedFarms) || [];
                farmsForClient = allFarms.filter(farm => allFarmIds.has(farm.id));
                console.log('[FarmSelector] Found', farmsForClient.length, 'farms from localStorage');
              } catch (e) {
                console.error('[FarmSelector] Error parsing farms from localStorage:', e);
              }
            }
          }
        } else {
          console.log('[FarmSelector] No farms found linked to this client');
        }
      }

      // Se não houver fazendas vinculadas, não mostrar nenhuma
      // Regra de negócio: fazendas devem sempre estar vinculadas a um cliente
      if (farmsForClient.length === 0) {
        console.log('[FarmSelector] No linked farms found. User must register farms properly linked to clients.');
      }
      
      console.log('[FarmSelector] Final farms to display:', farmsForClient.length);
      setClientFarms(farmsForClient);
      setFarms(farmsForClient);
      
      // Tentar carregar fazenda salva do localStorage
      const savedFarmId = localStorage.getItem('selectedFarmId');
      let farmToSelect: Farm | null = null;
      
      if (savedFarmId && farmsForClient.length > 0) {
        const savedFarm = farmsForClient.find(f => f.id === savedFarmId);
        if (savedFarm) {
          farmToSelect = savedFarm;
          console.log('[FarmSelector] Restored saved farm from localStorage:', savedFarm.name);
        }
      }
      
      // Se não houver fazenda selecionada e houver fazendas, selecionar a primeira ou a salva
      if (!selectedFarm && farmsForClient.length > 0) {
        const farm = farmToSelect || farmsForClient[0];
        console.log('[FarmSelector] Auto-selecting farm:', farm.name);
        onSelectFarm(farm);
        // Salvar no localStorage
        localStorage.setItem('selectedFarmId', farm.id);
      }
      // Se a fazenda selecionada não estiver mais na lista, usar a salva ou a primeira
      else if (selectedFarm && !farmsForClient.find(f => f.id === selectedFarm.id)) {
        const farm = farmToSelect || (farmsForClient.length > 0 ? farmsForClient[0] : null);
        onSelectFarm(farm);
        if (farm) {
          localStorage.setItem('selectedFarmId', farm.id);
        } else {
          localStorage.removeItem('selectedFarmId');
        }
      }
      // Se a fazenda selecionada está na lista, garantir que está salva
      else if (selectedFarm && farmsForClient.find(f => f.id === selectedFarm.id)) {
        localStorage.setItem('selectedFarmId', selectedFarm.id);
      }
    } catch (err: any) {
      console.error('[FarmSelector] Unexpected error:', err);
      setClientFarms([]);
      setFarms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFarm = (farm: Farm) => {
    onSelectFarm(farm);
    setIsOpen(false);
  };

  // Não mostrar se não houver cliente selecionado
  if (!selectedClient) {
    return null;
  }

  // Não mostrar se não houver fazendas
  if (!isLoading && farms.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-ai-surface2 border border-ai-border rounded-md text-sm text-ai-subtext min-w-[180px]">
        <Building2 className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">Nenhuma fazenda</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-ai-surface2 hover:bg-ai-surface3 border border-ai-border rounded-md text-sm text-ai-text transition-colors min-w-[180px]"
        title="Selecionar fazenda"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-ai-subtext" />
            <span className="text-xs text-ai-subtext">Carregando...</span>
          </>
        ) : selectedFarm ? (
          <>
            <Building2 className="w-4 h-4 text-ai-accent flex-shrink-0" />
            <span className="truncate text-left flex-1">{selectedFarm.name}</span>
            <ChevronDown className={`w-4 h-4 text-ai-subtext flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 text-ai-subtext flex-shrink-0" />
            <span className="text-xs text-ai-subtext">Selecione uma fazenda</span>
            <ChevronDown className={`w-4 h-4 text-ai-subtext flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg border border-ai-border shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-ai-accent mx-auto" />
              <p className="text-xs text-ai-subtext mt-2">Carregando fazendas...</p>
            </div>
          ) : farms.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-ai-subtext">Nenhuma fazenda vinculada</p>
            </div>
          ) : (
            <div className="py-1">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => handleSelectFarm(farm)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                    selectedFarm?.id === farm.id
                      ? 'bg-ai-accent/10 text-ai-accent'
                      : 'text-ai-text hover:bg-ai-surface2'
                  }`}
                >
                  {selectedFarm?.id === farm.id && (
                    <Check className="w-4 h-4 text-ai-accent flex-shrink-0" />
                  )}
                  <Building2 className={`w-4 h-4 flex-shrink-0 ${selectedFarm?.id === farm.id ? 'text-ai-accent' : 'text-ai-subtext'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{farm.name}</p>
                    <p className="text-xs text-ai-subtext truncate">
                      {farm.city}, {farm.state || farm.country}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmSelector;
