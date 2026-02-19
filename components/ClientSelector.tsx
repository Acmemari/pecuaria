import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, Loader2, Check } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import { useAnalyst } from '../contexts/AnalystContext';

const ClientSelector: React.FC = () => {
  const { user } = useAuth();
  const { selectedClient, setSelectedClient } = useClient();
  const { selectedAnalyst } = useAnalyst();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determinar qual analista usar: se for admin, usar o analista selecionado; caso contrário, usar o usuário logado
  const effectiveAnalystId = user?.role === 'admin' ? selectedAnalyst?.id : user?.id;

  useEffect(() => {
    if (user && (user.qualification === 'analista' || user.role === 'admin')) {
      // Se for admin, só carregar clientes se houver analista selecionado
      if (user.role === 'admin' && !selectedAnalyst) {
        setClients([]);
        setSelectedClient(null);
        setIsLoading(false);
        return;
      }
      loadClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedAnalyst]);

  // Escutar eventos de clientes adicionados/atualizados/excluídos
  useEffect(() => {
    const handleClientChange = () => {
      // Recarregar clientes quando houver mudanças
      if (user && (user.qualification === 'analista' || user.role === 'admin')) {
        if (user.role === 'admin' && !selectedAnalyst) {
          return; // Não recarregar se for admin sem analista selecionado
        }
        // Usar um pequeno delay para garantir que o banco foi atualizado
        setTimeout(() => {
          loadClients();
        }, 300);
      }
    };

    window.addEventListener('clientAdded', handleClientChange);
    window.addEventListener('clientUpdated', handleClientChange);
    window.addEventListener('clientDeleted', handleClientChange);

    return () => {
      window.removeEventListener('clientAdded', handleClientChange);
      window.removeEventListener('clientUpdated', handleClientChange);
      window.removeEventListener('clientDeleted', handleClientChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedAnalyst, effectiveAnalystId]);

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

  const loadClients = async () => {
    try {
      setIsLoading(true);

      // Buscar clientes vinculados ao analista efetivo (selecionado para admin, ou usuário logado para analista)
      const query = supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      // Filtrar pelo analista efetivo
      if (effectiveAnalystId) {
        query.eq('analyst_id', effectiveAnalystId);
      } else {
        // Se não houver analista efetivo, não buscar clientes
        setClients([]);
        setSelectedClient(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ClientSelector] Error loading clients:', error);
        return;
      }

      if (data) {
        // Mapear campos do banco (snake_case) para a interface (camelCase)
        const mappedClients: Client[] = data.map((client: any) => ({
          id: client.id,
          name: client.name,
          phone: client.phone || '',
          email: client.email,
          analystId: client.analyst_id,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));

        setClients(mappedClients);

        // Validar o cliente salvo no localStorage
        const savedClientId = localStorage.getItem('selectedClientId');
        let savedClient: Client | null = null;
        if (savedClientId) {
          try {
            savedClient = JSON.parse(savedClientId);
          } catch {
            savedClient = null;
          }
        }

        // Verificar se o cliente salvo ainda existe na lista e pertence ao analista atual
        const savedClientExists = savedClient && mappedClients.find(c => c.id === savedClient!.id);

        // Se não houver cliente selecionado e houver clientes, usar o salvo ou o primeiro
        if (!selectedClient && mappedClients.length > 0) {
          const clientToSelect = savedClientExists ? savedClient! : mappedClients[0];
          setSelectedClient(clientToSelect);
          console.log('[ClientSelector] Restored/selected client:', clientToSelect.name);
        }
        // Se o cliente selecionado não estiver mais na lista, usar o salvo ou o primeiro
        else if (selectedClient && !mappedClients.find(c => c.id === selectedClient.id)) {
          const clientToSelect = savedClientExists ? savedClient! : (mappedClients.length > 0 ? mappedClients[0] : null);
          setSelectedClient(clientToSelect);
          if (!clientToSelect) {
            // Limpar fazenda se não houver cliente
            localStorage.removeItem('selectedFarmId');
          } else {
            // Se mudou o cliente, limpar a fazenda para forçar nova seleção
            localStorage.removeItem('selectedFarmId');
          }
        }
        // Se o cliente selecionado está na lista, garantir que está salvo e atualizado
        else if (selectedClient && mappedClients.find(c => c.id === selectedClient.id)) {
          // Atualizar o cliente salvo com os dados mais recentes da lista se houver mudanças reais
          const updatedClient = mappedClients.find(c => c.id === selectedClient.id);
          if (updatedClient && (
            updatedClient.name !== selectedClient.name ||
            updatedClient.email !== selectedClient.email ||
            updatedClient.phone !== selectedClient.phone
          )) {
            setSelectedClient(updatedClient);
            localStorage.setItem('selectedClientId', JSON.stringify(updatedClient));
          }
        }
      }
    } catch (err: any) {
      console.error('[ClientSelector] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setIsOpen(false);
  };

  // Não mostrar se não for analista ou admin
  if (!user || (user.qualification !== 'analista' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => clients.length > 0 && setIsOpen(!isOpen)}
        disabled={clients.length === 0}
        className={`flex items-center gap-2 px-3 py-1.5 bg-ai-surface2 border border-ai-border rounded-md text-sm text-ai-text transition-colors min-w-[180px] ${clients.length > 0 ? 'hover:bg-ai-surface3 cursor-pointer' : 'opacity-60 cursor-not-allowed'
          }`}
        title={clients.length > 0 ? "Selecionar cliente" : "Nenhum cliente cadastrado"}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-ai-subtext" />
            <span className="text-xs text-ai-subtext">Carregando...</span>
          </>
        ) : selectedClient ? (
          <>
            <User className="w-4 h-4 text-ai-accent flex-shrink-0" />
            <span className="truncate text-left flex-1">{selectedClient.name}</span>
            <ChevronDown className={`w-4 h-4 text-ai-subtext flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        ) : clients.length === 0 ? (
          <>
            <User className="w-4 h-4 text-ai-subtext flex-shrink-0" />
            <span className="text-xs text-ai-subtext">Sem clientes</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-ai-subtext flex-shrink-0" />
            <span className="text-xs text-ai-subtext">Selecione um cliente</span>
            <ChevronDown className={`w-4 h-4 text-ai-subtext flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg border border-ai-border shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-ai-accent mx-auto" />
              <p className="text-xs text-ai-subtext mt-2">Carregando clientes...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-ai-subtext">Nenhum cliente cadastrado</p>
              <p className="text-[10px] text-ai-subtext mt-1">Cadastre clientes em Cadastro de Clientes</p>
            </div>
          ) : (
            <div className="py-1">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${selectedClient?.id === client.id
                      ? 'bg-ai-accent/10 text-ai-accent'
                      : 'text-ai-text hover:bg-ai-surface2'
                    }`}
                >
                  {selectedClient?.id === client.id && (
                    <Check className="w-4 h-4 text-ai-accent flex-shrink-0" />
                  )}
                  <User className={`w-4 h-4 flex-shrink-0 ${selectedClient?.id === client.id ? 'text-ai-accent' : 'text-ai-subtext'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{client.name}</p>
                    {client.email && (
                      <p className="text-xs text-ai-subtext truncate">{client.email}</p>
                    )}
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

export default ClientSelector;
