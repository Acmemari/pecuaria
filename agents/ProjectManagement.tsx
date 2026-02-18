import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ArrowLeft, Loader2, Pencil, Trash2, FolderOpen, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectPayload,
  type ProjectRow,
  type ProjectStakeholderRow,
} from '../lib/projects';
import { fetchDeliveries, createDelivery, updateDelivery, type DeliveryRow } from '../lib/deliveries';

interface ProjectManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ProjectFormState {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  transformations_achievements: string;
  success_evidence: string[];
  stakeholder_matrix: ProjectStakeholderRow[];
}

const initialForm: ProjectFormState = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  transformations_achievements: '',
  success_evidence: [''],
  stakeholder_matrix: [{ name: '', activity: '' }],
};

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

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [formData, setFormData] = useState<ProjectFormState>(initialForm);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [newDeliveryDescription, setNewDeliveryDescription] = useState('');
  const [creatingDelivery, setCreatingDelivery] = useState(false);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const isAdmin = user?.role === 'admin';
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id]
  );

  const clientFilter = useMemo(
    () => (selectedClient?.id ? { clientId: selectedClient.id } : undefined),
    [selectedClient?.id]
  );

  const loadData = useCallback(async () => {
    if (!effectiveUserId) {
      setProjects([]);
      setDeliveries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [projectRows, deliveryRows] = await Promise.all([
        fetchProjects(effectiveUserId, clientFilter),
        fetchDeliveries(effectiveUserId, clientFilter),
      ]);
      setProjects(projectRows);
      setDeliveries(deliveryRows);
    } catch (e) {
      onToastRef.current?.(e instanceof Error ? e.message : 'Erro ao carregar projetos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, clientFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = useCallback(() => {
    setFormData(initialForm);
    setSelectedDeliveryIds(new Set());
    setNewDeliveryName('');
    setNewDeliveryDescription('');
  }, []);

  const openNew = useCallback(() => {
    setEditing(null);
    resetForm();
    setView('form');
  }, [resetForm]);

  const openEdit = (project: ProjectRow) => {
    const linkedIds = deliveries
      .filter((d) => d.project_id === project.id)
      .map((d) => d.id);
    setEditing(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      transformations_achievements: project.transformations_achievements || '',
      success_evidence: project.success_evidence.length > 0 ? project.success_evidence : [''],
      stakeholder_matrix: project.stakeholder_matrix.length > 0 ? project.stakeholder_matrix : [{ name: '', activity: '' }],
    });
    setSelectedDeliveryIds(new Set(linkedIds));
    setNewDeliveryName('');
    setNewDeliveryDescription('');
    setView('form');
  };

  const updateStakeholderRow = useCallback((idx: number, field: 'name' | 'activity', value: string) => {
    setFormData((prev) => ({
      ...prev,
      stakeholder_matrix: prev.stakeholder_matrix.map((row, rowIdx) => (
        rowIdx === idx ? { ...row, [field]: value } : row
      )),
    }));
  }, []);

  const addStakeholderRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      stakeholder_matrix: [...prev.stakeholder_matrix, { name: '', activity: '' }],
    }));
  }, []);

  const removeStakeholderRow = useCallback((idx: number) => {
    setFormData((prev) => {
      const next = prev.stakeholder_matrix.filter((_, rowIdx) => rowIdx !== idx);
      return { ...prev, stakeholder_matrix: next.length > 0 ? next : [{ name: '', activity: '' }] };
    });
  }, []);

  const addSuccessEvidence = useCallback(() => {
    setFormData((prev) => ({ ...prev, success_evidence: [...prev.success_evidence, ''] }));
  }, []);

  const updateSuccessEvidence = useCallback((idx: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      success_evidence: prev.success_evidence.map((item, itemIdx) => (itemIdx === idx ? value : item)),
    }));
  }, []);

  const removeSuccessEvidence = useCallback((idx: number) => {
    setFormData((prev) => {
      const next = prev.success_evidence.filter((_, itemIdx) => itemIdx !== idx);
      return { ...prev, success_evidence: next.length > 0 ? next : [''] };
    });
  }, []);

  const toggleDeliverySelection = useCallback((deliveryId: string) => {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(deliveryId)) next.delete(deliveryId);
      else next.add(deliveryId);
      return next;
    });
  }, []);

  const availableDeliveries = useMemo(() => {
    if (!editing) return deliveries.filter((d) => !d.project_id);
    return deliveries.filter((d) => !d.project_id || d.project_id === editing.id);
  }, [deliveries, editing]);

  const syncProjectDeliveries = useCallback(async (
    projectId: string,
    deliveriesSnapshot: DeliveryRow[],
    selectedIds: Set<string>
  ) => {
    const linkedNow = deliveriesSnapshot.filter((d) => d.project_id === projectId);

    const toLink = deliveriesSnapshot.filter((d) => selectedIds.has(d.id) && d.project_id !== projectId);
    const toUnlink = linkedNow.filter((d) => !selectedIds.has(d.id));

    if (!toLink.length && !toUnlink.length) return;

    await Promise.all([
      ...toLink.map((delivery) => updateDelivery(delivery.id, {
        name: delivery.name,
        description: delivery.description || '',
        client_id: delivery.client_id,
        project_id: projectId,
      })),
      ...toUnlink.map((delivery) => updateDelivery(delivery.id, {
        name: delivery.name,
        description: delivery.description || '',
        client_id: delivery.client_id,
        project_id: null,
      })),
    ]);
  }, []);

  const deliveryCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deliveries) {
      if (!d.project_id) continue;
      map.set(d.project_id, (map.get(d.project_id) || 0) + 1);
    }
    return map;
  }, [deliveries]);

  const handleSave = async () => {
    if (saving) return;
    if (!effectiveUserId) {
      onToast?.('Selecione um analista para continuar.', 'warning');
      return;
    }
    if (!formData.name.trim()) {
      onToast?.('O nome do projeto é obrigatório.', 'warning');
      return;
    }
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(`${formData.end_date}T00:00:00`) < new Date(`${formData.start_date}T00:00:00`)
    ) {
      onToast?.('A data final não pode ser anterior à data de início.', 'warning');
      return;
    }

    const payload: ProjectPayload = {
      name: formData.name,
      description: formData.description || null,
      client_id: selectedClient?.id || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      transformations_achievements: formData.transformations_achievements || null,
      success_evidence: formData.success_evidence.map((item) => item.trim()).filter(Boolean),
      stakeholder_matrix: formData.stakeholder_matrix
        .map((row) => ({ name: row.name.trim(), activity: row.activity.trim() }))
        .filter((row) => row.name || row.activity),
    };

    setSaving(true);
    try {
      const deliveriesSnapshot = [...deliveries];
      const selectedIds = new Set(selectedDeliveryIds);
      const savedProject = editing
        ? await updateProject(editing.id, payload)
        : await createProject(effectiveUserId, payload);
      await syncProjectDeliveries(savedProject.id, deliveriesSnapshot, selectedIds);
      onToast?.(editing ? 'Projeto atualizado com sucesso.' : 'Projeto criado com sucesso.', 'success');
      setView('list');
      setEditing(null);
      resetForm();
      await loadData();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao salvar projeto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: ProjectRow) => {
    if (!window.confirm(`Deseja excluir o projeto "${project.name}"?`)) return;
    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      onToast?.('Projeto removido com sucesso.', 'success');
      await loadData();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao excluir projeto.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateInlineDelivery = async () => {
    if (creatingDelivery) return;
    if (!effectiveUserId) {
      onToast?.('Selecione um analista para continuar.', 'warning');
      return;
    }
    if (!newDeliveryName.trim()) {
      onToast?.('Informe o nome da entrega planejada.', 'warning');
      return;
    }
    setCreatingDelivery(true);
    try {
      const created = await createDelivery(effectiveUserId, {
        name: newDeliveryName,
        description: newDeliveryDescription,
        client_id: selectedClient?.id || null,
      });
      setDeliveries((prev) => [...prev, created]);
      setSelectedDeliveryIds((prev) => new Set(prev).add(created.id));
      setNewDeliveryName('');
      setNewDeliveryDescription('');
      onToast?.('Entrega planejada criada.', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao criar entrega planejada.', 'error');
    } finally {
      setCreatingDelivery(false);
    }
  };

  if (view === 'form') {
    return (
      <div className="h-full flex flex-col p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 text-ai-subtext hover:text-ai-text text-sm"
          >
            <ArrowLeft size={16} />
            Voltar para lista
          </button>
        </div>

        <div className="bg-ai-surface border border-ai-border rounded-xl p-6 space-y-6">
          <h1 className="text-xl font-bold text-ai-text">{editing ? 'Editar Projeto' : 'Novo Projeto'}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ai-text mb-1">
                Nome do Projeto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
                placeholder="Ex.: Growth Partnership"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ai-text mb-1">Descrição do Projeto</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm resize-none"
                placeholder="Descreva do que se trata o projeto."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data de Início</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data Final</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
              />
            </div>
          </div>

          <section>
            <label className="block text-sm font-medium text-ai-text mb-1">Lista de Transformações Esperadas</label>
            <textarea
              rows={4}
              value={formData.transformations_achievements}
              onChange={(e) => setFormData((prev) => ({ ...prev, transformations_achievements: e.target.value }))}
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm resize-none"
              placeholder="Liste as transformações esperadas do projeto."
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-ai-text">Evidências de Sucesso</label>
              <button
                type="button"
                onClick={addSuccessEvidence}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-ai-border text-ai-subtext hover:text-ai-text text-xs"
              >
                <Plus size={14} />
                Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {formData.success_evidence.map((item, idx) => (
                <div key={`evidence-${idx}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateSuccessEvidence(idx, e.target.value)}
                    className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
                    placeholder={`Evidência ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSuccessEvidence(idx)}
                    className="p-2 rounded border border-ai-border text-ai-subtext hover:text-red-500"
                    title="Remover evidência"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-ai-text">Matriz de Stakeholder</label>
              <button
                type="button"
                onClick={addStakeholderRow}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-ai-border text-ai-subtext hover:text-ai-text text-xs"
              >
                <Plus size={14} />
                Adicionar linha
              </button>
            </div>
            <div className="space-y-2">
              {formData.stakeholder_matrix.map((row, idx) => (
                <div key={`stakeholder-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateStakeholderRow(idx, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
                    placeholder="Nome do stakeholder"
                  />
                  <input
                    type="text"
                    value={row.activity}
                    onChange={(e) => updateStakeholderRow(idx, 'activity', e.target.value)}
                    className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
                    placeholder="Atividade / responsabilidade"
                  />
                  <button
                    type="button"
                    onClick={() => removeStakeholderRow(idx)}
                    className="px-3 py-2 rounded border border-ai-border text-ai-subtext hover:text-red-500"
                    title="Remover stakeholder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <label className="block text-sm font-medium text-ai-text">Entregas Planejadas</label>
            <div className="rounded-lg border border-ai-border bg-ai-bg p-3 space-y-2 max-h-56 overflow-y-auto">
              {availableDeliveries.length === 0 ? (
                <p className="text-xs text-ai-subtext">Nenhuma entrega disponível. Crie uma nova abaixo.</p>
              ) : (
                availableDeliveries.map((delivery) => (
                  <label
                    key={delivery.id}
                    className="flex items-start gap-2 p-2 rounded hover:bg-ai-surface cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedDeliveryIds.has(delivery.id)}
                      onChange={() => toggleDeliverySelection(delivery.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-ai-text font-medium">{delivery.name}</span>
                      <span className="block text-xs text-ai-subtext whitespace-pre-wrap">{delivery.description || 'Sem descrição.'}</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="rounded-lg border border-ai-border bg-ai-bg p-3 space-y-2">
              <p className="text-xs font-medium text-ai-text">Nova Entrega Planejada</p>
              <input
                type="text"
                value={newDeliveryName}
                onChange={(e) => setNewDeliveryName(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-white text-ai-text text-sm"
                placeholder="Nome da entrega"
              />
              <textarea
                rows={2}
                value={newDeliveryDescription}
                onChange={(e) => setNewDeliveryDescription(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-white text-ai-text text-sm resize-none"
                placeholder="Descrição da entrega planejada"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateInlineDelivery}
                  disabled={creatingDelivery}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ai-accent text-white text-xs hover:opacity-90 disabled:opacity-60"
                >
                  {creatingDelivery && <Loader2 size={14} className="animate-spin" />}
                  Adicionar entrega
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-4 py-2 rounded-md border border-ai-border text-ai-subtext hover:text-ai-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editing ? 'Atualizar Projeto' : 'Salvar Projeto'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin && !selectedAnalyst) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Selecione um <strong>Analista</strong> no cabeçalho para gerenciar projetos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ai-text tracking-tight">Cadastro de Projeto</h1>
          <p className="text-sm text-ai-subtext">Cadastre projetos, stakeholders e entregas planejadas.</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90"
        >
          <Plus size={16} />
          Novo Projeto
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-ai-accent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ai-border bg-ai-surface p-10 text-center">
          <FolderOpen size={28} className="mx-auto text-ai-subtext mb-2" />
          <p className="text-ai-subtext text-sm">Nenhum projeto cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const linkedCount = deliveryCountByProject.get(project.id) || 0;
            return (
              <article
                key={project.id}
                className="rounded-xl border border-ai-border bg-ai-surface p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ai-text">{project.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(project)}
                      className="p-1.5 rounded text-ai-subtext hover:text-ai-text hover:bg-ai-surface2"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project)}
                      disabled={deletingId === project.id}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-60"
                      title="Excluir"
                    >
                      {deletingId === project.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-ai-subtext whitespace-pre-wrap">
                  {project.description || 'Sem descrição.'}
                </p>

                <div className="text-xs text-ai-subtext flex flex-wrap items-center gap-3">
                  <span>Início: {formatDate(project.start_date)}</span>
                  <span>Final: {formatDate(project.end_date)}</span>
                  <span>{linkedCount} entrega(s) planejada(s)</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
