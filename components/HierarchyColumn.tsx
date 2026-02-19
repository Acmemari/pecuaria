import React, { useCallback } from 'react';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';

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
}

const HierarchyColumnItem: React.FC<{
  item: HierarchyColumnItem;
  isSelected: boolean;
  accentClassName: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = React.memo(({ item, isSelected, accentClassName, onSelect, onEdit, onDelete }) => {
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

  return (
    <article
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={[
        'rounded-lg border p-2.5 cursor-pointer transition-all duration-150 group',
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
HierarchyColumnItem.displayName = 'HierarchyColumnItem';

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
}) => {
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

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ai-accent border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-ai-subtext px-2 py-4 text-center">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <HierarchyColumnItem
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              accentClassName={accentClassName}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
});
HierarchyColumn.displayName = 'HierarchyColumn';

export default HierarchyColumn;
