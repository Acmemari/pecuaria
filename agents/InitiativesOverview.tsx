import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderOpen, CheckCircle2, Loader2, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchInitiatives, type InitiativeWithProgress } from '../lib/initiatives';

const STATUS_COLORS: Record<string, string> = {
  'Não Iniciado': '#94a3b8',
  'Em Andamento': '#3b82f6',
  Concluído: '#22c55e',
  Suspenso: '#f59e0b',
  Atrasado: '#ef4444',
};

/**
 * Visão Geral (Dashboard) das Iniciativas.
 * Exibe KPIs e gráficos do portfólio de iniciativas.
 * Respeita contexto de analista/cliente/fazenda para admin e analista.
 */
const InitiativesOverview: React.FC = () => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();
  const [initiatives, setInitiatives] = useState<InitiativeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id]
  );

  const loadData = useCallback(async () => {
    if (!effectiveUserId) {
      setInitiatives([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: { clientId?: string; farmId?: string } = {};
      if (selectedClient?.id) filters.clientId = selectedClient.id;
      if (selectedFarm?.id) filters.farmId = selectedFarm.id;
      const list = await fetchInitiatives(
        effectiveUserId,
        Object.keys(filters).length > 0 ? filters : undefined
      );
      setInitiatives(list);
    } catch (e) {
      console.error('[InitiativesOverview] loadData:', e);
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, selectedClient?.id, selectedFarm?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalInitiatives = initiatives.length;
  const entregasRealizadas = initiatives.reduce((acc, i) => {
    const completed = (i.milestones || []).filter((m) => m.completed).length;
    return acc + completed;
  }, 0);
  const emAndamento = initiatives.filter((i) => i.status === 'Em Andamento').length;
  const progressoMedio =
    totalInitiatives > 0
      ? Math.round(
          initiatives.reduce((acc, i) => acc + (i.progress ?? 0), 0) / totalInitiatives
        )
      : 0;

  const statusDistribution = Object.entries(
    initiatives.reduce<Record<string, number>>((acc, i) => {
      const s = i.status || 'Não Iniciado';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const healthData = initiatives
    .slice(0, 8)
    .map((i) => ({ name: i.name.length > 20 ? i.name.slice(0, 20) + '…' : i.name, progress: i.progress ?? 0 }));

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-ai-accent" />
        <p className="text-sm text-ai-subtext mt-3">Carregando painel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center text-red-500">
        <p className="text-sm">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-3 px-4 py-2 rounded-lg bg-ai-accent text-white text-sm hover:opacity-90"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const kpis = [
    { label: 'Iniciativas Ativas', value: String(totalInitiatives), icon: FolderOpen },
    { label: 'Entregas Realizadas', value: String(entregasRealizadas), icon: CheckCircle2 },
    { label: 'Em Andamento', value: String(emAndamento), icon: Loader2 },
    { label: 'Progresso Médio', value: `${progressoMedio}%`, icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ai-text">Painel Executivo</h1>
          <p className="text-sm text-ai-subtext mt-1">Visão consolidada do portfólio de iniciativas.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-ai-surface border border-ai-border rounded-lg p-4 flex items-center gap-3"
            >
              <div className="p-2 rounded-md bg-ai-accent/10 text-ai-accent">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ai-subtext uppercase tracking-wide">{label}</p>
                <p className="text-lg font-semibold text-ai-text">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-ai-surface border border-ai-border rounded-lg p-4">
            <h2 className="text-sm font-medium text-ai-text mb-3 flex items-center gap-2">
              <BarChart3 size={16} /> Distribuição por Status
            </h2>
            {statusDistribution.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-ai-subtext text-sm">
                Nenhum dado ainda. Crie iniciativas em Atividades.
              </div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistribution} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E7" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke="#5F6368" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={100} stroke="#5F6368" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E3E7', borderRadius: 8 }}
                      labelStyle={{ color: '#1F1F1F' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {statusDistribution.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.name] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="bg-ai-surface border border-ai-border rounded-lg p-4">
            <h2 className="text-sm font-medium text-ai-text mb-3 flex items-center gap-2">
              <TrendingUp size={16} /> Saúde do Portfólio
            </h2>
            {healthData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-ai-subtext text-sm">
                Gráfico será exibido quando houver iniciativas.
              </div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={healthData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E7" vertical={false} />
                    <XAxis dataKey="name" stroke="#5F6368" fontSize={11} tick={{ fill: '#5F6368' }} />
                    <YAxis stroke="#5F6368" fontSize={12} domain={[0, 100]} tick={{ fill: '#5F6368' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#F8F9FA', border: '1px solid #E0E3E7', borderRadius: 8 }}
                      formatter={(v: number) => [`${v}%`, 'Progresso']}
                    />
                    <Bar dataKey="progress" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitiativesOverview;
