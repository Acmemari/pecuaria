import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { ModalShell } from './ModalShell';
import DateInputBR from '../DateInputBR';
import type { TaskFormState } from './types';
import type { Person } from '../../lib/people';

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatDateBR(raw: string | null): string {
  if (!raw) return '—';
  try {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? raw : DATE_FMT.format(d);
  } catch {
    return raw;
  }
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

interface TaskModalProps {
  form: TaskFormState;
  onChange: (form: TaskFormState) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  mode: 'create' | 'edit';
  people: Person[];
}

export const TaskModal: React.FC<TaskModalProps> = ({ form, onChange, onSave, onClose, saving, mode, people }) => {
  const computedTaskDueDate =
    form.activity_date && form.duration_days
      ? addDaysIso(form.activity_date, Math.max(1, parseInt(form.duration_days, 10) || 1) - 1)
      : null;

  return (
    <ModalShell title={mode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'} onClose={saving ? () => {} : onClose}>
      <div>
        <label className="block text-sm font-medium text-ai-text mb-1">Título *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => onChange({ ...form, title: e.target.value })}
          className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
          className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text resize-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ai-text mb-1">Responsável *</label>
          <select
            value={form.responsible_person_id}
            onChange={e => onChange({ ...form, responsible_person_id: e.target.value })}
            className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
          >
            <option value="">Selecione o responsável</option>
            {people.map(person => (
              <option key={person.id} value={person.id}>
                {person.preferred_name?.trim() || person.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ai-text mb-1">Status Kanban</label>
          <select
            value={form.kanban_status}
            onChange={e => onChange({ ...form, kanban_status: e.target.value as TaskFormState['kanban_status'] })}
            className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
          >
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
          <DateInputBR value={form.activity_date} onChange={v => onChange({ ...form, activity_date: v })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ai-text mb-1">Duração (dias)</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={form.duration_days}
            onChange={e => onChange({ ...form, duration_days: e.target.value })}
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
        <input
          type="checkbox"
          checked={form.completed}
          onChange={e => onChange({ ...form, completed: e.target.checked })}
        />
        Tarefa concluída
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-md border border-ai-border px-3 py-2 text-sm text-ai-subtext hover:text-ai-text disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-ai-accent px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {mode === 'create' ? 'Salvar' : 'Atualizar'}
        </button>
      </div>
    </ModalShell>
  );
};
