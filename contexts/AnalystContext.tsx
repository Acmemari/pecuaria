import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '../types';

interface AnalystContextType {
  selectedAnalyst: User | null;
  setSelectedAnalyst: (analyst: User | null) => void;
}

const AnalystContext = createContext<AnalystContextType | undefined>(undefined);

export const AnalystProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAnalyst, setSelectedAnalystState] = useState<User | null>(() => {
    // Carregar do localStorage se existir
    const saved = localStorage.getItem('selectedAnalystId');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setSelectedAnalyst = useCallback((analyst: User | null) => {
    setSelectedAnalystState(analyst);
    if (analyst) {
      localStorage.setItem('selectedAnalystId', JSON.stringify(analyst));
    } else {
      localStorage.removeItem('selectedAnalystId');
    }

    // Ao trocar de analista, limpar cliente e fazenda selecionados
    // Isso garante que o admin não veja dados do analista anterior
    localStorage.removeItem('selectedClientId');
    localStorage.removeItem('selectedFarmId');
  }, []);

  const value = useMemo(() => ({
    selectedAnalyst,
    setSelectedAnalyst
  }), [selectedAnalyst, setSelectedAnalyst]);

  return (
    <AnalystContext.Provider value={value}>
      {children}
    </AnalystContext.Provider>
  );
};

export const useAnalyst = () => {
  const context = useContext(AnalystContext);
  if (context === undefined) {
    throw new Error('useAnalyst must be used within an AnalystProvider');
  }
  return context;
};
