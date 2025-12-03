import React, { useState, useEffect } from 'react';
import { User, Shield, Users, Activity, Search, MoreHorizontal, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { mapUserProfile } from '../lib/auth/mapUserProfile';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    mrr: 0,
  });

  useEffect(() => {
    // Verify admin permission before loading
    if (currentUser?.role === 'admin') {
      loadClients();
    } else if (currentUser && currentUser.role !== 'admin') {
      setError('Acesso negado. Apenas administradores podem visualizar esta página.');
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadClients = async (retries = 3, delay = 1000) => {
    // Verify admin permission
    if (currentUser?.role !== 'admin') {
      setError('Acesso negado. Apenas administradores podem visualizar esta página.');
      setIsLoading(false);
      return;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`[AdminDashboard] Loading clients (attempt ${attempt + 1}/${retries})...`);
        
        const { data, error: queryError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'client')
          .order('created_at', { ascending: false });

        if (queryError) {
          console.error('[AdminDashboard] Error loading clients:', {
            code: queryError.code,
            message: queryError.message,
            details: queryError.details,
            hint: queryError.hint
          });

          // If it's a permission/RLS error, don't retry
          if (queryError.code === 'PGRST301' || queryError.message?.includes('permission') || queryError.message?.includes('RLS')) {
            setError('Erro de permissão. Verifique se você tem permissão de administrador e se as políticas RLS estão configuradas corretamente.');
            setIsLoading(false);
            return;
          }

          // Retry on other errors
          if (attempt < retries - 1) {
            console.log(`[AdminDashboard] Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          setError(`Erro ao carregar clientes: ${queryError.message || 'Erro desconhecido'}`);
          setIsLoading(false);
          return;
        }

        if (data) {
          console.log(`[AdminDashboard] Loaded ${data.length} client profiles from database`);
          
          const mappedClients = data.map(mapUserProfile).filter(Boolean) as UserType[];
          console.log(`[AdminDashboard] Successfully mapped ${mappedClients.length} clients`);
          
          setClients(mappedClients);
          
          // Calculate stats
          const active = mappedClients.filter(c => c.status === 'active').length;
          const mrr = mappedClients.reduce((sum, c) => {
            const planPrice = c.plan === 'enterprise' ? 299 : c.plan === 'pro' ? 97 : 0;
            return sum + planPrice;
          }, 0);
          
          setStats({
            total: mappedClients.length,
            active,
            mrr,
          });
          
          setIsLoading(false);
          return; // Success, exit retry loop
        } else {
          console.log('[AdminDashboard] No data returned from query');
          setClients([]);
          setStats({ total: 0, active: 0, mrr: 0 });
        }
      } catch (error: any) {
        console.error('[AdminDashboard] Exception loading clients:', error);
        
        if (attempt < retries - 1) {
          console.log(`[AdminDashboard] Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        setError(`Erro inesperado ao carregar clientes: ${error.message || 'Erro desconhecido'}`);
      } finally {
        if (attempt === retries - 1) {
          setIsLoading(false);
        }
      }
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Nunca';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ai-subtext" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 mb-1">Erro ao carregar dados</h3>
              <p className="text-xs text-red-700 mb-4">{error}</p>
              <button
                onClick={() => loadClients()}
                className="text-xs px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 p-2">
      
      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-ai-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
                <span className="text-xs font-bold text-ai-subtext uppercase">Total Clientes</span>
            </div>
            <div className="text-2xl font-mono font-bold text-ai-text">{stats.total}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Clientes cadastrados</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-ai-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Activity size={18} /></div>
                <span className="text-xs font-bold text-ai-subtext uppercase">Ativos</span>
            </div>
            <div className="text-2xl font-mono font-bold text-ai-text">{stats.active}</div>
            <div className="text-xs text-ai-subtext font-medium mt-1">Clientes ativos</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-ai-border shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Shield size={18} /></div>
                <span className="text-xs font-bold text-ai-subtext uppercase">Receita (MRR)</span>
            </div>
            <div className="text-2xl font-mono font-bold text-ai-text">R$ {stats.mrr.toLocaleString('pt-BR')}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Receita mensal recorrente</div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 bg-white rounded-xl border border-ai-border shadow-sm flex flex-col overflow-hidden">
         
         {/* Table Header / Toolbar */}
         <div className="p-4 border-b border-ai-border flex justify-between items-center">
            <h2 className="text-sm font-bold text-ai-text">Base de Clientes</h2>
            <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ai-subtext" />
                <input 
                    type="text" 
                    placeholder="Buscar cliente..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-ai-border rounded-md bg-ai-surface focus:outline-none focus:border-ai-text transition-colors"
                />
            </div>
         </div>

         {/* Table Content */}
         <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-ai-surface sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Cliente</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Plano</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Status</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border">Último Acesso</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-ai-subtext uppercase tracking-wider border-b border-ai-border text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ai-border">
                    {filteredClients.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-ai-subtext">
                                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                            </td>
                        </tr>
                    ) : (
                        filteredClients.map((client) => (
                            <tr key={client.id} className="hover:bg-ai-surface/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-ai-text text-white flex items-center justify-center text-xs font-bold mr-3">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-ai-text">{client.name}</div>
                                            <div className="text-xs text-ai-subtext">{client.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`
                                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                                        ${client.plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                          client.plan === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                          'bg-gray-50 text-gray-600 border-gray-200'}
                                    `}>
                                        {client.plan === 'enterprise' ? 'Enterprise' : client.plan === 'pro' ? 'Pro' : 'Básico'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        {client.status === 'active' 
                                            ? <CheckCircle2 size={14} className="text-emerald-500 mr-1.5" /> 
                                            : <XCircle size={14} className="text-rose-500 mr-1.5" />
                                        }
                                        <span className={`text-xs ${client.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {client.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-ai-subtext">
                                    {formatLastLogin(client.lastLogin)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-ai-subtext hover:text-ai-text p-1 rounded hover:bg-ai-border/50 transition-colors">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>
         
         <div className="p-3 border-t border-ai-border bg-ai-surface/30 text-xs text-ai-subtext text-center">
            Mostrando {filteredClients.length} de {stats.total} clientes
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
