import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Calendar,
  Users,
  User,
  Flag,
  Package,
  FolderOpen,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchInitiativesWithTeams, type InitiativeWithTeam, type InitiativeMilestoneRow } from '../lib/initiatives';
import { fetchDeliveries, type DeliveryRow } from '../lib/deliveries';

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try {
    const date = new Date(`${d}T00:00:00`);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
};

const statusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('andamento')) return { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800', bar: 'bg-indigo-500', dot: 'bg-indigo-500' };
  if (s.includes('concluído') || s.includes('concluido')) return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800', bar: 'bg-green-500', dot: 'bg-green-500' };
  if (s.includes('atrasado')) return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800', bar: 'bg-red-500', dot: 'bg-red-500' };
  if (s.includes('suspenso')) return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500', dot: 'bg-amber-500' };
  return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400', dot: 'bg-slate-400' };
};

const deadlineIndicator = (endDate: string | null) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  if (isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return { label: 'Vencido', cls: 'text-red-600' };
  if (diff <= 7) return { label: `${diff}d restantes`, cls: 'text-amber-600' };
  return null;
};

interface DeliveryGroup {
  delivery: DeliveryRow | null;
  initiatives: InitiativeWithTeam[];
}

function MilestoneItem({ milestone }: { milestone: InitiativeMilestoneRow }) {
  const dl = deadlineIndicator(milestone.due_date);
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5 flex-shrink-0">
        {milestone.completed ? (
          <CheckCircle2 size={14} className="text-green-500" />
        ) : (
          <Circle size={14} className="text-slate-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${milestone.completed ? 'text-green-700 line-through' : 'text-ai-text'}`}>
            {milestone.title}
          </span>
          <span className="text-[10px] text-ai-subtext tabular-nums">({milestone.percent}%)</span>
        </div>
        {milestone.due_date && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Calendar size={10} className="text-ai-subtext" />
            <span className="text-[10px] text-ai-subtext tabular-nums">{formatDate(milestone.due_date)}</span>
            {dl && <span className={`text-[10px] font-medium ${dl.cls}`}>{dl.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function InitiativeCard({ initiative }: { initiative: InitiativeWithTeam }) {
  const [open, setOpen] = useState(false);
  const sc = statusColor(initiative.status);
  const milestones = initiative.milestones || [];
  const completedMil = milestones.filter((m) => m.completed).length;
  const dl = deadlineIndicator(initiative.end_date);
  const leader = initiative.team.find((t) => t.role === 'RESPONSÁVEL');
  const support = initiative.team.filter((t) => t.role !== 'RESPONSÁVEL');

  return (
    <div className={`rounded-lg border ${sc.bg} overflow-hidden transition-all`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/40 transition-colors"
      >
        <div className="flex-shrink-0">
          {open ? <ChevronDown size={16} className={sc.text} /> : <ChevronRight size={16} className={sc.text} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ai-text">{initiative.name}</span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sc.badge}`}>
              {initiative.status || 'Não Iniciado'}
            </span>
            {dl && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${dl.cls}`}>
                <Clock size={10} />
                {dl.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-[11px] text-ai-subtext">
            {(initiative.leader || leader) && (
              <span className="inline-flex items-center gap-1">
                <User size={11} />
                {initiative.leader || leader?.name || '—'}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(initiative.start_date)} — {formatDate(initiative.end_date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Flag size={11} />
              {completedMil}/{milestones.length} marcos
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-28">
          <div className="flex-1 bg-white/60 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${sc.bar}`} style={{ width: `${Math.min(100, initiative.progress ?? 0)}%` }} />
          </div>
          <span className="text-xs font-bold text-ai-text tabular-nums w-9 text-right">{initiative.progress ?? 0}%</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/50 space-y-3">
          {initiative.description && (
            <p className="text-xs text-ai-subtext leading-relaxed">{initiative.description}</p>
          )}

          {initiative.team.length > 0 && (
            <div>
              <h5 className="text-[10px] font-semibold text-ai-subtext uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Users size={11} />
                Time
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {leader && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-medium border border-indigo-200">
                    <User size={10} />
                    {leader.name}
                    <span className="text-indigo-500 font-normal ml-0.5">Resp.</span>
                  </span>
                )}
                {support.map((t, i) => (
                  <span
                    key={`${t.name}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200"
                  >
                    {t.name}
                    <span className="text-slate-400 font-normal ml-0.5">Apoio</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <h5 className="text-[10px] font-semibold text-ai-subtext uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flag size={11} />
                Marcos ({completedMil}/{milestones.length})
              </h5>
              <div className="divide-y divide-white/50">
                {milestones.map((m) => (
                  <MilestoneItem key={m.id} milestone={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeliverySection({ group, defaultOpen }: { group: DeliveryGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalProgress = group.initiatives.length > 0
    ? Math.round(group.initiatives.reduce((s, i) => s + (i.progress ?? 0), 0) / group.initiatives.length)
    : 0;

  return (
    <div className="rounded-xl border border-ai-border bg-white dark:bg-ai-bg overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-3.5 flex items-center gap-3 bg-ai-surface/30 hover:bg-ai-surface/50 transition-colors border-b border-ai-border"
      >
        <div className="flex-shrink-0 w-1 h-8 rounded-full bg-indigo-500" />
        <div className="flex-shrink-0">
          {open ? <ChevronDown size={18} className="text-indigo-500" /> : <ChevronRight size={18} className="text-ai-subtext" />}
        </div>
        <Package size={18} className="text-indigo-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-ai-text">
            {group.delivery?.name || 'Sem entrega vinculada'}
          </div>
          {group.delivery?.description && (
            <div className="text-[11px] text-ai-subtext mt-0.5 truncate">{group.delivery.description}</div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-ai-subtext">
            {group.initiatives.length} atividade{group.initiatives.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5 w-24">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${totalProgress}%` }} />
            </div>
            <span className="text-xs font-bold text-ai-text tabular-nums w-9 text-right">{totalProgress}%</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-2">
          {group.initiatives.length === 0 ? (
            <p className="text-xs text-ai-subtext italic px-2 py-3">Nenhuma atividade vinculada a esta entrega.</p>
          ) : (
            group.initiatives.map((init) => (
              <InitiativeCard key={init.id} initiative={init} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

const ProjectStructureReport: React.FC = () => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();

  const [initiatives, setInitiatives] = useState<InitiativeWithTeam[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
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
      setDeliveries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: { clientId?: string; farmId?: string } = {};
      if (selectedClient?.id) filters.clientId = selectedClient.id;
      if (selectedFarm?.id) filters.farmId = selectedFarm.id;

      const [inits, dels] = await Promise.all([
        fetchInitiativesWithTeams(effectiveUserId, Object.keys(filters).length > 0 ? filters : undefined),
        fetchDeliveries(effectiveUserId, selectedClient?.id ? { clientId: selectedClient.id } : undefined),
      ]);
      setInitiatives(inits);
      setDeliveries(dels);
    } catch (e) {
      console.error('[ProjectStructureReport] loadData:', e);
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, selectedClient?.id, selectedFarm?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groups = useMemo<DeliveryGroup[]>(() => {
    const deliveryMap = new Map(deliveries.map((d) => [d.id, d]));
    const byDelivery = new Map<string, InitiativeWithTeam[]>();
    const orphans: InitiativeWithTeam[] = [];

    for (const init of initiatives) {
      if (init.delivery_id && deliveryMap.has(init.delivery_id)) {
        const list = byDelivery.get(init.delivery_id) || [];
        list.push(init);
        byDelivery.set(init.delivery_id, list);
      } else {
        orphans.push(init);
      }
    }

    const result: DeliveryGroup[] = [];

    for (const del of deliveries) {
      const inits = byDelivery.get(del.id) || [];
      if (inits.length > 0) {
        result.push({ delivery: del, initiatives: inits });
      }
    }

    if (orphans.length > 0) {
      result.push({ delivery: null, initiatives: orphans });
    }

    return result;
  }, [initiatives, deliveries]);

  const summaryStats = useMemo(() => {
    const totalDeliveries = groups.filter((g) => g.delivery !== null).length;
    const totalInitiatives = initiatives.length;
    const totalMilestones = initiatives.reduce((s, i) => s + (i.milestones?.length || 0), 0);
    const completedMilestones = initiatives.reduce(
      (s, i) => s + (i.milestones?.filter((m) => m.completed).length || 0), 0
    );
    const avgProgress = totalInitiatives > 0
      ? Math.round(initiatives.reduce((s, i) => s + (i.progress ?? 0), 0) / totalInitiatives)
      : 0;
    return { totalDeliveries, totalInitiatives, totalMilestones, completedMilestones, avgProgress };
  }, [groups, initiatives]);

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-ai-accent" />
        <p className="text-sm text-ai-subtext mt-3">Carregando estrutura do projeto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center text-red-500">
        <p className="text-sm">{error}</p>
        <button type="button" onClick={loadData} className="mt-3 px-4 py-2 rounded-lg bg-ai-accent text-white text-sm hover:opacity-90">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (initiatives.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-auto">
        <div className="p-4 md:p-6">
          <nav className="text-xs text-ai-subtext uppercase tracking-widest mb-0.5">Gestão do Projeto &gt; Estrutura</nav>
          <h1 className="text-xl font-bold text-ai-text tracking-tight">Estrutura do Projeto</h1>
          <div className="bg-ai-surface/50 border border-ai-border rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[280px] mt-6">
            <FolderOpen size={56} className="text-ai-subtext/40 mb-4" />
            <h2 className="text-lg font-semibold text-ai-text mb-2">Nenhuma atividade cadastrada</h2>
            <p className="text-ai-subtext max-w-sm">
              Cadastre entregas e atividades para visualizar a estrutura hierárquica do projeto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-white dark:bg-ai-bg">
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <nav className="text-xs text-ai-subtext uppercase tracking-widest mb-0.5">Gestão do Projeto &gt; Estrutura</nav>
          <h1 className="text-xl font-bold text-ai-text tracking-tight">Estrutura do Projeto</h1>
          <p className="text-xs text-ai-subtext mt-1">
            Visão hierárquica: entregas, atividades, times e marcos.
          </p>
        </div>

        {isAdmin && !selectedAnalyst && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Selecione um <strong>Analista</strong> no cabeçalho para visualizar a estrutura.
            </p>
          </div>
        )}

        {/* Mini KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border border-ai-border rounded-lg p-3 flex items-center gap-3">
            <Package size={18} className="text-indigo-500 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-ai-subtext uppercase tracking-wider font-medium">Entregas</div>
              <div className="text-lg font-bold text-ai-text">{summaryStats.totalDeliveries}</div>
            </div>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3 flex items-center gap-3">
            <Flag size={18} className="text-emerald-500 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-ai-subtext uppercase tracking-wider font-medium">Atividades</div>
              <div className="text-lg font-bold text-ai-text">{summaryStats.totalInitiatives}</div>
            </div>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-ai-subtext uppercase tracking-wider font-medium">Marcos</div>
              <div className="text-lg font-bold text-ai-text">
                {summaryStats.completedMilestones}
                <span className="text-sm font-normal text-ai-subtext">/{summaryStats.totalMilestones}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3 flex items-center gap-3">
            <TrendingUp size={18} className="text-blue-500 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-ai-subtext uppercase tracking-wider font-medium">Progresso</div>
              <div className="text-lg font-bold text-ai-text">{summaryStats.avgProgress}%</div>
            </div>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3 flex items-center gap-3">
            <Users size={18} className="text-purple-500 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-ai-subtext uppercase tracking-wider font-medium">Times</div>
              <div className="text-lg font-bold text-ai-text">
                {new Set(initiatives.flatMap((i) => i.team.map((t) => t.name))).size}
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchical Report */}
        <div className="space-y-4">
          {groups.map((group, idx) => (
            <DeliverySection
              key={group.delivery?.id || 'orphan'}
              group={group}
              defaultOpen={idx < 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectStructureReport;
