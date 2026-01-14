import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Building2, Loader2, Check } from 'lucide-react';
import { Farm } from '../types';
import { supabase } from '../lib/supabase';
import { useClient } from '../contexts/ClientContext';

interface FarmSelectorProps {
  selectedFarm: Farm | null;
  onSelectFarm: (farm: Farm | null) => void;
}

const FarmSelector: React.FC<FarmSelectorProps> = ({ selectedFarm, onSelectFarm }) => {
  const { selectedClient } = useClient();
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
  }, [selectedClient]);

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

      // Carregar fazendas do localStorage
      const storedFarms = localStorage.getItem('agro-farms');
      let allFarms: Farm[] = [];
      
      if (storedFarms) {
        try {
          allFarms = JSON.parse(storedFarms) || [];
        } catch (e) {
          console.error('[FarmSelector] Error parsing farms from localStorage:', e);
        }
      }

      // Buscar fazendas vinculadas ao cliente selecionado
      const { data: clientFarmsData, error } = await supabase
        .from('client_farms')
        .select('farm_id')
        .eq('client_id', selectedClient?.id);

      if (error) {
        console.error('[FarmSelector] Error loading client farms:', error);
        setClientFarms([]);
        setFarms([]);
        return;
      }

      if (clientFarmsData && allFarms.length > 0) {
        const farmIds = clientFarmsData.map(cf => cf.farm_id);
        const farmsForClient = allFarms.filter(farm => farmIds.includes(farm.id));
        
        setClientFarms(farmsForClient);
        setFarms(farmsForClient);
        
        // Se não houver fazenda selecionada e houver fazendas, selecionar a primeira
        if (!selectedFarm && farmsForClient.length > 0) {
          onSelectFarm(farmsForClient[0]);
        }
        // Se a fazenda selecionada não estiver mais na lista, limpar seleção
        else if (selectedFarm && !farmsForClient.find(f => f.id === selectedFarm.id)) {
          onSelectFarm(farmsForClient.length > 0 ? farmsForClient[0] : null);
        }
      } else {
        setClientFarms([]);
        setFarms([]);
        onSelectFarm(null);
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
