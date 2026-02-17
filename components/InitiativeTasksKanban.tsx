import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  UniqueIdentifier,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, PauseCircle, PlayCircle, CheckCircle2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { InitiativeMilestoneRow, InitiativeTaskRow, KanbanStatus } from '../lib/initiatives';
import { updateTasksKanban } from '../lib/initiatives';

type FlatTask = InitiativeTaskRow & { milestoneTitle: string; milestoneId: string };

const STATUSES: KanbanStatus[] = ['A Fazer', 'Andamento', 'Pausado', 'Concluído'];

function statusMeta(status: KanbanStatus) {
  switch (status) {
    case 'A Fazer':
      return { icon: PlayCircle, headerClass: 'bg-ai-surface/60 border-ai-border', dotClass: 'bg-slate-400' };
    case 'Andamento':
      return { icon: PlayCircle, headerClass: 'bg-indigo-50/60 border-indigo-200', dotClass: 'bg-indigo-500' };
    case 'Pausado':
      return { icon: PauseCircle, headerClass: 'bg-amber-50/60 border-amber-200', dotClass: 'bg-amber-500' };
    case 'Concluído':
      return { icon: CheckCircle2, headerClass: 'bg-green-50/60 border-green-200', dotClass: 'bg-green-600' };
  }
}

function findContainer(columns: Record<KanbanStatus, string[]>, id: UniqueIdentifier): KanbanStatus | null {
  const key = String(id) as KanbanStatus;
  if (STATUSES.includes(key)) return key;
  for (const s of STATUSES) {
    if (columns[s]?.includes(String(id))) return s;
  }
  return null;
}

function formatDateBR(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return d;
  }
}

function KanbanCard({
  task,
  responsibleLabel,
  isOverlay,
  onEdit,
  onDelete,
}: {
  task: FlatTask;
  responsibleLabel: (personId: string | null) => string;
  isOverlay?: boolean;
  onEdit?: (task: FlatTask) => void;
  onDelete?: (task: FlatTask) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const showMenu = !isOverlay && (onEdit || onDelete);
  const isClickable = !isOverlay && !!onEdit;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isClickable && (e.target as HTMLElement).closest?.('[data-card-menu]') === null) {
      onEdit?.(task);
    }
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit?.(task); } } : undefined}
      className={[
        'rounded-lg border border-ai-border bg-white dark:bg-ai-bg shadow-sm',
        'px-3 py-2 text-sm',
        isOverlay ? 'shadow-xl' : 'hover:shadow-md transition-shadow',
        isClickable ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-ai-text text-sm ${task.completed ? 'line-through text-ai-subtext' : ''}`}>
            {task.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ai-subtext">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {formatDateBR(task.due_date)}
            </span>
            <span className="truncate">
              Resp.: <span className="font-medium text-ai-text">{responsibleLabel(task.responsible_person_id)}</span>
            </span>
          </div>
        </div>
        {showMenu && (
          <div className="relative flex-shrink-0" ref={menuRef} data-card-menu>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 rounded text-ai-subtext hover:text-ai-text hover:bg-ai-surface2"
              aria-label="Abrir menu"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-0.5 py-1 min-w-[120px] rounded-lg border border-ai-border bg-white dark:bg-ai-bg shadow-lg z-10"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onEdit(task); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-ai-text hover:bg-ai-surface2"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onDelete(task); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-ai-subtext bg-ai-surface2 border border-ai-border/60 px-2 py-0.5 rounded-full truncate">
          {task.milestoneTitle}
        </span>
      </div>
    </div>
  );
}

function SortableCard({
  id,
  task,
  responsibleLabel,
  onEdit,
  onDelete,
}: {
  id: string;
  task: FlatTask;
  responsibleLabel: (personId: string | null) => string;
  onEdit?: (task: FlatTask) => void;
  onDelete?: (task: FlatTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation"
      data-kanban-card
      onClick={(e) => e.stopPropagation()}
    >
      <KanbanCard
        task={task}
        responsibleLabel={responsibleLabel}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function DroppableColumn({
  status,
  children,
  onClick,
}: {
  status: KanbanStatus;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={isOver ? 'ring-2 ring-ai-accent/30 rounded-xl' : ''}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default function InitiativeTasksKanban({
  milestones,
  onToast,
  onRefresh,
  responsibleLabel,
  onRequestCreateTask,
  onEditTask,
  onDeleteTask,
}: {
  milestones: InitiativeMilestoneRow[];
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefresh?: () => Promise<void>;
  responsibleLabel: (personId: string | null) => string;
  onRequestCreateTask?: () => void;
  onEditTask?: (task: FlatTask) => void;
  onDeleteTask?: (task: FlatTask) => void;
}) {
  const flatTasks = useMemo<FlatTask[]>(() => {
    const out: FlatTask[] = [];
    for (const m of milestones || []) {
      for (const t of m.tasks || []) {
        out.push({ ...(t as InitiativeTaskRow), milestoneTitle: m.title, milestoneId: m.id });
      }
    }
    return out;
  }, [milestones]);

  const [tasksById, setTasksById] = useState<Record<string, FlatTask>>({});
  const [columns, setColumns] = useState<Record<KanbanStatus, string[]>>({
    'A Fazer': [],
    Andamento: [],
    Pausado: [],
    Concluído: [],
  });
  const columnsRef = useRef(columns);
  useEffect(() => { columnsRef.current = columns; }, [columns]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const byId: Record<string, FlatTask> = {};
    for (const t of flatTasks) byId[t.id] = t;
    setTasksById(byId);

    const next: Record<KanbanStatus, string[]> = { 'A Fazer': [], Andamento: [], Pausado: [], Concluído: [] };
    // Fallback: default A Fazer if missing
    const sorted = [...flatTasks].sort((a, b) => {
      const ao = Number.isFinite(a.kanban_order) ? a.kanban_order : a.sort_order;
      const bo = Number.isFinite(b.kanban_order) ? b.kanban_order : b.sort_order;
      return ao - bo;
    });
    for (const t of sorted) {
      const status = (t.kanban_status || 'A Fazer') as KanbanStatus;
      next[STATUSES.includes(status) ? status : 'A Fazer'].push(t.id);
    }
    setColumns(next);
  }, [flatTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const persistKanban = useCallback(async (prevCols: Record<KanbanStatus, string[]>, nextCols: Record<KanbanStatus, string[]>, movedId: string) => {
    const prevStatus = findContainer(prevCols, movedId);
    const nextStatus = findContainer(nextCols, movedId);
    if (!prevStatus || !nextStatus) return;

    const affected = new Set<KanbanStatus>([prevStatus, nextStatus]);
    const updates: Array<{ id: string; kanban_status: KanbanStatus; kanban_order: number; completed?: boolean }> = [];

    for (const status of affected) {
      const ids = nextCols[status] || [];
      ids.forEach((id, idx) => {
        updates.push({ id, kanban_status: status, kanban_order: idx });
      });
    }

    // Sync completed only if the moved card crosses Concluído boundary
    if (prevStatus !== nextStatus) {
      const completed =
        nextStatus === 'Concluído' ? true :
          prevStatus === 'Concluído' ? false :
            undefined;
      if (typeof completed === 'boolean') {
        const entry = updates.find((u) => u.id === movedId);
        if (entry) entry.completed = completed;
        else updates.push({ id: movedId, kanban_status: nextStatus, kanban_order: 0, completed });
      }
    }

    setSaving(true);
    try {
      await updateTasksKanban(updates);
      await onRefresh?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao salvar Kanban', 'error');
      await onRefresh?.();
    } finally {
      setSaving(false);
    }
  }, [onRefresh, onToast]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const activeKey = String(active.id);
    setActiveId(null);
    if (!over) return;

    setColumns((prev) => {
      const activeContainer = findContainer(prev, active.id);
      const overContainer = findContainer(prev, over.id);
      if (!activeContainer || !overContainer) return prev;

      if (activeContainer === overContainer) {
        const oldIndex = prev[activeContainer].indexOf(activeKey);
        const overId = String(over.id);
        const overIndex = overId === overContainer ? prev[overContainer].length - 1 : prev[overContainer].indexOf(overId);
        if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) return prev;
        const nextCols = {
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], oldIndex, overIndex),
        };
        void persistKanban(prev, nextCols, activeKey);
        return nextCols;
      }

      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.indexOf(activeKey);
      if (activeIndex === -1) return prev;
      activeItems.splice(activeIndex, 1);

      const overId = String(over.id);
      const overIndex = overItems.includes(overId) ? overItems.indexOf(overId) : overItems.length;
      overItems.splice(overIndex, 0, activeKey);

      const nextCols = {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
      void persistKanban(prev, nextCols, activeKey);
      return nextCols;
    });
  }, [persistKanban]);

  const overlayTask = activeId ? tasksById[activeId] : null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-ai-text">Kanban</h3>
        {saving && <span className="text-xs text-ai-subtext">Salvando…</span>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {STATUSES.map((status) => {
            const meta = statusMeta(status);
            const Icon = meta.icon;
            const ids = columns[status] || [];
            return (
              <DroppableColumn
                key={status}
                status={status}
                onClick={(e) => {
                  if (activeId) return; // não abrir durante drag
                  if (status !== 'A Fazer') return;
                  const target = e.target as HTMLElement | null;
                  if (target?.closest?.('[data-kanban-card]')) return;
                  onRequestCreateTask?.();
                }}
              >
                <div className="min-h-[220px] rounded-xl border border-ai-border bg-ai-surface/20">
                  <div className={`px-3 py-2 rounded-t-xl border-b ${meta.headerClass} flex items-center justify-between`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      <Icon size={14} className="text-ai-subtext" />
                      <span className="text-xs font-semibold text-ai-text truncate">{status}</span>
                    </div>
                    <span className="text-[11px] text-ai-subtext tabular-nums">{ids.length}</span>
                  </div>

                  <div className="p-3">
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {ids.map((id) => {
                          const t = tasksById[id];
                          if (!t) return null;
                          return (
                            <SortableCard
                              key={id}
                              id={id}
                              task={t}
                              responsibleLabel={responsibleLabel}
                              onEdit={onEditTask}
                              onDelete={onDeleteTask}
                            />
                          );
                        })}
                        {ids.length === 0 && (
                          <div className="text-xs text-ai-subtext/70 border border-dashed border-ai-border rounded-lg p-3">
                            Solte tarefas aqui
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              </DroppableColumn>
            );
          })}
        </div>

        <DragOverlay>
          {overlayTask ? (
            <KanbanCard task={overlayTask} responsibleLabel={responsibleLabel} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

