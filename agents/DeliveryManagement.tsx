import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ArrowLeft, Loader2, Pencil, Trash2, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { fetchDeliveries, createDelivery, updateDelivery, deleteDelivery, type DeliveryRow } from '../lib/deliveries';

interface DeliveryManagementProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const initialForm = {
  name: '',
  description: '',
};

const DeliveryManagement: React.FC<DeliveryManagementProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DeliveryRow | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const isAdmin = user?.role === 'admin';
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id],
  );

  const loadDeliveries = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const rows = await fetchDeliveries(effectiveUserId);
      setDeliveries(rows);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao carregar entregas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, onToast]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const openNew = () => {
    setEditing(null);
    setFormData(initialForm);
    setView('form');
  };

  const openEdit = (delivery: DeliveryRow) => {
    setEditing(delivery);
    setFormData({
      name: delivery.name || '',
      description: delivery.description || '',
    });
    setView('form');
  };

  const handleSave = async () => {
    if (!effectiveUserId) {
      onToast?.('Selecione um analista para continuar.', 'warning');
      return;
    }
    if (!formData.name.trim()) {
      onToast?.('O nome da entrega é obrigatório.', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateDelivery(editing.id, formData);
        onToast?.('Entrega atualizada com sucesso.', 'success');
      } else {
        await createDelivery(effectiveUserId, formData);
        onToast?.('Entrega criada com sucesso.', 'success');
      }
      setView('list');
      setEditing(null);
      setFormData(initialForm);
      await loadDeliveries();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao salvar entrega.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deliveryId: string) => {
    setDeletingId(deliveryId);
    try {
      await deleteDelivery(deliveryId);
      onToast?.('Entrega removida com sucesso.', 'success');
      await loadDeliveries();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao excluir entrega.', 'error');
    } finally {
      setDeletingId(null);
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

        <div className="bg-ai-surface border border-ai-border rounded-xl p-6 space-y-5">
          <h1 className="text-xl font-bold text-ai-text">{editing ? 'Editar Entrega' : 'Nova Entrega'}</h1>

          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm"
              placeholder="Ex.: Reestruturação Comercial Fase 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ai-text mb-1">Descrição</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-ai-border rounded-md bg-ai-bg text-ai-text text-sm resize-none"
              placeholder="Descreva objetivo, escopo e critérios da entrega."
            />
          </div>

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
              {editing ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ai-text tracking-tight">Cadastro de Entregas</h1>
          <p className="text-sm text-ai-subtext">Gerencie as entregas que serão vinculadas às iniciativas.</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-ai-accent text-white hover:opacity-90"
        >
          <Plus size={16} />
          Nova Entrega
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-ai-accent" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ai-border bg-ai-surface p-10 text-center">
          <Package size={28} className="mx-auto text-ai-subtext mb-2" />
          <p className="text-ai-subtext text-sm">Nenhuma entrega cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deliveries.map(delivery => (
            <article
              key={delivery.id}
              className="rounded-xl border border-ai-border bg-ai-surface p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ai-text">{delivery.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(delivery)}
                    className="p-1.5 rounded text-ai-subtext hover:text-ai-text hover:bg-ai-surface2"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(delivery.id)}
                    disabled={deletingId === delivery.id}
                    className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-60"
                    title="Excluir"
                  >
                    {deletingId === delivery.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-ai-subtext whitespace-pre-wrap">{delivery.description || 'Sem descrição.'}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryManagement;
