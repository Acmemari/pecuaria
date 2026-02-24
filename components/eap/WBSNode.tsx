import React, { memo, useContext } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { FolderOpen, Package, Layers, CheckSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import type { WBSNodeData, WBSLevel } from '../../lib/eapTree';

export const EAPNodeActionsContext = React.createContext<{
  onAdd?: (nodeId: string, level: WBSLevel) => void;
  onEdit?: (nodeId: string, level: WBSLevel) => void;
  onDelete?: (nodeId: string, level: WBSLevel) => void;
}>({});

const LEVEL_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  program: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    border: 'border-indigo-400',
    icon: <FolderOpen size={14} className="text-indigo-600 dark:text-indigo-400" />,
  },
  delivery: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-400',
    icon: <Package size={14} className="text-blue-600 dark:text-blue-400" />,
  },
  activity: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-400',
    icon: <Layers size={14} className="text-emerald-600 dark:text-emerald-400" />,
  },
  task: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-400',
    icon: <CheckSquare size={14} className="text-amber-600 dark:text-amber-400" />,
  },
};

type WBSFlowNode = Node<WBSNodeData>;

const WBSNodeComponent: React.FC<NodeProps<WBSFlowNode>> = ({ id, data, selected }) => {
  const level = data.level || 'program';
  const style = LEVEL_STYLES[level] ?? LEVEL_STYLES.program;
  const actions = useContext(EAPNodeActionsContext);
  const rawId = data.rawId;

  const tooltip = [data.label, data.subtitle].filter(Boolean).join(' · ');

  return (
    <div
      className={`
        min-w-[200px] max-w-[260px] rounded-lg border-2 px-3 py-2.5 shadow-sm transition-all
        ${style.bg} ${style.border}
        ${selected ? 'ring-2 ring-ai-accent ring-offset-2' : ''}
      `}
      title={tooltip}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2" />
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">{style.icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ai-text truncate" title={data.label}>
            {data.label}
          </p>
          {data.subtitle && (
            <p className="text-xs text-ai-subtext truncate mt-0.5" title={data.subtitle}>
              {data.subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-ai-border/50">
        {level !== 'task' && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              actions.onAdd?.(id, level);
            }}
            className="p-1 rounded text-ai-subtext hover:text-ai-accent hover:bg-ai-surface/50 transition-colors"
            title="Adicionar filho"
          >
            <Plus size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            actions.onEdit?.(id, level);
          }}
          className="p-1 rounded text-ai-subtext hover:text-ai-accent hover:bg-ai-surface/50 transition-colors"
          title="Editar"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            actions.onDelete?.(id, level);
          }}
          className="p-1 rounded text-ai-subtext hover:text-red-500 hover:bg-red-500/10 transition-colors"
          title="Excluir"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2" />
    </div>
  );
};

export const WBSNode = memo(WBSNodeComponent);
