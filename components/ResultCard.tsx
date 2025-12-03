import React from 'react';

interface ResultCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
  color?: 'default' | 'neutral' | 'positive' | 'negative' | 'info';
}

const ResultCard: React.FC<ResultCardProps> = ({ 
  label, 
  value, 
  subValue, 
  highlight = false,
  color = 'default'
}) => {
  
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
    <div className={`p-2.5 md:p-3 rounded-lg border ${borderClass} ${bgClass} flex flex-col justify-between h-full min-h-[80px]`}>
      <div className="text-ai-subtext text-[10px] font-bold uppercase tracking-wider leading-tight mb-1 truncate">
        {label}
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
    </div>
  );
};

export default ResultCard;