import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, RefreshCw, X, FolderOpen, Package, Layers, CheckSquare,
  Info, Calendar, Target, CheckCircle2, Users, Trash2, Save, Plus,
} from 'lucide-react';
import {
  createProject,
  deleteProject,
  fetchProjects,
  type ProjectPayload,
  type ProjectRow,
  type ProjectStakeholderRow,
  updateProject,
} from '../lib/projects';
import {
  deleteDelivery,
  fetchDeliveriesByProject,
  type DeliveryRow,
} from '../lib/deliveries';
import {
  fetchInitiativesByDelivery,
  fetchTasksByInitiative,
  ensureDefaultMilestone,
  type InitiativeWithProgress,
} from '../lib/initiatives';
import { fetchPeople, type Person } from '../lib/people';
import { arrayMove } from '@dnd-kit/sortable';
import { sanitizeText } from '../lib/inputSanitizer';
import { supabase } from '../lib/supabase';
import HierarchyColumn, { type HierarchyColumnItem } from './HierarchyColumn';
import DateInputBR from './DateInputBR';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ProgramaWorkbenchProps {
  effectiveUserId: string;
  selectedClientId?: string | null;
  selectedFarmId?: string | null;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ProgramFormState {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  transformations_achievements: string;
  success_evidence: string[];
  stakeholder_matrix: ProjectStakeholderRow[];
}

interface DeliveryFormState {
  name: string;
  description: string;
  transformations_achievements: string;
  start_date: string;
  end_date: string;
}

interface ActivityFormState {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  leader_id: string;
}

type KanbanStatus = 'A Fazer' | 'Andamento' | 'Pausado' | 'Concluído';

interface TaskFormState {
  title: string;
  description: string;
  responsible_person_id: string;
  activity_date: string;
  duration_days: string;
  kanban_status: KanbanStatus;
  completed: boolean;
}

interface WorkbenchTask {
  id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  responsible_person_id: string | null;
  activity_date: string | null;
  duration_days: number | null;
  completed: boolean;
  sort_order: number;
  kanban_status: KanbanStatus;
  kanban_order: number;
}

type ModalEntity = 'program' | 'delivery' | 'activity' | 'task';
type ModalMode = 'create' | 'edit';

// ─── Constantes ─────────────────────────────────────────────────────────────

const INITIAL_PROGRAM_FORM: ProgramFormState = {
  name: '', description: '', start_date: '', end_date: '',
  transformations_achievements: '', success_evidence: [''],
  stakeholder_matrix: [{ name: '', activity: '' }],
};

const INITIAL_DELIVERY_FORM: DeliveryFormState = {
  name: '', description: '', transformations_achievements: '', start_date: '', end_date: '',
};

const INITIAL_ACTIVITY_FORM: ActivityFormState = {
  name: '', description: '', start_date: '', end_date: '', status: 'Não Iniciado', leader_id: '',
};

function currentIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  try {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const dt = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return '';
    dt.setDate(dt.getDate() + (Number.isFinite(days) ? days : 0));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

const INITIAL_TASK_FORM: TaskFormState = {
  title: '',
  description: '',
  responsible_person_id: '',
  activity_date: currentIsoDate(),
  duration_days: '1',
  kanban_status: 'A Fazer',
  completed: false,
};

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatDateBR(raw: string | null): string {
  if (!raw) return '—';
  try {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? raw : DATE_FMT.format(d);
  } catch {
    return raw;
  }
}

function removeAtIndex<T>(arr: T[], idx: number, fallback: T): T[] {
  const next = arr.filter((_, i) => i !== idx);
  return next.length > 0 ? next : [fallback];
}

function updateAtIndex<T>(arr: T[], idx: number, updater: (item: T) => T): T[] {
  return arr.map((item, i) => (i === idx ? updater(item) : item));
}

function swapSortOrderLocally<T extends { id: string; sort_order: number }>(
  rows: T[],
  firstId: string,
  secondId: string
): T[] {
  const first = rows.find((row) => row.id === firstId);
  const second = rows.find((row) => row.id === secondId);
  if (!first || !second) return rows;

  return rows
    .map((row) => {
      if (row.id === first.id) return { ...row, sort_order: second.sort_order };
      if (row.id === second.id) return { ...row, sort_order: first.sort_order };
      return row;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ─── ModalShell ─────────────────────────────────────────────────────────────

const ModalShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        ref={contentRef}
        className="w-full max-w-2xl rounded-xl border border-ai-border bg-ai-bg shadow-xl max-h-[88vh] flex flex-col"
      >
        <header className="flex items-start justify-between px-6 py-4 border-b border-ai-border shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-ai-text">{title}</h3>
            {subtitle && <p className="text-sm text-ai-subtext mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-ai-subtext hover:text-ai-text transition-colors"
          >
            <X size={18} />
          </button>
        </header>
        <div className="p-6 space-y-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 pt-1">
    {icon}
    <span className="text-xs font-semibold tracking-wider text-ai-subtext uppercase">{label}</span>
  </div>
);

// ─── Workbench Principal ────────────────────────────────────────────────────

const ProgramaWorkbench: React.FC<ProgramaWorkbenchProps> = ({
  effectiveUserId,
  selectedClientId,
  selectedFarmId,
  onToast,
}) => {
  const mountedRef = useRef(true);
  const toastRef = useRef(onToast);
  useEffect(() => { toastRef.current = onToast; }, [onToast]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const toast = useCallback(
    (msg: string, type: 'success' | 'error' | 'warning' | 'info') => {
      if (mountedRef.current) toastRef.current?.(msg, type);
    },
    []
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [initiatives, setInitiatives] = useState<InitiativeWithProgress[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const [modalEntity, setModalEntity] = useState<ModalEntity | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [programForm, setProgramForm] = useState<ProgramFormState>(INITIAL_PROGRAM_FORM);
  const [deliveryForm, setDeliveryForm] = useState<DeliveryFormState>(INITIAL_DELIVERY_FORM);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(INITIAL_ACTIVITY_FORM);
  const [taskForm, setTaskForm] = useState<TaskFormState>(INITIAL_TASK_FORM);

  const filters = useMemo(
    () => (selectedClientId ? { clientId: selectedClientId } : undefined),
    [selectedClientId]
  );

  // ── Cascade data loading ───────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoadingProjects(true);
    setErrorMessage(null);
    try {
      const p = await fetchProjects(effectiveUserId, filters);
      if (!mountedRef.current) return;
      setProjects(p);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar programas.';
      if (mountedRef.current) setErrorMessage(msg);
      toast(msg, 'error');
    } finally {
      if (mountedRef.current) setLoadingProjects(false);
    }
  }, [effectiveUserId, filters, toast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadDeliveriesForProject = useCallback(async (projectId: string) => {
    if (!mountedRef.current) return;
    setLoadingDeliveries(true);
    try {
      const d = await fetchDeliveriesByProject(projectId);
      if (mountedRef.current) setDeliveries(d);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar entregas.', 'error');
      if (mountedRef.current) setDeliveries([]);
    } finally {
      if (mountedRef.current) setLoadingDeliveries(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedProgramId) {
      loadDeliveriesForProject(selectedProgramId);
    } else {
      setDeliveries([]);
    }
  }, [selectedProgramId, loadDeliveriesForProject]);

  const loadActivitiesForDelivery = useCallback(async (deliveryId: string) => {
    if (!mountedRef.current) return;
    setLoadingActivities(true);
    try {
      const i = await fetchInitiativesByDelivery(deliveryId);
      if (mountedRef.current) setInitiatives(i);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar atividades.', 'error');
      if (mountedRef.current) setInitiatives([]);
    } finally {
      if (mountedRef.current) setLoadingActivities(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedDeliveryId) {
      loadActivitiesForDelivery(selectedDeliveryId);
    } else {
      setInitiatives([]);
    }
  }, [selectedDeliveryId, loadActivitiesForDelivery]);

  useEffect(() => {
    let active = true;
    fetchPeople(effectiveUserId, selectedFarmId ? { farmId: selectedFarmId } : undefined)
      .then((rows) => {
        if (active && mountedRef.current) setPeople(rows);
      })
      .catch((err) => {
        if (active && mountedRef.current) setPeople([]);
        toast(err instanceof Error ? err.message : 'Erro ao carregar pessoas.', 'error');
      });
    return () => { active = false; };
  }, [effectiveUserId, selectedFarmId, toast]);

  const loadTasksForActivity = useCallback(async (initiativeId: string): Promise<WorkbenchTask[]> => {
    const rows = await fetchTasksByInitiative(initiativeId);
    return rows as WorkbenchTask[];
  }, []);

  const refreshTasks = useCallback(async () => {
    if (!selectedActivityId) { setTasks([]); return; }
    try {
      const rows = await loadTasksForActivity(selectedActivityId);
      if (mountedRef.current) setTasks(rows);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao carregar tarefas.', 'error');
    }
  }, [selectedActivityId, loadTasksForActivity, toast]);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  // ── Derived state ─────────────────────────────────────────────────────

  const selectedDeliveryActivities = useMemo(() => {
    if (!selectedDeliveryId) return [] as InitiativeWithProgress[];
    return initiatives
      .filter((i) => i.delivery_id === selectedDeliveryId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [initiatives, selectedDeliveryId]);

  // ── Auto-select first items (cascade default) ──────────────────────────

  useEffect(() => {
    if (projects.length === 0) return;
    const hasValidSelection = selectedProgramId && projects.some((p) => p.id === selectedProgramId);
    if (!hasValidSelection) {
      setSelectedProgramId(projects[0].id);
    }
  }, [projects, selectedProgramId]);

  useEffect(() => {
    if (deliveries.length === 0) return;
    const hasValidSelection = selectedDeliveryId && deliveries.some((d) => d.id === selectedDeliveryId);
    if (!hasValidSelection) {
      setSelectedDeliveryId(deliveries[0].id);
    }
  }, [deliveries, selectedDeliveryId]);

  useEffect(() => {
    if (selectedDeliveryActivities.length === 0) return;
    const hasValidSelection = selectedActivityId
      && selectedDeliveryActivities.some((a) => a.id === selectedActivityId);
    if (!hasValidSelection) {
      setSelectedActivityId(selectedDeliveryActivities[0].id);
    }
  }, [selectedDeliveryActivities, selectedActivityId]);

  // ── Column items (memoized) ───────────────────────────────────────────

  const programItems = useMemo<HierarchyColumnItem[]>(
    () => projects.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${formatDateBR(p.start_date)} — ${formatDateBR(p.end_date)}`,
    })),
    [projects]
  );

  const deliveryItems = useMemo<HierarchyColumnItem[]>(
    () => deliveries.map((d) => ({
      id: d.id,
      title: d.name,
      subtitle: d.start_date || d.end_date || d.due_date
        ? `${formatDateBR(d.start_date ?? null)} — ${formatDateBR(d.end_date ?? d.due_date ?? null)}`
        : 'Sem período definido',
    })),
    [deliveries]
  );

  const activityItems = useMemo<HierarchyColumnItem[]>(
    () => selectedDeliveryActivities.map((a) => ({
      id: a.id,
      title: a.name,
      subtitle: `${a.progress ?? 0}% · ${a.status || 'Não Iniciado'}`,
    })),
    [selectedDeliveryActivities]
  );

  const taskItems = useMemo<HierarchyColumnItem[]>(
    () => tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.kanban_status}${t.due_date ? ` · ${formatDateBR(t.due_date)}` : ''}`,
    })),
    [tasks]
  );

  const computedTaskDueDate = useMemo(() => {
    const start = taskForm.activity_date || currentIsoDate();
    const duration = Math.max(1, Number.parseInt(taskForm.duration_days || '1', 10) || 1);
    return addDaysIso(start, duration - 1);
  }, [taskForm.activity_date, taskForm.duration_days]);

  // ── Modal helpers ─────────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setModalEntity(null);
    setEditingId(null);
  }, []);

  const openCreateModal = useCallback((entity: ModalEntity) => {
    setModalEntity(entity);
    setModalMode('create');
    setEditingId(null);
    setProgramForm(INITIAL_PROGRAM_FORM);
    setDeliveryForm(INITIAL_DELIVERY_FORM);
    setActivityForm(INITIAL_ACTIVITY_FORM);
    setTaskForm({ ...INITIAL_TASK_FORM, activity_date: currentIsoDate() });
  }, []);

  const openEditProgram = useCallback((id: string) => {
    const t = projects.find((p) => p.id === id);
    if (!t) return;
    setModalEntity('program');
    setModalMode('edit');
    setEditingId(id);
    setProgramForm({
      name: t.name || '', description: t.description || '',
      start_date: t.start_date || '',
      end_date: t.end_date || '',
      transformations_achievements: t.transformations_achievements || '',
      success_evidence: t.success_evidence.length ? [...t.success_evidence] : [''],
      stakeholder_matrix: t.stakeholder_matrix.length ? [...t.stakeholder_matrix] : [{ name: '', activity: '' }],
    });
  }, [projects]);

  const openEditDelivery = useCallback((id: string) => {
    const t = deliveries.find((d) => d.id === id);
    if (!t) return;
    setModalEntity('delivery');
    setModalMode('edit');
    setEditingId(id);
    setDeliveryForm({
      name: t.name || '', description: t.description || '',
      transformations_achievements: t.transformations_achievements || '',
      start_date: t.start_date || '',
      end_date: t.end_date || t.due_date || '',
    });
  }, [deliveries]);

  const openEditActivity = useCallback((id: string) => {
    const t = selectedDeliveryActivities.find((a) => a.id === id);
    if (!t) return;
    setModalEntity('activity');
    setModalMode('edit');
    setEditingId(id);
    setActivityForm({
      name: t.name || '',
      description: t.description || '',
      start_date: t.start_date || '',
      end_date: t.end_date || '',
      status: t.status || 'Não Iniciado',
      leader_id: t.leader || '',
    });
  }, [selectedDeliveryActivities]);

  const openEditTask = useCallback((id: string) => {
    const t = tasks.find((tk) => tk.id === id);
    if (!t) return;
    const activityDate = t.activity_date || t.due_date || currentIsoDate();
    const durationDays = Math.max(1, t.duration_days || 1);
    setModalEntity('task');
    setModalMode('edit');
    setEditingId(id);
    setTaskForm({
      title: t.title || '', description: t.description || '',
      responsible_person_id: t.responsible_person_id || '',
      activity_date: activityDate,
      duration_days: String(durationDays),
      completed: t.completed,
      kanban_status: t.kanban_status || 'A Fazer',
    });
  }, [tasks]);

  // ── CRUD: Program ─────────────────────────────────────────────────────

  const saveProgram = useCallback(async () => {
    if (saving) return;
    const name = programForm.name.trim();
    if (!name) { toast('Nome do programa é obrigatório.', 'warning'); return; }
    if (programForm.start_date && programForm.end_date &&
        programForm.end_date < programForm.start_date) {
      toast('Data final anterior à data inicial.', 'warning'); return;
    }

    const payload: ProjectPayload = {
      name,
      description: programForm.description.trim() || null,
      client_id: selectedClientId || null,
      start_date: programForm.start_date || null,
      end_date: programForm.end_date || null,
      transformations_achievements: programForm.transformations_achievements.trim() || null,
      success_evidence: programForm.success_evidence.map((s) => s.trim()).filter(Boolean),
      stakeholder_matrix: programForm.stakeholder_matrix
        .map((r) => ({ name: r.name.trim(), activity: r.activity.trim() }))
        .filter((r) => r.name || r.activity),
    };

    setSaving(true);
    try {
      const saved = editingId
        ? await updateProject(editingId, payload)
        : await createProject(effectiveUserId, payload);
      await loadProjects();
      setSelectedProgramId(saved.id);
      toast(editingId ? 'Programa atualizado.' : 'Programa criado.', 'success');
      closeModal();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar programa.', 'error');
    } finally {
      setSaving(false);
    }
  }, [saving, programForm, selectedClientId, editingId, effectiveUserId, loadProjects, toast, closeModal]);

  const deleteProgramById = useCallback(async (id: string) => {
    const t = projects.find((p) => p.id === id);
    if (!t || !window.confirm(`Excluir "${t.name}"?`)) return;
    setDeleting(id);
    try {
      await deleteProject(id);
      if (selectedProgramId === id) {
        setSelectedProgramId(null);
        setSelectedDeliveryId(null);
        setSelectedActivityId(null);
        setTasks([]);
      }
      await loadProjects();
      toast('Programa removido.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir programa.', 'error');
    } finally {
      setDeleting(null);
    }
  }, [projects, selectedProgramId, loadProjects, toast]);

  // ── CRUD: Delivery ────────────────────────────────────────────────────

  const saveDelivery = useCallback(async () => {
    if (saving) return;
    if (!selectedProgramId) { toast('Selecione um programa.', 'warning'); return; }
    const name = deliveryForm.name.trim();
    if (!name) { toast('Nome da entrega é obrigatório.', 'warning'); return; }
    if (deliveryForm.start_date && deliveryForm.end_date && deliveryForm.end_date < deliveryForm.start_date) {
      toast('Data final da entrega não pode ser anterior à data inicial.', 'warning');
      return;
    }

    const payload = {
      name: sanitizeText(name),
      description: deliveryForm.description.trim() ? sanitizeText(deliveryForm.description.trim()) : null,
      transformations_achievements: deliveryForm.transformations_achievements.trim()
        ? sanitizeText(deliveryForm.transformations_achievements.trim()) : null,
      start_date: deliveryForm.start_date || null,
      end_date: deliveryForm.end_date || null,
      // Compatibilidade com consumidores legados que ainda leem due_date.
      due_date: deliveryForm.end_date || null,
      client_id: selectedClientId || null,
      project_id: selectedProgramId,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('deliveries').update(payload).eq('id', editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('deliveries').insert({
          created_by: effectiveUserId,
          sort_order: deliveries.length,
          ...payload,
        });
        if (error) throw new Error(error.message);
      }
      await loadDeliveriesForProject(selectedProgramId);
      toast(editingId ? 'Entrega atualizada.' : 'Entrega criada.', 'success');
      closeModal();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar entrega.', 'error');
    } finally {
      setSaving(false);
    }
  }, [saving, selectedProgramId, deliveryForm, selectedClientId, editingId, effectiveUserId, loadDeliveriesForProject, toast, closeModal]);

  const deleteDeliveryById = useCallback(async (id: string) => {
    const t = deliveries.find((d) => d.id === id);
    if (!t || !window.confirm(`Excluir "${t.name}"?`)) return;
    setDeleting(id);
    try {
      await deleteDelivery(id);
      if (selectedDeliveryId === id) {
        setSelectedDeliveryId(null);
        setSelectedActivityId(null);
        setTasks([]);
      }
      if (selectedProgramId) await loadDeliveriesForProject(selectedProgramId);
      toast('Entrega removida.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir entrega.', 'error');
    } finally {
      setDeleting(null);
    }
  }, [deliveries, selectedDeliveryId, selectedProgramId, loadDeliveriesForProject, toast]);

  // ── CRUD: Activity (Initiative) ──────────────────────────────────────

  const saveActivity = useCallback(async () => {
    if (saving) return;
    if (!selectedDeliveryId) { toast('Selecione uma entrega.', 'warning'); return; }
    const name = activityForm.name.trim();
    if (!name) { toast('Nome é obrigatório.', 'warning'); return; }

    setSaving(true);
    try {
      const leaderPerson = people.find((p) => p.id === activityForm.leader_id);
      const leaderName = leaderPerson ? (leaderPerson.preferred_name?.trim() || leaderPerson.full_name) : (activityForm.leader_id || null);

      if (editingId) {
        const { error } = await supabase
          .from('initiatives')
          .update({
            name: sanitizeText(name),
            description: activityForm.description.trim() ? sanitizeText(activityForm.description.trim()) : null,
            start_date: activityForm.start_date || null,
            end_date: activityForm.end_date || null,
            status: activityForm.status || 'Não Iniciado',
            leader: leaderName,
          })
          .eq('id', editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('initiatives')
          .insert({
            created_by: effectiveUserId,
            name: sanitizeText(name),
            description: activityForm.description.trim() ? sanitizeText(activityForm.description.trim()) : null,
            start_date: activityForm.start_date || null,
            end_date: activityForm.end_date || null,
            status: activityForm.status || 'Não Iniciado',
            leader: leaderName,
            delivery_id: selectedDeliveryId,
            client_id: selectedClientId || null,
            farm_id: selectedFarmId || null,
            sort_order: selectedDeliveryActivities.length,
          });
        if (error) throw new Error(error.message);
      }
      await loadActivitiesForDelivery(selectedDeliveryId);
      toast(editingId ? 'Macro atividade atualizada.' : 'Macro atividade criada.', 'success');
      closeModal();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar macro atividade.', 'error');
    } finally {
      setSaving(false);
    }
  }, [saving, selectedDeliveryId, activityForm, editingId, effectiveUserId, selectedClientId, selectedFarmId, people, selectedDeliveryActivities.length, loadActivitiesForDelivery, toast, closeModal]);

  const deleteActivityById = useCallback(async (id: string) => {
    const t = selectedDeliveryActivities.find((a) => a.id === id);
    if (!t || !window.confirm(`Excluir "${t.name}"?`)) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('initiatives').delete().eq('id', id);
      if (error) throw new Error(error.message);
      if (selectedActivityId === id) { setSelectedActivityId(null); setTasks([]); }
      if (selectedDeliveryId) await loadActivitiesForDelivery(selectedDeliveryId);
      toast('Macro atividade removida.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir macro atividade.', 'error');
    } finally {
      setDeleting(null);
    }
  }, [selectedDeliveryActivities, selectedActivityId, selectedDeliveryId, loadActivitiesForDelivery, toast]);

  // ── CRUD: Task ────────────────────────────────────────────────────────

  const saveTask = useCallback(async () => {
    if (saving) return;
    if (!selectedActivityId) { toast('Selecione uma macro atividade.', 'warning'); return; }
    const title = taskForm.title.trim();
    if (!title) { toast('Título é obrigatório.', 'warning'); return; }
    if (!taskForm.responsible_person_id.trim()) { toast('Responsável é obrigatório.', 'warning'); return; }

    const activityDate = taskForm.activity_date || currentIsoDate();
    const durationDays = Math.max(1, Number.parseInt(taskForm.duration_days || '1', 10) || 1);
    const dueDate = addDaysIso(activityDate, durationDays - 1) || null;

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('initiative_tasks')
          .update({
            title: sanitizeText(title),
            description: taskForm.description.trim() ? sanitizeText(taskForm.description.trim()) : null,
            responsible_person_id: taskForm.responsible_person_id,
            activity_date: activityDate,
            duration_days: durationDays,
            due_date: dueDate,
            completed: taskForm.completed,
            completed_at: taskForm.completed ? new Date().toISOString() : null,
            kanban_status: taskForm.kanban_status,
          })
          .eq('id', editingId);
        if (error) throw new Error(error.message);
      } else {
        const milestoneId = await ensureDefaultMilestone(selectedActivityId);
        const order = tasks.length;
        const { error } = await supabase
          .from('initiative_tasks')
          .insert({
            milestone_id: milestoneId,
            title: sanitizeText(title),
            description: taskForm.description.trim() ? sanitizeText(taskForm.description.trim()) : null,
            responsible_person_id: taskForm.responsible_person_id,
            activity_date: activityDate,
            duration_days: durationDays,
            due_date: dueDate,
            completed: taskForm.completed,
            completed_at: taskForm.completed ? new Date().toISOString() : null,
            sort_order: order, kanban_status: taskForm.kanban_status, kanban_order: order,
          });
        if (error) throw new Error(error.message);
      }
      await refreshTasks();
      toast(editingId ? 'Tarefa atualizada.' : 'Tarefa criada.', 'success');
      closeModal();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar tarefa.', 'error');
    } finally {
      setSaving(false);
    }
  }, [saving, selectedActivityId, taskForm, editingId, tasks.length, refreshTasks, toast, closeModal]);

  const deleteTaskById = useCallback(async (id: string) => {
    const t = tasks.find((tk) => tk.id === id);
    if (!t || !window.confirm(`Excluir "${t.title}"?`)) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('initiative_tasks').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await refreshTasks();
      toast('Tarefa removida.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir tarefa.', 'error');
    } finally {
      setDeleting(null);
    }
  }, [tasks, refreshTasks, toast]);

  // ── Selection handlers ────────────────────────────────────────────────

  const selectProgram = useCallback((id: string) => {
    setSelectedProgramId(id);
    setSelectedDeliveryId(null);
    setSelectedActivityId(null);
    setTasks([]);
  }, []);

  const selectDelivery = useCallback((id: string) => {
    setSelectedDeliveryId(id);
    setSelectedActivityId(null);
    setTasks([]);
  }, []);

  const selectActivity = useCallback((id: string) => {
    setSelectedActivityId(id);
  }, []);

  const noopSelect = useCallback(() => {}, []);

  const swapSortOrder = useCallback(
    async (
      table: 'projects' | 'deliveries' | 'initiatives' | 'initiative_milestones' | 'initiative_tasks',
      first: { id: string; sort_order: number },
      second: { id: string; sort_order: number }
    ) => {
      const [firstUpdate, secondUpdate] = await Promise.all([
        supabase.from(table).update({ sort_order: second.sort_order }).eq('id', first.id),
        supabase.from(table).update({ sort_order: first.sort_order }).eq('id', second.id),
      ]);

      const error = firstUpdate.error || secondUpdate.error;
      if (error) throw new Error(error.message || 'Erro ao reordenar itens.');
    },
    []
  );

  const moveProgram = useCallback(async (id: string, direction: -1 | 1) => {
    const currentIndex = projects.findIndex((project) => project.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= projects.length) return;

    const current = projects[currentIndex];
    const target = projects[targetIndex];
    if (!current || !target) return;

    setProjects((prev) => swapSortOrderLocally(prev, current.id, target.id));
    try {
      await swapSortOrder('projects', current, target);
    } catch (err) {
      await loadProjects();
      toast(err instanceof Error ? err.message : 'Erro ao reordenar programas.', 'error');
    }
  }, [projects, swapSortOrder, loadProjects, toast]);

  const moveDelivery = useCallback(async (id: string, direction: -1 | 1) => {
    const currentIndex = deliveries.findIndex((delivery) => delivery.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= deliveries.length) return;

    const current = deliveries[currentIndex];
    const target = deliveries[targetIndex];
    if (!current || !target) return;

    setDeliveries((prev) => swapSortOrderLocally(prev, current.id, target.id));
    try {
      await swapSortOrder('deliveries', current, target);
    } catch (err) {
      if (selectedProgramId) await loadDeliveriesForProject(selectedProgramId);
      toast(err instanceof Error ? err.message : 'Erro ao reordenar entregas.', 'error');
    }
  }, [deliveries, swapSortOrder, selectedProgramId, loadDeliveriesForProject, toast]);

  const moveActivity = useCallback(async (id: string, direction: -1 | 1) => {
    const currentIndex = selectedDeliveryActivities.findIndex((activity) => activity.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= selectedDeliveryActivities.length) return;

    const current = selectedDeliveryActivities[currentIndex];
    const target = selectedDeliveryActivities[targetIndex];
    if (!current || !target) return;

    const currentSortOrder = current.sort_order ?? currentIndex;
    const targetSortOrder = target.sort_order ?? targetIndex;

    setInitiatives((prev) => prev.map((init) => {
      if (init.id === current.id) return { ...init, sort_order: targetSortOrder };
      if (init.id === target.id) return { ...init, sort_order: currentSortOrder };
      return init;
    }));

    try {
      await swapSortOrder('initiatives', { id: current.id, sort_order: currentSortOrder }, { id: target.id, sort_order: targetSortOrder });
    } catch (err) {
      if (selectedDeliveryId) await loadActivitiesForDelivery(selectedDeliveryId);
      toast(err instanceof Error ? err.message : 'Erro ao reordenar atividades.', 'error');
    }
  }, [selectedDeliveryActivities, swapSortOrder, selectedDeliveryId, loadActivitiesForDelivery, toast]);

  const moveTask = useCallback(async (id: string, direction: -1 | 1) => {
    const currentIndex = tasks.findIndex((task) => task.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tasks.length) return;

    const current = tasks[currentIndex];
    const target = tasks[targetIndex];
    if (!current || !target) return;

    setTasks((prev) => swapSortOrderLocally(prev, current.id, target.id));
    try {
      await swapSortOrder('initiative_tasks', current, target);
    } catch (err) {
      await refreshTasks();
      toast(err instanceof Error ? err.message : 'Erro ao reordenar tarefas.', 'error');
    }
  }, [tasks, swapSortOrder, refreshTasks, toast]);

  const batchUpdateSortOrder = useCallback(
    async (
      table: 'projects' | 'deliveries' | 'initiatives' | 'initiative_milestones' | 'initiative_tasks',
      updates: { id: string; sort_order: number }[]
    ) => {
      const results = await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from(table).update({ sort_order }).eq('id', id)
        )
      );
      const error = results.find((r) => r.error);
      if (error) throw new Error(error.error?.message || 'Erro ao reordenar.');
    },
    []
  );

  const reorderPrograms = useCallback(
    async (activeId: string, overIndex: number) => {
      const oldIndex = projects.findIndex((p) => p.id === activeId);
      if (oldIndex < 0 || oldIndex === overIndex) return;
      const reordered = arrayMove(projects, oldIndex, overIndex).map((p, i) => ({
        ...p,
        sort_order: i,
      }));
      setProjects(reordered);
      try {
        await batchUpdateSortOrder(
          'projects',
          reordered.map((p) => ({ id: p.id, sort_order: p.sort_order }))
        );
      } catch (err) {
        await loadProjects();
        toast(err instanceof Error ? err.message : 'Erro ao reordenar programas.', 'error');
      }
    },
    [projects, batchUpdateSortOrder, loadProjects, toast]
  );

  const reorderDeliveries = useCallback(
    async (activeId: string, overIndex: number) => {
      const oldIndex = deliveries.findIndex((d) => d.id === activeId);
      if (oldIndex < 0 || oldIndex === overIndex) return;
      const reordered = arrayMove(deliveries, oldIndex, overIndex).map((d, i) => ({
        ...d,
        sort_order: i,
      }));
      setDeliveries(reordered);
      try {
        await batchUpdateSortOrder(
          'deliveries',
          reordered.map((d) => ({ id: d.id, sort_order: d.sort_order }))
        );
      } catch (err) {
        if (selectedProgramId) await loadDeliveriesForProject(selectedProgramId);
        toast(err instanceof Error ? err.message : 'Erro ao reordenar entregas.', 'error');
      }
    },
    [deliveries, batchUpdateSortOrder, selectedProgramId, loadDeliveriesForProject, toast]
  );

  const reorderActivities = useCallback(
    async (activeId: string, overIndex: number) => {
      const oldIndex = selectedDeliveryActivities.findIndex((a) => a.id === activeId);
      if (oldIndex < 0 || oldIndex === overIndex) return;
      const reordered = arrayMove(selectedDeliveryActivities, oldIndex, overIndex).map((a, i) => ({
        ...a,
        sort_order: i,
      }));
      setInitiatives((prev) =>
        prev.map((init) => {
          const updated = reordered.find((r) => r.id === init.id);
          return updated ? { ...init, sort_order: updated.sort_order } : init;
        })
      );
      try {
        await batchUpdateSortOrder(
          'initiatives',
          reordered.map((a) => ({ id: a.id, sort_order: a.sort_order ?? 0 }))
        );
      } catch (err) {
        if (selectedDeliveryId) await loadActivitiesForDelivery(selectedDeliveryId);
        toast(err instanceof Error ? err.message : 'Erro ao reordenar atividades.', 'error');
      }
    },
    [selectedDeliveryActivities, batchUpdateSortOrder, selectedDeliveryId, loadActivitiesForDelivery, toast]
  );

  const reorderTasks = useCallback(
    async (activeId: string, overIndex: number) => {
      const oldIndex = tasks.findIndex((t) => t.id === activeId);
      if (oldIndex < 0 || oldIndex === overIndex) return;
      const reordered = arrayMove(tasks, oldIndex, overIndex).map((t, i) => ({
        ...t,
        sort_order: i,
      }));
      setTasks(reordered);
      try {
        await batchUpdateSortOrder(
          'initiative_tasks',
          reordered.map((t) => ({ id: t.id, sort_order: t.sort_order }))
        );
      } catch (err) {
        await refreshTasks();
        toast(err instanceof Error ? err.message : 'Erro ao reordenar tarefas.', 'error');
      }
    },
    [tasks, batchUpdateSortOrder, refreshTasks, toast]
  );

  // ── Render ────────────────────────────────────────────────────────────

  if (loadingProjects && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-ai-accent" />
      </div>
    );
  }

  if (errorMessage && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-red-600">{errorMessage}</p>
        <button
          type="button"
          onClick={loadProjects}
          className="inline-flex items-center gap-2 rounded-md border border-ai-border px-4 py-2 text-sm text-ai-text hover:bg-ai-surface transition-colors"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ai-subtext">
        Cadastre o <strong>Programa</strong>, depois a <strong>Entrega</strong>, em seguida as{' '}
        <strong>Atividades</strong> e por fim as <strong>Tarefas</strong>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <HierarchyColumn
          title="Programas"
          icon={<FolderOpen size={12} className="text-indigo-500" />}
          emptyLabel="Nenhum programa cadastrado."
          items={programItems}
          selectedId={selectedProgramId}
          accentClassName="bg-indigo-100 text-indigo-900"
          addLabel="Novo"
          loading={loadingProjects}
          onAdd={() => openCreateModal('program')}
          onSelect={selectProgram}
          onEdit={openEditProgram}
          onDelete={deleteProgramById}
          onMoveUp={(id) => moveProgram(id, -1)}
          onMoveDown={(id) => moveProgram(id, 1)}
          onReorder={reorderPrograms}
        />

        <HierarchyColumn
          title="Entregas"
          icon={<Package size={12} className="text-blue-500" />}
          emptyLabel={selectedProgramId ? 'Nenhuma entrega.' : 'Selecione um programa.'}
          items={deliveryItems}
          selectedId={selectedDeliveryId}
          accentClassName="bg-blue-100 text-blue-900"
          addLabel="Nova"
          addDisabled={!selectedProgramId}
          loading={loadingDeliveries}
          onAdd={() => openCreateModal('delivery')}
          onSelect={selectDelivery}
          onEdit={openEditDelivery}
          onDelete={deleteDeliveryById}
          onMoveUp={(id) => moveDelivery(id, -1)}
          onMoveDown={(id) => moveDelivery(id, 1)}
          onReorder={reorderDeliveries}
        />

        <HierarchyColumn
          title="Atividades"
          icon={<Layers size={12} className="text-emerald-500" />}
          emptyLabel={selectedDeliveryId ? 'Nenhuma atividade.' : 'Selecione uma entrega.'}
          items={activityItems}
          selectedId={selectedActivityId}
          accentClassName="bg-emerald-100 text-emerald-900"
          addLabel="Nova"
          addDisabled={!selectedDeliveryId}
          loading={loadingActivities}
          onAdd={() => openCreateModal('activity')}
          onSelect={selectActivity}
          onEdit={openEditActivity}
          onDelete={deleteActivityById}
          onMoveUp={(id) => moveActivity(id, -1)}
          onMoveDown={(id) => moveActivity(id, 1)}
          onReorder={reorderActivities}
        />

        <HierarchyColumn
          title="Tarefas"
          icon={<CheckSquare size={12} className="text-amber-500" />}
          emptyLabel={selectedActivityId ? 'Nenhuma tarefa.' : 'Selecione uma macro atividade.'}
          items={taskItems}
          selectedId={null}
          accentClassName="bg-amber-100 text-amber-900"
          addLabel="Nova"
          addDisabled={!selectedActivityId}
          onAdd={() => openCreateModal('task')}
          onSelect={noopSelect}
          onEdit={openEditTask}
          onDelete={deleteTaskById}
          onMoveUp={(id) => moveTask(id, -1)}
          onMoveDown={(id) => moveTask(id, 1)}
          onReorder={reorderTasks}
        />
      </div>

      {/* ── Program Modal ──────────────────────────────────────────────── */}
      {modalEntity === 'program' && (
        <ModalShell
          title={modalMode === 'create' ? 'Novo Programa' : 'Editar Programa'}
          subtitle="Preencha os detalhes para criar uma nova atividade."
          onClose={saving ? () => {} : closeModal}
        >
          {/* INFORMAÇÕES BÁSICAS */}
          <SectionHeader icon={<Info size={14} className="text-ai-accent" />} label="Informações Básicas" />
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">
              Nome do Programa <span className="text-red-500">*</span>
            </label>
            <input type="text" value={programForm.name}
              onChange={(e) => setProgramForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Transformação Digital 2024"
              className="w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2.5 text-sm text-ai-text placeholder:text-ai-subtext/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
            <textarea rows={3} value={programForm.description}
              onChange={(e) => setProgramForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descreva os objetivos principais e o contexto do programa..."
              className="w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2.5 text-sm text-ai-text placeholder:text-ai-subtext/50 resize-none" />
          </div>

          {/* CRONOGRAMA */}
          <SectionHeader icon={<Calendar size={14} className="text-ai-accent" />} label="Cronograma" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data de Início</label>
              <DateInputBR
                value={programForm.start_date}
                onChange={(v) => setProgramForm((p) => ({ ...p, start_date: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data Final</label>
              <DateInputBR
                value={programForm.end_date}
                onChange={(v) => setProgramForm((p) => ({ ...p, end_date: v }))}
                min={programForm.start_date || undefined}
              />
            </div>
          </div>

          {/* TRANSFORMAÇÕES ESPERADAS */}
          <SectionHeader icon={<Target size={14} className="text-ai-accent" />} label="Transformações Esperadas" />
          <textarea rows={3} value={programForm.transformations_achievements}
            onChange={(e) => setProgramForm((p) => ({ ...p, transformations_achievements: e.target.value }))}
            placeholder="Quais mudanças reais este programa trará para a organização?"
            className="w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2.5 text-sm text-ai-text placeholder:text-ai-subtext/50 resize-none" />

          {/* EVIDÊNCIAS DE SUCESSO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeader icon={<CheckCircle2 size={14} className="text-ai-accent" />} label="Evidências de Sucesso" />
              <button type="button"
                onClick={() => setProgramForm((p) => ({ ...p, success_evidence: [...p.success_evidence, ''] }))}
                className="inline-flex items-center gap-1 text-xs font-medium text-ai-accent hover:text-ai-accent/80 transition-colors">
                <Plus size={12} />
                Adicionar item
              </button>
            </div>
            {programForm.success_evidence.map((item, idx) => (
              <div key={`ev-${idx}`} className="flex items-center gap-2">
                <input type="text" value={item}
                  onChange={(e) => setProgramForm((p) => ({
                    ...p, success_evidence: updateAtIndex(p.success_evidence, idx, () => e.target.value),
                  }))}
                  placeholder={`Evidência ${idx + 1}`}
                  className="w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2.5 text-sm text-ai-text placeholder:text-ai-subtext/50" />
                <button type="button"
                  onClick={() => setProgramForm((p) => ({
                    ...p, success_evidence: removeAtIndex(p.success_evidence, idx, ''),
                  }))}
                  className="shrink-0 p-2 text-ai-subtext hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* MATRIZ DE STAKEHOLDERS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Users size={14} className="text-ai-accent" />} label="Matriz de Stakeholders" />
              <button type="button"
                onClick={() => setProgramForm((p) => ({ ...p, stakeholder_matrix: [...p.stakeholder_matrix, { name: '', activity: '' }] }))}
                className="inline-flex items-center gap-1 text-xs font-medium text-ai-accent hover:text-ai-accent/80 transition-colors">
                <Plus size={12} />
                Adicionar linha
              </button>
            </div>
            {programForm.stakeholder_matrix.map((row, idx) => (
              <div key={`sh-${idx}`} className="flex items-center gap-2">
                <input type="text" value={row.name}
                  onChange={(e) => setProgramForm((p) => ({
                    ...p, stakeholder_matrix: updateAtIndex(p.stakeholder_matrix, idx, (r) => ({ ...r, name: e.target.value })),
                  }))}
                  placeholder="Nome / Cargo"
                  className="w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2.5 text-sm text-ai-text placeholder:text-ai-subtext/50" />
                <input type="text" value={row.activity}
                  onChange={(e) => setProgramForm((p) => ({
                    ...p, stakeholder_matrix: updateAtIndex(p.stakeholder_matrix, idx, (r) => ({ ...r, activity: e.target.value })),
                  }))}
                  placeholder="Atividade / Responsabilidade"
                  className="w-full rounded-lg border border-ai-border bg-ai-surface px-3 py-2.5 text-sm text-ai-text placeholder:text-ai-subtext/50" />
                <button type="button"
                  onClick={() => setProgramForm((p) => ({
                    ...p, stakeholder_matrix: removeAtIndex(p.stakeholder_matrix, idx, { name: '', activity: '' }),
                  }))}
                  className="shrink-0 p-2 text-ai-subtext hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-ai-border">
            <button type="button" onClick={closeModal} disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-ai-subtext hover:text-ai-text disabled:opacity-50 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={saveProgram} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-ai-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ai-accent/90 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {modalMode === 'create' ? 'Salvar Programa' : 'Atualizar Programa'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Delivery Modal ─────────────────────────────────────────────── */}
      {modalEntity === 'delivery' && (
        <ModalShell title={modalMode === 'create' ? 'Nova Entrega' : 'Editar Entrega'} onClose={saving ? () => {} : closeModal}>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Nome *</label>
            <input type="text" value={deliveryForm.name}
              onChange={(e) => setDeliveryForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
            <textarea rows={3} value={deliveryForm.description}
              onChange={(e) => setDeliveryForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text resize-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data inicial</label>
              <DateInputBR
                value={deliveryForm.start_date}
                onChange={(v) => setDeliveryForm((p) => ({ ...p, start_date: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data final</label>
              <DateInputBR
                value={deliveryForm.end_date}
                onChange={(v) => setDeliveryForm((p) => ({ ...p, end_date: v }))}
                min={deliveryForm.start_date || undefined}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} disabled={saving}
              className="rounded-md border border-ai-border px-3 py-2 text-sm text-ai-subtext hover:text-ai-text disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={saveDelivery} disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-ai-accent px-3 py-2 text-sm text-white disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {modalMode === 'create' ? 'Salvar' : 'Atualizar'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Activity (Initiative) Modal ──────────────────────────────── */}
      {modalEntity === 'activity' && (
        <ModalShell title={modalMode === 'create' ? 'Nova Macro Atividade' : 'Editar Macro Atividade'} onClose={saving ? () => {} : closeModal}>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Nome *</label>
            <input type="text" value={activityForm.name}
              onChange={(e) => setActivityForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
            <textarea rows={3} value={activityForm.description}
              onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data inicial</label>
              <DateInputBR
                value={activityForm.start_date}
                onChange={(v) => setActivityForm((p) => ({ ...p, start_date: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Data final</label>
              <DateInputBR
                value={activityForm.end_date}
                onChange={(v) => setActivityForm((p) => ({ ...p, end_date: v }))}
                min={activityForm.start_date || undefined}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Responsável</label>
              <select value={activityForm.leader_id}
                onChange={(e) => setActivityForm((p) => ({ ...p, leader_id: e.target.value }))}
                className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text">
                <option value="">Selecione</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.preferred_name?.trim() || person.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Status</label>
              <select value={activityForm.status}
                onChange={(e) => setActivityForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text">
                <option value="Não Iniciado">Não Iniciado</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Suspenso">Suspenso</option>
                <option value="Concluído">Concluído</option>
                <option value="Atrasado">Atrasado</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} disabled={saving}
              className="rounded-md border border-ai-border px-3 py-2 text-sm text-ai-subtext hover:text-ai-text disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={saveActivity} disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-ai-accent px-3 py-2 text-sm text-white disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {modalMode === 'create' ? 'Salvar' : 'Atualizar'}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ── Task Modal ─────────────────────────────────────────────────── */}
      {modalEntity === 'task' && (
        <ModalShell title={modalMode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'} onClose={saving ? () => {} : closeModal}>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Título *</label>
            <input type="text" value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
            <textarea rows={3} value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Responsável *</label>
              <select value={taskForm.responsible_person_id}
                onChange={(e) => setTaskForm((p) => ({ ...p, responsible_person_id: e.target.value }))}
                className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text">
                <option value="">Selecione o responsável</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.preferred_name?.trim() || person.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Status Kanban</label>
              <select value={taskForm.kanban_status}
                onChange={(e) => setTaskForm((p) => ({ ...p, kanban_status: e.target.value as KanbanStatus }))}
                className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text">
                <option value="A Fazer">A Fazer</option>
                <option value="Andamento">Andamento</option>
                <option value="Pausado">Pausado</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Início</label>
              <DateInputBR
                value={taskForm.activity_date}
                onChange={(v) => setTaskForm((p) => ({ ...p, activity_date: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Duração (dias)</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={taskForm.duration_days}
                onChange={(e) => setTaskForm((p) => ({ ...p, duration_days: e.target.value }))}
                className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ai-text mb-1">Prazo final</label>
              <div className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text">
                {formatDateBR(computedTaskDueDate || null)}
              </div>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ai-text">
            <input type="checkbox" checked={taskForm.completed}
              onChange={(e) => setTaskForm((p) => ({ ...p, completed: e.target.checked }))} />
            Tarefa concluída
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} disabled={saving}
              className="rounded-md border border-ai-border px-3 py-2 text-sm text-ai-subtext hover:text-ai-text disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={saveTask} disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-ai-accent px-3 py-2 text-sm text-white disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {modalMode === 'create' ? 'Salvar' : 'Atualizar'}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default ProgramaWorkbench;
