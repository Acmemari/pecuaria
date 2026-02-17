import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';
import { useClient } from '../contexts/ClientContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchDeliveries, type DeliveryRow } from '../lib/deliveries';
import { fetchPeople, type Person } from '../lib/people';
import { fetchInitiatives, fetchInitiativeDetail, type InitiativeWithProgress, type InitiativeMilestoneRow } from '../lib/initiatives';
import InitiativeTasksKanban from '../components/InitiativeTasksKanban';
import TaskCreateModal from '../components/TaskCreateModal';

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

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const personLabel = useCallback((p: Person) => (p.preferred_name?.trim() || p.full_name || '—'), []);

  const initiativesFiltered = useMemo(() => {
    const list = initiatives || [];
    if (!selectedDeliveryId) return list;
    return list.filter((i) => i.delivery_id === selectedDeliveryId);
  }, [initiatives, selectedDeliveryId]);

  const milestonesAll = useMemo<InitiativeMilestoneRow[]>(() => (viewing?.milestones || []) as InitiativeMilestoneRow[], [viewing]);
  const milestonesFiltered = useMemo<InitiativeMilestoneRow[]>(() => {
    if (!selectedMilestoneId) return milestonesAll;
    return milestonesAll.filter((m) => m.id === selectedMilestoneId);
  }, [milestonesAll, selectedMilestoneId]);

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
      const stillValid = initiativesFiltered.some((i) => i.id === selectedInitiativeId);
      if (!stillValid) {
        setSelectedInitiativeId(initiativesFiltered[0]?.id || '');
      }
    } else if (initiativesFiltered.length > 0) {
      setSelectedInitiativeId(initiativesFiltered[0].id);
    }
  }, [initiativesFiltered, selectedInitiativeId]);

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
        // Reset milestone filter if not present
        if (selectedMilestoneId && !detail.milestones?.some((m) => m.id === selectedMilestoneId)) {
          setSelectedMilestoneId('');
        }
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : 'Erro ao carregar iniciativa', 'error');
      }
    })();
    return () => { mounted = false; };
  }, [selectedInitiativeId, selectedMilestoneId, onToast]);

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
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Projeto</div>
          <select
            value={selectedDeliveryId}
            onChange={(e) => {
              setSelectedDeliveryId(e.target.value);
              setSelectedInitiativeId('');
              setSelectedMilestoneId('');
            }}
            className="px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm min-w-[220px]"
          >
            <option value="">Todos</option>
            {deliveries.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Atividade</div>
          <select
            value={selectedInitiativeId}
            onChange={(e) => {
              setSelectedInitiativeId(e.target.value);
              setSelectedMilestoneId('');
            }}
            className="px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm min-w-[280px]"
          >
            <option value="">Selecione</option>
            {initiativesFiltered.map((i) => (
              <option key={i.id} value={i.id}>{i.name}{i.farm_id ? '' : ' [Global]'}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-[10px] text-ai-subtext font-semibold uppercase tracking-wide mb-1">Marco</div>
          <select
            value={selectedMilestoneId}
            onChange={(e) => setSelectedMilestoneId(e.target.value)}
            className="px-3 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm min-w-[260px]"
            disabled={!viewing}
          >
            <option value="">Todos</option>
            {(viewing?.milestones || []).map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
      </div>

      {!viewing ? (
        <div className="text-sm text-ai-subtext">Selecione uma atividade para ver o Kanban.</div>
      ) : (
        <>
          <InitiativeTasksKanban
            milestones={milestonesFiltered}
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
          />

          <TaskCreateModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onToast={onToast}
            deliveries={deliveries}
            initiatives={initiativesFiltered}
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
        </>
      )}
    </div>
  );
};

export default InitiativesKanban;

