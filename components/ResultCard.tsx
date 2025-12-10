import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface ResultCardProps {
  label: string;
  subLabel?: string; // Texto secundário abaixo do label (ex: unidade de medida)
  value: string | number;
  subValue?: string;
  highlight?: boolean;
  color?: 'default' | 'neutral' | 'positive' | 'negative' | 'info';
  description?: string; // Descrição para o popover de info
}

const ResultCard: React.FC<ResultCardProps> = ({ 
  label, 
  subLabel,
  value, 
  subValue, 
  highlight = false,
  color = 'default',
  description
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };

    if (showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfo]);
  
  const valueColor = {
    default: 'text-ai-text',
    neutral: 'text-ai-text',
    positive: 'text-emerald-600',
    negative: 'text-rose-600',
    info: 'text-ai-accent',
  };

  const borderClass = highlight ? 'border-ai-accent shadow-sm' : 'border-ai-border/60';
  const bgClass = highlight ? 'bg-white' : 'bg-white';

  return (
    <div className={`p-2.5 md:p-3 rounded-lg border ${borderClass} ${bgClass} flex flex-col justify-between h-full min-h-[80px] relative`}>
      <div className="mb-1">
        <div className="text-ai-subtext text-[10px] font-bold uppercase tracking-wider leading-tight truncate">
          {label}
        </div>
        {subLabel && (
          <div className="text-ai-subtext/70 text-[8px] font-semibold uppercase tracking-wider leading-tight">
            {subLabel}
          </div>
        )}
      </div>
      <div>
        <div className={`text-lg md:text-xl font-mono font-medium tracking-tight ${valueColor[color]}`}>
            {value}
        </div>
        {subValue && (
            <div className="text-ai-subtext text-[10px] mt-0.5 font-medium truncate">
            {subValue}
            </div>
        )}
      </div>

      {/* Info Button - Canto inferior direito */}
      {description && (
        <div className="absolute bottom-1.5 right-1.5" ref={infoRef}>
          <button 
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-300 hover:text-blue-500 transition-colors focus:outline-none"
            aria-label="Mais informações"
          >
            <Info size={10} />
          </button>

          {/* Popover Flutuante */}
          {showInfo && (
            <div className="absolute right-0 bottom-5 z-50 w-56 p-2.5 bg-white rounded-lg shadow-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed animate-in fade-in zoom-in-95 duration-200">
              {/* Seta do Popover */}
              <div className="absolute -bottom-1.5 right-2 w-3 h-3 bg-white border-b border-r border-gray-100 transform rotate-45"></div>
              
              <p className="font-medium text-gray-800 mb-1">{label}</p>
              <p className="text-[10px]">{description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultCard;