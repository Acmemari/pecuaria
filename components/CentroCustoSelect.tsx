import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, RotateCw } from 'lucide-react';
import { CENTROS_DE_CUSTO, CentroCusto } from '../constants/centrosDeCusto';

interface CentroCustoSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const INTEGRA_ACCENT = '#10b981';
const INTEGRA_TEXT = '#1e293b';
const INTEGRA_SUBTEXT = '#64748b';
const INTEGRA_BORDER = '#e2e8f0';

export default function CentroCustoSelect({ value, onChange }: CentroCustoSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const findNodeLabel = (nodes: CentroCusto[], id: string): string => {
    for (const node of nodes) {
      if (node.id === id) return `${node.codigo} ${node.nome}`;
      if (node.children) {
        const found = findNodeLabel(node.children, id);
        if (found) return found;
      }
    }
    return '';
  };

  const renderItems = (items: CentroCusto[], level = 0) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedNodes.has(item.id);

      return (
        <React.Fragment key={item.id}>
          <div 
            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${level > 0 ? 'bg-white' : ''}`}
            style={{ paddingLeft: `${level * 20 + 16}px` }}
            onClick={() => {
              if (hasChildren) {
                const newExpanded = new Set(expandedNodes);
                if (isExpanded) newExpanded.delete(item.id);
                else newExpanded.add(item.id);
                setExpandedNodes(newExpanded);
              } else {
                onChange(item.id);
                setIsOpen(false);
              }
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} className="text-gray-600" /> : <ChevronRight size={16} className="text-gray-600" />
            ) : (
              <div className="w-4" />
            )}
            <span className={`text-[13px] font-bold ${level === 0 ? 'text-[#1a9a5c]' : 'text-gray-700'}`}>
              {item.codigo} {item.nome}
            </span>
          </div>
          {hasChildren && isExpanded && renderItems(item.children, level + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 pl-3 pr-10 border rounded-md text-[13px] text-left appearance-none outline-none focus:border-[#10b981] flex items-center justify-between"
        style={{ borderColor: INTEGRA_BORDER, color: value ? INTEGRA_TEXT : '#94a3b8' }}
      >
        <span>{value ? findNodeLabel(CENTROS_DE_CUSTO, value) : 'Selecione um Centro de Custo'}</span>
        <ChevronDown size={18} className="text-ai-subtext shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-[1100] top-full left-0 w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b flex gap-2" style={{ borderColor: INTEGRA_BORDER }}>
            <button className="flex-1 bg-[#1a9a5c] hover:opacity-90 text-white h-10 rounded-lg flex items-center justify-center gap-2 text-[13px] font-bold">
              <Plus size={18} />
              Cadastrar
            </button>
            <button className="w-10 h-10 border rounded-lg flex items-center justify-center text-[#1a9a5c] hover:bg-gray-50" style={{ borderColor: '#1a9a5c' }}>
              <RotateCw size={18} />
            </button>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            {renderItems(CENTROS_DE_CUSTO)}
          </div>
        </div>
      )}
    </div>
  );
}
