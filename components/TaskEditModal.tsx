import React, { useCallback, useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import DateInputBR from './DateInputBR';
import type { Person } from '../lib/people';
import type { InitiativeTaskRow } from '../lib/initiatives';
import { updateTask } from '../lib/initiatives';

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dueDateToIso(d: string | null): string {
  if (!d) return toLocalIso(new Date());
  const match = d.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : toLocalIso(new Date());
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

export default function TaskEditModal({
  open,
  task,
  onClose,
  onToast,
  people,
  getResponsibleLabel,
  onSaved,
}: {
  open: boolean;
  task: InitiativeTaskRow | null;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  people: Person[];
  getResponsibleLabel: (id: string | null) => string;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [days, setDays] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setResponsiblePersonId(task.responsible_person_id || '');
    const fallbackDueDate = dueDateToIso(task.due_date);
    setActivityDate(task.activity_date || fallbackDueDate);
    setDays(String(Math.max(1, task.duration_days || 1)));
  }, [task]);

  const computedDueDateIso = React.useMemo(() => {
    const base = activityDate || dueDateToIso(task?.due_date || null);
    const duration = Math.max(1, Number.parseInt(days || '1', 10) || 1);
    return addDaysIso(base, duration - 1);
  }, [activityDate, days, task?.due_date]);

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  const canSave = !!task && !!title.trim() && !!responsiblePersonId.trim() && !saving;

  const handleSave = useCallback(async () => {
    if (!task) return;
    if (!title.trim()) {
      onToast?.('O título da tarefa é obrigatório.', 'warning');
      return;
    }
    if (!responsiblePersonId.trim()) {
      onToast?.('Selecione um responsável para a tarefa.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        responsible_person_id: responsiblePersonId,
        activity_date: activityDate || null,
        duration_days: Math.max(1, Number.parseInt(days || '1', 10) || 1),
        due_date: computedDueDateIso || null,
      });
      onToast?.('Tarefa atualizada com sucesso.', 'success');
      await onSaved();
      onClose();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao atualizar tarefa', 'error');
    } finally {
      setSaving(false);
    }
  }, [task, title, description, responsiblePersonId, activityDate, days, computedDueDateIso, onToast, onSaved, onClose]);

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={handleClose}>
      <div
        className="bg-white dark:bg-ai-bg border border-ai-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-ai-border flex items-center justify-between">
          <div className="text-base font-semibold text-ai-text">Editar tarefa</div>
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
          <div>
            <label className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1 block">Tarefa</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              placeholder="Ex: Revisar relatório..."
            />
          </div>

          <div>
            <label className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1 block">Descrição da tarefa</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm resize-none"
              rows={4}
              placeholder="Descreva detalhes importantes..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1 block">
                Responsável <span className="text-red-500">*</span>
              </label>
              <select
                value={responsiblePersonId}
                onChange={(e) => setResponsiblePersonId(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              >
                <option value="" disabled>Selecione</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.preferred_name?.trim() || p.full_name}
                    {p.job_role?.trim() ? ` — ${p.job_role.trim()}` : ''}
                  </option>
                ))}
              </select>
              {responsiblePersonId && (
                <div className="mt-1 text-[11px] text-ai-subtext">
                  Selecionado: <span className="font-medium text-ai-text">{getResponsibleLabel(responsiblePersonId)}</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1 block">Início</label>
              <DateInputBR value={activityDate} onChange={setActivityDate} placeholder="dd/mm/aaaa" />
            </div>
            <div>
              <label className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1 block">Duração</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1 block">Prazo final</label>
              <div className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm tabular-nums">
                {formatDateBR(computedDueDateIso || null)}
              </div>
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
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
