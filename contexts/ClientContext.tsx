import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '../types';

interface ClientContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClient, setSelectedClientState] = useState<Client | null>(() => {
    // Carregar do localStorage se existir
    const saved = localStorage.getItem('selectedClientId');
    if (saved) {
      try {
        const client = JSON.parse(saved);
        // Validar se o cliente tem os campos necessários
        if (client && client.id && client.name) {
          return client;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const setSelectedClient = (client: Client | null) => {
    setSelectedClientState(client);
    if (client) {
      localStorage.setItem('selectedClientId', JSON.stringify(client));
    } else {
      localStorage.removeItem('selectedClientId');
      // Limpar também a fazenda selecionada quando o cliente for limpo
      localStorage.removeItem('selectedFarmId');
    }
  };

  return (
    <ClientContext.Provider value={{ selectedClient, setSelectedClient }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};
