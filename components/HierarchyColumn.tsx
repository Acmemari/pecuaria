import React, { useCallback, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';

export interface HierarchyColumnItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface HierarchyColumnProps {
  title: string;
  icon?: React.ReactNode;
  emptyLabel: string;
  items: HierarchyColumnItem[];
  selectedId: string | null;
  accentClassName: string;
  addLabel: string;
  addDisabled?: boolean;
  loading?: boolean;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onReorder?: (activeId: string, overIndex: number) => void;
}

const CardContent: React.FC<{
  item: HierarchyColumnItem;
  isSelected: boolean;
  accentClassName: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
}> = React.memo(({
  item,
  isSelected,
  accentClassName,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isDragging = false,
  isOverlay = false,
}) => {
  const handleClick = useCallback(() => onSelect(item.id), [onSelect, item.id]);
  const handleDoubleClick = useCallback(() => onEdit(item.id), [onEdit, item.id]);
  const handleEdit = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onEdit(item.id); },
    [onEdit, item.id]
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onDelete(item.id); },
    [onDelete, item.id]
  );
  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onMoveUp?.(item.id); },
    [onMoveUp, item.id]
  );
  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onMoveDown?.(item.id); },
    [onMoveDown, item.id]
  );

  return (
    <article
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={[
        'rounded-lg border p-2.5 transition-all duration-150 group',
        isOverlay ? 'shadow-lg ring-2 ring-ai-accent/40 cursor-grabbing opacity-95' : 'cursor-pointer',
        isDragging ? 'opacity-30' : '',
        isSelected
          ? `${accentClassName} border-transparent shadow-sm`
          : 'border-ai-border bg-ai-bg hover:border-ai-accent/30 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isSelected ? '' : 'text-ai-text'}`}>{item.title}</p>
          {item.subtitle && (
            <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'opacity-70' : 'text-ai-subtext'}`}>
              {item.subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveUp && (
            <button
              type="button"
              onClick={handleMoveUp}
              disabled={isFirst}
              className="rounded p-1 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mover para cima"
            >
              <ChevronUp size={12} />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={handleMoveDown}
              disabled={isLast}
              className="rounded p-1 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mover para baixo"
            >
              <ChevronDown size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={handleEdit}
            className="rounded p-1 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded p-1 text-ai-subtext hover:text-red-500 hover:bg-red-50"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {isSelected && <ChevronRight size={14} className="shrink-0 opacity-60" />}
      </div>
    </article>
  );
});
CardContent.displayName = 'CardContent';

const SortableHierarchyItem: React.FC<{
  item: HierarchyColumnItem;
  index: number;
  items: HierarchyColumnItem[];
  selectedId: string | null;
  accentClassName: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}> = React.memo(({
  item,
  index,
  items,
  selectedId,
  accentClassName,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-manipulation transition-transform duration-150">
      <CardContent
        item={item}
        isSelected={selectedId === item.id}
        accentClassName={accentClassName}
        isFirst={index === 0}
        isLast={index === items.length - 1}
        isDragging={isDragging}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
});
SortableHierarchyItem.displayName = 'SortableHierarchyItem';

const HierarchyColumn: React.FC<HierarchyColumnProps> = React.memo(({
  title,
  icon,
  emptyLabel,
  items,
  selectedId,
  accentClassName,
  addLabel,
  addDisabled = false,
  loading = false,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onReorder,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const sortableIds = items.map((i) => i.id);
  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const handleDragStart = useCallback((event: { active: { id: unknown } }) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!onReorder || !over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === String(active.id));
    const overIndex = items.findIndex((i) => i.id === String(over.id));
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      onReorder(String(active.id), overIndex);
    }
  }, [items, onReorder]);

  const content = loading ? (
    <div className="flex items-center justify-center py-8">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-ai-accent border-t-transparent" />
    </div>
  ) : items.length === 0 ? (
    <p className="text-xs text-ai-subtext px-2 py-4 text-center">{emptyLabel}</p>
  ) : onReorder && items.length > 1 ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((item, index) => (
            <SortableHierarchyItem
              key={item.id}
              item={item}
              index={index}
              items={items}
              selectedId={selectedId}
              accentClassName={accentClassName}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="rotate-0 scale-100">
            <CardContent
              item={activeItem}
              isSelected={selectedId === activeItem.id}
              accentClassName={accentClassName}
              isFirst={items[0]?.id === activeItem.id}
              isLast={items[items.length - 1]?.id === activeItem.id}
              isOverlay
              onSelect={() => {}}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  ) : (
    <div className="space-y-1">
      {items.map((item, index) => (
        <CardContent
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          accentClassName={accentClassName}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );

  return (
    <section className="rounded-xl border border-ai-border bg-ai-surface flex min-h-[480px] flex-col">
      <header className="px-3 py-2.5 border-b border-ai-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h2 className="text-xs font-bold uppercase tracking-wider text-ai-subtext">{title}</h2>
          {items.length > 0 && (
            <span className="text-[10px] font-medium text-ai-subtext/60 tabular-nums">({items.length})</span>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          className="inline-flex items-center gap-1 rounded-md border border-ai-border px-2 py-1 text-xs text-ai-subtext hover:text-ai-text hover:border-ai-accent/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={addLabel}
        >
          <Plus size={12} />
          {addLabel}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {content}
      </div>
    </section>
  );
});
HierarchyColumn.displayName = 'HierarchyColumn';

export default HierarchyColumn;
