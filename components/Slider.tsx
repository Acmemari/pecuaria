import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
  description?: string;
  index?: number;
}

const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  unit, 
  onChange,
  description,
  index
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="bg-ai-surface p-2 md:p-2.5 rounded border border-ai-border/50 hover:border-ai-accent/30 transition-colors group">
      <div className="flex justify-between items-baseline mb-1.5 md:mb-1.5">
        <div className="flex-1 mr-2">
          <label className="text-ai-text font-medium text-xs flex items-center gap-1.5 truncate">
            {index && <span className="text-ai-subtext font-mono text-[10px] w-3">{index}.</span>}
            {label}
          </label>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-mono font-bold text-ai-accent tracking-tight">
            {unit === 'R$' || unit === 'R$/kg' ? 'R$ ' : ''}
            {value.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(step) ? 0 : 2, maximumFractionDigits: 2 })}
            {unit !== 'R$' && unit !== 'R$/kg' ? ` ${unit.replace('R$ ', '')}` : ''}
          </span>
        </div>
      </div>

      <div className="relative h-6 md:h-4 flex items-center cursor-pointer touch-none">
        {/* Track background - taller on mobile for better touch target */}
        <div className="absolute w-full h-1 md:h-[3px] bg-ai-border rounded-full overflow-hidden">
          {/* Active track */}
          <div 
            className="h-full bg-ai-accent transition-all duration-75 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Range Input (Invisible but functional) - larger touch target on mobile */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10 touch-none"
          style={{ minHeight: '44px' }} // Minimum touch target size
        />

        {/* Thumb (Visual) - larger on mobile for better visibility and touch */}
        <div 
          className="absolute h-4 w-4 md:h-3 md:w-3 bg-white rounded-full border border-ai-border shadow-sm pointer-events-none transition-all duration-75 ease-out group-hover:scale-125 group-hover:border-ai-accent"
          style={{ 
            left: `${percentage}%`,
            transform: 'translateX(-50%)'
          }}
        />
      </div>
    </div>
  );
};

export default Slider;