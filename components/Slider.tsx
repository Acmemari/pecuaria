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
  /** Se true, badge sem caixa (apenas texto). Se false e labelBadgePill true, usa estilo pill (fundo amarelo, borda, texto marrom). */
  labelBadgePlain?: boolean;
  /** Se true, badge com estilo pill (fundo amarelo claro, borda, texto marrom) para tempo e $ da @ */
  labelBadgePill?: boolean;
  /** Número em destaque no badge (ex.: "8,5") - quando definido com labelBadgeUnit, número fica em destaque e unidade menor */
  labelBadgeNumber?: string;
  /** Unidade do badge em fonte menor (ex.: "meses", "%") */
  labelBadgeUnit?: string;
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
  labelBadgePlain = false,
  labelBadgePill = false,
  labelBadgeNumber,
  labelBadgeUnit,
}) => {
  const { currencySymbol } = useLocation();
  const [showInfo, setShowInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const percentage = ((value - min) / (max - min)) * 100;
  const uniqueId = useId().replace(/:/g, ''); // Remover caracteres inválidos para classe CSS se necessário
  const sliderClass = `slider-${uniqueId}`;
  const sliderRangeId = `slider-range-${uniqueId}`;

  // Sincronizar inputValue quando value muda externamente (ex: slider)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  // Validação ±25% do valor atual; interseção com min/max do slider
  const getValidRange = () => {
    if (value === 0 || Math.abs(value) < 1e-10) {
      return { validMin: min, validMax: max };
    }
    const validMin = value * 0.75;
    const validMax = value * 1.25;
    return {
      validMin: Math.max(validMin, min),
      validMax: Math.min(validMax, max),
    };
  };

  const applyTypedValue = () => {
    // Aceitar vírgula (pt-BR) ou ponto como decimal
    let normalized = inputValue.trim();
    if (normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      setInputValue(value.toString());
      setIsEditing(false);
      return;
    }
    const { validMin, validMax } = getValidRange();
    const clamped = Math.max(validMin, Math.min(validMax, parsed));
    const rounded = step >= 1 ? Math.round(clamped) : Math.round(clamped / step) * step;
    const final = Math.max(min, Math.min(max, rounded));
    onChange(final);
    setInputValue(final.toString());
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setInputValue(value.toString());
    setIsEditing(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyTypedValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

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
      className={`bg-gray-50 px-[0.35rem] py-[0.19rem] rounded-lg border border-gray-100 hover:border-gray-200 transition-colors group relative overflow-visible ${sliderClass}`}
    >
      {/* Cabeçalho: Label + Valor */}
      <div className="flex justify-between items-start mb-[0.14rem] overflow-visible w-full min-w-0">
        {/* Lado Esquerdo: Label */}
        <label htmlFor={sliderRangeId} className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-0.5 flex-shrink-1 min-w-0 overflow-visible max-w-[75%] md:max-w-none">
          {index && <span className="opacity-70 flex-shrink-0">{index}.</span>}
          <span className="truncate">{label}</span>
          {(labelBadge != null && labelBadge !== '') || (labelBadgeNumber != null && labelBadgeNumber !== '') ? (
            <span
              className={`flex-shrink-0 ml-2 ${labelBadgePlain ? '' : 'rounded-md px-1.5 py-0.5 inline-flex items-baseline gap-0.5'}`}
              style={
                labelBadgePill
                  ? {
                      backgroundColor: '#FFFDD0',
                      border: '1px solid #D4C85A',
                      color: '#8B4513',
                      ...labelBadgeStyle,
                    }
                  : labelBadgeStyle
              }
              title={labelBadgeTitle}
            >
              {labelBadgeNumber != null && labelBadgeNumber !== '' ? (
                <>
                  <span className="text-[0.65rem] font-bold tabular-nums">{labelBadgeNumber}</span>
                  {labelBadgeUnit && (
                    <span className="text-[0.5rem] font-medium opacity-90">{labelBadgeUnit}</span>
                  )}
                </>
              ) : (
                <span className="text-[0.6rem] font-bold">{labelBadge}</span>
              )}
            </span>
          ) : null}
        </label>

        {/* Lado Direito: Valor editável e Unidade (container pill indica clicabilidade) */}
        <div className="text-right flex items-baseline justify-end gap-1 flex-shrink-0 min-w-fit overflow-visible">
          {isCurrency && (
            <span className="text-[0.675rem] text-gray-400 font-medium flex-shrink-0">{currencySymbol}</span>
          )}
          <div
            className={`inline-flex items-baseline rounded-full px-1.5 py-0.5 transition-colors cursor-text ${
              isEditing ? 'bg-white ring-1 ring-blue-400' : 'bg-gray-100/80 hover:bg-gray-100'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={isEditing ? inputValue : formattedValue}
              onChange={e => setInputValue(e.target.value)}
              onFocus={() => {
                setIsEditing(true);
                setInputValue(value.toString());
                setTimeout(() => inputRef.current?.select(), 0);
              }}
              onBlur={applyTypedValue}
              onKeyDown={handleKeyDown}
              className="text-[0.9rem] font-bold text-blue-600 tabular-nums leading-none min-w-[3rem] max-w-[4.5rem] text-right bg-transparent border-none outline-none cursor-text py-0"
              aria-label={`${label}: ${formattedValue} ${cleanUnit}`}
            />
          </div>
          {cleanUnit && (
            <span className="text-[0.675rem] text-gray-400 font-medium self-end mb-0.5 flex-shrink-0">{cleanUnit}</span>
          )}
        </div>
      </div>

      {/* Slider + Info Button na mesma linha */}
      <div className="flex items-center gap-2">
        {/* Slider Customizado */}
        <div className="relative h-[1.05rem] flex items-center flex-1">
          <input
            id={sliderRangeId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="w-full absolute z-20 opacity-0 cursor-pointer h-full custom-range-input"
            aria-label={`${label}: ${formattedValue} ${cleanUnit}`}
          />

          {/* Visual Track */}
          <div className="w-full h-[0.38rem] bg-gray-200 rounded-full overflow-hidden relative z-10 pointer-events-none">
            {/* Progress Bar (Opcional, mas melhora UX) */}
            <div
              className="h-full bg-blue-200/50 absolute left-0 top-0 transition-all duration-75"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Visual Thumb - Segue o input real via CSS calc ou JS */}
          <div
            className="absolute h-[0.7rem] w-[0.7rem] bg-white border-[2px] rounded-full shadow-md z-10 pointer-events-none transition-all duration-75 ease-out"
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
        .${sliderClass} > div:first-child > div:last-child > span,
        .${sliderClass} > div:first-child > div:last-child > div input,
        .${sliderClass} > div:first-child > div:last-child > input {
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

        /* Webkit Slider Thumb (Chrome, Safari, Edge) - matches visual thumb 0.7rem */
        .${sliderClass} input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 0.7rem;
          width: 0.7rem;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid ${highlightBorder ? highlightColor : '#2563eb'}; /* cor highlight ou blue-600 */
          cursor: pointer;
          margin-top: -2.8px; /* Align with 0.38rem track */
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

        /* Firefox Thumb - matches visual thumb 0.7rem */
        .${sliderClass} input[type=range]::-moz-range-thumb {
          height: 0.7rem;
          width: 0.7rem;
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
