import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon } from 'lucide-react';

registerLocale('pt-BR', ptBR);

/* ── helpers ────────────────────────────────────────────── */

function parseIso(v?: string): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return isFinite(dt.getTime()) ? dt : null;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtBR(d: Date | null): string {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function parseBR(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dt = new Date(+m[3], +m[2] - 1, +m[1]);
  if (dt.getDate() !== +m[1] || dt.getMonth() !== +m[2] - 1) return null;
  return isFinite(dt.getTime()) ? dt : null;
}

function mask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/* ── componente ────────────────────────────────────────── */

interface DateInputBRProps {
  value?: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  id?: string;
}

const DateInputBR: React.FC<DateInputBRProps> = ({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className = '',
  disabled = false,
  required = false,
  min,
  max,
  id,
}) => {
  const selected = useMemo(() => parseIso(value), [value]);
  const minD = useMemo(() => parseIso(min), [min]);
  const maxD = useMemo(() => parseIso(max), [max]);

  const [text, setText] = useState(fmtBR(selected));
  const [showCal, setShowCal] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sincroniza texto quando value externo muda
  useEffect(() => {
    setText(fmtBR(selected));
  }, [selected]);

  // Fecha calendário ao clicar fora
  useEffect(() => {
    if (!showCal) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowCal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCal]);

  const commitTyped = useCallback(
    (s: string) => {
      let d = parseBR(s);
      if (d) {
        // Restringir ao intervalo min/max
        if (minD && d < minD) d = minD;
        if (maxD && d > maxD) d = maxD;
        onChange(toIso(d));
        setText(fmtBR(d));
      }
    },
    [onChange, minD, maxD],
  );

  const handleBlur = useCallback(() => {
    if (!text.trim()) {
      onChange('');
      return;
    }
    let d = parseBR(text);
    if (d) {
      // Restringir ao intervalo min/max
      if (minD && d < minD) d = minD;
      if (maxD && d > maxD) d = maxD;
      onChange(toIso(d));
      setText(fmtBR(d));
    } else {
      setText(fmtBR(selected)); // reverte
    }
  }, [text, selected, onChange, minD, maxD]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Campo de texto – digitação livre */}
      <input
        id={id}
        type="text"
        value={text}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full pl-3 pr-10 py-2 border border-ai-border rounded-md bg-ai-surface text-ai-text text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent/20 transition-all placeholder:text-ai-subtext/40"
        onChange={e => {
          const m = mask(e.target.value);
          setText(m);
          if (m.length === 10) commitTyped(m);
        }}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (
            !/[0-9/]/.test(e.key) &&
            !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)
          ) {
            e.preventDefault();
          }
        }}
      />

      {/* Botão do calendário – abre/fecha o popup */}
      <button
        type="button"
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ai-subtext/60 hover:text-ai-accent hover:bg-ai-surface2 transition-colors"
        title="Abrir calendário"
        onClick={() => setShowCal(p => !p)}
      >
        <CalendarIcon size={16} />
      </button>

      {/* Popup do calendário */}
      {showCal && (
        <div className="absolute z-[9999] mt-1 left-0">
          <DatePicker
            selected={selected}
            onChange={(date: Date | null) => {
              if (date) {
                onChange(toIso(date));
                setText(fmtBR(date));
              }
              setShowCal(false);
            }}
            inline
            locale="pt-BR"
            minDate={minD || undefined}
            maxDate={maxD || undefined}
          />
        </div>
      )}
    </div>
  );
};

export default DateInputBR;
