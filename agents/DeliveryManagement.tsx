import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Package,
  Calendar,
  Users,
  PlusCircle,
  X,
  Link2,
  Unlink,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import {
  fetchDeliveries,
  createDelivery,
  deleteDelivery,
  linkDeliveryToProject,
  unlinkDeliveryFromProject,
  type DeliveryRow,
} from '../lib/deliveries';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectRow,
  type ProjectStakeholderRow,
} from '../lib/projects';
import DateInputBR from '../components/DateInputBR';

interface DeliveryManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const initialStakeholderRow = (): ProjectStakeholderRow => ({ name: '', activity: '' });

const initialProjectForm = {
  name: '',
  transformations_achievements: '',
  success_evidence: [] as string[],
  start_date: '',
  end_date: '',
  stakeholder_matrix: [] as ProjectStakeholderRow[],
};

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
};

const DeliveryManagement: React.FC<DeliveryManagementProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [deliveriesForProject, setDeliveriesForProject] = useState<DeliveryRow[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [addingDelivery, setAddingDelivery] = useState(false);
  const [linkDeliveryId, setLinkDeliveryId] = useState('');
  const [linkingDelivery, setLinkingDelivery] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);
  const successEvidenceInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const toast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    onToastRef.current?.(message, type);
  }, []);

  const isAdmin = user?.role === 'admin';
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id]
  );

  const clientFilter = useMemo(() => (selectedClient?.id ? { clientId: selectedClient.id } : undefined), [selectedClient?.id]);

  const unlinkedDeliveries = useMemo(() => deliveries.filter((d) => !d.project_id), [deliveries]);

  const loadProjects = useCallback(async () => {
    if (!effectiveUserId) return;
    const rows = await fetchProjects(effectiveUserId, clientFilter);
    setProjects(rows);
  }, [effectiveUserId, clientFilter]);

  const loadDeliveries = useCallback(async () => {
    if (!effectiveUserId) return;
    const rows = await fetchDeliveries(effectiveUserId, clientFilter);
    setDeliveries(rows);
  }, [effectiveUserId, clientFilter]);

  const loadDeliveriesForProject = useCallback(
    async (projectId: string) => {
      if (!effectiveUserId) return;
      const rows = await fetchDeliveries(effectiveUserId, { ...clientFilter, projectId });
      setDeliveriesForProject(rows);
    },
    [effectiveUserId, clientFilter]
  );

  useEffect(() => {
    if (!effectiveUserId) { setLoading(false); return; }
    let stale = false;
    setLoading(true);
    Promise.all([
      fetchProjects(effectiveUserId, clientFilter),
      fetchDeliveries(effectiveUserId, clientFilter),
    ])
      .then(([projectRows, deliveryRows]) => {
        if (stale) return;
        setProjects(projectRows);
        setDeliveries(deliveryRows);
      })
      .catch((e) => {
        if (stale) return;
        toast(e instanceof Error ? e.message : 'Erro ao carregar dados.', 'error');
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => { stale = true; };
  }, [effectiveUserId, clientFilter, toast]);

  useEffect(() => {
    if (!editingProject?.id || !effectiveUserId) return;
    let stale = false;
    fetchDeliveries(effectiveUserId, { ...clientFilter, projectId: editingProject.id })
      .then((rows) => { if (!stale) setDeliveriesForProject(rows); })
      .catch((e) => {
        if (!stale) toast(e instanceof Error ? e.message : 'Erro ao carregar entregas do projeto.', 'error');
      });
    return () => { stale = true; };
  }, [editingProject?.id, effectiveUserId, clientFilter, toast]);

  const openNewProject = () => {
    setEditingProject(null);
    setProjectForm(initialProjectForm);
    setView('form');
    setDeliveriesForProject([]);
  };

  const openEditProject = (project: ProjectRow) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name || '',
      transformations_achievements: project.transformations_achievements || '',
      success_evidence: Array.isArray(project.success_evidence) ? project.success_evidence : [],
      start_date: project.start_date ? project.start_date.slice(0, 10) : '',
      end_date: project.end_date ? project.end_date.slice(0, 10) : '',
      stakeholder_matrix: Array.isArray(project.stakeholder_matrix) && project.stakeholder_matrix.length > 0
        ? project.stakeholder_matrix
        : [],
    });
    setView('form');
  };

  const handleSaveProject = useCallback(async () => {
    if (!effectiveUserId) {
      toast('Selecione um analista para continuar.', 'warning');
      return;
    }
    if (!projectForm.name.trim()) {
      toast('O nome do projeto é obrigatório.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        client_id: selectedClient?.id || null,
        transformations_achievements: projectForm.transformations_achievements.trim() || null,
        success_evidence: projectForm.success_evidence.filter((s) => s.trim()),
        start_date: projectForm.start_date.trim() || null,
        end_date: projectForm.end_date.trim() || null,
        stakeholder_matrix: projectForm.stakeholder_matrix.filter((r) => r.name.trim() || r.activity.trim()),
      };
      if (editingProject) {
        const updated = await updateProject(editingProject.id, payload);
        setEditingProject(updated);
        toast('Projeto atualizado com sucesso.', 'success');
      } else {
        const created = await createProject(effectiveUserId, payload);
        setEditingProject(created);
        toast('Projeto criado. Agora vincule as entregas abaixo.', 'success');
      }
      await loadProjects();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar projeto.', 'error');
    } finally {
      setSaving(false);
    }
  }, [effectiveUserId, projectForm, editingProject, selectedClient?.id, toast, loadProjects]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este projeto? As entregas vinculadas serão desvinculadas.')) return;
    setDeletingId(projectId);
    try {
      await deleteProject(projectId);
      toast('Projeto removido com sucesso.', 'success');
      setView('list');
      setEditingProject(null);
      await Promise.all([loadProjects(), loadDeliveries()]);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao excluir projeto.', 'error');
    } finally {
      setDeletingId(null);
    }
  }, [toast, loadProjects, loadDeliveries]);

  const handleAddDelivery = useCallback(async () => {
    if (!editingProject || !effectiveUserId || !newDeliveryName.trim()) {
      toast('Digite o nome da entrega.', 'warning');
      return;
    }
    setAddingDelivery(true);
    try {
      await createDelivery(effectiveUserId, {
        name: newDeliveryName.trim(),
        client_id: selectedClient?.id || null,
        project_id: editingProject.id,
      });
      setNewDeliveryName('');
      toast('Entrega adicionada ao projeto.', 'success');
      await Promise.all([
        loadDeliveriesForProject(editingProject.id),
        loadDeliveries(),
      ]);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar entrega.', 'error');
    } finally {
      setAddingDelivery(false);
    }
  }, [editingProject, effectiveUserId, newDeliveryName, selectedClient?.id, toast, loadDeliveriesForProject, loadDeliveries]);

  const handleLinkDelivery = useCallback(async () => {
    if (!editingProject || !linkDeliveryId) return;
    setLinkingDelivery(true);
    try {
      await linkDeliveryToProject(linkDeliveryId, editingProject.id);
      setLinkDeliveryId('');
      toast('Entrega vinculada ao projeto.', 'success');
      await Promise.all([
        loadDeliveriesForProject(editingProject.id),
        loadDeliveries(),
      ]);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao vincular entrega.', 'error');
    } finally {
      setLinkingDelivery(false);
    }
  }, [editingProject, linkDeliveryId, toast, loadDeliveriesForProject, loadDeliveries]);

  const handleUnlinkDelivery = useCallback(async (deliveryId: string) => {
    setUnlinkingId(deliveryId);
    try {
      await unlinkDeliveryFromProject(deliveryId);
      toast('Entrega desvinculada do projeto.', 'success');
      if (editingProject) {
        await Promise.all([
          loadDeliveriesForProject(editingProject.id),
          loadDeliveries(),
        ]);
      } else {
        await loadDeliveries();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao desvincular.', 'error');
    } finally {
      setUnlinkingId(null);
    }
  }, [editingProject, toast, loadDeliveriesForProject, loadDeliveries]);

  const handleDeleteDelivery = useCallback(async (deliveryId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta entrega?')) return;
    setDeletingDeliveryId(deliveryId);
    try {
      await deleteDelivery(deliveryId);
      toast('Entrega excluída.', 'success');
      if (editingProject) {
        await Promise.all([
          loadDeliveriesForProject(editingProject.id),
          loadDeliveries(),
        ]);
      } else {
        await loadDeliveries();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao excluir entrega.', 'error');
    } finally {
      setDeletingDeliveryId(null);
    }
  }, [editingProject, toast, loadDeliveriesForProject, loadDeliveries]);

  if (view === 'form') {
    return (
      <div className="h-full flex flex-col overflow-auto p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => { setView('list'); setEditingProject(null); }}
            className="inline-flex items-center gap-1.5 text-ai-subtext hover:text-ai-text text-sm"
          >
            <ArrowLeft size={16} />
            Voltar para lista
          </button>
        </div>

        <div className="space-y-8">
          <div className="bg-ai-surface border border-ai-border rounded-xl p-6 space-y-5">
            <h1 className="text-xl font-bold text-ai-text">
              {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
            </h1>

            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Nome do Projeto <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
                placeholder="Ex.: Growth Partnership"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Descrição das transformações e conquistas</label>
              <textarea
                rows={4}
                value={projectForm.transformations_achievements}
                onChange={(e) => setProjectForm((p) => ({ ...p, transformations_achievements: e.target.value }))}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm resize-none"
                placeholder="Transformações e conquistas esperadas."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ai-text mb-2 flex items-center gap-1.5">
                <CheckSquare size={14} />
                Evidências de sucesso do projeto
              </label>
              <p className="text-xs text-ai-subtext mb-2">Lista numerada: descreva cada evidência de sucesso em uma linha.</p>
              <div className="border border-ai-border rounded-lg overflow-hidden">
                <div className="divide-y divide-ai-border">
                  {projectForm.success_evidence.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-ai-bg/30">
                      <span className="flex-shrink-0 w-6 text-sm font-semibold text-ai-subtext tabular-nums">{idx + 1}.</span>
                      <input
                        ref={(el) => { successEvidenceInputRefs.current[idx] = el; }}
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const next = [...projectForm.success_evidence];
                          next[idx] = e.target.value;
                          setProjectForm((p) => ({ ...p, success_evidence: next }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const next = [...projectForm.success_evidence];
                            next.splice(idx + 1, 0, '');
                            setProjectForm((p) => ({ ...p, success_evidence: next }));
                            setTimeout(() => successEvidenceInputRefs.current[idx + 1]?.focus(), 0);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border border-ai-border rounded bg-ai-bg text-ai-text text-sm"
                        placeholder="Descreva a evidência de sucesso"
                      />
                      <button
                        type="button"
                        onClick={() => setProjectForm((p) => ({ ...p, success_evidence: p.success_evidence.filter((_, i) => i !== idx) }))}
                        className="p-1.5 rounded text-ai-subtext hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-ai-border bg-ai-surface2/50">
                  <button
                    type="button"
                    onClick={() => setProjectForm((p) => ({ ...p, success_evidence: [...p.success_evidence, ''] }))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ai-accent hover:underline"
                  >
                    <PlusCircle size={14} />
                    Adicionar evidência
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ai-text mb-1 flex items-center gap-1.5"><Calendar size={14} /> Data inicial</label>
                <DateInputBR value={projectForm.start_date} onChange={(v) => setProjectForm((p) => ({ ...p, start_date: v }))} placeholder="dd/mm/aaaa" className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ai-text mb-1 flex items-center gap-1.5"><Calendar size={14} /> Data final</label>
                <DateInputBR value={projectForm.end_date} onChange={(v) => setProjectForm((p) => ({ ...p, end_date: v }))} placeholder="dd/mm/aaaa" className="w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ai-text mb-2 flex items-center gap-1.5"><Users size={14} /> Matriz de Stakeholder</label>
              <p className="text-xs text-ai-subtext mb-2">Nome e atividade por linha.</p>
              <div className="border border-ai-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ai-surface2 border-b border-ai-border">
                      <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider text-xs w-[45%]">Nome</th>
                      <th className="text-left px-3 py-2 font-semibold text-ai-subtext uppercase tracking-wider text-xs">Atividade</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {projectForm.stakeholder_matrix.map((row, idx) => (
                      <tr key={idx} className="border-b border-ai-border/50 last:border-b-0">
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const next = [...projectForm.stakeholder_matrix];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setProjectForm((p) => ({ ...p, stakeholder_matrix: next }));
                            }}
                            className="w-full px-2 py-1.5 border border-ai-border rounded bg-ai-bg text-ai-text text-sm"
                            placeholder="Nome"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={row.activity}
                            onChange={(e) => {
                              const next = [...projectForm.stakeholder_matrix];
                              next[idx] = { ...next[idx], activity: e.target.value };
                              setProjectForm((p) => ({ ...p, stakeholder_matrix: next }));
                            }}
                            className="w-full px-2 py-1.5 border border-ai-border rounded bg-ai-bg text-ai-text text-sm"
                            placeholder="Atividade"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <button type="button" onClick={() => setProjectForm((p) => ({ ...p, stakeholder_matrix: p.stakeholder_matrix.filter((_, i) => i !== idx) }))} className="p-1 rounded text-ai-subtext hover:text-red-500 hover:bg-red-50">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2 border-t border-ai-border bg-ai-surface2/50">
                  <button type="button" onClick={() => setProjectForm((p) => ({ ...p, stakeholder_matrix: [...p.stakeholder_matrix, initialStakeholderRow()] }))} className="inline-flex items-center gap-1.5 text-xs font-medium text-ai-accent hover:underline">
                    <PlusCircle size={14} /> Adicionar linha
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setView('list'); setEditingProject(null); }} className="px-4 py-2 rounded-md border border-ai-border text-ai-subtext hover:text-ai-text">Cancelar</button>
              <button type="button" onClick={handleSaveProject} disabled={saving} className="px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingProject ? 'Atualizar projeto' : 'Salvar projeto'}
              </button>
            </div>
          </div>

          {editingProject && (
            <div className="bg-ai-surface border border-ai-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-ai-text flex items-center gap-2">
                <Package size={18} />
                Entregas do projeto
              </h2>

              <div className="flex flex-wrap gap-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newDeliveryName}
                    onChange={(e) => setNewDeliveryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDelivery()}
                    placeholder="Nome da nova entrega"
                    className="px-3 py-1.5 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm w-56"
                  />
                  <button type="button" onClick={handleAddDelivery} disabled={addingDelivery || !newDeliveryName.trim()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ai-accent text-white text-sm hover:opacity-90 disabled:opacity-50">
                    {addingDelivery ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Nova entrega
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={linkDeliveryId}
                    onChange={(e) => setLinkDeliveryId(e.target.value)}
                    className="px-3 py-1.5 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm min-w-[200px]"
                  >
                    <option value="">Vincular entrega existente</option>
                    {unlinkedDeliveries.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleLinkDelivery} disabled={!linkDeliveryId || linkingDelivery} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ai-border text-ai-text text-sm hover:bg-ai-surface2 disabled:opacity-50">
                    {linkingDelivery ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    Vincular
                  </button>
                </div>
              </div>

              {deliveriesForProject.length === 0 ? (
                <p className="text-sm text-ai-subtext">Nenhuma entrega vinculada. Crie uma nova ou vincule uma existente.</p>
              ) : (
                <ul className="space-y-2">
                  {deliveriesForProject.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-ai-border bg-ai-bg">
                      <span className="text-sm font-medium text-ai-text">{d.name}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleUnlinkDelivery(d.id)} disabled={unlinkingId === d.id} className="p-1.5 rounded text-ai-subtext hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50" title="Desvincular do projeto">
                          {unlinkingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                        </button>
                        <button type="button" onClick={() => handleDeleteDelivery(d.id)} disabled={deletingDeliveryId === d.id} className="p-1.5 rounded text-ai-subtext hover:text-red-500 hover:bg-red-50 disabled:opacity-50" title="Excluir entrega">
                          {deletingDeliveryId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ai-text tracking-tight">Projeto e Entregas</h1>
          <p className="text-sm text-ai-subtext">Cadastre projetos e vincule as entregas a cada projeto.</p>
        </div>
        <button type="button" onClick={openNewProject} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90">
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
          <Package size={28} className="mx-auto text-ai-subtext mb-2" />
          <p className="text-ai-subtext text-sm">Nenhum projeto cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <article
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => openEditProject(project)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditProject(project); } }}
              className="rounded-xl border border-ai-border bg-ai-surface p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-ai-accent/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ai-text">{project.name}</h3>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => openEditProject(project)} className="p-1.5 rounded text-ai-subtext hover:text-ai-text hover:bg-ai-surface2" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button type="button" onClick={() => handleDeleteProject(project.id)} disabled={deletingId === project.id} className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-60" title="Excluir">
                    {deletingId === project.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-ai-subtext">
                <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(project.start_date)} — {formatDate(project.end_date)}</span>
                {(project.stakeholder_matrix?.length ?? 0) > 0 && (
                  <span className="flex items-center gap-1"><Users size={12} /> {project.stakeholder_matrix.length} stakeholder(s)</span>
                )}
              </div>
              <p className="text-xs text-ai-subtext whitespace-pre-wrap line-clamp-2">{project.transformations_achievements || 'Sem descrição.'}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
