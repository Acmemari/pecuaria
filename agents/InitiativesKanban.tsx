import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchDeliveries, type DeliveryRow } from '../lib/deliveries';
import { fetchPeople, type Person } from '../lib/people';
import { fetchInitiatives, fetchInitiativeDetail, deleteTask, type InitiativeWithProgress, type InitiativeMilestoneRow, type InitiativeTaskRow } from '../lib/initiatives';
import InitiativeTasksKanban from '../components/InitiativeTasksKanban';
import TaskCreateModal from '../components/TaskCreateModal';
import TaskEditModal from '../components/TaskEditModal';

interface InitiativesKanbanProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const InitiativesKanban: React.FC<InitiativesKanbanProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedAnalyst } = useAnalyst();
  const { selectedClient } = useClient();
  const { selectedFarm } = useFarm();

  const isAdmin = user?.role === 'admin';
  const effectiveUserId = useMemo(
    () => (isAdmin && selectedAnalyst ? selectedAnalyst.id : user?.id),
    [isAdmin, selectedAnalyst, user?.id]
  );

  const [loading, setLoading] = useState(true);
  const [initiatives, setInitiatives] = useState<InitiativeWithProgress[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [selectedInitiativeId, setSelectedInitiativeId] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');

  const [viewing, setViewing] = useState<Awaited<ReturnType<typeof fetchInitiativeDetail>> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<InitiativeTaskRow | null>(null);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const personLabel = useCallback((p: Person) => (p.preferred_name?.trim() || p.full_name || '—'), []);

  // No Kanban, removemos filtros visuais (Projeto/Marco).
  // Mantemos selectedDeliveryId apenas para o modal de criação (pré-preenchimento/UX).
  const initiativesForView = useMemo(() => initiatives || [], [initiatives]);
  const initiativesForModal = useMemo(() => {
    const list = initiatives || [];
    if (!selectedDeliveryId) return list;
    return list.filter((i) => i.delivery_id === selectedDeliveryId);
  }, [initiatives, selectedDeliveryId]);

  const milestonesAll = useMemo<InitiativeMilestoneRow[]>(() => (viewing?.milestones || []) as InitiativeMilestoneRow[], [viewing]);
  const milestonesForView = milestonesAll;

  const refresh = useCallback(async () => {
    if (!effectiveUserId) return;
    const filters = { clientId: selectedClient?.id, farmId: selectedFarm?.id };
    const [inits, dels, ppl] = await Promise.all([
      fetchInitiatives(effectiveUserId, filters),
      fetchDeliveries(effectiveUserId, { clientId: selectedClient?.id }),
      fetchPeople(effectiveUserId, { farmId: selectedFarm?.id }),
    ]);
    setInitiatives(inits);
    setDeliveries(dels);
    setPeople(ppl);
  }, [effectiveUserId, selectedClient?.id, selectedFarm?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : 'Erro ao carregar Kanban', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [refresh, onToast]);

  // Reset selections when farm or client changes
  useEffect(() => {
    setSelectedDeliveryId('');
    setSelectedInitiativeId('');
    setSelectedMilestoneId('');
    setViewing(null);
  }, [selectedFarm?.id, selectedClient?.id]);

  useEffect(() => {
    // Auto-seleciona ou valida a initiative selecionada
    if (selectedInitiativeId) {
      // Se a initiative selecionada não está na lista filtrada, resetar
      const stillValid = initiativesForView.some((i) => i.id === selectedInitiativeId);
      if (!stillValid) {
        setSelectedInitiativeId(initiativesForView[0]?.id || '');
      }
    } else if (initiativesForView.length > 0) {
      setSelectedInitiativeId(initiativesForView[0].id);
    }
  }, [initiativesForView, selectedInitiativeId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedInitiativeId) {
        setViewing(null);
        return;
      }
      try {
        const detail = await fetchInitiativeDetail(selectedInitiativeId);
        if (!mounted) return;
        setViewing(detail);
        // Se o marco selecionado (usado no modal) não existir mais para esta iniciativa, resetar.
        if (selectedMilestoneId && !detail.milestones?.some((m) => m.id === selectedMilestoneId)) setSelectedMilestoneId('');
        // Pré-preencher "Projeto" no modal com base na atividade selecionada.
        if (detail.delivery_id && !selectedDeliveryId) setSelectedDeliveryId(detail.delivery_id);
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : 'Erro ao carregar iniciativa', 'error');
      }
    })();
    return () => { mounted = false; };
  }, [selectedInitiativeId, selectedMilestoneId, selectedDeliveryId, onToast]);

  const canCreateTask = !!viewing && (viewing.milestones || []).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-ai-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {viewing && (
        <div className="text-xs text-ai-subtext">
          Atividade:{' '}
          <span className="font-semibold text-ai-text">{viewing.name}{viewing.farm_id ? '' : ' [Global]'}</span>
        </div>
      )}

      {!viewing ? (
        <div className="text-sm text-ai-subtext">
          {initiativesForView.length === 0
            ? 'Nenhuma atividade encontrada para o contexto selecionado no cabeçalho.'
            : 'Carregando Kanban da atividade...'}
        </div>
      ) : (
        <>
          <InitiativeTasksKanban
            milestones={milestonesForView}
            onToast={onToast}
            onRefresh={async () => {
              if (selectedInitiativeId) {
                const detail = await fetchInitiativeDetail(selectedInitiativeId);
                setViewing(detail);
              }
              await refresh();
            }}
            responsibleLabel={(personId) => {
              if (!personId) return '—';
              const p = peopleById.get(personId);
              return p ? personLabel(p) : '—';
            }}
            onRequestCreateTask={() => {
              if (!canCreateTask) {
                onToast?.('Cadastre pelo menos um marco antes de criar tarefas.', 'warning');
                return;
              }
              setCreateOpen(true);
            }}
            onEditTask={(task) => setEditTask(task)}
            onDeleteTask={async (task) => {
              if (!window.confirm('Excluir esta tarefa? Esta ação não pode ser desfeita.')) return;
              try {
                await deleteTask(task.id);
                onToast?.('Tarefa excluída.', 'success');
                if (selectedInitiativeId) {
                  const detail = await fetchInitiativeDetail(selectedInitiativeId);
                  setViewing(detail);
                }
                await refresh();
              } catch (e) {
                onToast?.(e instanceof Error ? e.message : 'Erro ao excluir tarefa', 'error');
              }
            }}
          />

          <TaskCreateModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onToast={onToast}
            deliveries={deliveries}
            initiatives={initiativesForModal}
            people={people}
            selectedDeliveryId={selectedDeliveryId}
            setSelectedDeliveryId={(v) => setSelectedDeliveryId(v)}
            selectedInitiativeId={selectedInitiativeId}
            setSelectedInitiativeId={(v) => setSelectedInitiativeId(v)}
            milestones={milestonesAll}
            selectedMilestoneId={selectedMilestoneId}
            setSelectedMilestoneId={(v) => setSelectedMilestoneId(v)}
            getResponsibleLabel={(id) => {
              if (!id) return '—';
              const p = peopleById.get(id);
              return p ? personLabel(p) : '—';
            }}
            onCreated={async () => {
              setCreateOpen(false);
              if (selectedInitiativeId) {
                const detail = await fetchInitiativeDetail(selectedInitiativeId);
                setViewing(detail);
              }
              await refresh();
            }}
          />

          <TaskEditModal
            open={!!editTask}
            task={editTask}
            onClose={() => setEditTask(null)}
            onToast={onToast}
            people={people}
            getResponsibleLabel={(id) => {
              if (!id) return '—';
              const p = peopleById.get(id);
              return p ? personLabel(p) : '—';
            }}
            onSaved={async () => {
              setEditTask(null);
              if (selectedInitiativeId) {
                const detail = await fetchInitiativeDetail(selectedInitiativeId);
                setViewing(detail);
              }
              await refresh();
            }}
          />
        </>
      )}
    </div>
  );
};

export default InitiativesKanban;

