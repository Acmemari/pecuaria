import React, { useCallback, useMemo, useState } from 'react';
import { X, Save } from 'lucide-react';
import DateInputBR from './DateInputBR';
import type { DeliveryRow } from '../lib/deliveries';
import type { Person } from '../lib/people';
import type { InitiativeWithProgress, InitiativeMilestoneRow } from '../lib/initiatives';
import { createTask } from '../lib/initiatives';

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysIso(iso: string, days: number): string {
  try {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const dt = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return '';
    dt.setDate(dt.getDate() + (Number.isFinite(days) ? days : 0));
    return toLocalIso(dt);
  } catch {
    return '';
  }
}

function formatDateBR(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function TaskCreateModal({
  open,
  onClose,
  onToast,
  deliveries,
  initiatives,
  people,
  selectedDeliveryId,
  setSelectedDeliveryId,
  selectedInitiativeId,
  setSelectedInitiativeId,
  milestones,
  selectedMilestoneId,
  setSelectedMilestoneId,
  getResponsibleLabel,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  deliveries: DeliveryRow[];
  initiatives: InitiativeWithProgress[];
  people: Person[];
  selectedDeliveryId: string;
  setSelectedDeliveryId: (v: string) => void;
  selectedInitiativeId: string;
  setSelectedInitiativeId: (v: string) => void;
  milestones: InitiativeMilestoneRow[];
  selectedMilestoneId: string;
  setSelectedMilestoneId: (v: string) => void;
  getResponsibleLabel: (id: string | null) => string;
  onCreated: () => Promise<void>;
}) {
  const todayIso = useMemo(() => toLocalIso(new Date()), []);

  const [title, setTitle] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState('');
  const [activityDate, setActivityDate] = useState(todayIso);
  const [days, setDays] = useState('1');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveMilestoneId = useMemo(() => {
    if (selectedMilestoneId) return selectedMilestoneId;
    return milestones[0]?.id || '';
  }, [selectedMilestoneId, milestones]);

  const computedDueDateIso = useMemo(() => {
    const base = activityDate || todayIso;
    const duration = Math.max(1, Number.parseInt(days || '1', 10) || 1);
    return addDaysIso(base, duration - 1);
  }, [activityDate, days, todayIso]);

  const nextKanbanOrder = useMemo(() => {
    let max = -1;
    for (const m of milestones || []) {
      for (const t of m.tasks || []) {
        if ((t.kanban_status || 'A Fazer') === 'A Fazer') {
          const o = Number.isFinite(t.kanban_order) ? t.kanban_order : 0;
          if (o > max) max = o;
        }
      }
    }
    return max + 1;
  }, [milestones]);

  const resetLocal = useCallback(() => {
    setTitle('');
    setResponsiblePersonId('');
    setActivityDate(todayIso);
    setDays('1');
    setDescription('');
  }, [todayIso]);

  const handleClose = useCallback(() => {
    if (!saving) {
      resetLocal();
      onClose();
    }
  }, [saving, resetLocal, onClose]);

  const canSave = !!title.trim() && !!responsiblePersonId.trim() && !!effectiveMilestoneId && !saving;

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      onToast?.('O título da tarefa é obrigatório.', 'warning');
      return;
    }
    if (!responsiblePersonId.trim()) {
      onToast?.('Selecione um responsável para a tarefa.', 'warning');
      return;
    }
    if (!effectiveMilestoneId) {
      onToast?.('Nenhum marco disponível para vincular a tarefa.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await createTask(effectiveMilestoneId, {
        title: title.trim(),
        description: description.trim() || undefined,
        activity_date: activityDate || null,
        duration_days: Math.max(1, Number.parseInt(days || '1', 10) || 1),
        due_date: computedDueDateIso || null,
        responsible_person_id: responsiblePersonId,
        kanban_status: 'A Fazer',
        kanban_order: nextKanbanOrder,
      });
      onToast?.('Tarefa criada com sucesso.', 'success');
      await onCreated();
      resetLocal();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao criar tarefa', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    title,
    description,
    computedDueDateIso,
    responsiblePersonId,
    effectiveMilestoneId,
    nextKanbanOrder,
    onToast,
    onCreated,
    resetLocal,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={handleClose}>
      <div
        className="bg-white dark:bg-ai-bg border border-ai-border rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-ai-border flex items-center justify-between">
          <div className="text-base font-semibold text-ai-text">Adicionar nova tarefa</div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 text-sm text-ai-subtext hover:text-ai-text"
          >
            <X size={16} />
            Fechar
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Linha superior: Tarefa, Responsável, Início, Duração, Prazo final */}
          <div className="grid grid-cols-1 md:grid-cols-16 gap-3">
            <div className="md:col-span-6">
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Tarefa</div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
                placeholder="Ex: Revisar relatório..."
              />
            </div>

            <div className="md:col-span-4">
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">
                Responsável <span className="text-red-500">*</span>
              </div>
              <select
                value={responsiblePersonId}
                onChange={e => setResponsiblePersonId(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              >
                <option value="" disabled>
                  Selecione
                </option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.preferred_name?.trim() || p.full_name}
                    {p.job_role?.trim() ? ` — ${p.job_role.trim()}` : ''}
                  </option>
                ))}
              </select>
              {responsiblePersonId && (
                <div className="mt-1 text-[11px] text-ai-subtext">
                  Selecionado:{' '}
                  <span className="font-medium text-ai-text">{getResponsibleLabel(responsiblePersonId)}</span>
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Início</div>
              <DateInputBR value={activityDate} onChange={setActivityDate} placeholder="dd/mm/aaaa" />
            </div>

            <div className="md:col-span-1">
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Duração</div>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={days}
                onChange={e => setDays(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Prazo final</div>
              <div className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm tabular-nums">
                {formatDateBR(computedDueDateIso || null)}
              </div>
            </div>
          </div>

          {/* Linha intermediária: Descrição da tarefa */}
          <div>
            <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">
              Descrição da tarefa
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm resize-none"
              rows={5}
              placeholder="Descreva detalhes importantes..."
            />
          </div>

          {/* Linha inferior: Projeto, Atividade, Marco */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">
                Projeto (opcional)
              </div>
              <select
                value={selectedDeliveryId}
                onChange={e => {
                  setSelectedDeliveryId(e.target.value);
                  setSelectedInitiativeId('');
                  setSelectedMilestoneId('');
                }}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              >
                <option value="">—</option>
                {deliveries.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">
                Atividade (opcional)
              </div>
              <select
                value={selectedInitiativeId}
                onChange={e => {
                  setSelectedInitiativeId(e.target.value);
                  setSelectedMilestoneId('');
                }}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              >
                <option value="">—</option>
                {initiatives.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">
                Marco (opcional)
              </div>
              <select
                value={selectedMilestoneId}
                onChange={e => setSelectedMilestoneId(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              >
                <option value="">— (usar 1º marco)</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              {!selectedMilestoneId && milestones[0]?.id && (
                <div className="mt-1 text-[11px] text-ai-subtext">
                  Usando: <span className="font-medium text-ai-text">{milestones[0]?.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ai-border flex items-center justify-end gap-3 bg-ai-surface/10">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium text-ai-subtext hover:text-ai-text"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ai-accent text-white text-sm font-semibold disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando…' : 'Salvar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
}
