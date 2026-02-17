import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Clock,
  Target,
  User,
  Flag,
  Calendar,
  FolderOpen,
  AlertTriangle,
  ChevronDown,
  X,
  FileDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchInitiatives, type InitiativeWithProgress } from '../lib/initiatives';
import DateInputBR from '../components/DateInputBR';
import { generateInitiativesOverviewPdf } from '../lib/generateInitiativesOverviewPdf';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try {
    // Usar T00:00:00 para evitar deslocamento de timezone com datas ISO
    const date = new Date(`${d}T00:00:00`);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
};

const getScheduleIndicator = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) return { colorClass: 'bg-slate-400', label: 'Sem cronograma' };
  const now = new Date();
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { colorClass: 'bg-slate-400', label: 'Data inválida' };
  if (now > end) return { colorClass: 'bg-red-500', label: 'Prazo expirado' };
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const elapsed = (now.getTime() - start.getTime()) / 86400000;
  const pct = elapsed / totalDays;
  if (pct > 0.85) return { colorClass: 'bg-amber-500', label: 'Próximo do prazo' };
  return { colorClass: 'bg-green-500', label: 'Dentro do prazo' };
};

const statusVariant = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('andamento')) return 'bg-indigo-100 text-indigo-800';
  if (s.includes('concluído') || s.includes('concluido')) return 'bg-green-100 text-green-800';
  if (s.includes('atrasado')) return 'bg-red-100 text-red-800';
  if (s.includes('suspenso')) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
};

const STATUS_BAR_COLORS: Record<string, string> = {
  'Em Andamento': 'bg-indigo-500',
  'Concluído': 'bg-green-500',
  'Não Iniciado': 'bg-slate-400',
  'Atrasado': 'bg-red-500',
  'Suspenso': 'bg-amber-500',
};

const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const;

// ─── Componente ─────────────────────────────────────────────────────────────

const InitiativesOverview: React.FC = () => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();
  const [initiatives, setInitiatives] = useState<InitiativeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);

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

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    initiatives.forEach((i) => {
      if (i.start_date?.slice(0, 4)) years.add(Number(i.start_date.slice(0, 4)));
      if (i.end_date?.slice(0, 4)) years.add(Number(i.end_date.slice(0, 4)));
    });
    const current = new Date().getFullYear();
    years.add(current - 1);
    years.add(current);
    years.add(current + 1);
    return [...years].filter((y) => Number.isFinite(y)).sort((a, b) => b - a);
  }, [initiatives]);

  useEffect(() => {
    if (!selectedMonth || !selectedYear) return;
    const year = Number(selectedYear);
    const month = Number(selectedMonth);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayDate = new Date(year, month, 0); // month already 1-12
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    setDateFrom(firstDay);
    setDateTo(lastDay);
  }, [selectedMonth, selectedYear]);

  // ─── Filtro por período ────────────────────────────────────────────

  const filteredInitiatives = useMemo(() => {
    if (!dateFrom && !dateTo) return initiatives;
    return initiatives.filter((init) => {
      const initStart = init.start_date || null;
      const initEnd = init.end_date || null;
      // A iniciativa é incluída se o período dela tem interseção com o período do filtro
      if (dateFrom && initEnd && initEnd < dateFrom) return false;
      if (dateTo && initStart && initStart > dateTo) return false;
      return true;
    });
  }, [initiatives, dateFrom, dateTo]);

  const hasDateFilter = !!dateFrom || !!dateTo;

  // Limpar linha expandida quando o filtro muda
  useEffect(() => {
    setExpandedId(null);
  }, [dateFrom, dateTo]);

  // ─── Métricas ─────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = filteredInitiatives.length;
    const byStatus: Record<string, number> = {};
    const byLeader: Record<string, { count: number; avgProgress: number }> = {};
    const allMilestones = { total: 0, completed: 0 };
    let totalProgress = 0;
    let atrasadas = 0;
    const now = new Date();

    filteredInitiatives.forEach((init) => {
      const st = init.status || 'Não Iniciado';
      byStatus[st] = (byStatus[st] || 0) + 1;
      totalProgress += init.progress ?? 0;

      const leader = init.leader || 'Sem líder';
      if (!byLeader[leader]) byLeader[leader] = { count: 0, avgProgress: 0 };
      byLeader[leader].count++;
      byLeader[leader].avgProgress += init.progress ?? 0;

      (init.milestones || []).forEach((m) => {
        allMilestones.total++;
        if (m.completed === true) allMilestones.completed++;
      });

      if (init.end_date && new Date(init.end_date) < now && (init.progress ?? 0) < 100) {
        atrasadas++;
      }
    });

    Object.values(byLeader).forEach((v) => {
      v.avgProgress = v.count > 0 ? Math.round(v.avgProgress / v.count) : 0;
    });

    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;
    const milPct = allMilestones.total > 0 ? Math.round((allMilestones.completed / allMilestones.total) * 100) : 0;

    return { total, byStatus, byLeader, allMilestones, avgProgress, atrasadas, milPct };
  }, [filteredInitiatives]);

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current || isGeneratingPdf) return;

    setPdfError(null);
    setIsGeneratingPdf(true);
    try {
      await generateInitiativesOverviewPdf(reportRef.current, {
        fileName: `visao-geral-iniciativas-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    } catch (e) {
      console.error('[InitiativesOverview] handleExportPdf:', e);
      setPdfError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [isGeneratingPdf]);

  // ─── Render: Loading / Error ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-ai-accent" />
        <p className="text-sm text-ai-subtext mt-3">Carregando relatório...</p>
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

  if (initiatives.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-auto">
        <div className="p-4 md:p-6">
          <div>
            <nav className="text-xs text-ai-subtext uppercase tracking-widest mb-0.5">INICIATIVAS &gt; VISÃO GERAL</nav>
            <h1 className="text-xl font-bold text-ai-text tracking-tight">Relatório de Iniciativas</h1>
          </div>
          <div className="bg-ai-surface/50 border border-ai-border rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[280px] mt-6">
            <FolderOpen size={56} className="text-ai-subtext/40 mb-4" />
            <h2 className="text-lg font-semibold text-ai-text mb-2">Nenhuma iniciativa cadastrada</h2>
            <p className="text-ai-subtext max-w-sm">
              Cadastre iniciativas na aba <strong>Atividades</strong> para visualizar o relatório.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { total, byStatus, byLeader, allMilestones, avgProgress, atrasadas, milPct } = metrics;

  // ─── Render: Relatório ────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-white dark:bg-ai-bg">
      <div ref={reportRef} className="p-4 md:p-6 space-y-4">
        {/* Header + Filtro de datas */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <nav className="text-xs text-ai-subtext uppercase tracking-widest mb-0.5">INICIATIVAS &gt; VISÃO GERAL</nav>
            <h1 className="text-xl font-bold text-ai-text tracking-tight">Relatório de Iniciativas</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ai-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              title="Salvar e imprimir relatório em PDF"
            >
              {isGeneratingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              {isGeneratingPdf ? 'Gerando PDF...' : 'Salvar/Imprimir PDF'}
            </button>
            <Calendar size={13} className="text-ai-subtext" />
            <span className="text-[10px] text-ai-subtext font-medium uppercase tracking-wider whitespace-nowrap">Período:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1 text-xs border border-ai-border rounded-md bg-ai-surface text-ai-text w-[115px]"
              title="Selecionar mês"
            >
              <option value="">Mês</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2 py-1 text-xs border border-ai-border rounded-md bg-ai-surface text-ai-text w-[86px]"
              title="Selecionar ano"
            >
              <option value="">Ano</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <DateInputBR
              value={dateFrom}
              onChange={(v) => {
                setDateFrom(v);
                setSelectedMonth('');
              }}
              placeholder="dd/mm/aaaa"
              className="w-[130px]"
            />
            <span className="text-xs text-ai-subtext">→</span>
            <DateInputBR
              value={dateTo}
              onChange={(v) => {
                setDateTo(v);
                setSelectedMonth('');
              }}
              placeholder="dd/mm/aaaa"
              min={dateFrom}
              className="w-[130px]"
            />
            {hasDateFilter && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setSelectedMonth('');
                  setSelectedYear(String(new Date().getFullYear()));
                }}
                className="p-1 text-red-500 hover:text-red-700"
                title="Limpar filtro de datas"
              >
                <X size={14} />
              </button>
            )}
            {hasDateFilter && (
              <span className="text-[10px] text-ai-subtext">
                {filteredInitiatives.length}/{initiatives.length}
              </span>
            )}
          </div>
        </div>

        {pdfError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {pdfError}
          </div>
        )}

        {/* Admin sem analista */}
        {isAdmin && !selectedAnalyst && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Selecione um <strong>Analista</strong> no cabeçalho para visualizar o relatório.
            </p>
          </div>
        )}

        {/* Aviso: filtro sem resultados */}
        {hasDateFilter && filteredInitiatives.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar size={36} className="text-ai-subtext/40 mb-3" />
            <p className="text-sm text-ai-subtext">Nenhuma iniciativa encontrada no período selecionado.</p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-ai-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-indigo-500" />
              <span className="text-[10px] uppercase tracking-wider text-ai-subtext font-medium">Total Iniciativas</span>
            </div>
            <p className="text-2xl font-bold text-ai-text">{total}</p>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-[10px] uppercase tracking-wider text-ai-subtext font-medium">Progresso Médio</span>
            </div>
            <p className="text-2xl font-bold text-ai-text">{avgProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-emerald-500" />
              <span className="text-[10px] uppercase tracking-wider text-ai-subtext font-medium">Marcos Entregues</span>
            </div>
            <p className="text-2xl font-bold text-ai-text">
              {allMilestones.completed}<span className="text-sm font-normal text-ai-subtext">/{allMilestones.total}</span>
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${milPct}%` }} />
            </div>
          </div>
          <div className="bg-white border border-ai-border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-red-500" />
              <span className="text-[10px] uppercase tracking-wider text-ai-subtext font-medium">Atrasadas</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{atrasadas}</p>
            <p className="text-[10px] text-ai-subtext mt-0.5">de {total} iniciativas</p>
          </div>
        </div>

        {/* Status + Líderes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Distribuição por Status */}
          <div className="bg-white border border-ai-border rounded-lg p-4">
            <h3 className="text-xs font-semibold text-ai-text uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-ai-subtext" />
              Distribuição por Status
            </h3>
            <div className="space-y-2.5">
              {Object.entries(byStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-ai-text">{status}</span>
                      <span className="text-xs font-semibold text-ai-text">
                        {count} <span className="text-ai-subtext font-normal">({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`${STATUS_BAR_COLORS[status] || 'bg-slate-400'} h-2.5 rounded-full transition-all`}
                        style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Desempenho por Líder */}
          <div className="bg-white border border-ai-border rounded-lg p-4">
            <h3 className="text-xs font-semibold text-ai-text uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={14} className="text-ai-subtext" />
              Desempenho por Líder
            </h3>
            <div className="space-y-2.5">
              {Object.entries(byLeader)
                .sort(([, a], [, b]) => b.avgProgress - a.avgProgress)
                .map(([leader, data]) => (
                  <div key={leader}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-ai-text">{leader}</span>
                      <span className="text-xs text-ai-subtext">
                        {data.count} inic. · <span className="font-semibold text-ai-text">{data.avgProgress}%</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${data.avgProgress}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Tabela Detalhada */}
        <div className="bg-white border border-ai-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-ai-border bg-ai-surface/50">
            <h3 className="text-xs font-semibold text-ai-text uppercase tracking-wider flex items-center gap-2">
              <Flag size={14} className="text-ai-subtext" />
              Detalhamento por Iniciativa
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ai-border bg-ai-surface/30">
                  <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider">Iniciativa</th>
                  <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider">Líder</th>
                  <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider">Período</th>
                  <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider w-32">Progresso</th>
                  <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider">Marcos</th>
                </tr>
              </thead>
              <tbody>
                {filteredInitiatives.map((init, idx) => {
                  const milestones = init.milestones || [];
                  const completedMil = milestones.filter((m) => m.completed === true).length;
                  const indicator = getScheduleIndicator(init.start_date, init.end_date);
                  const isExpanded = expandedId === init.id;
                  return (
                    <React.Fragment key={init.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${init.name} — ${init.progress ?? 0}%`}
                        onClick={() => setExpandedId(isExpanded ? null : init.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : init.id); } }}
                        className={`border-b border-ai-border/50 hover:bg-ai-surface/30 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ai-accent/30 ${idx % 2 === 0 ? '' : 'bg-ai-surface/10'} ${isExpanded ? 'bg-indigo-50/50' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <ChevronDown
                              size={12}
                              className={`shrink-0 text-ai-subtext transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-ai-text max-w-[200px] truncate" title={init.name}>
                                {init.name}
                              </div>
                              {init.tags && (
                                <div className="text-[10px] text-ai-subtext mt-0.5 truncate max-w-[200px]" title={init.tags}>
                                  {init.tags}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-ai-text">{init.leader || '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${indicator.colorClass}`}
                              title={indicator.label}
                            />
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${statusVariant(init.status ?? '')}`}
                            >
                              {init.status || 'Não Iniciado'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-ai-subtext whitespace-nowrap">
                          {formatDate(init.start_date)} → {formatDate(init.end_date)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[60px]">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  (init.progress ?? 0) >= 100
                                    ? 'bg-green-500'
                                    : (init.progress ?? 0) >= 50
                                      ? 'bg-indigo-500'
                                      : (init.progress ?? 0) > 0
                                        ? 'bg-amber-500'
                                        : 'bg-gray-300'
                                }`}
                                style={{ width: `${Math.min(100, init.progress ?? 0)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-ai-text tabular-nums w-8 text-right">
                              {init.progress ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-ai-text font-medium">{completedMil}</span>
                          <span className="text-ai-subtext">/{milestones.length}</span>
                          {milestones.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {milestones.map((m) => (
                                <div
                                  key={m.id}
                                  className={`h-1.5 rounded-full flex-1 ${m.completed ? 'bg-green-500' : 'bg-gray-200'}`}
                                  title={`${m.title} (${m.percent}%) — ${m.completed ? 'Concluído' : 'Pendente'}`}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Linha expandida — Descrição + Marcos */}
                      {isExpanded && (
                        <tr className="bg-indigo-50/30">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Descrição */}
                              <div>
                                <h4 className="text-[10px] font-semibold text-ai-subtext uppercase tracking-wider mb-1.5">Descrição</h4>
                                <p className="text-xs text-ai-text leading-relaxed">
                                  {init.description?.trim() || 'Sem descrição cadastrada.'}
                                </p>
                                {init.tags && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {init.tags.split(/\s+/).filter((t) => t.startsWith('#') && t.length > 1).map((tag) => (
                                      <span key={tag} className="inline-flex px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-medium">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Marcos */}
                              <div>
                                <h4 className="text-[10px] font-semibold text-ai-subtext uppercase tracking-wider mb-1.5">
                                  Marcos ({completedMil}/{milestones.length})
                                </h4>
                                {milestones.length === 0 ? (
                                  <p className="text-xs text-ai-subtext italic">Nenhum marco cadastrado.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {milestones.map((m) => (
                                      <div key={m.id} className="flex items-start gap-2">
                                        <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${m.completed ? 'bg-green-500' : 'bg-gray-200'}`}>
                                          {m.completed && <CheckCircle size={10} className="text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-medium ${m.completed ? 'text-green-700 line-through' : 'text-ai-text'}`}>
                                              {m.title}
                                            </span>
                                            <span className="text-[10px] text-ai-subtext shrink-0 tabular-nums">{m.percent}%</span>
                                          </div>
                                          {m.due_date && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <Calendar size={9} className="text-ai-subtext" />
                                              <span className="text-[10px] text-ai-subtext">{formatDate(m.due_date)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitiativesOverview;
