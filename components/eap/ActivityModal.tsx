import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { ModalShell } from './ModalShell';
import DateInputBR from '../DateInputBR';
import type { ActivityFormState } from './types';
import type { Person } from '../../lib/people';

interface ActivityModalProps {
  form: ActivityFormState;
  onChange: (form: ActivityFormState) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  mode: 'create' | 'edit';
  people: Person[];
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  form,
  onChange,
  onSave,
  onClose,
  saving,
  mode,
  people,
}) => (
  <ModalShell
    title={mode === 'create' ? 'Nova Macro Atividade' : 'Editar Macro Atividade'}
    onClose={saving ? () => {} : onClose}
  >
    <div>
      <label className="block text-sm font-medium text-ai-text mb-1">Nome *</label>
      <input
        type="text"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
      <textarea
        rows={3}
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text resize-none"
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-ai-text mb-1">Data inicial</label>
        <DateInputBR value={form.start_date} onChange={(v) => onChange({ ...form, start_date: v })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-ai-text mb-1">Data final</label>
        <DateInputBR
          value={form.end_date}
          onChange={(v) => onChange({ ...form, end_date: v })}
          min={form.start_date || undefined}
        />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium text-ai-text mb-1">Responsável</label>
        <select
          value={form.leader_id}
          onChange={(e) => onChange({ ...form, leader_id: e.target.value })}
          className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
        >
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
        <select
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value })}
          className="w-full rounded-md border border-ai-border bg-ai-surface px-3 py-2 text-sm text-ai-text"
        >
          <option value="Não Iniciado">Não Iniciado</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Suspenso">Suspenso</option>
          <option value="Concluído">Concluído</option>
          <option value="Atrasado">Atrasado</option>
        </select>
      </div>
    </div>
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
