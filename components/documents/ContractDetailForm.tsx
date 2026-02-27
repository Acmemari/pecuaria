import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ContractDetails, ContractParty } from '../../types';
import { createContractDetails, getContractDetails, updateContractDetails } from '../../lib/contracts';

interface Props {
  documentId: string;
  onSaved?: () => void;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

const EMPTY_PARTY: ContractParty = { name: '', role: 'contratante', email: '' };

const ContractDetailForm: React.FC<Props> = ({ documentId, onSaved, onToast }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existing, setExisting] = useState<ContractDetails | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState('');
  const [renewalReminderDays, setRenewalReminderDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [parties, setParties] = useState<ContractParty[]>([{ ...EMPTY_PARTY }]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getContractDetails(documentId).then(({ data }) => {
      if (!mounted) return;
      if (data) {
        setExisting(data);
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setContractValue(data.contractValue?.toString() || '');
        setAutoRenew(data.autoRenew);
        setRenewalPeriodMonths(data.renewalPeriodMonths?.toString() || '');
        setRenewalReminderDays(data.renewalReminderDays.toString());
        setNotes(data.notes || '');
        setParties(data.parties.length > 0 ? data.parties : [{ ...EMPTY_PARTY }]);
      }
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [documentId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const details = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        contractValue: contractValue ? parseFloat(contractValue) : undefined,
        autoRenew,
        renewalPeriodMonths: renewalPeriodMonths ? parseInt(renewalPeriodMonths) : undefined,
        renewalReminderDays: parseInt(renewalReminderDays) || 30,
        notes: notes || undefined,
        parties: parties.filter(p => p.name.trim()),
      };

      if (existing) {
        const { success, error } = await updateContractDetails(documentId, details);
        if (success) {
          onToast?.('Contrato atualizado', 'success');
          onSaved?.();
        } else {
          onToast?.(error || 'Erro ao atualizar', 'error');
        }
      } else {
        const { success, error } = await createContractDetails(documentId, details);
        if (success) {
          onToast?.('Detalhes do contrato criados', 'success');
          onSaved?.();
        } else {
          onToast?.(error || 'Erro ao criar', 'error');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addParty = () => setParties([...parties, { ...EMPTY_PARTY }]);
  const removeParty = (idx: number) => setParties(parties.filter((_, i) => i !== idx));
  const updateParty = (idx: number, field: keyof ContractParty, value: string) => {
    const updated = [...parties];
    (updated[idx] as any)[field] = value;
    setParties(updated);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="animate-spin text-ai-accent" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Datas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ai-text mb-1">Início</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ai-text mb-1">Vencimento</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
          />
        </div>
      </div>

      {/* Valor */}
      <div>
        <label className="block text-xs font-medium text-ai-text mb-1">Valor do Contrato (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={contractValue}
          onChange={e => setContractValue(e.target.value)}
          placeholder="0,00"
          className="w-full px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
        />
      </div>

      {/* Renovação */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-ai-text">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={e => setAutoRenew(e.target.checked)}
            className="rounded"
          />
          Renovação automática
        </label>
        {autoRenew && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ai-subtext mb-1">Período (meses)</label>
              <input
                type="number"
                min="1"
                value={renewalPeriodMonths}
                onChange={e => setRenewalPeriodMonths(e.target.value)}
                placeholder="12"
                className="w-full px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-ai-subtext mb-1">Lembrete (dias antes)</label>
              <input
                type="number"
                min="1"
                value={renewalReminderDays}
                onChange={e => setRenewalReminderDays(e.target.value)}
                placeholder="30"
                className="w-full px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Partes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-ai-text">Partes / Signatários</label>
          <button
            type="button"
            onClick={addParty}
            className="text-xs text-ai-accent hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {parties.map((party, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                type="text"
                value={party.name}
                onChange={e => updateParty(idx, 'name', e.target.value)}
                placeholder="Nome"
                className="flex-1 px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
              <select
                value={party.role}
                onChange={e => updateParty(idx, 'role', e.target.value)}
                className="px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
              >
                <option value="contratante">Contratante</option>
                <option value="contratado">Contratado</option>
                <option value="testemunha">Testemunha</option>
                <option value="fiador">Fiador</option>
              </select>
              <input
                type="email"
                value={party.email || ''}
                onChange={e => updateParty(idx, 'email', e.target.value)}
                placeholder="Email"
                className="flex-1 px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
              {parties.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParty(idx)}
                  className="p-1.5 text-ai-subtext hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-ai-text mb-1">Observações</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observações sobre o contrato..."
          rows={2}
          className="w-full px-2 py-1.5 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ai-accent resize-none"
        />
      </div>

      {/* Salvar */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2 px-4 py-2 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 transition-colors text-sm font-medium disabled:opacity-50 w-full justify-center"
      >
        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
        {existing ? 'Atualizar Contrato' : 'Salvar Detalhes do Contrato'}
      </button>
    </div>
  );
};

export default ContractDetailForm;
