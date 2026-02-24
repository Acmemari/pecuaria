import React, { useCallback } from 'react';

interface CustomSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  marks?: number[];
  highlightRange?: { start: number; end: number };
  color?: 'blue' | 'green' | 'purple' | 'orange';
  showValue?: boolean;
  compact?: boolean;
}

const colorClasses = {
  blue: {
    highlight: 'bg-blue-300/40 border-blue-500',
    marker: 'bg-blue-500 text-blue-600',
    thumb: 'bg-blue-600',
    tooltip: 'bg-blue-600 border-t-blue-600',
  },
  green: {
    highlight: 'bg-green-300/40',
    marker: 'bg-green-500 text-green-600',
    thumb: 'bg-green-600',
    tooltip: 'bg-green-600 border-t-green-600',
  },
  purple: {
    highlight: 'bg-purple-300/40',
    marker: 'bg-purple-500 text-purple-600',
    thumb: 'bg-purple-600',
    tooltip: 'bg-purple-600 border-t-purple-600',
  },
  orange: {
    highlight: 'bg-orange-300/40',
    marker: 'bg-orange-500 text-orange-600',
    thumb: 'bg-orange-600',
    tooltip: 'bg-orange-600 border-t-orange-600',
  },
};

/**
 * Slider customizado reutilizável com marcadores e tooltip
 */
export const CustomSlider: React.FC<CustomSliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit = '%',
  marks,
  highlightRange,
  color = 'blue',
  showValue = true,
  compact = false,
}) => {
  const range = max - min;
  const colors = colorClasses[color];

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (isFinite(newValue)) {
        onChange(newValue);
      }
    },
    [onChange],
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const newValue = parseFloat((e.target as HTMLInputElement).value);
      if (isFinite(newValue)) {
        onChange(newValue);
      }
    },
    [onChange],
  );

  // Gerar marcadores automáticos se não fornecidos
  const sliderMarks =
    marks ||
    (() => {
      const autoMarks: number[] = [];
      const markerStep = range > 20 ? 5 : range > 10 ? 2 : 1;
      for (let i = min; i <= max; i += markerStep) {
        autoMarks.push(i);
      }
      if (!autoMarks.includes(max)) autoMarks.push(max);
      return autoMarks;
    })();

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {!compact && (
        <label className="block text-xs font-medium text-ai-text">
          {label}
          {showValue && (
            <span className="ml-2 text-ai-accent font-semibold">
              {value.toFixed(step < 1 ? 1 : 0)}
              {unit}
            </span>
          )}
        </label>
      )}

      <div className={`relative ${compact ? 'pt-2 pb-1' : 'pt-4 pb-1.5'}`}>
        {/* Track */}
        <div className="relative h-1.5 bg-gray-200 rounded-full overflow-visible">
          {/* Área destacada */}
          {highlightRange && (
            <div
              className={`absolute top-0 bottom-0 rounded-full border-l border-r ${colors.highlight}`}
              style={{
                left: `${((highlightRange.start - min) / range) * 100}%`,
                width: `${((highlightRange.end - highlightRange.start) / range) * 100}%`,
              }}
            />
          )}

          {/* Marcadores */}
          {!compact && (
            <div className="absolute -top-3 left-0 right-0 flex justify-between px-0.5">
              {sliderMarks.map(val => {
                const isInRange = !highlightRange || (val >= highlightRange.start && val <= highlightRange.end);
                return (
                  <div key={val} className="flex flex-col items-center">
                    <div className={`w-0.5 h-0.5 ${isInRange ? colors.marker : 'bg-gray-400'}`} />
                    <span
                      className={`text-[8px] mt-0.5 ${isInRange ? `${colors.marker} font-semibold` : 'text-gray-500'}`}
                    >
                      {val}
                      {unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input Range */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            onInput={handleInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
          />

          {/* Thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 ${colors.thumb} rounded-full border border-white shadow z-20 pointer-events-none transition-all duration-75`}
            style={{
              left: `${((value - min) / range) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Tooltip */}
            <div
              className={`absolute -top-5 left-1/2 -translate-x-1/2 ${colors.tooltip} text-white text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap shadow`}
            >
              {value.toFixed(step < 1 ? 1 : 0)}
              {unit}
              <div
                className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent ${colors.tooltip}`}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
