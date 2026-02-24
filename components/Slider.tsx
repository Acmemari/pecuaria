import React, { useState, useRef, useEffect, useId } from 'react';
import { Info } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

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
  highlightBorder?: boolean; // Se true, usa borda colorida
  highlightColor?: string; // Cor customizada para highlight (default: #F5DEB3 amarelo palha)
  /** Valor exibido após o label (ex.: indicador calculado na barra 7) */
  labelBadge?: string;
  /** Estilo do badge (ex.: cores verde/amarelo/vermelho por faixa) */
  labelBadgeStyle?: React.CSSProperties;
  /** Tooltip ao passar o mouse no badge */
  labelBadgeTitle?: string;
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
  index,
  highlightBorder = false,
  highlightColor = '#F5DEB3', // amarelo palha padrão
  labelBadge,
  labelBadgeStyle,
  labelBadgeTitle,
}) => {
  const { currencySymbol } = useLocation();
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
  const isCurrency = unit.includes('R$') || unit.includes('G$');
  const cleanUnit = unit.replace('R$ ', '').replace('R$', '').replace('G$ ', '').replace('G$', '').trim();

  const formattedValue = value.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(step) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={`bg-gray-50 p-[0.45rem] rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group relative overflow-visible ${sliderClass}`}
    >
      {/* Cabeçalho: Label + Valor */}
      <div className="flex justify-between items-start mb-[0.45rem] overflow-visible w-full min-w-0">
        {/* Lado Esquerdo: Label */}
        <label className="text-[0.675rem] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1 flex-shrink-1 min-w-0 overflow-visible max-w-[60%] md:max-w-none">
          {index && <span className="opacity-70 flex-shrink-0">{index}.</span>}
          <span className="truncate">{label}</span>
          {labelBadge != null && labelBadge !== '' && (
            <span
              className="text-[0.6rem] font-bold rounded px-1.5 py-0.5 flex-shrink-0"
              style={labelBadgeStyle}
              title={labelBadgeTitle}
            >
              {labelBadge}
            </span>
          )}
        </label>

        {/* Lado Direito: Valor e Unidade */}
        <div className="text-right flex items-baseline justify-end gap-1 flex-shrink-0 min-w-fit overflow-visible">
          {isCurrency && (
            <span className="text-[0.675rem] text-gray-400 font-medium flex-shrink-0">{currencySymbol}</span>
          )}
          <span className="text-[0.9rem] font-bold text-blue-600 tabular-nums leading-none whitespace-nowrap flex-shrink-0">
            {formattedValue}
          </span>
          {cleanUnit && (
            <span className="text-[0.675rem] text-gray-400 font-medium self-end mb-0.5 flex-shrink-0">{cleanUnit}</span>
          )}
        </div>
      </div>

      {/* Slider + Info Button na mesma linha */}
      <div className="flex items-center gap-2">
        {/* Slider Customizado */}
        <div className="relative h-[1.35rem] flex items-center flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full absolute z-20 opacity-0 cursor-pointer h-full custom-range-input"
          />

          {/* Visual Track */}
          <div className="w-full h-[0.45rem] bg-gray-200 rounded-full overflow-hidden relative z-10 pointer-events-none">
            {/* Progress Bar (Opcional, mas melhora UX) */}
            <div
              className="h-full bg-blue-200/50 absolute left-0 top-0 transition-all duration-75"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Visual Thumb - Segue o input real via CSS calc ou JS */}
          <div
            className="absolute h-[0.9rem] w-[0.9rem] bg-white border-[2px] rounded-full shadow-md z-10 pointer-events-none transition-all duration-75 ease-out"
            style={{
              left: `calc(${percentage}% + (${8 - percentage * 0.15}px))`, // Ajuste fino para centralizar
              transform: 'translateX(-50%)',
              borderColor: highlightBorder ? highlightColor : '#2563eb',
            }}
          />
        </div>

        {/* Info Button - No final do slider */}
        <div className="relative shrink-0" ref={infoRef}>
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
            <div className="absolute right-0 bottom-5 z-50 w-64 p-3 bg-white rounded-lg shadow-2xl border border-gray-100 text-xs text-gray-600 leading-relaxed animate-in fade-in zoom-in-95 duration-200">
              {/* Seta do Popover */}
              <div className="absolute -bottom-1.5 right-2 w-3 h-3 bg-white border-b border-r border-gray-100 transform rotate-45"></div>

              <p className="font-medium text-gray-800 mb-1">{label}</p>
              <p>{description || 'Ajuste este valor conforme as premissas do seu cenário.'}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Garantir que valores apareçam em mobile */
        .${sliderClass} > div:first-child {
          overflow-x: visible !important;
          overflow-y: visible !important;
        }
        .${sliderClass} > div:first-child > div:last-child {
          overflow: visible !important;
          min-width: fit-content !important;
        }
        .${sliderClass} > div:first-child > div:last-child > span {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        @media (max-width: 768px) {
          .${sliderClass} > div:first-child > div:last-child {
            max-width: none !important;
            flex-basis: auto !important;
          }
        }
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
          height: 14.4px;
          width: 14.4px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid ${highlightBorder ? highlightColor : '#2563eb'}; /* cor highlight ou blue-600 */
          cursor: pointer;
          margin-top: -3.6px; /* Ajuste para alinhar com o track visual se necessário */
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        /* Webkit Slider Runnable Track */
        .${sliderClass} input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 7.2px;
          cursor: pointer;
          background: transparent;
          border-radius: 9999px;
        }

        /* Firefox Thumb */
        .${sliderClass} input[type=range]::-moz-range-thumb {
          height: 14.4px;
          width: 14.4px;
          border: 2px solid ${highlightBorder ? highlightColor : '#2563eb'};
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        /* Firefox Track */
        .${sliderClass} input[type=range]::-moz-range-track {
          width: 100%;
          height: 7.2px;
          cursor: pointer;
          background: transparent;
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
};

export default Slider;
