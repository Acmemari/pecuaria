import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  ChevronRight,
  FolderOpen,
  X,
  Users,
  Flag,
  UserPlus,
  Loader2,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  User,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import {
  fetchInitiatives,
  createInitiative,
  updateInitiative,
  fetchInitiativeForEdit,
  fetchInitiativeDetail,
  toggleMilestoneCompleted,
  deleteInitiative,
  type InitiativeWithProgress,
} from '../lib/initiatives';
import { fetchPeople, type Person } from '../lib/people';
import { EvidenciaEntregaModal } from '../components/EvidenciaEntregaModal';
import { DateInputBR } from '../components/DateInputBR';

const STATUS_OPTIONS = ['Não Iniciado', 'Em Andamento', 'Suspenso', 'Concluído', 'Atrasado'];

interface MilestoneRow {
  id: string;
  title: string;
  percent: number;
  dueDate: string;
  completed?: boolean;
}

interface InitiativesActivitiesProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

/**
 * Lista de Atividades (iniciativas/projetos).
 * - Analista vê suas próprias iniciativas (created_by = user.id)
 * - Admin vê as iniciativas do analista selecionado (created_by = selectedAnalyst.id)
 * - Filtros por cliente e fazenda via contexto global (header)
 */
const InitiativesActivities: React.FC<InitiativesActivitiesProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();

  // ─── Identidade efetiva ───────────────────────────────────────────
  const isAdmin = user?.role === 'admin';

  /** ID do analista cujas iniciativas são exibidas */
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id]
  );

  /** Admin sem analista selecionado = bloqueio parcial (não pode criar) */
  const adminMissingAnalyst = isAdmin && !selectedAnalyst;

  /** Precisamos de analista + cliente para criar nova iniciativa */
  const canCreate = !!effectiveUserId && !!selectedClient;

  // ─── State ────────────────────────────────────────────────────────
  const [initiatives, setInitiatives] = useState<InitiativeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<InitiativeWithProgress | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [viewingInitiative, setViewingInitiative] = useState<
    Awaited<ReturnType<typeof fetchInitiativeDetail>> | null
  >(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'time'>('geral');
  const [togglingMilestone, setTogglingMilestone] = useState<string | null>(null);
  const [deletingInitiativeId, setDeletingInitiativeId] = useState<string | null>(null);
  const [viewingEvidenceMilestone, setViewingEvidenceMilestone] = useState<
    { milestone: import('../lib/initiatives').InitiativeMilestoneRow; initiativeName: string } | null
  >(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    tags: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'Não Iniciado',
    leaderId: '' as string,
    teamIds: [] as string[],
    milestones: [{ id: crypto.randomUUID(), title: '', percent: 0, dueDate: '' }] as MilestoneRow[],
  });

  // ─── Helpers Modal ────────────────────────────────────────────────
  const resetForm = () =>
    setFormData({
      name: '',
      tags: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'Não Iniciado',
      leaderId: '',
      teamIds: [],
      milestones: [{ id: crypto.randomUUID(), title: '', percent: 0, dueDate: '' }],
    });

  const openNewModal = () => {
    if (!canCreate) {
      onToast?.(
        isAdmin
          ? 'Selecione um Analista e um Cliente antes de criar uma iniciativa.'
          : 'Selecione um Cliente antes de criar uma iniciativa.',
        'warning'
      );
      return;
    }
    setEditingInitiative(null);
    resetForm();
    setShowNewModal(true);
  };

  const closeModal = () => {
    setShowNewModal(false);
    setEditingInitiative(null);
  };

  // ─── Gestão (detalhe) ────────────────────────────────────────────
  const openGestaoView = async (init: InitiativeWithProgress) => {
    setLoadingDetail(true);
    setViewingInitiative(null);
    try {
      const detail = await fetchInitiativeDetail(init.id);
      setViewingInitiative(detail);
      setActiveTab('geral');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao carregar iniciativa', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeGestaoView = () => setViewingInitiative(null);

  const openEditModalFromGestao = async () => {
    if (!viewingInitiative) return;
    await openEditModal(viewingInitiative);
    closeGestaoView();
  };

  const personDisplayName = (p: Person) => p.preferred_name?.trim() || p.full_name;

  const openEditModal = async (init: InitiativeWithProgress) => {
    setEditingInitiative(init);
    setLoadingEdit(true);
    setShowNewModal(true);
    try {
      const [editData, peopleList] = await Promise.all([
        fetchInitiativeForEdit(init.id),
        effectiveUserId ? fetchPeople(effectiveUserId) : Promise.resolve([]),
      ]);
      const { initiative, team, milestones } = editData;
      const leaderId =
        peopleList.find((p) => personDisplayName(p) === (initiative.leader || '').trim())?.id || '';
      const leaderNameTrim = (initiative.leader || '').trim();
      const teamIds = (team || [])
        .filter((n) => n?.trim() && n.trim() !== leaderNameTrim)
        .map((name) => peopleList.find((p) => personDisplayName(p) === name.trim())?.id)
        .filter((id): id is string => !!id)
        .slice(0, 5);
      setFormData({
        name: initiative.name || '',
        tags: initiative.tags || '',
        description: initiative.description || '',
        startDate: initiative.start_date ? initiative.start_date.slice(0, 10) : '',
        endDate: initiative.end_date ? initiative.end_date.slice(0, 10) : '',
        status: (initiative.status as typeof formData.status) || 'Não Iniciado',
        leaderId,
        teamIds: teamIds.length > 0 ? teamIds : [],
        milestones:
          milestones.length > 0
            ? milestones.map((m) => ({
                id: m.id,
                title: m.title,
                percent: m.percent,
                dueDate: m.due_date ? m.due_date.slice(0, 10) : '',
                completed: m.completed,
              }))
            : [{ id: crypto.randomUUID(), title: '', percent: 0, dueDate: '' }],
      });
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao carregar iniciativa', 'error');
      closeModal();
    } finally {
      setLoadingEdit(false);
    }
  };

  // ─── Marcos ───────────────────────────────────────────────────────
  const handleToggleMilestone = async (milestoneId: string) => {
    setTogglingMilestone(milestoneId);
    try {
      await toggleMilestoneCompleted(milestoneId);
      // Recarregar detalhe e lista
      if (viewingInitiative) {
        const updated = await fetchInitiativeDetail(viewingInitiative.id);
        setViewingInitiative(updated);
      }
      await loadInitiatives();
      onToast?.('Marco atualizado.', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao atualizar marco', 'error');
    } finally {
      setTogglingMilestone(null);
    }
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { id: crypto.randomUUID(), title: '', percent: 0, dueDate: '' }],
    }));
  };

  const updateMilestone = (id: string, field: 'title' | 'percent' | 'dueDate', value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === id ? { ...m, [field]: field === 'percent' ? Number(value) || 0 : String(value) } : m
      ),
    }));
  };

  const removeMilestone = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
  };

  // ─── Time (máx. 5 pessoas do cadastro) ────────────────────────────
  const addTeamMember = () => {
    setFormData((prev) =>
      prev.teamIds.length < 5 ? { ...prev, teamIds: [...prev.teamIds, ''] } : prev
    );
  };

  const updateTeamMember = (index: number, personId: string) => {
    setFormData((prev) => {
      const next = [...prev.teamIds];
      next[index] = personId;
      return { ...prev, teamIds: next };
    });
  };

  const removeTeamMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      teamIds: prev.teamIds.filter((_, i) => i !== index),
    }));
  };

  // Ao mudar o líder, removê-lo do time se estiver como membro
  const handleLeaderChange = (leaderId: string) => {
    setFormData((prev) => ({
      ...prev,
      leaderId,
      teamIds: prev.teamIds.filter((id) => id !== leaderId),
    }));
  };

  const totalPercent = formData.milestones.reduce((s, m) => s + m.percent, 0);

  // ─── Carregar lista ───────────────────────────────────────────────
  const loadInitiatives = useCallback(async () => {
    if (!effectiveUserId) {
      setInitiatives([]);
      setLoading(false);
      return;
    }
    setLoading(true);
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
      onToast?.(e instanceof Error ? e.message : 'Erro ao carregar iniciativas', 'error');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, selectedClient?.id, selectedFarm?.id, onToast]);

  useEffect(() => {
    loadInitiatives();
  }, [loadInitiatives]);

  // Carregar pessoas para líder e time
  useEffect(() => {
    if (!effectiveUserId) {
      setPeople([]);
      return;
    }
    fetchPeople(effectiveUserId)
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [effectiveUserId]);

  // Fechar detalhe/edição se mudar de analista/cliente/fazenda
  useEffect(() => {
    setViewingInitiative(null);
    closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId, selectedClient?.id, selectedFarm?.id]);

  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNewModal) closeModal();
        else if (viewingInitiative) closeGestaoView();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showNewModal, viewingInitiative]);

  // ─── Salvar ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user?.id) {
      onToast?.('Faça login para criar iniciativas.', 'warning');
      return;
    }

    // Validação front-end
    if (!formData.name.trim()) {
      onToast?.('O nome da iniciativa é obrigatório.', 'warning');
      return;
    }
    if (!formData.startDate?.trim()) {
      onToast?.('A data de início é obrigatória (dd/mm/aa).', 'warning');
      return;
    }
    if (!formData.endDate?.trim()) {
      onToast?.('A data final é obrigatória (dd/mm/aa).', 'warning');
      return;
    }
    if (!formData.leaderId?.trim()) {
      onToast?.('O responsável (líder) é obrigatório.', 'warning');
      return;
    }
    if (totalPercent > 100) {
      onToast?.(`A soma dos marcos (${totalPercent}%) excede 100%.`, 'warning');
      return;
    }
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      onToast?.('A data de início não pode ser posterior à data final.', 'warning');
      return;
    }
    // Validar due_date dos marcos dentro do intervalo
    for (const m of formData.milestones.filter((mil) => mil.title?.trim() && mil.dueDate)) {
      if (formData.startDate && m.dueDate < formData.startDate) {
        onToast?.(`Data limite do marco "${m.title}" é anterior ao início da iniciativa.`, 'warning');
        return;
      }
      if (formData.endDate && m.dueDate > formData.endDate) {
        onToast?.(`Data limite do marco "${m.title}" é posterior ao fim da iniciativa.`, 'warning');
        return;
      }
    }

    const creatorId = effectiveUserId;
    if (!creatorId) {
      onToast?.('Selecione um analista antes de criar uma iniciativa.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const leaderPerson = people.find((p) => p.id === formData.leaderId);
      const leaderName = leaderPerson ? personDisplayName(leaderPerson) : undefined;
      const teamNames = formData.teamIds
        .filter((id) => id?.trim() && id !== formData.leaderId)
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is Person => !!p)
        .map(personDisplayName);
      const payload = {
        name: formData.name,
        tags: formData.tags || undefined,
        description: formData.description || undefined,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        status: formData.status,
        leader: leaderName,
        client_id: selectedClient?.id ?? null,
        farm_id: selectedFarm?.id ?? null,
        team: teamNames,
        milestones: formData.milestones
          .filter((m) => m.title?.trim())
          .map((m) => ({
            title: m.title,
            percent: m.percent || 0,
            due_date: m.dueDate?.trim() || undefined,
            completed: m.completed,
          })),
      };

      if (editingInitiative) {
        await updateInitiative(editingInitiative.id, payload);
        onToast?.('Iniciativa atualizada com sucesso.', 'success');
      } else {
        await createInitiative(creatorId, payload);
        onToast?.('Iniciativa salva com sucesso.', 'success');
      }
      closeModal();
      await loadInitiatives();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao salvar iniciativa', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInitiative = async (initiative: InitiativeWithProgress) => {
    const confirmed = window.confirm(`Deseja excluir a iniciativa "${initiative.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingInitiativeId(initiative.id);
    try {
      await deleteInitiative(initiative.id);
      if (viewingInitiative?.id === initiative.id) {
        setViewingInitiative(null);
      }
      onToast?.('Iniciativa excluída com sucesso.', 'success');
      await loadInitiatives();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao excluir iniciativa', 'error');
    } finally {
      setDeletingInitiativeId(null);
    }
  };

  // ─── Helpers de formatação ────────────────────────────────────────
  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const getScheduleIndicator = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) {
      return {
        colorClass: 'bg-slate-400',
        label: 'Sem cronograma',
      };
    }

    // Parse em meia-noite local para evitar deslocamentos de timezone.
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        colorClass: 'bg-slate-400',
        label: 'Cronograma inválido',
      };
    }

    // Não iniciado: data atual antes do início do prazo.
    if (today < start) {
      return {
        colorClass: 'bg-blue-500',
        label: 'Não iniciado',
      };
    }

    // Data atual após o prazo.
    if (today > end) {
      return {
        colorClass: 'bg-red-500',
        label: 'Prazo vencido',
      };
    }

    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) {
      return {
        colorClass: 'bg-yellow-500',
        label: 'Faixa final do prazo',
      };
    }

    const elapsedRatio = (today.getTime() - start.getTime()) / totalMs;

    // Últimos 10% do prazo.
    if (elapsedRatio >= 0.9) {
      return {
        colorClass: 'bg-yellow-500',
        label: 'Últimos 10% do prazo',
      };
    }

    // Entre início e 90% do prazo.
    return {
      colorClass: 'bg-green-500',
      label: 'Dentro do prazo',
    };
  };

  const statusVariant = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('andamento')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200';
    if (s.includes('concluído') || s.includes('concluido'))
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    if (s.includes('atrasado')) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    if (s.includes('suspenso')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    return 'bg-ai-surface2 text-ai-subtext';
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Loading detalhe
  if (loadingDetail) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-ai-accent" />
        <p className="text-sm text-ai-subtext mt-3">Carregando iniciativa...</p>
      </div>
    );
  }

  // ─── Tela de Gestão (detalhe) ────────────────────────────────────
  if (viewingInitiative) {
    const v = viewingInitiative;
    const tagsList = (v.tags || '')
      .split(/[#,]/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const completedCount = (v.milestones || []).filter((m) => m.completed).length;
    const totalMilestones = (v.milestones || []).length;

    return (
      <div className="flex flex-col h-full min-h-0 overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={closeGestaoView}
              className="inline-flex items-center gap-2 text-ai-subtext hover:text-ai-text text-sm"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDeleteInitiative(v)}
                disabled={deletingInitiativeId === v.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium disabled:opacity-60"
              >
                {deletingInitiativeId === v.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Excluir
              </button>
              <button
                type="button"
                onClick={openEditModalFromGestao}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ai-accent text-ai-accent hover:bg-ai-accent/10 text-sm font-medium"
              >
                <Pencil size={18} />
                Editar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-ai-border">
            <button
              type="button"
              onClick={() => setActiveTab('geral')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'geral'
                  ? 'text-ai-accent border-b-2 border-ai-accent'
                  : 'text-ai-subtext hover:text-ai-text'
              }`}
            >
              Geral & Marcos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('time')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'time'
                  ? 'text-ai-accent border-b-2 border-ai-accent'
                  : 'text-ai-subtext hover:text-ai-text'
              }`}
            >
              Time do Projeto
            </button>
          </div>

          {activeTab === 'geral' && (
            <>
              {/* Overview */}
              <div>
                <div className="flex flex-wrap items-start gap-3 mb-2">
                  <h2 className="text-xl font-bold text-ai-text">{v.name}</h2>
                  <span className="px-3 py-1 rounded-full bg-ai-surface2 text-ai-subtext text-xs font-medium">
                    {v.status ?? 'Não Iniciado'}
                  </span>
                </div>
                {v.leader && <p className="text-sm text-ai-subtext mb-2">LIDERANÇA: {v.leader}</p>}
                {tagsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tagsList.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-ai-surface2 text-ai-subtext text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {v.description && <p className="text-sm text-ai-text mb-4">{v.description}</p>}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-ai-subtext block text-xs uppercase tracking-wide">Início</span>
                    <span className="text-ai-text font-medium">{formatDate(v.start_date)}</span>
                  </div>
                  <div>
                    <span className="text-ai-subtext block text-xs uppercase tracking-wide">Final previsto</span>
                    <span className="text-ai-text font-medium">{formatDate(v.end_date)}</span>
                  </div>
                  <div>
                    <span className="text-ai-subtext block text-xs uppercase tracking-wide">Progresso</span>
                    <span className="text-ai-accent font-semibold">{v.progress ?? 0}%</span>
                  </div>
                </div>
              </div>

              {/* Marcos e Entregáveis */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Flag size={20} className="text-ai-subtext" />
                  <h3 className="text-lg font-semibold text-ai-text">Marcos e Entregáveis</h3>
                  <span className="text-sm text-ai-subtext ml-2">
                    {completedCount} de {totalMilestones} concluídos
                  </span>
                </div>
                <div className="space-y-2">
                  {(v.milestones || []).map((m) => (
                    <div
                      key={m.id}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                        m.completed
                          ? 'bg-ai-accent/5 border-ai-accent/30'
                          : 'bg-ai-surface border-ai-border hover:border-ai-accent/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMilestone(m.id);
                        }}
                        disabled={!!togglingMilestone}
                        className="shrink-0 flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer"
                      >
                        {togglingMilestone === m.id ? (
                          <Loader2 size={24} className="animate-spin text-ai-accent" />
                        ) : m.completed ? (
                          <CheckCircle size={24} className="text-green-600" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-ai-border" />
                        )}
                      </button>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => setViewingEvidenceMilestone({ milestone: m, initiativeName: v.name })}
                        onKeyDown={(e) => e.key === 'Enter' && setViewingEvidenceMilestone({ milestone: m, initiativeName: v.name })}
                        role="button"
                        tabIndex={0}
                      >
                        <p className="font-medium text-ai-text">{m.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-ai-subtext">
                          {m.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Limite: {formatDate(m.due_date)}
                            </span>
                          )}
                          <span>Clique para detalhar evidências</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-ai-text shrink-0">{m.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'time' && (
            <div>
              <h3 className="text-lg font-semibold text-ai-text mb-4">Time da Iniciativa</h3>
              {(v.team || []).length === 0 ? (
                <p className="text-sm text-ai-subtext">Nenhum membro cadastrado.</p>
              ) : (
                <ul className="space-y-2">
                  {(v.team || []).map((member, i) => (
                    <li key={i} className="flex items-center gap-2 py-2 border-b border-ai-border last:border-0">
                      <Users size={18} className="text-ai-subtext shrink-0" />
                      <span className="text-ai-text font-medium">{member.name || '—'}</span>
                      {member.role && (
                        <span className="text-xs text-ai-subtext bg-ai-surface2 px-2 py-0.5 rounded">
                          {member.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Modal Evidência de Entrega */}
        {viewingEvidenceMilestone && (
          <EvidenciaEntregaModal
            milestone={
              viewingInitiative?.milestones?.find((m) => m.id === viewingEvidenceMilestone.milestone.id) ??
              viewingEvidenceMilestone.milestone
            }
            initiativeName={viewingEvidenceMilestone.initiativeName}
            onClose={() => setViewingEvidenceMilestone(null)}
            onSaved={async () => {
              if (viewingInitiative) {
                const updated = await fetchInitiativeDetail(viewingInitiative.id);
                setViewingInitiative(updated);
              }
              loadInitiatives();
            }}
            onToast={onToast}
          />
        )}
      </div>
    );
  }

  // ─── Tela principal (lista) ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-white dark:bg-ai-bg">
      <div className="p-4 md:p-6 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <nav className="text-xs text-ai-subtext uppercase tracking-widest mb-2">
              INICIATIVAS &gt; ATIVIDADES
            </nav>
            <h1 className="text-2xl md:text-3xl font-bold text-ai-text tracking-tight">
              Atividades em Foco
            </h1>
            <p className="text-ai-subtext mt-1.5 text-base">
              Acompanhe o status e as entregas de cada consultoria ativa.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            disabled={!canCreate}
            title={
              !canCreate
                ? isAdmin
                  ? 'Selecione um Analista e Cliente no cabeçalho'
                  : 'Selecione um Cliente no cabeçalho'
                : undefined
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-ai-text text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={20} strokeWidth={2.5} />
            Nova Iniciativa
          </button>
        </div>

        {/* Aviso: admin sem analista selecionado */}
        {adminMissingAnalyst && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Selecione um <strong>Analista</strong> no cabeçalho para visualizar e gerenciar iniciativas.
            </p>
          </div>
        )}

        {/* Aviso: sem cliente selecionado (mas com analista) */}
        {!adminMissingAnalyst && effectiveUserId && !selectedClient && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <AlertTriangle size={20} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Exibindo todas as iniciativas do analista. Selecione um <strong>Cliente</strong> para filtrar.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={36} className="animate-spin text-ai-accent" />
          </div>
        ) : !effectiveUserId ? null : initiatives.length === 0 ? (
          <div className="bg-ai-surface/50 border border-ai-border rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[280px]">
            <FolderOpen size={56} className="text-ai-subtext/40 mb-4" />
            <h2 className="text-lg font-semibold text-ai-text mb-2">Nenhuma iniciativa ainda</h2>
            <p className="text-ai-subtext max-w-sm mb-6">
              {canCreate
                ? 'Crie sua primeira iniciativa para acompanhar marcos, entregas e progresso.'
                : isAdmin
                  ? 'Selecione um Analista e um Cliente no cabeçalho para criar uma iniciativa.'
                  : 'Selecione um Cliente no cabeçalho para criar uma iniciativa.'}
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={openNewModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-ai-text text-white text-sm font-semibold hover:opacity-90"
              >
                <Plus size={20} />
                Nova Iniciativa
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {initiatives.map((init) => (
              <li
                key={init.id}
                onClick={() => openGestaoView(init)}
                className="flex items-center gap-4 p-4 bg-white border border-ai-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Progresso (esquerda) */}
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <div className="flex flex-col">
                    <span
                      className="text-xl font-bold text-ai-text tabular-nums"
                      title="Andamento da atividade"
                    >
                      {init.progress ?? 0}%
                    </span>
                  </div>
                </div>

                {/* Título, líder e status (centro) */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-ai-text truncate mb-1">{init.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-ai-subtext">
                      <User size={14} className="shrink-0 text-ai-subtext" />
                      <span className="truncate">{init.leader ?? '—'}</span>
                    </span>
                    {(() => {
                      const indicator = getScheduleIndicator(init.start_date, init.end_date);
                      return (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-ai-subtext"
                          title={indicator.label}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${indicator.colorClass}`} />
                        </span>
                      );
                    })()}
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shrink-0 ${statusVariant(init.status ?? '')}`}
                    >
                      {init.status ?? 'Não iniciado'}
                    </span>
                  </div>
                </div>

                {/* Cronograma e navegação (direita) */}
                <div className="flex items-center justify-between md:justify-end gap-4 md:w-56 md:shrink-0">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-wider text-ai-subtext font-medium mb-0.5">
                      Cronograma
                    </span>
                    <span className="text-sm text-ai-text whitespace-nowrap inline-flex items-center gap-2">
                      {formatDate(init.start_date)} → {formatDate(init.end_date)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteInitiative(init);
                    }}
                    disabled={deletingInitiativeId === init.id}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-red-200 text-red-600 hover:bg-red-50 shrink-0 disabled:opacity-60"
                    title="Excluir iniciativa"
                  >
                    {deletingInitiativeId === init.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-ai-surface2 text-ai-subtext shrink-0">
                    <ChevronRight size={20} strokeWidth={2} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── Modal Nova / Editar Iniciativa ─────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div
            className="bg-ai-bg border border-ai-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-ai-bg border-b border-ai-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-ai-text">
                {editingInitiative ? 'Editar Iniciativa' : 'Nova Iniciativa'}
              </h2>
              <button type="button" onClick={closeModal} className="p-1.5 text-ai-subtext hover:text-ai-text rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {loadingEdit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-ai-accent" />
                </div>
              ) : (
                <>
                  {/* Contexto: Analista / Cliente / Fazenda */}
                  <div className="rounded-lg bg-ai-surface/60 border border-ai-border p-3 text-xs text-ai-subtext space-y-1">
                    {isAdmin && selectedAnalyst && (
                      <p>
                        <strong>Analista:</strong> {selectedAnalyst.name}
                      </p>
                    )}
                    {selectedClient && (
                      <p>
                        <strong>Cliente:</strong> {selectedClient.name}
                      </p>
                    )}
                    {selectedFarm && (
                      <p>
                        <strong>Fazenda:</strong> {selectedFarm.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ai-text mb-1">
                      Nome da Iniciativa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Reestruturação Organizacional"
                      className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ai-text mb-1">Tags (#)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
                      placeholder="#Financeiro, #Digital"
                      className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ai-text mb-1">
                        Data Início <span className="text-red-500">*</span>
                      </label>
                      <DateInputBR
                        value={formData.startDate}
                        onChange={(v) => setFormData((p) => ({ ...p, startDate: v }))}
                        placeholder="dd/mm/aaaa"
                        required
                        className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ai-text mb-1">
                        Data Final <span className="text-red-500">*</span>
                      </label>
                      <DateInputBR
                        value={formData.endDate}
                        onChange={(v) => setFormData((p) => ({ ...p, endDate: v }))}
                        placeholder="dd/mm/aaaa"
                        required
                        className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ai-text mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ai-text mb-1">
                      Responsável (Líder) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.leaderId}
                      onChange={(e) => handleLeaderChange(e.target.value)}
                      className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                      required
                    >
                      <option value="">Selecione o responsável</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {personDisplayName(p)}
                          {p.job_role ? ` — ${p.job_role}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-ai-subtext" />
                        <span className="text-sm font-medium text-ai-text">Time da Iniciativa</span>
                      </div>
                      <span className="text-xs text-ai-subtext">máx. 5 membros</span>
                    </div>
                    {formData.teamIds.map((personId, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <select
                          value={personId}
                          onChange={(e) => updateTeamMember(i, e.target.value)}
                          className="flex-1 px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                        >
                          <option value="">Selecione...</option>
                          {people
                            .filter(
                              (p) =>
                                p.id !== formData.leaderId &&
                                (!formData.teamIds.includes(p.id) || p.id === personId)
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {personDisplayName(p)}
                                {p.job_role ? ` — ${p.job_role}` : ''}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(i)}
                          className="p-2 text-ai-subtext hover:text-red-500 shrink-0"
                          title="Remover"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {formData.teamIds.length < 5 && (
                      <button
                        type="button"
                        onClick={addTeamMember}
                        className="flex items-center gap-1.5 text-sm text-ai-accent hover:underline"
                      >
                        <UserPlus size={16} /> Adicionar membro
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Flag size={16} className="text-ai-subtext" />
                        <span className="text-sm font-medium text-ai-text">Marcos e % Representatividade</span>
                      </div>
                      <span
                        className={`text-xs ${totalPercent > 100 ? 'text-red-500 font-semibold' : 'text-ai-subtext'}`}
                      >
                        Total: {totalPercent}%
                      </span>
                    </div>
                    {formData.milestones.map((m) => (
                      <div key={m.id} className="flex flex-wrap gap-2 mb-2 items-center">
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => updateMilestone(m.id, 'title', e.target.value)}
                          placeholder="Título do marco..."
                          className="flex-1 min-w-[140px] px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={m.percent || ''}
                          onChange={(e) => updateMilestone(m.id, 'percent', e.target.value)}
                          className="w-16 px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm text-right"
                        />
                        <span className="text-ai-subtext text-sm">%</span>
                        <div className="flex items-center gap-1.5" title="Data limite (entre início e fim da iniciativa) - dd/mm/aaaa">
                          <Calendar size={14} className="text-ai-subtext shrink-0" />
                          <DateInputBR
                            value={m.dueDate}
                            onChange={(v) => updateMilestone(m.id, 'dueDate', v)}
                            placeholder="dd/mm/aaaa"
                            min={formData.startDate || undefined}
                            max={formData.endDate || undefined}
                            className="w-[130px] px-2 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                          />
                        </div>
                        {formData.milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMilestone(m.id)}
                            className="p-2 text-ai-subtext hover:text-red-500"
                            title="Remover marco"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="flex items-center gap-1.5 text-sm text-ai-accent hover:underline"
                    >
                      <Plus size={14} /> Adicionar marco
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-ai-bg border-t border-ai-border px-6 py-4 flex justify-end gap-3 z-10">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-md border border-ai-border text-ai-accent bg-transparent hover:bg-ai-surface2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  loadingEdit ||
                  !formData.name.trim() ||
                  !formData.startDate?.trim() ||
                  !formData.endDate?.trim() ||
                  !formData.leaderId?.trim()
                }
                className="px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingInitiative ? 'Atualizar' : 'Salvar Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InitiativesActivities;
