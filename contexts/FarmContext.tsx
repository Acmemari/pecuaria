import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Farm } from '../types';
import { useClient } from './ClientContext';

interface FarmContextType {
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  clearFarm: () => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedClient } = useClient();
  const [selectedFarm, setSelectedFarmState] = useState<Farm | null>(() => {
    // Carregar do localStorage se existir
    const saved = localStorage.getItem('selectedFarm');
    if (saved) {
      try {
        const farm = JSON.parse(saved);
        // Validar se a fazenda tem os campos necessários
        if (farm && farm.id && farm.name) {
          return farm;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  // Limpar fazenda quando o cliente mudar
  useEffect(() => {
    if (selectedFarm && selectedClient) {
      // Se a fazenda não pertence ao cliente selecionado, limpar
      if (selectedFarm.client_id && selectedFarm.client_id !== selectedClient.id) {
        setSelectedFarmState(null);
        localStorage.removeItem('selectedFarm');
      }
    }
    // Se não há cliente selecionado, limpar a fazenda
    if (!selectedClient && selectedFarm) {
      setSelectedFarmState(null);
      localStorage.removeItem('selectedFarm');
    }
  }, [selectedClient, selectedFarm]);

  const setSelectedFarm = useCallback((farm: Farm | null) => {
    setSelectedFarmState(farm);
    if (farm) {
      localStorage.setItem('selectedFarm', JSON.stringify(farm));
    } else {
      localStorage.removeItem('selectedFarm');
    }
  }, []);

  const clearFarm = useCallback(() => {
    setSelectedFarmState(null);
    localStorage.removeItem('selectedFarm');
  }, []);

  const value = useMemo(() => ({
    selectedFarm,
    setSelectedFarm,
    clearFarm
  }), [selectedFarm, setSelectedFarm, clearFarm]);

  return (
    <FarmContext.Provider value={value}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
};
