import React, { useState, useRef, useEffect, useId } from 'react';
import { Info } from 'lucide-react';

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
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const percentage = ((value - min) / (max - min)) * 100;
  const uniqueId = useId().replace(/:/g, ''); // Remover caracteres inválidos para classe CSS se necessário
  const sliderClass = `slider-${uniqueId}`;

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

  // Formatar valor e unidade
  const isCurrency = unit.includes('R$');
  const cleanUnit = unit.replace('R$ ', '').replace('R$', '').trim();
  
  const formattedValue = value.toLocaleString('pt-BR', { 
    minimumFractionDigits: Number.isInteger(step) ? 0 : 2, 
    maximumFractionDigits: 2 
  });

  return (
    <div className={`bg-gray-50 p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group relative ${sliderClass}`}>
      
      {/* Cabeçalho: Label + Info + Valor */}
      <div className="flex justify-between items-start mb-2">
        
        {/* Lado Esquerdo: Label e Info */}
        <div className="flex items-center gap-1.5 relative" ref={infoRef}>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1">
            {index && <span className="opacity-70">{index}.</span>}
            {label}
          </label>
          
          <button 
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
            aria-label="Mais informações"
          >
            <Info size={14} />
          </button>

          {/* Popover Flutuante */}
          {showInfo && (
            <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-white rounded-lg shadow-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed animate-in fade-in zoom-in-95 duration-200">
              {/* Seta do Popover */}
              <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-t border-l border-gray-100 transform rotate-45"></div>
              
              <p className="font-medium text-gray-800 mb-1">{label}</p>
              <p>{description || "Ajuste este valor conforme as premissas do seu cenário."}</p>
            </div>
          )}
        </div>

        {/* Lado Direito: Valor e Unidade */}
        <div className="text-right flex items-baseline justify-end gap-1">
          {isCurrency && <span className="text-xs text-gray-400 font-medium">R$</span>}
          <span className="text-base font-bold text-blue-600 tabular-nums leading-none">
            {formattedValue}
          </span>
          {cleanUnit && <span className="text-xs text-gray-400 font-medium self-end mb-0.5">{cleanUnit}</span>}
        </div>
      </div>

      {/* Slider Customizado */}
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full absolute z-20 opacity-0 cursor-pointer h-full custom-range-input"
        />
        
        {/* Visual Track */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative z-10 pointer-events-none">
          {/* Progress Bar (Opcional, mas melhora UX) */}
          <div 
            className="h-full bg-blue-200/50 absolute left-0 top-0 transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Visual Thumb - Segue o input real via CSS calc ou JS */}
        <div 
          className="absolute h-4 w-4 bg-white border-[2px] border-blue-600 rounded-full shadow-md z-10 pointer-events-none transition-transform duration-75 ease-out"
          style={{ 
            left: `calc(${percentage}% + (${8 - percentage * 0.15}px))`, // Ajuste fino para centralizar
            transform: 'translateX(-50%)'
          }}
        />
      </div>

      <style>{`
        /* Reset básico para input range dentro deste componente */
        .${sliderClass} input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
        }

        .${sliderClass} input[type=range]:focus {
          outline: none;
        }

        /* Webkit Slider Thumb (Chrome, Safari, Edge) */
        .${sliderClass} input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #2563eb; /* blue-600 */
          cursor: pointer;
          margin-top: -4px; /* Ajuste para alinhar com o track visual se necessário */
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        /* Webkit Slider Runnable Track */
        .${sliderClass} input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: transparent;
          border-radius: 9999px;
        }

        /* Firefox Thumb */
        .${sliderClass} input[type=range]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border: 2px solid #2563eb;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        /* Firefox Track */
        .${sliderClass} input[type=range]::-moz-range-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: transparent;
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
};

export default Slider;
