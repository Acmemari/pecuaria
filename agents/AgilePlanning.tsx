import React, { useState, useEffect } from 'react';
import { useClient } from '../contexts/ClientContext';
import { useAuth } from '../contexts/AuthContext';
import { Farm } from '../types';
import { supabase } from '../lib/supabase';
import { Building2, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import ClientSelector from '../components/ClientSelector';
import FarmSelector from '../components/FarmSelector';

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

  useEffect(() => {
    // Verificar se há cliente e fazenda selecionados
    if (selectedClient && selectedFarm) {
      setIsLoading(false);
      setShowSelectionModal(false);
    } else {
      // Se não houver, mostrar modal de seleção
      setIsLoading(false);
      setShowSelectionModal(true);
      loadClients();
    }
  }, [selectedClient, selectedFarm]);

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ai-text mb-2">Planejamento Ágil</h1>
        <div className="flex items-center gap-4 text-sm text-ai-subtext">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>Cliente: <strong className="text-ai-text">{selectedClient?.name}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 size={16} />
            <span>Fazenda: <strong className="text-ai-text">{selectedFarm?.name}</strong></span>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 bg-white rounded-lg border border-ai-border p-6">
        <div className="text-center py-12">
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
  );
};

export default AgilePlanning;
