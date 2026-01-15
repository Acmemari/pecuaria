import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Building2,
  User,
  Mail,
  Phone,
  Users
} from 'lucide-react';
import { Client, Farm } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ClientManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ onToast }) => {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [analysts, setAnalysts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [selectedClientFarms, setSelectedClientFarms] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    analystId: currentUser?.id || ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.qualification === 'analista')) {
      loadClients();
      loadFarms();
      loadAnalysts();
    } else if (currentUser) {
      setError('Acesso negado. Apenas analistas e administradores podem acessar esta página.');
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Construir query base
      let query = supabase
        .from('clients')
        .select('*');

      // Filtrar por analista: se for analista, mostrar apenas seus clientes; se for admin, mostrar todos
      if (currentUser?.qualification === 'analista' && currentUser?.role !== 'admin') {
        // Analista vê apenas seus próprios clientes
        query = query.eq('analyst_id', currentUser.id);
      }
      // Admin vê todos os clientes (sem filtro)

      query = query.order('created_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('[ClientManagement] Error loading clients:', queryError);
        setError(`Erro ao carregar clientes: ${queryError.message}`);
        return;
      }

      if (data) {
        // Buscar informações dos analistas para cada cliente
        const clientsWithAnalysts = await Promise.all(
          data.map(async (client) => {
            const { data: analystData } = await supabase
              .from('user_profiles')
              .select('id, name, email')
              .eq('id', client.analyst_id)
              .single();

            return {
              ...client,
              analyst: analystData || null
            };
          })
        );

        setClients(clientsWithAnalysts as any);
      }
    } catch (err: any) {
      console.error('[ClientManagement] Unexpected error:', err);
      setError(`Erro inesperado: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFarms = async () => {
    try {
      // Buscar fazendas do banco de dados que pertencem aos clientes do analista
      // As RLS policies garantem que só veremos fazendas dos nossos clientes
      const { data: dbFarms, error: dbError } = await supabase
        .from('farms')
        .select('*')
        .order('name', { ascending: true });

      if (!dbError && dbFarms && dbFarms.length > 0) {
        // Converter do formato do banco para o formato Farm
        const convertedFarms: Farm[] = dbFarms.map(farm => ({
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
        }));
        
        setFarms(convertedFarms);
        return;
      }

      // Fallback: carregar do localStorage
      const storedFarms = localStorage.getItem('agro-farms');
      if (storedFarms) {
        const parsedFarms = JSON.parse(storedFarms);
        setFarms(parsedFarms || []);
      }
    } catch (err: any) {
      console.error('[ClientManagement] Error loading farms:', err);
    }
  };

  const loadAnalysts = async () => {
    try {
      // Buscar apenas usuários com qualification='analista' (não incluir administradores que não são analistas)
      const { data, error: queryError } = await supabase
        .from('user_profiles')
        .select('id, name, email, qualification')
        .eq('qualification', 'analista')
        .order('name', { ascending: true });

      if (queryError) {
        console.error('[ClientManagement] Error loading analysts:', queryError);
        return;
      }

      if (data) {
        setAnalysts(data);
      }
    } catch (err: any) {
      console.error('[ClientManagement] Error loading analysts:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!formData.analystId) {
      errors.analystId = 'Analista responsável é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingClient) {
        // Update existing client
        const { data, error: updateError } = await supabase
          .from('clients')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim(),
            analyst_id: formData.analystId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingClient.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Update client-farm relationships
        await updateClientFarms(editingClient.id);

        onToast?.('Cliente atualizado com sucesso!', 'success');
      } else {
        // Create new client
        const { data, error: insertError } = await supabase
          .from('clients')
          .insert({
            name: formData.name.trim(),
            phone: formData.phone.trim() || null,
            email: formData.email.trim(),
            analyst_id: formData.analystId
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Create client-farm relationships
        if (data && selectedClientFarms.length > 0) {
          await updateClientFarms(data.id);
        }

        onToast?.('Cliente cadastrado com sucesso!', 'success');
      }

      // Reset form
      resetForm();
      setView('list');
      loadClients();
      
      // Disparar evento para atualizar o ClientSelector após um pequeno delay
      // para garantir que o banco de dados foi atualizado
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('clientAdded'));
        window.dispatchEvent(new CustomEvent('clientUpdated'));
      }, 500);
    } catch (err: any) {
      console.error('[ClientManagement] Error saving client:', err);
      onToast?.(`Erro ao salvar cliente: ${err.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateClientFarms = async (clientId: string) => {
    try {
      // Get current client farms
      const { data: currentFarms } = await supabase
        .from('client_farms')
        .select('farm_id')
        .eq('client_id', clientId);

      const currentFarmIds = (currentFarms || []).map(cf => cf.farm_id);

      // Remove farms that are no longer selected
      const farmsToRemove = currentFarmIds.filter(id => !selectedClientFarms.includes(id));
      if (farmsToRemove.length > 0) {
        await supabase
          .from('client_farms')
          .delete()
          .eq('client_id', clientId)
          .in('farm_id', farmsToRemove);
      }

      // Add new farms
      const farmsToAdd = selectedClientFarms.filter(id => !currentFarmIds.includes(id));
      if (farmsToAdd.length > 0) {
        await supabase
          .from('client_farms')
          .insert(
            farmsToAdd.map(farmId => ({
              client_id: clientId,
              farm_id: farmId
            }))
          );
      }
    } catch (err: any) {
      console.error('[ClientManagement] Error updating client farms:', err);
    }
  };

  const handleEdit = async (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email,
      analystId: client.analystId
    });

    // Load client farms
    const { data } = await supabase
      .from('client_farms')
      .select('farm_id')
      .eq('client_id', client.id);

    setSelectedClientFarms((data || []).map(cf => cf.farm_id));
    setView('form');
  };

  const handleDelete = async (clientId: string) => {
    try {
      // 1. Buscar fazendas vinculadas ao cliente
      const clientFarms = await getClientFarms(clientId);
      
      // 2. Mostrar confirmação com detalhes
      const farmCount = clientFarms.length;
      const farmNames = clientFarms.map(f => f.name).join(', ');
      
      let confirmMessage = `Tem certeza que deseja excluir este cliente?\n\n`;
      
      if (farmCount > 0) {
        confirmMessage += `⚠️ ATENÇÃO: Esta ação irá excluir:\n`;
        confirmMessage += `• ${farmCount} fazenda${farmCount !== 1 ? 's' : ''}: ${farmNames}\n`;
        confirmMessage += `• Todos os vínculos e registros associados\n\n`;
        confirmMessage += `Esta ação NÃO pode ser desfeita!`;
      } else {
        confirmMessage += `O cliente será removido do sistema.`;
      }
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Iniciar processo de exclusão
      setDeletingClientId(clientId);

      // 3. Se houver fazendas, excluí-las primeiro
      if (farmCount > 0) {
        for (const farm of clientFarms) {
          // Excluir vínculos analyst_farms
          await supabase
            .from('analyst_farms')
            .delete()
            .eq('farm_id', farm.id);
          
          // Excluir fazenda do banco
          await supabase
            .from('farms')
            .delete()
            .eq('id', farm.id);
          
          // Remover do localStorage
          const storedFarms = localStorage.getItem('agro-farms');
          if (storedFarms) {
            const allFarms = JSON.parse(storedFarms);
            const updatedFarms = allFarms.filter((f: Farm) => f.id !== farm.id);
            localStorage.setItem('agro-farms', JSON.stringify(updatedFarms));
          }
        }
      }

      // 4. Excluir o cliente (client_farms será excluído automaticamente por cascata)
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      // 5. Mensagem de sucesso
      if (farmCount > 0) {
        onToast?.(`Cliente e ${farmCount} fazenda${farmCount !== 1 ? 's' : ''} excluídos com sucesso!`, 'success');
      } else {
        onToast?.('Cliente excluído com sucesso!', 'success');
      }
      
      loadClients();
      
      // Disparar eventos para atualizar seletores
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('clientDeleted'));
        window.dispatchEvent(new CustomEvent('farmUpdated'));
      }, 500);
    } catch (err: any) {
      console.error('[ClientManagement] Error deleting client:', err);
      onToast?.(`Erro ao excluir cliente: ${err.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setDeletingClientId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      analystId: currentUser?.id || ''
    });
    setFormErrors({});
    setEditingClient(null);
    setSelectedClientFarms([]);
  };

  const handleCancel = () => {
    resetForm();
    setView('list');
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  const getClientFarms = async (clientId: string): Promise<Farm[]> => {
    try {
      // Buscar fazendas vinculadas ao cliente da tabela client_farms
      const { data: clientFarmsData, error: clientFarmsError } = await supabase
        .from('client_farms')
        .select('farm_id')
        .eq('client_id', clientId);

      if (clientFarmsError) {
        console.error('[ClientManagement] Error loading client_farms:', clientFarmsError);
        return [];
      }

      if (!clientFarmsData || clientFarmsData.length === 0) {
        return [];
      }

      const farmIds = clientFarmsData.map(cf => cf.farm_id);

      // Tentar buscar fazendas do banco de dados primeiro
      const { data: dbFarms, error: dbError } = await supabase
        .from('farms')
        .select('*')
        .in('id', farmIds);

      if (!dbError && dbFarms && dbFarms.length > 0) {
        // Converter do formato do banco para o formato Farm
        return dbFarms.map(farm => ({
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
      }

      // Fallback: buscar do localStorage se não encontrar no banco
      return farms.filter(farm => farmIds.includes(farm.id));
    } catch (err) {
      console.error('[ClientManagement] Error loading client farms:', err);
      return [];
    }
  };

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.qualification !== 'analista')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-ai-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ai-text mb-2">Acesso Negado</h2>
          <p className="text-ai-subtext">Apenas analistas e administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (view === 'form') {
    return (
      <div className="h-full overflow-y-auto bg-ai-bg">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-ai-surface rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-ai-text">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-ai-surface2 rounded-md transition-colors"
                title="Cancelar"
              >
                <X className="w-5 h-5 text-ai-subtext" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Nome do Cliente <span className="text-ai-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 bg-ai-surface2 border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                    formErrors.name ? 'border-ai-error' : 'border-ai-border'
                  }`}
                  placeholder="Digite o nome do cliente"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-ai-error">{formErrors.name}</p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-ai-surface2 border border-ai-border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Email <span className="text-ai-error">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 bg-ai-surface2 border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                    formErrors.email ? 'border-ai-error' : 'border-ai-border'
                  }`}
                  placeholder="cliente@exemplo.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-ai-error">{formErrors.email}</p>
                )}
              </div>

              {/* Analista Responsável */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Analista Responsável <span className="text-ai-error">*</span>
                </label>
                <select
                  value={formData.analystId}
                  onChange={(e) => setFormData({ ...formData, analystId: e.target.value })}
                  className={`w-full px-4 py-2 bg-ai-surface2 border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent ${
                    formErrors.analystId ? 'border-ai-error' : 'border-ai-border'
                  }`}
                  disabled={currentUser.role !== 'admin'} // Apenas admin pode escolher analista
                >
                  <option value="">Selecione um analista</option>
                  {analysts.map(analyst => (
                    <option key={analyst.id} value={analyst.id}>
                      {analyst.name} {analyst.email ? `(${analyst.email})` : ''}
                    </option>
                  ))}
                </select>
                {formErrors.analystId && (
                  <p className="mt-1 text-sm text-ai-error">{formErrors.analystId}</p>
                )}
                {currentUser.role !== 'admin' && (
                  <p className="mt-1 text-xs text-ai-subtext">
                    Você será automaticamente vinculado como analista responsável
                  </p>
                )}
              </div>

              {/* Fazendas Vinculadas */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Fazendas Vinculadas
                </label>
                <div className="max-h-48 overflow-y-auto border border-ai-border rounded-md p-3 bg-ai-surface2">
                  {farms.length === 0 ? (
                    <p className="text-sm text-ai-subtext">Nenhuma fazenda cadastrada no sistema.</p>
                  ) : (
                    <div className="space-y-2">
                      {farms.map(farm => (
                        <label key={farm.id} className="flex items-center space-x-2 cursor-pointer hover:bg-ai-surface p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedClientFarms.includes(farm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClientFarms([...selectedClientFarms, farm.id]);
                              } else {
                                setSelectedClientFarms(selectedClientFarms.filter(id => id !== farm.id));
                              }
                            }}
                            className="w-4 h-4 text-ai-accent rounded focus:ring-ai-accent"
                          />
                          <span className="text-sm text-ai-text">
                            {farm.name} - {farm.city}, {farm.state || farm.country}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-ai-subtext">
                  Selecione as fazendas que pertencem a este cliente
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-ai-border">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-ai-text bg-ai-surface2 hover:bg-ai-surface3 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-ai-accent text-white rounded-md hover:bg-ai-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingClient ? 'Atualizar' : 'Cadastrar'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-ai-bg">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-ai-text mb-2">Gestão de Clientes</h1>
            <p className="text-ai-subtext">Cadastre e gerencie os clientes do sistema</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setView('form');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-ai-accent text-white rounded-md hover:bg-ai-accent/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Cliente</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ai-subtext" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full pl-10 pr-4 py-2 bg-ai-surface2 border border-ai-border rounded-md text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-ai-error/10 border border-ai-error rounded-md flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-ai-error" />
            <p className="text-ai-error">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-ai-accent" />
          </div>
        ) : (
          /* Clients List */
          <div className="bg-ai-surface rounded-lg shadow-lg overflow-hidden">
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-ai-subtext mx-auto mb-4" />
                <p className="text-ai-subtext text-lg">
                  {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => {
                      resetForm();
                      setView('form');
                    }}
                    className="mt-4 px-4 py-2 bg-ai-accent text-white rounded-md hover:bg-ai-accent/90 transition-colors"
                  >
                    Cadastrar Primeiro Cliente
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-ai-surface2">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ai-subtext uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ai-subtext uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ai-subtext uppercase tracking-wider">
                        Analista
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-ai-subtext uppercase tracking-wider">
                        Fazendas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-ai-subtext uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ai-border">
                    {filteredClients.map((client) => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        deletingClientId={deletingClientId}
                        getClientFarms={getClientFarms}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ClientRowProps {
  client: Client & { analyst?: { name: string; email: string } };
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  deletingClientId: string | null;
  getClientFarms: (clientId: string) => Promise<Farm[]>;
}

const ClientRow: React.FC<ClientRowProps> = ({
  client,
  onEdit,
  onDelete,
  deletingClientId,
  getClientFarms
}) => {
  const [farmsCount, setFarmsCount] = useState<number | null>(null);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [showFarmsModal, setShowFarmsModal] = useState(false);
  const [clientFarmsList, setClientFarmsList] = useState<Farm[]>([]);
  const [loadingFarmsList, setLoadingFarmsList] = useState(false);

  useEffect(() => {
    loadFarmsCount();
  }, [client.id]);

  const loadFarmsCount = async () => {
    setLoadingFarms(true);
    try {
      // Buscar diretamente da tabela client_farms para contar (mais eficiente)
      const { data, error, count } = await supabase
        .from('client_farms')
        .select('*', { count: 'exact', head: false })
        .eq('client_id', client.id);

      if (error) {
        console.error('[ClientRow] Error loading farms count:', error);
        // Fallback: usar getClientFarms
        const clientFarms = await getClientFarms(client.id);
        setFarmsCount(clientFarms.length);
      } else {
        // Usar count se disponível, senão usar o tamanho do array
        setFarmsCount(count !== null ? count : (data?.length || 0));
      }
    } catch (err) {
      console.error('[ClientRow] Error loading farms:', err);
      // Fallback: usar getClientFarms
      try {
        const clientFarms = await getClientFarms(client.id);
        setFarmsCount(clientFarms.length);
      } catch (fallbackErr) {
        console.error('[ClientRow] Error in fallback:', fallbackErr);
        setFarmsCount(0);
      }
    } finally {
      setLoadingFarms(false);
    }
  };

  const handleViewFarms = async () => {
    if ((farmsCount ?? 0) === 0) {
      return; // Não abrir modal se não houver fazendas
    }

    setShowFarmsModal(true);
    setLoadingFarmsList(true);
    try {
      const farms = await getClientFarms(client.id);
      setClientFarmsList(farms);
    } catch (err) {
      console.error('[ClientRow] Error loading farms list:', err);
      setClientFarmsList([]);
    } finally {
      setLoadingFarmsList(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-ai-surface2 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-ai-accent/20 flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-ai-accent" />
            </div>
            <div>
              <div className="text-sm font-medium text-ai-text">{client.name}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-ai-text space-y-1">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-ai-subtext" />
              <span>{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-ai-subtext" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-ai-text">
            {client.analyst?.name || 'N/A'}
          </div>
        </td>
        <td className="px-6 py-4">
          {loadingFarms ? (
            <Loader2 className="w-4 h-4 animate-spin text-ai-accent" />
          ) : (
            <button
              onClick={handleViewFarms}
              disabled={(farmsCount ?? 0) === 0}
              className={`flex items-center space-x-1 text-sm text-ai-text ${
                (farmsCount ?? 0) > 0 
                  ? 'hover:text-ai-accent hover:underline cursor-pointer transition-colors' 
                  : 'cursor-not-allowed opacity-60'
              }`}
              title={(farmsCount ?? 0) > 0 ? 'Clique para ver as fazendas' : 'Nenhuma fazenda vinculada'}
            >
              <Building2 className="w-4 h-4 text-ai-subtext" />
              <span>{farmsCount ?? 0} fazenda{farmsCount !== 1 ? 's' : ''}</span>
            </button>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => onEdit(client)}
              className="p-2 text-ai-accent hover:bg-ai-surface2 rounded-md transition-colors"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(client.id)}
              disabled={deletingClientId === client.id}
              className="p-2 text-ai-error hover:bg-ai-error/10 rounded-md transition-colors disabled:opacity-50"
              title="Excluir cliente"
            >
              {deletingClientId === client.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {/* Modal de Fazendas */}
      {showFarmsModal && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFarmsModal(false)}>
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-ai-border flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-ai-text">Fazendas de {client.name}</h3>
                    <p className="text-sm text-ai-subtext mt-1">{clientFarmsList.length} fazenda{clientFarmsList.length !== 1 ? 's' : ''} cadastrada{clientFarmsList.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowFarmsModal(false)}
                    className="p-2 hover:bg-ai-surface2 rounded-md transition-colors"
                    title="Fechar"
                  >
                    <X className="w-5 h-5 text-ai-subtext" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                  {loadingFarmsList ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-ai-accent" />
                    </div>
                  ) : clientFarmsList.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-12 h-12 text-ai-subtext mx-auto mb-4" />
                      <p className="text-ai-subtext">Nenhuma fazenda vinculada a este cliente</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clientFarmsList.map((farm) => (
                        <div
                          key={farm.id}
                          className="border border-ai-border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-ai-accent/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-ai-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-ai-text truncate">{farm.name}</h4>
                              <p className="text-sm text-ai-subtext mt-1">
                                {farm.city}, {farm.state || farm.country}
                              </p>
                              {farm.productionSystem && (
                                <p className="text-xs text-ai-subtext mt-2">
                                  Sistema: {farm.productionSystem}
                                </p>
                              )}
                              {farm.totalArea && (
                                <p className="text-xs text-ai-subtext">
                                  Área total: {farm.totalArea.toFixed(2).replace('.', ',')} ha
                                </p>
                              )}
                              {farm.propertyValue && (
                                <p className="text-xs text-ai-subtext">
                                  Valor: R$ {farm.propertyValue.toLocaleString('pt-BR')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-ai-border flex justify-end">
                  <button
                    onClick={() => setShowFarmsModal(false)}
                    className="px-4 py-2 bg-ai-accent text-white rounded-md hover:bg-ai-accent/90 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ClientManagement;
